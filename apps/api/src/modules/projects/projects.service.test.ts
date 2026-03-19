import assert from 'node:assert/strict';
import test from 'node:test';
import type { AppEnv } from '@config/env.js';
import { encryptApiKey } from '@lib/crypto.js';
import { ObjectId } from 'mongodb';
import type { AuthRepository } from '@modules/auth/auth.repository.js';
import type { SettingsRepository } from '@modules/settings/settings.repository.js';
import type { SkillBindingValidator } from '@modules/skills/skills.binding.js';
import { createProjectConversationRuntime } from './project-conversation-runtime.js';
import { createProjectsService } from './projects.service.js';
import type { ProjectsRepository } from './projects.repository.js';
import type {
  ProjectConversationDocument,
  ProjectConversationSourceDocument,
  ProjectDocument,
} from './projects.types.js';

const TEST_ENCRYPTION_KEY =
  '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
const SUPPORTED_LLM_PROVIDER_CASES = [
  {
    provider: 'openai' as const,
    baseUrl: 'https://api.openai.com/v1',
    model: 'gpt-5.4',
  },
  {
    provider: 'gemini' as const,
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai/',
    model: 'gemini-2.5-flash',
  },
  {
    provider: 'aliyun' as const,
    baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    model: 'qwen-max',
  },
  {
    provider: 'deepseek' as const,
    baseUrl: 'https://api.deepseek.com',
    model: 'deepseek-chat',
  },
  {
    provider: 'moonshot' as const,
    baseUrl: 'https://api.moonshot.cn/v1',
    model: 'kimi-k2-turbo-preview',
  },
  {
    provider: 'zhipu' as const,
    baseUrl: 'https://open.bigmodel.cn/api/paas/v4/',
    model: 'glm-5',
  },
  {
    provider: 'custom' as const,
    baseUrl: 'https://llm.example.com/v1',
    model: 'custom-chat-model',
  },
] as const;

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

const createSettingsRepositoryStub = (options?: {
  llm?: {
    provider: (typeof SUPPORTED_LLM_PROVIDER_CASES)[number]['provider'];
    baseUrl: string;
    model: string;
    apiKey: string;
  };
}): SettingsRepository => {
  return {
    getSettings: async () => {
      if (!options?.llm) {
        return null;
      }

      return {
        singleton: 'default' as const,
        llm: {
          provider: options.llm.provider,
          baseUrl: options.llm.baseUrl,
          model: options.llm.model,
          apiKeyEncrypted: encryptApiKey(options.llm.apiKey),
          apiKeyHint: '...key',
          testedAt: null,
          testStatus: null,
        },
        updatedAt: new Date('2026-03-17T00:00:00.000Z'),
        updatedBy: 'user-1',
      };
    },
  } as unknown as SettingsRepository;
};

const withEncryptionKey = async (callback: () => Promise<void>) => {
  const originalEncryptionKey = process.env.SETTINGS_ENCRYPTION_KEY;
  process.env.SETTINGS_ENCRYPTION_KEY = TEST_ENCRYPTION_KEY;

  try {
    await callback();
  } finally {
    if (originalEncryptionKey === undefined) {
      delete process.env.SETTINGS_ENCRYPTION_KEY;
    } else {
      process.env.SETTINGS_ENCRYPTION_KEY = originalEncryptionKey;
    }
  }
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
  assert.equal(persistedConversation.title, '已有会话');
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
  assert.equal(result.conversation.title, '已有会话');
});

test('createProjectConversationMessage auto-generates a concise title from the first user message', async () => {
  const project: ProjectDocument & {
    _id: NonNullable<ProjectDocument['_id']>;
  } = {
    _id: new ObjectId('507f1f77bcf86cd799439019'),
    name: '对话标题生成',
    description: '验证首条消息自动命名',
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
        id: 'chat-title',
        title: '新对话',
        messages: [],
        createdAt: new Date('2026-03-17T10:00:00.000Z'),
        updatedAt: new Date('2026-03-17T10:00:00.000Z'),
      },
    ],
    createdAt: new Date('2026-03-17T00:00:00.000Z'),
    updatedAt: new Date('2026-03-17T10:00:00.000Z'),
  };

  let persistedConversation = project.conversations[0]!;
  let appendCalls = 0;
  let titleUpdateCalls = 0;

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
      assert.equal(conversationId, 'chat-title');
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
    updateProjectConversationTitle: async (
      _projectId: string,
      conversationId: string,
      title: string,
      updatedAt: Date,
    ) => {
      titleUpdateCalls += 1;
      assert.equal(conversationId, 'chat-title');
      persistedConversation = {
        ...persistedConversation,
        title,
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
    'chat-title',
    {
      content: '请帮我梳理项目对话命名策略，要求像 ChatGPT 一样简洁',
    },
  );

  assert.equal(appendCalls, 2);
  assert.equal(titleUpdateCalls, 1);
  assert.equal(persistedConversation.title, '梳理项目对话命名策略');
  assert.equal(result.conversation.title, '梳理项目对话命名策略');
});

test('createProjectConversationMessage keeps a concurrent manual rename when auto-title guard misses', async () => {
  const project: ProjectDocument & {
    _id: NonNullable<ProjectDocument['_id']>;
  } = {
    _id: new ObjectId('507f1f77bcf86cd79943901a'),
    name: '并发改名保护',
    description: '验证自动标题不会覆盖并发手动改名',
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
        id: 'chat-title-race',
        title: '新对话',
        messages: [],
        createdAt: new Date('2026-03-17T10:00:00.000Z'),
        updatedAt: new Date('2026-03-17T10:00:00.000Z'),
      },
    ],
    createdAt: new Date('2026-03-17T00:00:00.000Z'),
    updatedAt: new Date('2026-03-17T10:00:00.000Z'),
  };

  let persistedConversation = project.conversations[0]!;
  let titleUpdateCalls = 0;

  const repository = {
    findById: async (projectId: string) =>
      projectId === project._id.toHexString()
        ? {
            ...project,
            conversations: [persistedConversation],
            updatedAt: persistedConversation.updatedAt,
            _id: project._id,
          }
        : null,
    appendProjectConversationMessage: async (
      _projectId: string,
      conversationId: string,
      message: ProjectDocument['conversations'][number]['messages'][number],
      updatedAt: Date,
    ) => {
      assert.equal(conversationId, 'chat-title-race');
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
    updateProjectConversationTitle: async (
      _projectId: string,
      conversationId: string,
      _title: string,
      updatedAt: Date,
      options?: {
        expectedCurrentTitle?: string;
      },
    ) => {
      titleUpdateCalls += 1;
      assert.equal(conversationId, 'chat-title-race');
      assert.equal(options?.expectedCurrentTitle, '新对话');
      persistedConversation = {
        ...persistedConversation,
        title: '人工改名后的标题',
        updatedAt,
      };

      return null;
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
    'chat-title-race',
    {
      content: '请帮我总结并发场景下的项目对话命名策略',
    },
  );

  assert.equal(titleUpdateCalls, 1);
  assert.equal(persistedConversation.title, '人工改名后的标题');
  assert.equal(result.conversation.title, '人工改名后的标题');
});

test('createProjectConversationMessage reuses the persisted user message when retrying after assistant generation fails', async () => {
  const project: ProjectDocument & {
    _id: NonNullable<ProjectDocument['_id']>;
  } = {
    _id: new ObjectId('507f1f77bcf86cd79943901b'),
    name: '对话失败重试',
    description: '验证 assistant 生成失败后的幂等重试',
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
        id: 'chat-retry-runtime',
        title: '已有会话',
        messages: [],
        createdAt: new Date('2026-03-17T10:00:00.000Z'),
        updatedAt: new Date('2026-03-17T10:00:00.000Z'),
      },
    ],
    createdAt: new Date('2026-03-17T00:00:00.000Z'),
    updatedAt: new Date('2026-03-17T10:00:00.000Z'),
  };

  let persistedConversation = project.conversations[0]!;
  let appendCalls = 0;
  let runtimeCalls = 0;

  const repository = {
    findById: async (projectId: string) =>
      projectId === project._id.toHexString()
        ? {
            ...project,
            conversations: [persistedConversation],
            updatedAt: persistedConversation.updatedAt,
            _id: project._id,
          }
        : null,
    appendProjectConversationMessage: async (
      _projectId: string,
      conversationId: string,
      message: ProjectDocument['conversations'][number]['messages'][number],
      updatedAt: Date,
    ) => {
      appendCalls += 1;
      assert.equal(conversationId, 'chat-retry-runtime');
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
    conversationRuntime: createConversationRuntimeStub(async () => {
      runtimeCalls += 1;

      if (runtimeCalls === 1) {
        throw new Error('llm timeout');
      }

      return {
        content: '第二次重试后已补齐 assistant 回复。',
        sources: [],
      };
    }),
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
        'chat-retry-runtime',
        {
          content: '先验证幂等重试',
          clientRequestId: 'client-request-1',
        },
      ),
    (error) => error instanceof Error && /llm timeout/.test(error.message),
  );

  assert.equal(persistedConversation.messages.length, 1);
  assert.equal(persistedConversation.messages[0]?.role, 'user');
  assert.equal(
    persistedConversation.messages[0]?.clientRequestId,
    'client-request-1',
  );

  const retryResult = await service.createProjectConversationMessage(
    {
      actor: {
        id: 'user-1',
        username: 'langya',
      },
    },
    project._id.toHexString(),
    'chat-retry-runtime',
    {
      content: '先验证幂等重试',
      clientRequestId: 'client-request-1',
    },
  );

  assert.equal(runtimeCalls, 2);
  assert.equal(appendCalls, 2);
  assert.equal(persistedConversation.messages.length, 2);
  assert.equal(
    persistedConversation.messages.filter((message) => message.role === 'user')
      .length,
    1,
  );
  assert.equal(
    retryResult.conversation.messages[1]?.content,
    '第二次重试后已补齐 assistant 回复。',
  );
});

test('createProjectConversationMessage reuses the persisted user message when assistant persistence fails', async () => {
  const project: ProjectDocument & {
    _id: NonNullable<ProjectDocument['_id']>;
  } = {
    _id: new ObjectId('507f1f77bcf86cd79943901c'),
    name: '对话持久化重试',
    description: '验证 assistant 落库失败后的幂等重试',
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
        id: 'chat-retry-persist',
        title: '已有会话',
        messages: [],
        createdAt: new Date('2026-03-17T10:00:00.000Z'),
        updatedAt: new Date('2026-03-17T10:00:00.000Z'),
      },
    ],
    createdAt: new Date('2026-03-17T00:00:00.000Z'),
    updatedAt: new Date('2026-03-17T10:00:00.000Z'),
  };

  let persistedConversation = project.conversations[0]!;
  let appendCalls = 0;
  let assistantPersistAttempts = 0;

  const repository = {
    findById: async (projectId: string) =>
      projectId === project._id.toHexString()
        ? {
            ...project,
            conversations: [persistedConversation],
            updatedAt: persistedConversation.updatedAt,
            _id: project._id,
          }
        : null,
    appendProjectConversationMessage: async (
      _projectId: string,
      conversationId: string,
      message: ProjectDocument['conversations'][number]['messages'][number],
      updatedAt: Date,
    ) => {
      appendCalls += 1;
      assert.equal(conversationId, 'chat-retry-persist');

      if (message.role === 'assistant') {
        assistantPersistAttempts += 1;
        if (assistantPersistAttempts === 1) {
          throw new Error('mongo write failed');
        }
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
    conversationRuntime: createConversationRuntimeStub(async () => ({
      content: 'assistant 已在重试后写回成功。',
      sources: [],
    })),
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
        'chat-retry-persist',
        {
          content: '先验证 assistant 落库失败',
          clientRequestId: 'client-request-2',
        },
      ),
    (error) => error instanceof Error && /mongo write failed/.test(error.message),
  );

  assert.equal(persistedConversation.messages.length, 1);
  assert.equal(
    persistedConversation.messages[0]?.clientRequestId,
    'client-request-2',
  );

  const retryResult = await service.createProjectConversationMessage(
    {
      actor: {
        id: 'user-1',
        username: 'langya',
      },
    },
    project._id.toHexString(),
    'chat-retry-persist',
    {
      content: '先验证 assistant 落库失败',
      clientRequestId: 'client-request-2',
    },
  );

  assert.equal(appendCalls, 3);
  assert.equal(assistantPersistAttempts, 2);
  assert.equal(
    persistedConversation.messages.filter((message) => message.role === 'user')
      .length,
    1,
  );
  assert.equal(retryResult.conversation.messages.length, 2);
  assert.equal(
    retryResult.conversation.messages[1]?.content,
    'assistant 已在重试后写回成功。',
  );
});

test('updateProjectConversation updates the current thread title', async () => {
  const project: ProjectDocument & {
    _id: NonNullable<ProjectDocument['_id']>;
  } = {
    _id: new ObjectId('507f1f77bcf86cd799439020'),
    name: '对话标题编辑',
    description: '验证会话标题更新',
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
        id: 'chat-editable',
        title: '旧标题',
        messages: [],
        createdAt: new Date('2026-03-17T10:00:00.000Z'),
        updatedAt: new Date('2026-03-17T10:00:00.000Z'),
      },
    ],
    createdAt: new Date('2026-03-17T00:00:00.000Z'),
    updatedAt: new Date('2026-03-17T10:00:00.000Z'),
  };

  let persistedConversation = project.conversations[0]!;

  const repository = {
    findById: async (projectId: string) =>
      projectId === project._id.toHexString() ? project : null,
    updateProjectConversationTitle: async (
      _projectId: string,
      conversationId: string,
      title: string,
      updatedAt: Date,
    ) => {
      assert.equal(conversationId, 'chat-editable');
      persistedConversation = {
        ...persistedConversation,
        title,
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
  });

  const result = await service.updateProjectConversation(
    {
      actor: {
        id: 'user-1',
        username: 'langya',
      },
    },
    project._id.toHexString(),
    'chat-editable',
    {
      title: '新的项目线程标题',
    },
  );

  assert.equal(persistedConversation.title, '新的项目线程标题');
  assert.equal(result.conversation.title, '新的项目线程标题');
});

test('deleteProjectConversation removes a thread when other threads still exist', async () => {
  const project: ProjectDocument & {
    _id: NonNullable<ProjectDocument['_id']>;
  } = {
    _id: new ObjectId('507f1f77bcf86cd799439021'),
    name: '对话线程删除',
    description: '验证会话删除',
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
        id: 'chat-default',
        title: '默认线程',
        messages: [],
        createdAt: new Date('2026-03-17T09:00:00.000Z'),
        updatedAt: new Date('2026-03-17T09:00:00.000Z'),
      },
      {
        id: 'chat-removable',
        title: '待删除线程',
        messages: [],
        createdAt: new Date('2026-03-17T10:00:00.000Z'),
        updatedAt: new Date('2026-03-17T10:00:00.000Z'),
      },
    ],
    createdAt: new Date('2026-03-17T00:00:00.000Z'),
    updatedAt: new Date('2026-03-17T10:00:00.000Z'),
  };

  const repository = {
    findById: async (projectId: string) =>
      projectId === project._id.toHexString() ? project : null,
    deleteProjectConversation: async (
      _projectId: string,
      conversationId: string,
      updatedAt: Date,
    ) => {
      assert.equal(conversationId, 'chat-removable');

      return {
        ...project,
        conversations: project.conversations.filter(
          (conversation) => conversation.id !== conversationId,
        ),
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

  await service.deleteProjectConversation(
    {
      actor: {
        id: 'user-1',
        username: 'langya',
      },
    },
    project._id.toHexString(),
    'chat-removable',
  );
});

test('deleteProjectConversation rejects when the delete guard would drop the last persisted thread', async () => {
  const project: ProjectDocument & {
    _id: NonNullable<ProjectDocument['_id']>;
  } = {
    _id: new ObjectId('507f1f77bcf86cd799439023'),
    name: '删除竞争保护',
    description: '验证并发删除不会删空最后一个线程',
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
        id: 'chat-default',
        title: '默认线程',
        messages: [],
        createdAt: new Date('2026-03-17T09:00:00.000Z'),
        updatedAt: new Date('2026-03-17T09:00:00.000Z'),
      },
      {
        id: 'chat-removable',
        title: '待删除线程',
        messages: [],
        createdAt: new Date('2026-03-17T10:00:00.000Z'),
        updatedAt: new Date('2026-03-17T10:00:00.000Z'),
      },
    ],
    createdAt: new Date('2026-03-17T00:00:00.000Z'),
    updatedAt: new Date('2026-03-17T10:00:00.000Z'),
  };

  let currentProject = project;

  const repository = {
    findById: async (projectId: string) =>
      projectId === project._id.toHexString() ? currentProject : null,
    deleteProjectConversation: async (
      _projectId: string,
      conversationId: string,
      updatedAt: Date,
    ) => {
      assert.equal(conversationId, 'chat-removable');
      currentProject = {
        ...project,
        conversations: [project.conversations[1]!],
        updatedAt,
        _id: project._id,
      };

      return null;
    },
  } as unknown as ProjectsRepository;

  const service = createProjectsService({
    repository,
    authRepository: createAuthRepositoryStub(),
    skillBindingValidator: createSkillBindingValidatorStub(),
  });

  await assert.rejects(
    () =>
      service.deleteProjectConversation(
        {
          actor: {
            id: 'user-1',
            username: 'langya',
          },
        },
        project._id.toHexString(),
        'chat-removable',
      ),
    (error) => {
      assert.equal(
        (error as { code?: string }).code,
        'PROJECT_CONVERSATION_LAST_THREAD_FORBIDDEN',
      );
      return true;
    },
  );
});

test('deleteProjectConversation rejects removing the last visible thread', async () => {
  const project: ProjectDocument & {
    _id: NonNullable<ProjectDocument['_id']>;
  } = {
    _id: new ObjectId('507f1f77bcf86cd799439022'),
    name: '保底线程',
    description: '验证最后一个线程不可删除',
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
        id: 'chat-default',
        title: '唯一线程',
        messages: [],
        createdAt: new Date('2026-03-17T09:00:00.000Z'),
        updatedAt: new Date('2026-03-17T09:00:00.000Z'),
      },
    ],
    createdAt: new Date('2026-03-17T00:00:00.000Z'),
    updatedAt: new Date('2026-03-17T09:00:00.000Z'),
  };

  const repository = {
    findById: async (projectId: string) =>
      projectId === project._id.toHexString() ? project : null,
    deleteProjectConversation: async () => {
      throw new Error('deleteProjectConversation should not be called');
    },
  } as unknown as ProjectsRepository;

  const service = createProjectsService({
    repository,
    authRepository: createAuthRepositoryStub(),
    skillBindingValidator: createSkillBindingValidatorStub(),
  });

  await assert.rejects(
    () =>
      service.deleteProjectConversation(
        {
          actor: {
            id: 'user-1',
            username: 'langya',
          },
        },
        project._id.toHexString(),
        'chat-default',
      ),
    (error) => {
      assert.equal((error as { code?: string }).code, 'PROJECT_CONVERSATION_LAST_THREAD_FORBIDDEN');
      return true;
    },
  );
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
  let titleUpdateCalls = 0;

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
    updateProjectConversationTitle: async (
      _projectId: string,
      conversationId: string,
      title: string,
      updatedAt: Date,
    ) => {
      titleUpdateCalls += 1;
      assert.equal(conversationId, 'chat-default');

      if (!persistedConversation) {
        return null;
      }

      persistedConversation = {
        ...persistedConversation,
        title,
        updatedAt,
      };

      return {
        ...project,
        conversations: [persistedConversation],
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
  assert.equal(appendCalls, 2);
  assert.equal(titleUpdateCalls, 1);
  assert.notEqual(persistedConversation, null);
  if (!persistedConversation) {
    throw new Error('persistedConversation should not be null');
  }

  const persistedDefaultConversation =
    persistedConversation as ProjectDocument['conversations'][number];
  assert.equal(persistedDefaultConversation.id, 'chat-default');
  assert.equal(persistedDefaultConversation.title, '给默认会话写第一条消息');
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
  assert.equal(result.conversation.title, '给默认会话写第一条消息');
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

test('createProjectConversationRuntime accepts all configured supported providers', async () => {
  await withEncryptionKey(async () => {
    const projectId = '507f1f77bcf86cd799439100';
    const project: ProjectDocument & {
      _id: NonNullable<ProjectDocument['_id']>;
    } = {
      _id: new ObjectId(projectId),
      name: '多 Provider 对话',
      description: '验证项目对话 runtime 支持全部兼容 provider',
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
      id: 'chat-provider-check',
      title: 'Provider 检查',
      messages: [
        {
          id: 'msg-provider-user',
          role: 'user' as const,
          content: '请总结当前多 provider 对话链路',
          createdAt: new Date('2026-03-17T09:00:00.000Z'),
        },
      ],
      createdAt: new Date('2026-03-17T09:00:00.000Z'),
      updatedAt: new Date('2026-03-17T09:00:00.000Z'),
    };
    const originalFetch = global.fetch;
    let activeProviderCase:
      | (typeof SUPPORTED_LLM_PROVIDER_CASES)[number]
      | null = null;

    global.fetch = async (input, init) => {
      if (!activeProviderCase) {
        throw new Error('activeProviderCase should not be null');
      }

      const url = typeof input === 'string' ? input : input.toString();
      const body = JSON.parse(String(init?.body ?? '{}')) as {
        model?: string;
        messages?: Array<{ content?: string }>;
      };

      assert.equal(
        url,
        new URL(
          'chat/completions',
          activeProviderCase.baseUrl.endsWith('/')
            ? activeProviderCase.baseUrl
            : `${activeProviderCase.baseUrl}/`,
        ).toString(),
      );
      assert.equal(body.model, activeProviderCase.model);
      assert.match(body.messages?.[body.messages.length - 1]?.content ?? '', /项目知识片段/);

      return new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                content: `provider:${activeProviderCase.provider}`,
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
      for (const providerCase of SUPPORTED_LLM_PROVIDER_CASES) {
        activeProviderCase = providerCase;

        const runtime = createProjectConversationRuntime({
          env: createTestEnv(),
          settingsRepository: createSettingsRepositoryStub({
            llm: {
              provider: providerCase.provider,
              baseUrl: providerCase.baseUrl,
              model: providerCase.model,
              apiKey: `${providerCase.provider}-api-key`,
            },
          }),
          knowledgeSearch: {
            searchProjectDocuments: async () => ({
              query: '请总结当前多 provider 对话链路',
              sourceType: 'global_docs',
              total: 1,
              items: [
                {
                  knowledgeId: 'kb-1',
                  documentId: 'doc-1',
                  chunkId: 'chunk-1',
                  chunkIndex: 0,
                  type: 'global_docs',
                  source: 'chat-runtime.md',
                  content:
                    '项目对话当前统一复用 chat/completions 兼容协议，并由 settings 中的 provider/baseUrl/model 驱动。',
                  distance: 0.03,
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
          project,
          conversation,
          userMessage: conversation.messages[0]!,
        });

        assert.equal(result.content, `provider:${providerCase.provider}`);
        assert.equal(result.sources[0]?.source, 'chat-runtime.md');
      }
    } finally {
      global.fetch = originalFetch;
    }
  });
});

test('createProjectConversationRuntime rejects anthropic until a provider-specific adapter exists', async () => {
  await withEncryptionKey(async () => {
    const runtime = createProjectConversationRuntime({
      env: createTestEnv(),
      settingsRepository: createSettingsRepositoryStub({
        llm: {
          provider: 'anthropic' as unknown as (typeof SUPPORTED_LLM_PROVIDER_CASES)[number]['provider'],
          baseUrl: 'https://api.anthropic.com/v1',
          model: 'claude-sonnet-4-6',
          apiKey: 'anthropic-api-key',
        },
      }),
      knowledgeSearch: {
        searchProjectDocuments: async () => ({
          query: 'provider drift',
          sourceType: 'global_docs',
          total: 0,
          items: [],
        }),
      },
    });

    await assert.rejects(
      () =>
        runtime.generateAssistantReply({
          actor: {
            id: 'user-1',
            username: 'langya',
          },
          project: {
            _id: new ObjectId('507f1f77bcf86cd799439101'),
            name: 'Anthropic Drift',
            description: '',
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
          },
          conversation: {
            id: 'chat-anthropic',
            title: 'Anthropic 检查',
            messages: [],
            createdAt: new Date('2026-03-17T00:00:00.000Z'),
            updatedAt: new Date('2026-03-17T00:00:00.000Z'),
          },
          userMessage: {
            id: 'msg-anthropic',
            role: 'user',
            content: '测试 anthropic provider',
            createdAt: new Date('2026-03-17T00:00:00.000Z'),
          },
        }),
      (error) =>
        error instanceof Error &&
        error.message === '当前 LLM Provider 暂不支持项目对话',
    );
  });
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
