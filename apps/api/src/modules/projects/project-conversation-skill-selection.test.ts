import assert from 'node:assert/strict';
import test from 'node:test';
import { ObjectId } from 'mongodb';
import { AppError } from '@lib/app-error.js';
import { createProjectConversationRuntime } from './project-conversation-runtime.js';
import { prepareProjectConversationTurn } from './project-conversation-turn.prepare.js';
import type {
  ProjectConversationDocument,
  ProjectDocument,
} from './projects.types.js';

const createRuntimeTestEnv = () =>
  ({
    appName: 'Knowject API',
    nodeEnv: 'test',
    corsOrigin: '*',
    openai: {
      apiKey: 'openai-api-key',
      baseUrl: 'https://api.openai.com/v1',
      embeddingModel: 'text-embedding-3-small',
      requestTimeoutMs: 30000,
    },
  }) as const;

test('prepareProjectConversationTurn rejects skillId values that are not bound team skills on the project', async () => {
  const projectId = '507f1f77bcf86cd799439201';
  const project: ProjectDocument & {
    _id: NonNullable<ProjectDocument['_id']>;
  } = {
    _id: new ObjectId(projectId),
    name: 'Skill 校验项目',
    description: '验证 skill 选择校验',
    ownerId: 'user-1',
    members: [
      {
        userId: 'user-1',
        role: 'admin',
        joinedAt: new Date('2026-04-18T00:00:00.000Z'),
      },
    ],
    knowledgeBaseIds: [],
    agentIds: [],
    skillIds: ['skill-missing'],
    createdAt: new Date('2026-04-18T00:00:00.000Z'),
    updatedAt: new Date('2026-04-18T00:00:00.000Z'),
  };

  await assert.rejects(
    () =>
      prepareProjectConversationTurn({
        repository: {
          findById: async () => project,
        } as never,
        projectConversationsRepository: {} as never,
        skillsRepository: {
          findSkillById: async () => null,
        },
        context: {
          actor: {
            id: 'user-1',
            username: 'langya',
          },
          locale: 'zh-CN',
        },
        projectId,
        conversationId: 'chat-default',
        input: {
          content: '请按 Skill 处理这条消息',
          skillId: 'skill-missing',
        },
      }),
    (error: unknown) => {
      assert.ok(error instanceof AppError);
      assert.equal(error.messageKey, 'validation.projectConversation.skill.invalid');
      return true;
    },
  );
});

test('createProjectConversationRuntime injects the selected skill definition into the answer prompt', async () => {
  const projectId = '507f1f77bcf86cd799439202';
  const project: ProjectDocument & {
    _id: NonNullable<ProjectDocument['_id']>;
  } = {
    _id: new ObjectId(projectId),
    name: 'Skill Prompt 项目',
    description: '验证 Skill prompt 注入',
    ownerId: 'user-1',
    members: [
      {
        userId: 'user-1',
        role: 'admin',
        joinedAt: new Date('2026-04-18T00:00:00.000Z'),
      },
    ],
    knowledgeBaseIds: ['kb-1'],
    agentIds: [],
    skillIds: ['skill-1'],
    createdAt: new Date('2026-04-18T00:00:00.000Z'),
    updatedAt: new Date('2026-04-18T00:00:00.000Z'),
  };
  const conversation: ProjectConversationDocument = {
    id: 'chat-skill-prompt',
    title: 'Skill Prompt 会话',
    messages: [
      {
        id: 'msg-user-1',
        role: 'user',
        content: '请梳理当前需求边界',
        createdAt: new Date('2026-04-18T09:00:00.000Z'),
      },
    ],
    createdAt: new Date('2026-04-18T09:00:00.000Z'),
    updatedAt: new Date('2026-04-18T09:00:00.000Z'),
  };
  const capturedPrompts: string[] = [];
  const originalFetch = global.fetch;

  global.fetch = async (_input, init) => {
    const body = JSON.parse(String(init?.body ?? '{}')) as {
      messages?: Array<{ content?: string }>;
    };
    const latestPrompt = body.messages?.[body.messages.length - 1]?.content ?? '';
    const systemPrompt = body.messages?.[0]?.content ?? '';

    if (/结构化 citation JSON/.test(latestPrompt)) {
      return new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                content:
                  '{"version":1,"sentences":[{"id":"sent-1","text":"按 Skill 输出了需求边界整理。","sourceIds":["s1"],"grounded":true}]}',
              },
            },
          ],
        }),
        {
          status: 200,
          headers: {
            'content-type': 'application/json',
          },
        },
      );
    }

    capturedPrompts.push(systemPrompt);
    return new Response(
      JSON.stringify({
        choices: [
          {
            message: {
              content: '按 Skill 输出了需求边界整理。',
            },
          },
        ],
      }),
      {
        status: 200,
        headers: {
          'content-type': 'application/json',
        },
      },
    );
  };

  try {
    const runtime = createProjectConversationRuntime({
      env: createRuntimeTestEnv() as never,
      settingsRepository: {
        getSettings: async () => null,
      } as never,
      knowledgeSearch: {
        searchProjectDocuments: async () => ({
          query: '请梳理当前需求边界',
          sourceType: 'global_docs',
          total: 1,
          items: [
            {
              knowledgeId: 'kb-1',
              documentId: 'doc-1',
              chunkId: 'chunk-1',
              chunkIndex: 0,
              type: 'global_docs',
              source: 'requirements.md',
              content: '当前需求重点是先去歧义，再输出明确的执行边界。',
              distance: 0.05,
            },
          ],
        }),
      },
    });

    const result = await runtime.generateAssistantReply({
      actor: {
        id: 'user-1',
        username: 'langya',
      },
      locale: 'zh-CN',
      project,
      conversation,
      userMessage: conversation.messages[0]!,
      selectedSkill: {
        id: 'skill-1',
        name: '需求去歧义',
        description: '先澄清问题边界，再输出执行建议',
        owner: '当前团队',
        definition: {
          goal: '先把需求边界讲清楚，再给出执行建议',
          triggerScenarios: ['需求表达不明确'],
          requiredContext: ['当前问题描述'],
          workflow: ['澄清歧义点', '整理边界', '给出下一步建议'],
          outputContract: ['先结论后依据'],
          guardrails: ['不要跳过歧义澄清'],
          artifacts: [],
          projectBindingNotes: ['适合项目执行前的需求对齐'],
          followupQuestionsStrategy: 'optional',
        },
      },
    });

    assert.equal(result.content, '按 Skill 输出了需求边界整理。');
    assert.equal(capturedPrompts.length, 1);
    assert.match(capturedPrompts[0] ?? '', /当前启用的项目 Skill/);
    assert.match(capturedPrompts[0] ?? '', /需求去歧义/);
    assert.match(capturedPrompts[0] ?? '', /澄清歧义点/);
    assert.match(capturedPrompts[0] ?? '', /不要跳过歧义澄清/);
  } finally {
    global.fetch = originalFetch;
  }
});
