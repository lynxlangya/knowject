import assert from 'node:assert/strict';
import test from 'node:test';
import { ObjectId } from 'mongodb';
import { AppError } from '@lib/app-error.js';
import type { KnowledgeRepository } from '@modules/knowledge/knowledge.repository.js';
import { createSkillBindingValidator } from '@modules/skills/skills.binding.js';
import type { SkillsRepository } from '@modules/skills/skills.repository.js';
import type { SkillDocument } from '@modules/skills/skills.types.js';
import { DEFAULT_AGENT_MODEL } from './agents.types.js';
import type { AgentDocument } from './agents.types.js';
import type { AgentsRepository } from './agents.repository.js';
import { createAgentsService } from './agents.service.js';

const createKnowledgeRepositoryStub = (
  existingKnowledgeIds: string[],
): KnowledgeRepository => {
  return {
    findKnowledgeById: async (knowledgeId: string) =>
      existingKnowledgeIds.includes(knowledgeId)
        ? ({ _id: new ObjectId('507f1f77bcf86cd799439081') } as never)
        : null,
  } as unknown as KnowledgeRepository;
};

const createSkillBindingValidatorStub = (
  managedSkills: Array<SkillDocument & { _id: NonNullable<SkillDocument['_id']> }> = [],
) => {
  return createSkillBindingValidator({
    repository: {
      findSkillsByIds: async (skillIds: string[]) =>
        managedSkills.filter((skill) => skillIds.includes(skill._id.toHexString())),
    } as Pick<SkillsRepository, 'findSkillsByIds'>,
  });
};

const createManagedSkill = ({
  id = new ObjectId(),
  name,
  lifecycleStatus,
}: {
  id?: ObjectId;
  name: string;
  lifecycleStatus: 'draft' | 'published';
}): SkillDocument & { _id: NonNullable<SkillDocument['_id']> } => {
  const markdown = `---
name: ${name}
description: ${name} description
---

# ${name}
`;

  return {
    _id: id,
    name,
    slug: name.toLowerCase().replace(/\s+/g, '-'),
    description: `${name} description`,
    type: 'markdown_bundle',
    source: 'custom',
    origin: 'manual',
    handler: null,
    parametersSchema: null,
    runtimeStatus: 'contract_only',
    lifecycleStatus,
    skillMarkdown: markdown,
    markdownExcerpt: `${name} description`,
    storagePath: id.toHexString(),
    bundleFiles: [
      {
        path: 'SKILL.md',
        size: Buffer.byteLength(markdown),
      },
    ],
    importProvenance: null,
    createdBy: 'user-1',
    publishedAt: lifecycleStatus === 'published' ? new Date('2026-03-14T00:00:00.000Z') : null,
    createdAt: new Date('2026-03-14T00:00:00.000Z'),
    updatedAt: new Date('2026-03-14T00:00:00.000Z'),
  };
};

test('createAgent persists validated bindings with server-fixed model defaults', async () => {
  let createdAgent: Omit<AgentDocument, '_id'> | null = null;

  const repository = {
    createAgent: async (document: Omit<AgentDocument, '_id'>) => {
      createdAgent = document;

      return {
        ...document,
        _id: new ObjectId('507f1f77bcf86cd799439021'),
      };
    },
  } as unknown as AgentsRepository;

  const service = createAgentsService({
    repository,
    knowledgeRepository: createKnowledgeRepositoryStub(['kb-1', 'kb-2']),
    skillBindingValidator: createSkillBindingValidatorStub(),
  });

  const result = await service.createAgent(
    {
      actor: {
        id: 'user-1',
        username: 'langya',
      },
    },
    {
      name: '代码审查助手',
      description: '聚焦代码回归风险与测试缺口。',
      systemPrompt: '你是一个严格但务实的代码审查员。',
      boundSkillIds: ['search_documents', 'search_documents'],
      boundKnowledgeIds: ['kb-1', 'kb-2', 'kb-1'],
    },
  );

  assert.notEqual(createdAgent, null);
  if (!createdAgent) {
    throw new Error('createdAgent should not be null');
  }

  const persistedAgent: Omit<AgentDocument, '_id'> = createdAgent;

  assert.deepEqual(persistedAgent.boundSkillIds, ['search_documents']);
  assert.deepEqual(persistedAgent.boundKnowledgeIds, ['kb-1', 'kb-2']);
  assert.equal(persistedAgent.model, DEFAULT_AGENT_MODEL);
  assert.equal(persistedAgent.status, 'active');
  assert.equal(result.agent.model, DEFAULT_AGENT_MODEL);
  assert.deepEqual(result.agent.boundSkillIds, ['search_documents']);
  assert.deepEqual(result.agent.boundKnowledgeIds, ['kb-1', 'kb-2']);
});

test('createAgent rejects unknown builtin skill ids', async () => {
  const service = createAgentsService({
    repository: {} as AgentsRepository,
    knowledgeRepository: createKnowledgeRepositoryStub(['kb-1']),
    skillBindingValidator: createSkillBindingValidatorStub(),
  });

  await assert.rejects(
    () =>
      service.createAgent(
        {
          actor: {
            id: 'user-1',
            username: 'langya',
          },
        },
        {
          name: '失效绑定测试',
          systemPrompt: '测试非法 skill 绑定。',
          boundSkillIds: ['skill-not-exists'],
          boundKnowledgeIds: ['kb-1'],
        },
      ),
    (error: unknown) => {
      assert.ok(error instanceof AppError);
      assert.equal(error.code, 'VALIDATION_ERROR');
      assert.match(error.message, /Skill 绑定/);
      return true;
    },
  );
});

test('createAgent accepts published managed skill ids and rejects draft skill ids', async () => {
  const publishedSkill = createManagedSkill({
    id: new ObjectId('507f1f77bcf86cd799439061'),
    name: 'Published Skill',
    lifecycleStatus: 'published',
  });
  const draftSkill = createManagedSkill({
    id: new ObjectId('507f1f77bcf86cd799439062'),
    name: 'Draft Skill',
    lifecycleStatus: 'draft',
  });
  const service = createAgentsService({
    repository: {
      createAgent: async (document: Omit<AgentDocument, '_id'>) => ({
        ...document,
        _id: new ObjectId('507f1f77bcf86cd799439063'),
      }),
    } as unknown as AgentsRepository,
    knowledgeRepository: createKnowledgeRepositoryStub(['kb-1']),
    skillBindingValidator: createSkillBindingValidatorStub([publishedSkill, draftSkill]),
  });

  const publishedResult = await service.createAgent(
    {
      actor: {
        id: 'user-1',
        username: 'langya',
      },
    },
    {
      name: '已发布 Skill 绑定',
      systemPrompt: '测试 published managed skill',
      boundSkillIds: [publishedSkill._id.toHexString()],
      boundKnowledgeIds: ['kb-1'],
    },
  );

  assert.deepEqual(publishedResult.agent.boundSkillIds, [publishedSkill._id.toHexString()]);

  await assert.rejects(
    () =>
      service.createAgent(
        {
          actor: {
            id: 'user-1',
            username: 'langya',
          },
        },
        {
          name: '草稿 Skill 绑定',
          systemPrompt: '测试 draft managed skill',
          boundSkillIds: [draftSkill._id.toHexString()],
          boundKnowledgeIds: ['kb-1'],
        },
      ),
    (error: unknown) => {
      assert.ok(error instanceof AppError);
      assert.equal(error.code, 'VALIDATION_ERROR');
      assert.match(error.message, /Skill 绑定校验失败/);
      return true;
    },
  );
});

test('createAgent rejects null body with validation error', async () => {
  const service = createAgentsService({
    repository: {} as AgentsRepository,
    knowledgeRepository: createKnowledgeRepositoryStub([]),
    skillBindingValidator: createSkillBindingValidatorStub(),
  });

  await assert.rejects(
    () =>
      service.createAgent(
        {
          actor: {
            id: 'user-1',
            username: 'langya',
          },
        },
        null as unknown as AgentDocument,
      ),
    (error: unknown) => {
      assert.ok(error instanceof AppError);
      assert.equal(error.code, 'VALIDATION_ERROR');
      assert.equal(error.message, '请求体必须为对象');
      return true;
    },
  );
});

test('updateAgent accepts binding-only patches and status changes', async () => {
  const existingAgent: AgentDocument & {
    _id: NonNullable<AgentDocument['_id']>;
  } = {
    _id: new ObjectId('507f1f77bcf86cd799439022'),
    name: '需求分析助手',
    description: '帮助沉淀需求与验收标准。',
    systemPrompt: '你是一个关注边界和验收标准的需求分析助手。',
    boundSkillIds: ['search_documents'],
    boundKnowledgeIds: ['kb-keep'],
    model: DEFAULT_AGENT_MODEL,
    status: 'active',
    createdBy: 'user-1',
    createdAt: new Date('2026-03-14T00:00:00.000Z'),
    updatedAt: new Date('2026-03-14T00:00:00.000Z'),
  };

  const repository = {
    findAgentById: async (agentId: string) =>
      agentId === existingAgent._id.toHexString() ? existingAgent : null,
    updateAgent: async (_agentId: string, patch: Partial<AgentDocument>) => ({
      ...existingAgent,
      ...patch,
      _id: existingAgent._id,
      model: existingAgent.model,
    }),
  } as unknown as AgentsRepository;

  const service = createAgentsService({
    repository,
    knowledgeRepository: createKnowledgeRepositoryStub(['kb-real-1']),
    skillBindingValidator: createSkillBindingValidatorStub(),
  });

  const result = await service.updateAgent(
    {
      actor: {
        id: 'user-1',
        username: 'langya',
      },
    },
    existingAgent._id.toHexString(),
    {
      boundSkillIds: ['search_codebase'],
      boundKnowledgeIds: ['kb-real-1'],
      status: 'disabled',
    },
  );

  assert.deepEqual(result.agent.boundSkillIds, ['search_codebase']);
  assert.deepEqual(result.agent.boundKnowledgeIds, ['kb-real-1']);
  assert.equal(result.agent.status, 'disabled');
  assert.equal(result.agent.model, DEFAULT_AGENT_MODEL);
});

test('updateAgent allows non-binding edits when existing knowledge bindings are stale', async () => {
  let knowledgeLookupCount = 0;

  const existingAgent: AgentDocument & {
    _id: NonNullable<AgentDocument['_id']>;
  } = {
    _id: new ObjectId('507f1f77bcf86cd799439024'),
    name: '存量绑定智能体',
    description: '历史上绑定过一个已经被删除的知识库。',
    systemPrompt: '你负责补全知识绑定后的审查动作。',
    boundSkillIds: ['search_documents'],
    boundKnowledgeIds: ['kb-deleted'],
    model: DEFAULT_AGENT_MODEL,
    status: 'active',
    createdBy: 'user-1',
    createdAt: new Date('2026-03-14T00:00:00.000Z'),
    updatedAt: new Date('2026-03-14T00:00:00.000Z'),
  };

  const repository = {
    findAgentById: async (agentId: string) =>
      agentId === existingAgent._id.toHexString() ? existingAgent : null,
    updateAgent: async (_agentId: string, patch: Partial<AgentDocument>) => ({
      ...existingAgent,
      ...patch,
      _id: existingAgent._id,
      model: existingAgent.model,
    }),
  } as unknown as AgentsRepository;

  const knowledgeRepository = {
    findKnowledgeById: async () => {
      knowledgeLookupCount += 1;
      return null;
    },
  } as unknown as KnowledgeRepository;

  const service = createAgentsService({
    repository,
    knowledgeRepository,
    skillBindingValidator: createSkillBindingValidatorStub(),
  });

  const result = await service.updateAgent(
    {
      actor: {
        id: 'user-1',
        username: 'langya',
      },
    },
    existingAgent._id.toHexString(),
    {
      description: '只更新描述，不重写历史绑定。',
    },
  );

  assert.equal(result.agent.description, '只更新描述，不重写历史绑定。');
  assert.deepEqual(result.agent.boundKnowledgeIds, ['kb-deleted']);
  assert.equal(knowledgeLookupCount, 0);
});

test('updateAgent rejects null body with validation error', async () => {
  const existingAgent: AgentDocument & {
    _id: NonNullable<AgentDocument['_id']>;
  } = {
    _id: new ObjectId('507f1f77bcf86cd799439025'),
    name: '空请求体测试',
    description: '',
    systemPrompt: 'test',
    boundSkillIds: [],
    boundKnowledgeIds: [],
    model: DEFAULT_AGENT_MODEL,
    status: 'active',
    createdBy: 'user-1',
    createdAt: new Date('2026-03-14T00:00:00.000Z'),
    updatedAt: new Date('2026-03-14T00:00:00.000Z'),
  };

  const service = createAgentsService({
    repository: {
      findAgentById: async () => existingAgent,
    } as unknown as AgentsRepository,
    knowledgeRepository: createKnowledgeRepositoryStub([]),
    skillBindingValidator: createSkillBindingValidatorStub(),
  });

  await assert.rejects(
    () =>
      service.updateAgent(
        {
          actor: {
            id: 'user-1',
            username: 'langya',
          },
        },
        existingAgent._id.toHexString(),
        null as unknown as AgentDocument,
      ),
    (error: unknown) => {
      assert.ok(error instanceof AppError);
      assert.equal(error.code, 'VALIDATION_ERROR');
      assert.equal(error.message, '请求体必须为对象');
      return true;
    },
  );
});

test('deleteAgent removes an existing agent configuration', async () => {
  let deletedAgentId: string | null = null;

  const existingAgent: AgentDocument & {
    _id: NonNullable<AgentDocument['_id']>;
  } = {
    _id: new ObjectId('507f1f77bcf86cd799439023'),
    name: '删除测试',
    description: '',
    systemPrompt: 'test',
    boundSkillIds: [],
    boundKnowledgeIds: [],
    model: DEFAULT_AGENT_MODEL,
    status: 'active',
    createdBy: 'user-1',
    createdAt: new Date('2026-03-14T00:00:00.000Z'),
    updatedAt: new Date('2026-03-14T00:00:00.000Z'),
  };

  const repository = {
    findAgentById: async (agentId: string) =>
      agentId === existingAgent._id.toHexString() ? existingAgent : null,
    deleteAgent: async (agentId: string) => {
      deletedAgentId = agentId;
      return true;
    },
  } as unknown as AgentsRepository;

  const service = createAgentsService({
    repository,
    knowledgeRepository: createKnowledgeRepositoryStub([]),
    skillBindingValidator: createSkillBindingValidatorStub(),
  });

  await service.deleteAgent(
    {
      actor: {
        id: 'user-1',
        username: 'langya',
      },
    },
    existingAgent._id.toHexString(),
  );

  assert.equal(deletedAgentId, existingAgent._id.toHexString());
});
