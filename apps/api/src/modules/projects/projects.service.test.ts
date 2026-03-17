import assert from 'node:assert/strict';
import test from 'node:test';
import type { AppEnv } from '@config/env.js';
import { ObjectId } from 'mongodb';
import type { AuthRepository } from '@modules/auth/auth.repository.js';
import type { SettingsRepository } from '@modules/settings/settings.repository.js';
import type { SkillBindingValidator } from '@modules/skills/skills.binding.js';
import { createProjectConversationRuntime, createProjectsService } from './projects.service.js';
import type { ProjectsRepository } from './projects.repository.js';
import type {
  ProjectConversationDocument,
  ProjectConversationSourceDocument,
  ProjectDocument,
} from './projects.types.js';

const createAuthRepositoryStub = (): AuthRepository => {
  return {
    findProfilesByIds: async (userIds: string[]) =>
      userIds.map((userId) => ({
        id: userId,
        username: userId,
        name: userId === 'user-1' ? 'Langya' : `User ${userId}`,
      })),
  } as unknown as AuthRepository;
};

const createSkillBindingValidatorStub = (
  implementation?: (
    skillIds: string[],
    options: { fieldName: 'boundSkillIds' | 'skillIds' },
  ) => Promise<void>,
): SkillBindingValidator => {
  return {
    assertBindableSkillIds: implementation ?? (async () => undefined),
  };
};

const createConversationRuntimeStub = (implementation?: () => Promise<{
  content: string;
  sources: ProjectConversationSourceDocument[];
}>) => {
  return {
    generateAssistantReply:
      implementation ??
      (async () => ({
        content: '当前项目已经具备最小对话写链路，并开始接入项目级检索。',
        sources: [
          {
            knowledgeId: 'kb-1',
            documentId: 'doc-1',
            chunkId: 'chunk-1',
            chunkIndex: 0,
            source: 'chat-core.md',
            snippet: '项目对话已经具备最小消息写链路，并开始接入项目级 merged retrieval。',
            distance: 0.18,
          },
        ],
      })),
  };
};

const createSettingsRepositoryStub = (): SettingsRepository => {
  return {
    getSettings: async () => null,
  } as unknown as SettingsRepository;
};

const createTestEnv = (): AppEnv => {
  return {
    workspaceRoot: '/tmp/knowject-workspace',
    packageRoot: '/tmp/knowject-workspace/apps/api',
    nodeEnv: 'test',
    appName: 'Knowject Test',
    port: 3100,
    logLevel: 'silent',
    corsOrigin: '*',
    mongo: {
      uri: 'mongodb://127.0.0.1:27017',
      dbName: 'knowject_test',
      host: '127.0.0.1',
    },
    chroma: {
      url: 'http://127.0.0.1:8000',
      host: '127.0.0.1',
      heartbeatPath: '/api/v2/heartbeat',
      tenant: 'default_tenant',
      database: 'default_database',
      requestTimeoutMs: 1000,
    },
    knowledge: {
      storageRoot: '/tmp/knowject-knowledge',
      indexerUrl: 'http://127.0.0.1:8001',
      indexerRequestTimeoutMs: 1000,
    },
    skills: {
      storageRoot: '/tmp/knowject-skills',
    },
    openai: {
      apiKey: 'sk-test-openai',
      baseUrl: 'https://api.openai.com/v1',
      embeddingModel: 'text-embedding-3-small',
      requestTimeoutMs: 1000,
    },
    settings: {
      encryptionKey: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
    },
    jwt: {
      secret: 'test-secret',
      expiresIn: '1h',
      issuer: 'knowject-test',
      audience: 'knowject-test',
    },
    argon2: {
      memoryCost: 19456,
      timeCost: 2,
      parallelism: 1,
    },
    apiErrors: {
      exposeDetails: true,
      includeStack: false,
    },
  };
};

type CapturedLlmRequest = {
  url: string;
  body: {
    model?: string;
    messages?: Array<{ role: string; content: string }>;
  };
};

test('createProject persists resource bindings into the formal project model', async () => {
  let createdProject: ProjectDocument | null = null;

  const repository = {
    createProject: async (document: Omit<ProjectDocument, '_id'>) => {
      createdProject = document;

      return {
        ...document,
        _id: new ObjectId('507f1f77bcf86cd799439011'),
      };
    },
  } as unknown as ProjectsRepository;

  const service = createProjectsService({
    repository,
    authRepository: createAuthRepositoryStub(),
    skillBindingValidator: createSkillBindingValidatorStub(),
  });

  const response = await service.createProject(
    {
      actor: {
        id: 'user-1',
        username: 'langya',
      },
    },
    {
      name: '项目资源正式化',
      description: '把项目资源绑定切到后端主模型',
      knowledgeBaseIds: ['kb-1', 'kb-2', 'kb-1'],
      agentIds: ['agent-1'],
      skillIds: ['skill-1', 'skill-2'],
    },
  );

  assert.notEqual(createdProject, null);
  if (!createdProject) {
    throw new Error('createdProject should not be null');
  }

  const persistedProject: ProjectDocument = createdProject;
  assert.deepEqual(persistedProject.knowledgeBaseIds, ['kb-1', 'kb-2']);
  assert.deepEqual(persistedProject.agentIds, ['agent-1']);
  assert.deepEqual(persistedProject.skillIds, ['skill-1', 'skill-2']);
  assert.equal(persistedProject.conversations.length, 1);
  assert.equal(persistedProject.conversations[0]?.id, 'chat-default');
  assert.deepEqual(response.knowledgeBaseIds, ['kb-1', 'kb-2']);
  assert.deepEqual(response.agentIds, ['agent-1']);
  assert.deepEqual(response.skillIds, ['skill-1', 'skill-2']);
});

test('listProjectConversations returns a default formal conversation when the project has no stored threads', async () => {
  const project: ProjectDocument & {
    _id: NonNullable<ProjectDocument['_id']>;
  } = {
    _id: new ObjectId('507f1f77bcf86cd799439012'),
    name: '项目对话正式化',
    description: '验证默认会话回退',
    ownerId: 'user-1',
    members: [
      {
        userId: 'user-1',
        role: 'admin',
        joinedAt: new Date('2026-03-13T00:00:00.000Z'),
      },
    ],
    knowledgeBaseIds: [],
    agentIds: [],
    skillIds: [],
    conversations: [],
    createdAt: new Date('2026-03-13T00:00:00.000Z'),
    updatedAt: new Date('2026-03-13T00:00:00.000Z'),
  };

  const repository = {
    findById: async (projectId: string) =>
      projectId === project._id.toHexString() ? project : null,
  } as unknown as ProjectsRepository;

  const service = createProjectsService({
    repository,
    authRepository: createAuthRepositoryStub(),
    skillBindingValidator: createSkillBindingValidatorStub(),
  });

  const result = await service.listProjectConversations(
    {
      actor: {
        id: 'user-1',
        username: 'langya',
      },
    },
    project._id.toHexString(),
  );

  assert.equal(result.total, 1);
  assert.equal(result.items[0]?.id, 'chat-default');
  assert.match(result.items[0]?.title ?? '', /项目对话正式化/);
  assert.match(result.items[0]?.preview ?? '', /正式后端读链路/);
});

test('createProjectConversation creates a persisted thread with a default title fallback', async () => {
  const project: ProjectDocument & {
    _id: NonNullable<ProjectDocument['_id']>;
  } = {
    _id: new ObjectId('507f1f77bcf86cd799439015'),
    name: '对话写入基线',
    description: '验证新建会话',
    ownerId: 'user-1',
    members: [
      {
        userId: 'user-1',
        role: 'admin',
        joinedAt: new Date('2026-03-17T00:00:00.000Z'),
      },
    ],
    knowledgeBaseIds: [],
    agentIds: [],
    skillIds: [],
    conversations: [],
    createdAt: new Date('2026-03-17T00:00:00.000Z'),
    updatedAt: new Date('2026-03-17T00:00:00.000Z'),
  };

  let appendedConversation: ProjectConversationDocument | null = null;

  const repository = {
    findById: async (projectId: string) =>
      projectId === project._id.toHexString() ? project : null,
    appendProjectConversation: async (
      _projectId: string,
      conversation: ProjectConversationDocument,
      updatedAt: Date,
    ) => {
      appendedConversation = conversation;

      return {
        ...project,
        conversations: [conversation],
        updatedAt,
        _id: project._id,
      };
    },
  } as unknown as ProjectsRepository;

  const service = createProjectsService({
    repository,
    authRepository: createAuthRepositoryStub(),
    skillBindingValidator: createSkillBindingValidatorStub(),
  });

  const result = await service.createProjectConversation(
    {
      actor: {
        id: 'user-1',
        username: 'langya',
      },
    },
    project._id.toHexString(),
    {
      title: '   ',
    },
  );

  assert.notEqual(appendedConversation, null);
  if (!appendedConversation) {
    throw new Error('appendedConversation should not be null');
  }

  const persistedCreatedConversation =
    appendedConversation as ProjectDocument['conversations'][number];
  assert.equal(persistedCreatedConversation.title, '新对话');
  assert.match(persistedCreatedConversation.id, /^chat-/);
  assert.equal(result.conversation.title, '新对话');
  assert.deepEqual(result.conversation.messages, []);
});

test('createProjectConversationMessage appends persisted user and assistant messages to an existing thread', async () => {
  const existingConversationCreatedAt = new Date('2026-03-17T09:00:00.000Z');
  const existingConversationUpdatedAt = new Date('2026-03-17T09:05:00.000Z');
  const project: ProjectDocument & {
    _id: NonNullable<ProjectDocument['_id']>;
  } = {
    _id: new ObjectId('507f1f77bcf86cd799439016'),
    name: '对话消息写入',
    description: '验证已有会话写入',
    ownerId: 'user-1',
    members: [
      {
        userId: 'user-1',
        role: 'admin',
        joinedAt: new Date('2026-03-17T00:00:00.000Z'),
      },
    ],
    knowledgeBaseIds: [],
    agentIds: [],
    skillIds: [],
    conversations: [
      {
        id: 'chat-existing',
        title: '已有会话',
        messages: [],
        createdAt: existingConversationCreatedAt,
        updatedAt: existingConversationUpdatedAt,
      },
    ],
    createdAt: new Date('2026-03-17T00:00:00.000Z'),
    updatedAt: new Date('2026-03-17T09:05:00.000Z'),
  };

  let persistedConversation = project.conversations[0]!;
  let appendCalls = 0;

  const repository = {
    findById: async (projectId: string) =>
      projectId === project._id.toHexString() ? project : null,
    appendProjectConversationMessage: async (
      _projectId: string,
      conversationId: string,
      message: ProjectDocument['conversations'][number]['messages'][number],
      updatedAt: Date,
    ) => {
      appendCalls += 1;
      assert.equal(conversationId, 'chat-existing');
      persistedConversation = {
        ...persistedConversation,
        messages: [...persistedConversation.messages, message],
        updatedAt,
      };

      return {
        ...project,
        conversations: [persistedConversation],
        updatedAt,
        _id: project._id,
      };
    },
  } as unknown as ProjectsRepository;

  const service = createProjectsService({
    repository,
    authRepository: createAuthRepositoryStub(),
    skillBindingValidator: createSkillBindingValidatorStub(),
    conversationRuntime: createConversationRuntimeStub(),
  });

  const result = await service.createProjectConversationMessage(
    {
      actor: {
        id: 'user-1',
        username: 'langya',
      },
    },
    project._id.toHexString(),
    'chat-existing',
    {
      content: '  先把对话写链路打通  ',
    },
  );

  assert.equal(appendCalls, 2);
  assert.equal(persistedConversation.id, 'chat-existing');
  assert.equal(persistedConversation.messages.length, 2);
  assert.equal(persistedConversation.messages[0]?.role, 'user');
  assert.equal(persistedConversation.messages[0]?.content, '先把对话写链路打通');
  assert.match(persistedConversation.messages[0]?.id ?? '', /^msg-/);
  assert.equal(persistedConversation.messages[1]?.role, 'assistant');
  assert.equal(
    persistedConversation.messages[1]?.content,
    '当前项目已经具备最小对话写链路，并开始接入项目级检索。',
  );
  assert.deepEqual(persistedConversation.messages[1]?.sources, [
    {
      knowledgeId: 'kb-1',
      documentId: 'doc-1',
      chunkId: 'chunk-1',
      chunkIndex: 0,
      source: 'chat-core.md',
      snippet: '项目对话已经具备最小消息写链路，并开始接入项目级 merged retrieval。',
      distance: 0.18,
    },
  ]);
  assert.equal(result.conversation.messages.length, 2);
  assert.equal(result.conversation.messages[0]?.content, '先把对话写链路打通');
  assert.equal(
    result.conversation.messages[1]?.content,
    '当前项目已经具备最小对话写链路，并开始接入项目级检索。',
  );
  assert.equal(result.conversation.messages[1]?.sources?.length, 1);
});

test('createProjectConversationMessage materializes the fallback default thread and appends assistant reply', async () => {
  const project: ProjectDocument & {
    _id: NonNullable<ProjectDocument['_id']>;
  } = {
    _id: new ObjectId('507f1f77bcf86cd799439017'),
    name: '历史空会话项目',
    description: '验证默认会话物化',
    ownerId: 'user-1',
    members: [
      {
        userId: 'user-1',
        role: 'admin',
        joinedAt: new Date('2026-03-17T00:00:00.000Z'),
      },
    ],
    knowledgeBaseIds: [],
    agentIds: [],
    skillIds: [],
    conversations: [],
    createdAt: new Date('2026-03-17T00:00:00.000Z'),
    updatedAt: new Date('2026-03-17T00:00:00.000Z'),
  };

  let persistedConversation: ProjectConversationDocument | null = null;
  let appendCalls = 0;
  let materializeCalls = 0;

  const repository = {
    findById: async (projectId: string) =>
      projectId === project._id.toHexString() ? project : null,
    materializeDefaultProjectConversation: async (
      _projectId: string,
      conversation: ProjectConversationDocument,
      updatedAt: Date,
    ) => {
      materializeCalls += 1;
      persistedConversation = conversation;

      return {
        ...project,
        conversations: [conversation],
        updatedAt,
        _id: project._id,
      };
    },
    appendProjectConversationMessage: async (
      _projectId: string,
      conversationId: string,
      message: ProjectDocument['conversations'][number]['messages'][number],
      updatedAt: Date,
    ) => {
      appendCalls += 1;
      assert.equal(conversationId, 'chat-default');

      if (!persistedConversation) {
        return null;
      }

      persistedConversation = {
        ...persistedConversation,
        messages: [...persistedConversation.messages, message],
        updatedAt,
      };

      return {
        ...project,
        conversations: [persistedConversation],
        updatedAt,
        _id: project._id,
      };
    },
  } as unknown as ProjectsRepository;

  const service = createProjectsService({
    repository,
    authRepository: createAuthRepositoryStub(),
    skillBindingValidator: createSkillBindingValidatorStub(),
    conversationRuntime: createConversationRuntimeStub(),
  });

  const result = await service.createProjectConversationMessage(
    {
      actor: {
        id: 'user-1',
        username: 'langya',
      },
    },
    project._id.toHexString(),
    'chat-default',
    {
      content: '给默认会话写第一条消息',
    },
  );

  assert.equal(materializeCalls, 1);
  assert.equal(appendCalls, 3);
  assert.notEqual(persistedConversation, null);
  if (!persistedConversation) {
    throw new Error('persistedConversation should not be null');
  }

  const persistedDefaultConversation =
    persistedConversation as ProjectDocument['conversations'][number];
  assert.equal(persistedDefaultConversation.id, 'chat-default');
  assert.equal(persistedDefaultConversation.messages.length, 3);
  assert.equal(
    persistedDefaultConversation.messages[1]?.content,
    '给默认会话写第一条消息',
  );
  const latestPersistedMessage =
    persistedDefaultConversation.messages[persistedDefaultConversation.messages.length - 1];
  assert.equal(
    latestPersistedMessage?.content,
    '当前项目已经具备最小对话写链路，并开始接入项目级检索。',
  );
  assert.equal(result.conversation.id, 'chat-default');
  assert.equal(result.conversation.messages.length, 3);
  assert.equal(result.conversation.messages[2]?.sources?.[0]?.knowledgeId, 'kb-1');
});

test('createProjectConversationRuntime uses merged retrieval and returns normalized sources', async () => {
  const projectId = '507f1f77bcf86cd799439099';
  const project: ProjectDocument & {
    _id: NonNullable<ProjectDocument['_id']>;
  } = {
    _id: new ObjectId(projectId),
    name: '项目检索编排',
    description: '验证 merged retrieval runtime',
    ownerId: 'user-1',
    members: [
      {
        userId: 'user-1',
        role: 'admin',
        joinedAt: new Date('2026-03-17T00:00:00.000Z'),
      },
    ],
    knowledgeBaseIds: ['kb-1'],
    agentIds: [],
    skillIds: [],
    conversations: [],
    createdAt: new Date('2026-03-17T00:00:00.000Z'),
    updatedAt: new Date('2026-03-17T00:00:00.000Z'),
  };
  const conversation = {
    id: 'chat-existing',
    title: '已有会话',
    messages: [
      {
        id: 'msg-older-user',
        role: 'user' as const,
        content: '之前已经接了哪些正式能力？',
        createdAt: new Date('2026-03-17T09:00:00.000Z'),
      },
      {
        id: 'msg-latest-user',
        role: 'user' as const,
        content: '请总结当前项目知识基线',
        createdAt: new Date('2026-03-17T09:05:00.000Z'),
      },
    ],
    createdAt: new Date('2026-03-17T09:00:00.000Z'),
    updatedAt: new Date('2026-03-17T09:05:00.000Z'),
  };

  const capturedSearchCalls: Array<{
    projectId: string;
    query: string;
    topK?: number;
  }> = [];
  let capturedLlmRequest: CapturedLlmRequest | null = null;
  const originalFetch = global.fetch;

  global.fetch = async (input, init) => {
    capturedLlmRequest = {
      url: typeof input === 'string' ? input : input.toString(),
      body: JSON.parse(String(init?.body ?? '{}')) as CapturedLlmRequest['body'],
    };

    return new Response(
      JSON.stringify({
        choices: [
          {
            message: {
              content: '当前项目已经接入正式项目知识检索，并区分全局绑定知识与项目私有知识。',
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
      env: createTestEnv(),
      settingsRepository: createSettingsRepositoryStub(),
      knowledgeSearch: {
        searchProjectDocuments: async (_context, runtimeProjectId, input) => {
          capturedSearchCalls.push({
            projectId: runtimeProjectId,
            query: input.query,
            topK: input.topK,
          });

          return {
            query: input.query,
            sourceType: 'global_docs',
            total: 1,
            items: [
              {
                knowledgeId: 'kb-1',
                documentId: 'doc-1',
                chunkId: 'chunk-1',
                chunkIndex: 2,
                type: 'global_docs',
                source: 'architecture.md',
                content:
                  '项目知识已经区分全局绑定知识与项目私有知识，并通过项目级 merged retrieval 统一编排。',
                distance: 0.09,
              },
            ],
          };
        },
      },
    });

    const result = await runtime.generateAssistantReply({
      actor: {
        id: 'user-1',
        username: 'langya',
      },
      project,
      conversation,
      userMessage: conversation.messages[1]!,
    });

    assert.deepEqual(capturedSearchCalls, [
      {
        projectId,
        query: '请总结当前项目知识基线',
        topK: 5,
      },
    ]);
    assert.notEqual(capturedLlmRequest, null);
    if (!capturedLlmRequest) {
      throw new Error('capturedLlmRequest should not be null');
    }

    const persistedLlmRequest: CapturedLlmRequest = capturedLlmRequest;
    const persistedMessages = persistedLlmRequest.body.messages ?? [];
    const latestPromptMessage = persistedMessages[persistedMessages.length - 1];
    assert.match(persistedLlmRequest.url, /https:\/\/api\.openai\.com\/v1\/chat\/completions/);
    assert.equal(persistedLlmRequest.body.model, 'gpt-5.4');
    assert.match(
      latestPromptMessage?.content ?? '',
      /architecture\.md/,
    );
    assert.equal(
      result.content,
      '当前项目已经接入正式项目知识检索，并区分全局绑定知识与项目私有知识。',
    );
    assert.deepEqual(result.sources, [
      {
        knowledgeId: 'kb-1',
        documentId: 'doc-1',
        chunkId: 'chunk-1',
        chunkIndex: 2,
        source: 'architecture.md',
        snippet:
          '项目知识已经区分全局绑定知识与项目私有知识，并通过项目级 merged retrieval 统一编排。',
        distance: 0.09,
      },
    ]);
  } finally {
    global.fetch = originalFetch;
  }
});

test('createProjectConversation rejects non-object request bodies', async () => {
  const project: ProjectDocument & {
    _id: NonNullable<ProjectDocument['_id']>;
  } = {
    _id: new ObjectId('507f1f77bcf86cd799439019'),
    name: '非法对话创建输入',
    description: '验证 body shape 校验',
    ownerId: 'user-1',
    members: [
      {
        userId: 'user-1',
        role: 'admin',
        joinedAt: new Date('2026-03-17T00:00:00.000Z'),
      },
    ],
    knowledgeBaseIds: [],
    agentIds: [],
    skillIds: [],
    conversations: [],
    createdAt: new Date('2026-03-17T00:00:00.000Z'),
    updatedAt: new Date('2026-03-17T00:00:00.000Z'),
  };

  const repository = {
    findById: async (projectId: string) =>
      projectId === project._id.toHexString() ? project : null,
  } as unknown as ProjectsRepository;

  const service = createProjectsService({
    repository,
    authRepository: createAuthRepositoryStub(),
    skillBindingValidator: createSkillBindingValidatorStub(),
  });

  await assert.rejects(
    () =>
      service.createProjectConversation(
        {
          actor: {
            id: 'user-1',
            username: 'langya',
          },
        },
        project._id.toHexString(),
        null as unknown as never,
      ),
    /请求体必须为对象/,
  );
});

test('createProjectConversationMessage rejects empty content', async () => {
  const project: ProjectDocument & {
    _id: NonNullable<ProjectDocument['_id']>;
  } = {
    _id: new ObjectId('507f1f77bcf86cd799439018'),
    name: '非法消息输入',
    description: '验证消息校验',
    ownerId: 'user-1',
    members: [
      {
        userId: 'user-1',
        role: 'admin',
        joinedAt: new Date('2026-03-17T00:00:00.000Z'),
      },
    ],
    knowledgeBaseIds: [],
    agentIds: [],
    skillIds: [],
    conversations: [],
    createdAt: new Date('2026-03-17T00:00:00.000Z'),
    updatedAt: new Date('2026-03-17T00:00:00.000Z'),
  };

  const repository = {
    findById: async (projectId: string) =>
      projectId === project._id.toHexString() ? project : null,
  } as unknown as ProjectsRepository;

  const service = createProjectsService({
    repository,
    authRepository: createAuthRepositoryStub(),
    skillBindingValidator: createSkillBindingValidatorStub(),
  });

  await assert.rejects(
    () =>
      service.createProjectConversationMessage(
        {
          actor: {
            id: 'user-1',
            username: 'langya',
          },
        },
        project._id.toHexString(),
        'chat-default',
        {
          content: '   ',
        },
      ),
    /请输入消息内容/,
  );
});

test('createProjectConversationMessage rejects non-object request bodies', async () => {
  const project: ProjectDocument & {
    _id: NonNullable<ProjectDocument['_id']>;
  } = {
    _id: new ObjectId('507f1f77bcf86cd799439020'),
    name: '非法消息 body',
    description: '验证消息 body shape 校验',
    ownerId: 'user-1',
    members: [
      {
        userId: 'user-1',
        role: 'admin',
        joinedAt: new Date('2026-03-17T00:00:00.000Z'),
      },
    ],
    knowledgeBaseIds: [],
    agentIds: [],
    skillIds: [],
    conversations: [],
    createdAt: new Date('2026-03-17T00:00:00.000Z'),
    updatedAt: new Date('2026-03-17T00:00:00.000Z'),
  };

  const repository = {
    findById: async (projectId: string) =>
      projectId === project._id.toHexString() ? project : null,
  } as unknown as ProjectsRepository;

  const service = createProjectsService({
    repository,
    authRepository: createAuthRepositoryStub(),
    skillBindingValidator: createSkillBindingValidatorStub(),
  });

  await assert.rejects(
    () =>
      service.createProjectConversationMessage(
        {
          actor: {
            id: 'user-1',
            username: 'langya',
          },
        },
        project._id.toHexString(),
        'chat-default',
        [] as unknown as never,
      ),
    /请求体必须为对象/,
  );
});

test('updateProject accepts resource-binding-only patches', async () => {
  const project: ProjectDocument & {
    _id: NonNullable<ProjectDocument['_id']>;
  } = {
    _id: new ObjectId('507f1f77bcf86cd799439013'),
    name: '绑定迁移',
    description: '验证只更新绑定',
    ownerId: 'user-1',
    members: [
      {
        userId: 'user-1',
        role: 'admin',
        joinedAt: new Date('2026-03-13T00:00:00.000Z'),
      },
    ],
    knowledgeBaseIds: [],
    agentIds: [],
    skillIds: [],
    conversations: [],
    createdAt: new Date('2026-03-13T00:00:00.000Z'),
    updatedAt: new Date('2026-03-13T00:00:00.000Z'),
  };

  const repository = {
    findById: async (projectId: string) =>
      projectId === project._id.toHexString() ? project : null,
    updateProject: async (_projectId: string, patch: Partial<ProjectDocument>) => ({
      ...project,
      ...patch,
      _id: project._id,
    }),
  } as unknown as ProjectsRepository;

  const service = createProjectsService({
    repository,
    authRepository: createAuthRepositoryStub(),
    skillBindingValidator: createSkillBindingValidatorStub(),
  });

  const result = await service.updateProject(
    {
      actor: {
        id: 'user-1',
        username: 'langya',
      },
    },
    project._id.toHexString(),
    {
      knowledgeBaseIds: ['kb-real-1'],
      agentIds: ['agent-keep'],
      skillIds: ['skill-keep'],
    },
  );

  assert.equal(result.name, '绑定迁移');
  assert.deepEqual(result.knowledgeBaseIds, ['kb-real-1']);
  assert.deepEqual(result.agentIds, ['agent-keep']);
  assert.deepEqual(result.skillIds, ['skill-keep']);
});

test('createProject rejects unbindable managed skill ids', async () => {
  const service = createProjectsService({
    repository: {} as ProjectsRepository,
    authRepository: createAuthRepositoryStub(),
    skillBindingValidator: createSkillBindingValidatorStub(async (skillIds) => {
      if (skillIds.includes('draft-skill')) {
        throw new Error('draft skill');
      }
    }),
  });

  await assert.rejects(
    () =>
      service.createProject(
        {
          actor: {
            id: 'user-1',
            username: 'langya',
          },
        },
        {
          name: '非法 Skill 绑定',
          skillIds: ['draft-skill'],
        },
      ),
    /draft skill/,
  );
});

test('deleteProject cleans up project scoped knowledge before removing the project', async () => {
  const project: ProjectDocument & {
    _id: NonNullable<ProjectDocument['_id']>;
  } = {
    _id: new ObjectId('507f1f77bcf86cd799439014'),
    name: '项目知识清理',
    description: '验证删除项目前先清理私有知识',
    ownerId: 'user-1',
    members: [
      {
        userId: 'user-1',
        role: 'admin',
        joinedAt: new Date('2026-03-15T00:00:00.000Z'),
      },
    ],
    knowledgeBaseIds: [],
    agentIds: [],
    skillIds: [],
    conversations: [],
    createdAt: new Date('2026-03-15T00:00:00.000Z'),
    updatedAt: new Date('2026-03-15T00:00:00.000Z'),
  };
  const cleanupCalls: Array<{ projectId: string; actorId: string }> = [];
  let deletedProjectId = '';

  const repository = {
    findById: async (projectId: string) =>
      projectId === project._id.toHexString() ? project : null,
    deleteProject: async (projectId: string) => {
      deletedProjectId = projectId;
      return true;
    },
  } as unknown as ProjectsRepository;

  const service = createProjectsService({
    repository,
    authRepository: createAuthRepositoryStub(),
    skillBindingValidator: createSkillBindingValidatorStub(),
    knowledgeUsage: {
      deleteProjectKnowledge: async (projectId, actor) => {
        cleanupCalls.push({
          projectId,
          actorId: actor.id,
        });
      },
    },
  });

  await service.deleteProject(
    {
      actor: {
        id: 'user-1',
        username: 'langya',
      },
    },
    project._id.toHexString(),
  );

  assert.deepEqual(cleanupCalls, [
    {
      projectId: project._id.toHexString(),
      actorId: 'user-1',
    },
  ]);
  assert.equal(deletedProjectId, project._id.toHexString());
});
