import assert from 'node:assert/strict';
import { setTimeout as delay } from 'node:timers/promises';
import test from 'node:test';
import type { AppEnv } from '@config/env.js';
import { AppError } from '@lib/app-error.js';
import { encryptApiKey } from '@lib/crypto.js';
import { ObjectId } from 'mongodb';
import type { AuthRepository } from '@modules/auth/auth.repository.js';
import type { SettingsRepository } from '@modules/settings/settings.repository.js';
import type { EffectiveLlmConfig } from '@modules/settings/settings.types.js';
import type { SkillBindingValidator } from '@modules/skills/skills.binding.js';
import { createProjectConversationRuntime } from './project-conversation-runtime.js';
import type { ProjectConversationRuntime } from './project-conversation-runtime.js';
import type { ProjectsService } from './projects.service.js';
import { createProjectsService as createProjectsServiceBase } from './projects.service.js';
import type {
  ProjectConversationsRepository,
  ProjectsRepository,
} from './projects.repository.js';
import type {
  ProjectCommandContext,
  ProjectConversationDocument,
  ProjectConversationCitationContent,
  ProjectConversationStreamEvent,
  ProjectConversationSourceDocument,
  ProjectDocument as ProjectModelDocument,
} from './projects.types.js';

type ProjectDocument = ProjectModelDocument & {
  conversations: ProjectConversationDocument[];
};

type LegacyProjectConversationsRepository = Partial<ProjectConversationsRepository> & {
  appendProjectConversation?: (
    projectId: string,
    conversation: ProjectConversationDocument,
    updatedAt: Date,
  ) => Promise<{ conversations?: ProjectConversationDocument[] } | null>;
  materializeDefaultProjectConversation?: (
    projectId: string,
    conversation: ProjectConversationDocument,
    updatedAt: Date,
  ) => Promise<{ conversations?: ProjectConversationDocument[] } | null>;
  appendProjectConversationMessage?: (
    projectId: string,
    conversationId: string,
    message: ProjectConversationDocument['messages'][number],
    updatedAt: Date,
  ) => Promise<{ conversations?: ProjectConversationDocument[] } | null>;
  updateProjectConversationTitle?: (
    projectId: string,
    conversationId: string,
    title: string,
    updatedAt: Date,
    options?: { expectedCurrentTitle?: string; titleOrigin?: 'default' | 'auto' | 'manual' },
  ) => Promise<{ conversations?: ProjectConversationDocument[] } | null>;
  replaceProjectConversationMessages?: (
    projectId: string,
    conversationId: string,
    messages: ProjectConversationDocument['messages'],
    updatedAt: Date,
    options?: {
      title?: string;
      titleOrigin?: 'default' | 'auto' | 'manual' | null;
      expectedCurrentUpdatedAt?: Date;
    },
  ) => Promise<{ conversations?: ProjectConversationDocument[] } | null>;
  updateProjectConversationMessageMetadata?: (
    projectId: string,
    conversationId: string,
    messageId: string,
    patch: { starred: boolean; starredAt: Date | null; starredBy: string | null },
  ) => Promise<{ conversations?: ProjectConversationDocument[] } | null>;
  updateProjectConversationMessageCitationContent?: (
    projectId: string,
    conversationId: string,
    messageId: string,
    citationContent: ProjectConversationCitationContent,
  ) => Promise<{ conversations?: ProjectConversationDocument[] } | null>;
  deleteProjectConversation?: (
    projectId: string,
    conversationId: string,
    updatedAt: Date,
  ) => Promise<unknown>;
};

const toPersistedConversation = (
  projectId: string,
  conversation: ProjectConversationDocument,
) => {
  return {
    ...conversation,
    projectId,
    _id: new ObjectId(),
  };
};

const readConversationFromCarrier = (
  projectId: string,
  carrier: { conversations?: ProjectConversationDocument[] } | null | undefined,
  conversationId: string,
) => {
  const conversation =
    carrier?.conversations?.find(
      (projectConversation) => projectConversation.id === conversationId,
    ) ?? null;

  return conversation ? toPersistedConversation(projectId, conversation) : null;
};

const createProjectConversationsRepositoryStub = ({
  repository,
}: {
  repository: ProjectsRepository;
}): ProjectConversationsRepository => {
  const legacyRepository =
    repository as unknown as ProjectsRepository & LegacyProjectConversationsRepository;
  const projectConversationsRepository: Pick<
    ProjectConversationsRepository,
    | 'listByProjectId'
    | 'findByProjectAndConversationId'
    | 'createConversation'
    | 'updateTitle'
    | 'appendMessage'
    | 'replaceMessages'
    | 'updateMessageMetadata'
    | 'updateMessageCitationContent'
    | 'deleteConversation'
    | 'ensureIndexes'
  > = {
    listByProjectId: async (projectId: string) => {
      if (legacyRepository.listByProjectId) {
        return legacyRepository.listByProjectId(projectId);
      }

      const project = await legacyRepository.findById?.(projectId);
      return (
        (
          project as (ProjectModelDocument & {
            conversations?: ProjectConversationDocument[];
          }) | null | undefined
        )?.conversations ?? []
      ).map((conversation) =>
        toPersistedConversation(projectId, conversation),
      );
    },
    findByProjectAndConversationId: async (
      projectId: string,
      conversationId: string,
    ) => {
      if (legacyRepository.findByProjectAndConversationId) {
        return legacyRepository.findByProjectAndConversationId(
          projectId,
          conversationId,
        );
      }

      const project = await legacyRepository.findById?.(projectId);
      return readConversationFromCarrier(
        projectId,
        project as (ProjectModelDocument & {
          conversations?: ProjectConversationDocument[];
        }) | null | undefined,
        conversationId,
      );
    },
    createConversation: async (document) => {
      if (legacyRepository.createConversation) {
        return legacyRepository.createConversation(document);
      }

      if (legacyRepository.appendProjectConversation) {
        const result = await legacyRepository.appendProjectConversation(
          document.projectId,
          document,
          document.updatedAt,
        );
        return (
          readConversationFromCarrier(document.projectId, result, document.id) ??
          toPersistedConversation(document.projectId, document)
        );
      }

      if (
        legacyRepository.materializeDefaultProjectConversation &&
        document.id === 'chat-default'
      ) {
        const result =
          await legacyRepository.materializeDefaultProjectConversation(
            document.projectId,
            document,
            document.updatedAt,
          );
        return (
          readConversationFromCarrier(document.projectId, result, document.id) ??
          toPersistedConversation(document.projectId, document)
        );
      }

      return toPersistedConversation(document.projectId, document);
    },
    updateTitle: async (projectId, conversationId, title, options) => {
      if (legacyRepository.updateTitle) {
        return legacyRepository.updateTitle(projectId, conversationId, title, options);
      }

      if (!legacyRepository.updateProjectConversationTitle) {
        return null;
      }

      const result = await legacyRepository.updateProjectConversationTitle(
        projectId,
        conversationId,
        title,
        new Date(),
        options,
      );

      return readConversationFromCarrier(projectId, result, conversationId);
    },
    appendMessage: async (projectId, conversationId, message, updatedAt) => {
      if (legacyRepository.appendMessage) {
        return legacyRepository.appendMessage(
          projectId,
          conversationId,
          message,
          updatedAt,
        );
      }

      if (!legacyRepository.appendProjectConversationMessage) {
        return null;
      }

      const result = await legacyRepository.appendProjectConversationMessage(
        projectId,
        conversationId,
        message,
        updatedAt,
      );

      return readConversationFromCarrier(projectId, result, conversationId);
    },
    replaceMessages: async (projectId, conversationId, messages, options) => {
      if (legacyRepository.replaceMessages) {
        return legacyRepository.replaceMessages(
          projectId,
          conversationId,
          messages,
          options,
        );
      }

      if (!legacyRepository.replaceProjectConversationMessages) {
        return null;
      }

      const result = await legacyRepository.replaceProjectConversationMessages(
        projectId,
        conversationId,
        messages,
        new Date(),
        options,
      );

      return readConversationFromCarrier(projectId, result, conversationId);
    },
    updateMessageMetadata: async (
      projectId,
      conversationId,
      messageId,
      patch,
    ) => {
      if (legacyRepository.updateMessageMetadata) {
        return legacyRepository.updateMessageMetadata(
          projectId,
          conversationId,
          messageId,
          patch,
        );
      }

      if (!legacyRepository.updateProjectConversationMessageMetadata) {
        return null;
      }

      const result =
        await legacyRepository.updateProjectConversationMessageMetadata(
          projectId,
          conversationId,
          messageId,
          patch,
        );

      return readConversationFromCarrier(projectId, result, conversationId);
    },
    updateMessageCitationContent: async (
      projectId,
      conversationId,
      messageId,
      citationContent,
    ) => {
      if (legacyRepository.updateMessageCitationContent) {
        return legacyRepository.updateMessageCitationContent(
          projectId,
          conversationId,
          messageId,
          citationContent,
        );
      }

      if (!legacyRepository.updateProjectConversationMessageCitationContent) {
        return null;
      }

      const result =
        await legacyRepository.updateProjectConversationMessageCitationContent(
          projectId,
          conversationId,
          messageId,
          citationContent,
        );

      return readConversationFromCarrier(projectId, result, conversationId);
    },
    deleteConversation: async (projectId, conversationId, updatedAt) => {
      if (legacyRepository.deleteConversation) {
        return legacyRepository.deleteConversation(projectId, conversationId, updatedAt);
      }

      if (!legacyRepository.deleteProjectConversation) {
        return false;
      }

      const result = await legacyRepository.deleteProjectConversation(
        projectId,
        conversationId,
        updatedAt,
      );

      return Boolean(result);
    },
    ensureIndexes: async () => undefined,
  };

  return projectConversationsRepository as unknown as ProjectConversationsRepository;
};

const createProjectsService = ({
  projectConversationsRepository,
  ...options
}: Omit<Parameters<typeof createProjectsServiceBase>[0], 'projectConversationsRepository'> & {
  projectConversationsRepository?: ProjectConversationsRepository;
}) => {
  return createProjectsServiceBase({
    ...options,
    projectConversationsRepository:
      projectConversationsRepository ??
      createProjectConversationsRepositoryStub({
        repository: options.repository,
      }),
  });
};

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

const createDefaultAssistantReply = (): {
  content: string;
  sources: ProjectConversationSourceDocument[];
  citationContent?: ProjectConversationCitationContent;
} => {
  return {
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
  };
};

type ConversationRuntimeStubStreamReply = Omit<
  Awaited<ReturnType<ProjectConversationRuntime['streamAssistantReply']>>,
  'llmConfig'
> & {
  citationContent?: ProjectConversationCitationContent;
  llmConfig?: EffectiveLlmConfig;
};

const createConversationRuntimeStub = (options?: {
  generateAssistantReply?: () => Promise<{
    content: string;
    sources: ProjectConversationSourceDocument[];
    citationContent?: ProjectConversationCitationContent;
  }>;
  streamAssistantReply?: (
    input: Parameters<ProjectConversationRuntime['streamAssistantReply']>[0],
  ) => Promise<ConversationRuntimeStubStreamReply>;
  generateCitationContent?: ProjectConversationRuntime['generateCitationContent'];
}): ProjectConversationRuntime => {
  const defaultLlmConfig: EffectiveLlmConfig = {
    source: 'environment',
    provider: 'openai',
    baseUrl: 'https://api.openai.com/v1',
    model: 'gpt-5.4',
    apiKey: 'openai-api-key',
    requestTimeoutMs: 30000,
  };

  return {
    generateAssistantReply:
      options?.generateAssistantReply ??
      (async () => createDefaultAssistantReply()),
    streamAssistantReply: async (
      input: Parameters<ProjectConversationRuntime['streamAssistantReply']>[0],
    ) => {
      if (options?.streamAssistantReply) {
        const result = await options.streamAssistantReply(input);

        return {
          content: result.content,
          sources: result.sources,
          finishReason: result.finishReason,
          llmConfig: result.llmConfig ?? defaultLlmConfig,
        };
      }

      const { onDelta } = input;
      const reply = createDefaultAssistantReply();
      const deltas = ['当前项目已经具备最小对话写链路，', '并开始接入项目级检索。'];

      for (const delta of deltas) {
        await onDelta(delta);
      }

      return {
        ...reply,
        finishReason: 'stop',
        llmConfig: defaultLlmConfig,
      };
    },
    generateCitationContent:
      options?.generateCitationContent ??
      (async () => createDefaultAssistantReply().citationContent),
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

const createAbortAwareSseResponse = ({
  signal,
  encoder,
  steps,
}: {
  signal?: AbortSignal;
  encoder: InstanceType<typeof TextEncoder>;
  steps: Array<{
    afterMs: number;
    chunk: string;
  }>;
}): Response => {
  return new Response(
    new ReadableStream({
      start(controller) {
        let settled = false;
        const cleanup = (): void => {
          if (signal) {
            signal.removeEventListener('abort', handleAbort);
          }
        };
        const closeSafely = (): void => {
          if (settled) {
            return;
          }

          settled = true;
          cleanup();
          controller.close();
        };
        const errorSafely = (error: unknown): void => {
          if (settled) {
            return;
          }

          settled = true;
          cleanup();
          controller.error(error);
        };
        const handleAbort = (): void => {
          errorSafely(
            new DOMException(
              'The operation was aborted due to timeout',
              'AbortError',
            ),
          );
        };

        if (signal?.aborted) {
          handleAbort();
          return;
        }

        signal?.addEventListener('abort', handleAbort, { once: true });

        void (async () => {
          try {
            for (const step of steps) {
              await delay(step.afterMs);

              if (settled || signal?.aborted) {
                return;
              }

              controller.enqueue(encoder.encode(step.chunk));
            }

            closeSafely();
          } catch (error) {
            errorSafely(error);
          }
        })();
      },
    }),
    {
      status: 200,
      headers: {
        'content-type': 'text/event-stream',
      },
    },
  );
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
  assert.equal(
    (persistedProject as { conversations?: unknown }).conversations,
    undefined,
  );
  assert.deepEqual(response.knowledgeBaseIds, ['kb-1', 'kb-2']);
  assert.deepEqual(response.agentIds, ['agent-1']);
  assert.deepEqual(response.skillIds, ['skill-1', 'skill-2']);
});

test('createProject materializes the default conversation in the separated repository', async () => {
  let createdConversation:
    | {
        projectId: string;
        id: string;
        title: string;
      }
    | null = null;

  const repository = {
    createProject: async (document: Omit<ProjectDocument, '_id'>) => {
      return {
        ...document,
        _id: new ObjectId('507f1f77bcf86cd799439112'),
      };
    },
  } as unknown as ProjectsRepository;

  const service = createProjectsService({
    repository,
    projectConversationsRepository: {
      createConversation: async (
        document: Parameters<ProjectConversationsRepository['createConversation']>[0],
      ) => {
        createdConversation = {
          projectId: document.projectId,
          id: document.id,
          title: document.title,
        };

        return {
          ...document,
          _id: new ObjectId(),
        };
      },
    } as unknown as ProjectConversationsRepository,
    authRepository: createAuthRepositoryStub(),
    skillBindingValidator: createSkillBindingValidatorStub(),
  });

  await service.createProject(
    {
      actor: {
        id: 'user-1',
        username: 'langya',
      },
    },
    {
      name: '默认对话物化',
    },
  );

  assert.deepEqual(createdConversation, {
    projectId: '507f1f77bcf86cd799439112',
    id: 'chat-default',
    title: '新对话',
  });
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
      locale: 'en',
    },
    project._id.toHexString(),
  );

  assert.equal(result.total, 1);
  assert.equal(result.items[0]?.id, 'chat-default');
  assert.equal(result.items[0]?.title, '项目对话正式化 project context');
  assert.match(result.items[0]?.preview ?? '', /project conversation entry/);
});

test('listProjectConversations keeps legacy embedded conversations when the new repository is empty', async () => {
  const project: ProjectDocument & {
    _id: NonNullable<ProjectDocument['_id']>;
  } = {
    _id: new ObjectId('507f1f77bcf86cd799439013'),
    name: 'legacy 会话兼容',
    description: '验证旧 conversations 字段仍可读',
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
    conversations: [
      {
        id: 'chat-legacy-1',
        title: '旧会话',
        titleOrigin: 'manual',
        messages: [
          {
            id: 'msg-legacy-1',
            role: 'user',
            content: 'legacy question',
            createdAt: new Date('2026-03-13T08:00:00.000Z'),
          },
        ],
        createdAt: new Date('2026-03-13T08:00:00.000Z'),
        updatedAt: new Date('2026-03-13T08:00:00.000Z'),
      },
    ],
    createdAt: new Date('2026-03-13T00:00:00.000Z'),
    updatedAt: new Date('2026-03-13T08:00:00.000Z'),
  };

  const repository = {
    findById: async (projectId: string) =>
      projectId === project._id.toHexString() ? project : null,
  } as unknown as ProjectsRepository;

  const service = createProjectsService({
    repository,
    projectConversationsRepository: {
      listByProjectId: async () => [],
    } as unknown as ProjectConversationsRepository,
    authRepository: createAuthRepositoryStub(),
    skillBindingValidator: createSkillBindingValidatorStub(),
  });

  const result = await service.listProjectConversations(
    {
      actor: {
        id: 'user-1',
        username: 'langya',
      },
      locale: 'zh-CN',
    },
    project._id.toHexString(),
  );

  assert.equal(result.total, 1);
  assert.equal(result.items[0]?.id, 'chat-legacy-1');
  assert.equal(result.items[0]?.title, '旧会话');
  assert.match(result.items[0]?.preview ?? '', /legacy question/);
});

test('listProjects localizes unknown member fallback names when locale is en', async () => {
  const project: ProjectDocument & {
    _id: NonNullable<ProjectDocument['_id']>;
  } = {
    _id: new ObjectId('507f1f77bcf86cd7994390aa'),
    name: 'Locale Members',
    description: '验证未知成员名称本地化',
    ownerId: 'user-1',
    members: [
      {
        userId: 'user-1',
        role: 'admin',
        joinedAt: new Date('2026-03-13T00:00:00.000Z'),
      },
      {
        userId: 'user-2',
        role: 'member',
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

  const service = createProjectsService({
    repository: {
      listByMemberUserId: async () => [project],
    } as unknown as ProjectsRepository,
    authRepository: {
      findProfilesByIds: async () => [
        {
          id: 'user-1',
          username: 'langya',
          name: 'Langya',
        },
      ],
    } as unknown as AuthRepository,
    skillBindingValidator: createSkillBindingValidatorStub(),
  });

  const result = await service.listProjects({
    actor: {
      id: 'user-1',
      username: 'langya',
    },
    locale: 'en',
  });

  assert.equal(result.items[0]?.members[1]?.name, 'Unknown member');
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
      locale: 'en',
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
  assert.equal(result.conversation.title, 'New conversation');
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
      locale: 'en',
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
      id: 's1',
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

test('assistant message serializes source ids and citationContent sentences', async () => {
  const project: ProjectDocument & {
    _id: NonNullable<ProjectDocument['_id']>;
  } = {
    _id: new ObjectId('507f1f77bcf86cd799439021'),
    name: '引用序列化',
    description: '验证 assistant 引用字段序列化',
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
        id: 'chat-citation',
        title: '引用会话',
        messages: [],
        createdAt: new Date('2026-03-17T09:00:00.000Z'),
        updatedAt: new Date('2026-03-17T09:00:00.000Z'),
      },
    ],
    createdAt: new Date('2026-03-17T09:00:00.000Z'),
    updatedAt: new Date('2026-03-17T09:00:00.000Z'),
  };

  let persistedConversation = project.conversations[0]!;

  const repository = {
    findById: async (projectId: string) =>
      projectId === project._id.toHexString() ? project : null,
    appendProjectConversationMessage: async (
      _projectId: string,
      conversationId: string,
      message: ProjectDocument['conversations'][number]['messages'][number],
      updatedAt: Date,
    ) => {
      assert.equal(conversationId, 'chat-citation');
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
    conversationRuntime: createConversationRuntimeStub({
      generateAssistantReply: async () => ({
        content: '当前项目已经接入正式 merged retrieval。',
        sources: [
          {
            id: 's1',
            knowledgeId: 'kb-1',
            documentId: 'doc-1',
            chunkId: 'chunk-1',
            chunkIndex: 0,
            source: 'chat-core.md',
            snippet: '引用序列化基线',
            distance: 0.18,
          },
        ],
        citationContent: {
          version: 1,
          sentences: [
            {
              id: 'sent-1',
              text: '当前项目已经接入正式 merged retrieval。',
              sourceIds: ['s1'],
              grounded: true,
            },
          ],
        },
      }),
    }),
  });

  const result = await service.createProjectConversationMessage(
    {
      actor: {
        id: 'user-1',
        username: 'langya',
      },
      locale: 'en',
    },
    project._id.toHexString(),
    'chat-citation',
    {
      content: '请验证引用序列化',
    },
  );

  assert.equal(result.conversation.messages[1]?.sources?.[0]?.id, 's1');
  assert.deepEqual(result.conversation.messages[1]?.citationContent, {
    version: 1,
    sentences: [
      {
        id: 'sent-1',
        text: '当前项目已经接入正式 merged retrieval。',
        sourceIds: ['s1'],
        grounded: true,
      },
    ],
  });
});

test('createProjectConversationMessage persists citationContent from the real runtime grounding pass', async () => {
  const project: ProjectDocument & {
    _id: NonNullable<ProjectDocument['_id']>;
  } = {
    _id: new ObjectId('507f1f77bcf86cd799439023'),
    name: '真实 runtime 引用成功',
    description: '验证 grounding 成功后 assistant message 持久化 citationContent',
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
    conversations: [
      {
        id: 'chat-runtime-citation-success',
        title: '真实 runtime 引用成功',
        messages: [],
        createdAt: new Date('2026-03-17T09:00:00.000Z'),
        updatedAt: new Date('2026-03-17T09:00:00.000Z'),
      },
    ],
    createdAt: new Date('2026-03-17T09:00:00.000Z'),
    updatedAt: new Date('2026-03-17T09:00:00.000Z'),
  };

  let persistedConversation = project.conversations[0]!;
  let llmCalls = 0;
  const originalFetch = global.fetch;

  global.fetch = async () => {
    llmCalls += 1;

    return new Response(
      JSON.stringify({
        choices: [
          {
            message: {
              content:
                llmCalls === 1
                  ? '当前项目已经接入正式 merged retrieval。'
                  : '{"version":1,"sentences":[{"id":"sent-1","text":"当前项目已经接入正式 merged retrieval。","sourceIds":["s1"],"grounded":true}]}',
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
    const repository = {
      findById: async (projectId: string) =>
        projectId === project._id.toHexString() ? project : null,
      appendProjectConversationMessage: async (
        _projectId: string,
        conversationId: string,
        message: ProjectDocument['conversations'][number]['messages'][number],
        updatedAt: Date,
      ) => {
        assert.equal(conversationId, 'chat-runtime-citation-success');
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
      conversationRuntime: createProjectConversationRuntime({
        env: createTestEnv(),
        settingsRepository: createSettingsRepositoryStub(),
        knowledgeSearch: {
          searchProjectDocuments: async () => ({
            query: '请给出正式引用',
            sourceType: 'global_docs',
            total: 1,
            items: [
              {
                knowledgeId: 'kb-1',
                documentId: 'doc-1',
                chunkId: 'chunk-1',
                chunkIndex: 0,
                type: 'global_docs',
                source: 'chat-core.md',
                content: '当前项目已经接入正式 merged retrieval。',
                distance: 0.11,
              },
            ],
          }),
        },
      }),
    });

    const result = await service.createProjectConversationMessage(
      {
        actor: {
          id: 'user-1',
          username: 'langya',
        },
      },
      project._id.toHexString(),
      'chat-runtime-citation-success',
      {
        content: '请给出正式引用',
      },
    );

    assert.equal(llmCalls, 2);
    assert.equal(persistedConversation.messages[1]?.sources?.[0]?.id, 's1');
    assert.deepEqual(persistedConversation.messages[1]?.citationContent, {
      version: 1,
      sentences: [
        {
          id: 'sent-1',
          text: '当前项目已经接入正式 merged retrieval。',
          sourceIds: ['s1'],
          grounded: true,
        },
      ],
    });
    assert.deepEqual(result.conversation.messages[1]?.citationContent, {
      version: 1,
      sentences: [
        {
          id: 'sent-1',
          text: '当前项目已经接入正式 merged retrieval。',
          sourceIds: ['s1'],
          grounded: true,
        },
      ],
    });
  } finally {
    global.fetch = originalFetch;
  }
});

test('createProjectConversationMessage falls back to legacy sources when real runtime grounding is malformed', async () => {
  const project: ProjectDocument & {
    _id: NonNullable<ProjectDocument['_id']>;
  } = {
    _id: new ObjectId('507f1f77bcf86cd799439024'),
    name: '真实 runtime 引用降级',
    description: '验证 grounding 非法时回退 legacy sources',
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
    conversations: [
      {
        id: 'chat-runtime-citation-fallback',
        title: '真实 runtime 引用降级',
        messages: [],
        createdAt: new Date('2026-03-17T09:00:00.000Z'),
        updatedAt: new Date('2026-03-17T09:00:00.000Z'),
      },
    ],
    createdAt: new Date('2026-03-17T09:00:00.000Z'),
    updatedAt: new Date('2026-03-17T09:00:00.000Z'),
  };

  let persistedConversation = project.conversations[0]!;
  let llmCalls = 0;
  const originalFetch = global.fetch;

  global.fetch = async () => {
    llmCalls += 1;

    return new Response(
      JSON.stringify({
        choices: [
          {
            message: {
              content:
                llmCalls === 1
                  ? '当前项目已经接入正式 merged retrieval。'
                  : '```json\n{"version":1,"sentences":[{"id":"sent-1","text":"","sourceIds":["s1"],"grounded":true}]}\n```',
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
    const repository = {
      findById: async (projectId: string) =>
        projectId === project._id.toHexString() ? project : null,
      appendProjectConversationMessage: async (
        _projectId: string,
        conversationId: string,
        message: ProjectDocument['conversations'][number]['messages'][number],
        updatedAt: Date,
      ) => {
        assert.equal(conversationId, 'chat-runtime-citation-fallback');
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
      conversationRuntime: createProjectConversationRuntime({
        env: createTestEnv(),
        settingsRepository: createSettingsRepositoryStub(),
        knowledgeSearch: {
          searchProjectDocuments: async () => ({
            query: '请给出降级引用',
            sourceType: 'global_docs',
            total: 1,
            items: [
              {
                knowledgeId: 'kb-1',
                documentId: 'doc-1',
                chunkId: 'chunk-1',
                chunkIndex: 0,
                type: 'global_docs',
                source: 'chat-core.md',
                content: '当前项目已经接入正式 merged retrieval。',
                distance: 0.11,
              },
            ],
          }),
        },
      }),
    });

    const result = await service.createProjectConversationMessage(
      {
        actor: {
          id: 'user-1',
          username: 'langya',
        },
      },
      project._id.toHexString(),
      'chat-runtime-citation-fallback',
      {
        content: '请给出降级引用',
      },
    );

    assert.equal(llmCalls, 2);
    assert.equal(persistedConversation.messages[1]?.sources?.[0]?.id, 's1');
    assert.equal(persistedConversation.messages[1]?.citationContent, undefined);
    assert.equal(result.conversation.messages[1]?.citationContent, undefined);
    assert.equal(result.conversation.messages[1]?.sources?.[0]?.id, 's1');
  } finally {
    global.fetch = originalFetch;
  }
});

test('assistant persistence drops invalid citationContent that does not match final content', async () => {
  const project: ProjectDocument & {
    _id: NonNullable<ProjectDocument['_id']>;
  } = {
    _id: new ObjectId('507f1f77bcf86cd799439025'),
    name: '持久化边界降级',
    description: '验证非法 citation 在 persist 边界 fail closed',
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
        id: 'chat-persist-invalid-citation',
        title: '持久化边界降级',
        messages: [],
        createdAt: new Date('2026-03-17T09:00:00.000Z'),
        updatedAt: new Date('2026-03-17T09:00:00.000Z'),
      },
    ],
    createdAt: new Date('2026-03-17T09:00:00.000Z'),
    updatedAt: new Date('2026-03-17T09:00:00.000Z'),
  };

  let persistedConversation = project.conversations[0]!;

  const repository = {
    findById: async (projectId: string) =>
      projectId === project._id.toHexString() ? project : null,
    appendProjectConversationMessage: async (
      _projectId: string,
      conversationId: string,
      message: ProjectDocument['conversations'][number]['messages'][number],
      updatedAt: Date,
    ) => {
      assert.equal(conversationId, 'chat-persist-invalid-citation');
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
    conversationRuntime: createConversationRuntimeStub({
      generateAssistantReply: async () => ({
        content: '当前项目已经接入正式 merged retrieval。',
        sources: [
          {
            id: 's1',
            knowledgeId: 'kb-1',
            documentId: 'doc-1',
            chunkId: 'chunk-1',
            chunkIndex: 0,
            source: 'chat-core.md',
            snippet: '引用序列化基线',
            distance: 0.18,
          },
        ],
        citationContent: {
          version: 1,
          sentences: [
            {
              id: 'sent-1',
              text: '不匹配的句子',
              sourceIds: ['s1'],
              grounded: true,
            },
          ],
        },
      }),
    }),
  });

  const result = await service.createProjectConversationMessage(
    {
      actor: {
        id: 'user-1',
        username: 'langya',
      },
      locale: 'en',
    },
    project._id.toHexString(),
    'chat-persist-invalid-citation',
    {
      content: '请验证持久化边界',
    },
  );

  assert.equal(persistedConversation.messages[1]?.citationContent, undefined);
  assert.equal(result.conversation.messages[1]?.citationContent, undefined);
  assert.equal(result.conversation.messages[1]?.sources?.[0]?.id, 's1');
});

test('getProjectConversationDetail backfills legacy source ids for persisted messages', async () => {
  const project: ProjectDocument & {
    _id: NonNullable<ProjectDocument['_id']>;
  } = {
    _id: new ObjectId('507f1f77bcf86cd799439022'),
    name: '旧消息兼容',
    description: '验证旧消息 source id 补齐',
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
        id: 'chat-legacy',
        title: '旧消息会话',
        messages: [
          {
            id: 'msg-legacy-assistant',
            role: 'assistant',
            content: '旧消息仍然可读',
            createdAt: new Date('2026-03-17T09:10:00.000Z'),
            sources: [
              {
                knowledgeId: 'kb-legacy-1',
                documentId: 'doc-legacy-1',
                chunkId: 'chunk-legacy-1',
                chunkIndex: 0,
                source: 'legacy-1.md',
                snippet: 'legacy snippet 1',
                distance: 0.12,
              },
              {
                knowledgeId: 'kb-legacy-2',
                documentId: 'doc-legacy-2',
                chunkId: 'chunk-legacy-2',
                chunkIndex: 1,
                source: 'legacy-2.md',
                snippet: 'legacy snippet 2',
                distance: 0.24,
              },
            ],
          },
        ],
        createdAt: new Date('2026-03-17T09:00:00.000Z'),
        updatedAt: new Date('2026-03-17T09:10:00.000Z'),
      },
    ],
    createdAt: new Date('2026-03-17T09:00:00.000Z'),
    updatedAt: new Date('2026-03-17T09:10:00.000Z'),
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

  const result = await service.getProjectConversationDetail(
    {
      actor: {
        id: 'user-1',
        username: 'langya',
      },
      locale: 'en',
    },
    project._id.toHexString(),
    'chat-legacy',
  );

  assert.deepEqual(
    result.conversation.messages[0]?.sources?.map((source) => source.id),
    ['s1', 's2'],
  );
});

test('getProjectConversationDetail omits invalid persisted citationContent from response', async () => {
  const project: ProjectDocument & {
    _id: NonNullable<ProjectDocument['_id']>;
  } = {
    _id: new ObjectId('507f1f77bcf86cd799439026'),
    name: '脏引用详情降级',
    description: '验证 detail 边界会隐藏非法 citation',
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
        id: 'chat-dirty-citation',
        title: '脏引用会话',
        messages: [
          {
            id: 'msg-dirty-assistant',
            role: 'assistant',
            content: '当前项目已经接入正式 merged retrieval。',
            createdAt: new Date('2026-03-17T09:10:00.000Z'),
            sources: [
              {
                knowledgeId: 'kb-1',
                documentId: 'doc-1',
                chunkId: 'chunk-1',
                chunkIndex: 0,
                source: 'chat-core.md',
                snippet: '引用序列化基线',
                distance: 0.18,
              },
            ],
            citationContent: {
              version: 1,
              sentences: [
                {
                  id: 'sent-1',
                  text: '不匹配的脏句子',
                  sourceIds: ['s1'],
                  grounded: true,
                },
              ],
            },
          },
        ],
        createdAt: new Date('2026-03-17T09:00:00.000Z'),
        updatedAt: new Date('2026-03-17T09:10:00.000Z'),
      },
    ],
    createdAt: new Date('2026-03-17T09:00:00.000Z'),
    updatedAt: new Date('2026-03-17T09:10:00.000Z'),
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

  const result = await service.getProjectConversationDetail(
    {
      actor: {
        id: 'user-1',
        username: 'langya',
      },
      locale: 'en',
    },
    project._id.toHexString(),
    'chat-dirty-citation',
  );

  assert.equal(result.conversation.messages[0]?.citationContent, undefined);
  assert.equal(result.conversation.messages[0]?.sources?.[0]?.id, 's1');
});

test('message star contract returns starred metadata for the persisted message', async () => {
  const project: ProjectDocument & {
    _id: NonNullable<ProjectDocument['_id']>;
  } = {
    _id: new ObjectId('507f1f77bcf86cd799439030'),
    name: '消息星标契约',
    description: '验证 persisted message 的 star contract',
    ownerId: 'user-1',
    members: [
      {
        userId: 'user-1',
        role: 'admin',
        joinedAt: new Date('2026-03-18T00:00:00.000Z'),
      },
    ],
    knowledgeBaseIds: [],
    agentIds: [],
    skillIds: [],
    conversations: [
      {
        id: 'chat-star-contract',
        title: '消息星标会话',
        messages: [
          {
            id: 'msg-star-target',
            role: 'user',
            content: '把这条消息加星',
            createdAt: new Date('2026-03-18T09:00:00.000Z'),
          },
        ],
        createdAt: new Date('2026-03-18T09:00:00.000Z'),
        updatedAt: new Date('2026-03-18T09:30:00.000Z'),
      },
    ],
    createdAt: new Date('2026-03-18T00:00:00.000Z'),
    updatedAt: new Date('2026-03-18T09:30:00.000Z'),
  };

  let persistedProject = project;

  const repository = {
    findById: async (projectId: string) =>
      projectId === project._id.toHexString() ? persistedProject : null,
    updateProjectConversationMessageMetadata: async (
      projectId: string,
      conversationId: string,
      messageId: string,
      patch: {
        starred: boolean;
        starredAt: Date | null;
        starredBy: string | null;
      },
    ) => {
      assert.equal(projectId, project._id.toHexString());
      assert.equal(conversationId, 'chat-star-contract');
      assert.equal(messageId, 'msg-star-target');
      assert.equal(patch.starred, true);
      assert.ok(patch.starredAt instanceof Date);
      assert.equal(patch.starredBy, 'user-1');

      persistedProject = {
        ...persistedProject,
        conversations: persistedProject.conversations.map((conversation) =>
          conversation.id === conversationId
            ? {
                ...conversation,
                messages: conversation.messages.map((message) =>
                  message.id === messageId
                    ? {
                        ...message,
                        starredAt: patch.starredAt ?? undefined,
                        starredBy: patch.starredBy ?? undefined,
                      }
                    : message,
                ),
              }
            : conversation,
        ),
      };

      return persistedProject;
    },
  } as unknown as ProjectsRepository;

  const service = createProjectsService({
    repository,
    authRepository: createAuthRepositoryStub(),
    skillBindingValidator: createSkillBindingValidatorStub(),
  });

  const result = await (
    service as ProjectsService & {
      updateProjectConversationMessageMetadata(
        context: { actor: { id: string; username: string } },
        projectId: string,
        conversationId: string,
        messageId: string,
        input: { starred?: unknown },
      ): Promise<{
        message: {
          starred: boolean;
          starredAt: string | null;
          starredBy: string | null;
          id: string;
          conversationId: string;
          content: string;
        };
      }>;
    }
  ).updateProjectConversationMessageMetadata(
    {
      actor: {
        id: 'user-1',
        username: 'langya',
      },
    },
    project._id.toHexString(),
    'chat-star-contract',
    'msg-star-target',
    {
      starred: true,
    },
  );

  assert.equal(result.message.id, 'msg-star-target');
  assert.equal(result.message.conversationId, 'chat-star-contract');
  assert.equal(result.message.starred, true);
  assert.equal(result.message.starredBy, 'user-1');
  assert.ok(result.message.starredAt);
});

test('message star contract clears starred metadata when unstarred', async () => {
  const project: ProjectDocument & {
    _id: NonNullable<ProjectDocument['_id']>;
  } = {
    _id: new ObjectId('507f1f77bcf86cd799439031'),
    name: '消息取消加星',
    description: '验证 unstar contract',
    ownerId: 'user-1',
    members: [
      {
        userId: 'user-1',
        role: 'admin',
        joinedAt: new Date('2026-03-18T00:00:00.000Z'),
      },
    ],
    knowledgeBaseIds: [],
    agentIds: [],
    skillIds: [],
    conversations: [
      {
        id: 'chat-unstar-contract',
        title: '已加星会话',
        messages: [
          {
            id: 'msg-unstar-target',
            role: 'assistant',
            content: '这条消息先处于已加星状态',
            createdAt: new Date('2026-03-18T09:00:00.000Z'),
            starredAt: new Date('2026-03-18T09:10:00.000Z'),
            starredBy: 'user-1',
          },
        ],
        createdAt: new Date('2026-03-18T09:00:00.000Z'),
        updatedAt: new Date('2026-03-18T09:30:00.000Z'),
      },
    ],
    createdAt: new Date('2026-03-18T00:00:00.000Z'),
    updatedAt: new Date('2026-03-18T09:30:00.000Z'),
  };

  let persistedProject = project;

  const repository = {
    findById: async (projectId: string) =>
      projectId === project._id.toHexString() ? persistedProject : null,
    updateProjectConversationMessageMetadata: async (
      projectId: string,
      conversationId: string,
      messageId: string,
      patch: {
        starred: boolean;
        starredAt: Date | null;
        starredBy: string | null;
      },
    ) => {
      assert.equal(projectId, project._id.toHexString());
      assert.equal(conversationId, 'chat-unstar-contract');
      assert.equal(messageId, 'msg-unstar-target');
      assert.equal(patch.starred, false);
      assert.equal(patch.starredAt, null);
      assert.equal(patch.starredBy, null);

      persistedProject = {
        ...persistedProject,
        conversations: persistedProject.conversations.map((conversation) =>
          conversation.id === conversationId
            ? {
                ...conversation,
                messages: conversation.messages.map((message) =>
                  message.id === messageId
                    ? {
                        ...message,
                        starredAt: undefined,
                        starredBy: undefined,
                      }
                    : message,
                ),
              }
            : conversation,
        ),
      };

      return persistedProject;
    },
  } as unknown as ProjectsRepository;

  const service = createProjectsService({
    repository,
    authRepository: createAuthRepositoryStub(),
    skillBindingValidator: createSkillBindingValidatorStub(),
  });

  const result = await (
    service as ProjectsService & {
      updateProjectConversationMessageMetadata(
        context: { actor: { id: string; username: string } },
        projectId: string,
        conversationId: string,
        messageId: string,
        input: { starred?: unknown },
      ): Promise<{
        message: {
          starred: boolean;
          starredAt: string | null;
          starredBy: string | null;
          id: string;
          conversationId: string;
          content: string;
        };
      }>;
    }
  ).updateProjectConversationMessageMetadata(
    {
      actor: {
        id: 'user-1',
        username: 'langya',
      },
    },
    project._id.toHexString(),
    'chat-unstar-contract',
    'msg-unstar-target',
    {
      starred: false,
    },
  );

  assert.equal(result.message.id, 'msg-unstar-target');
  assert.equal(result.message.starred, false);
  assert.equal(result.message.starredAt, null);
  assert.equal(result.message.starredBy, null);
});

test('message star mutation rejects an invalid message id with not-found semantics', async () => {
  const project: ProjectDocument & {
    _id: NonNullable<ProjectDocument['_id']>;
  } = {
    _id: new ObjectId('507f1f77bcf86cd799439032'),
    name: '非法消息星标',
    description: '验证不存在的 messageId',
    ownerId: 'user-1',
    members: [
      {
        userId: 'user-1',
        role: 'admin',
        joinedAt: new Date('2026-03-18T00:00:00.000Z'),
      },
    ],
    knowledgeBaseIds: [],
    agentIds: [],
    skillIds: [],
    conversations: [
      {
        id: 'chat-star-not-found',
        title: '消息不存在会话',
        messages: [
          {
            id: 'msg-present',
            role: 'user',
            content: '存在的消息',
            createdAt: new Date('2026-03-18T09:00:00.000Z'),
          },
        ],
        createdAt: new Date('2026-03-18T09:00:00.000Z'),
        updatedAt: new Date('2026-03-18T09:30:00.000Z'),
      },
    ],
    createdAt: new Date('2026-03-18T00:00:00.000Z'),
    updatedAt: new Date('2026-03-18T09:30:00.000Z'),
  };

  const repository = {
    findById: async (projectId: string) =>
      projectId === project._id.toHexString() ? project : null,
    updateProjectConversationMessageMetadata: async () => {
      throw new Error('updateProjectConversationMessageMetadata should not be called');
    },
  } as unknown as ProjectsRepository;

  const service = createProjectsService({
    repository,
    authRepository: createAuthRepositoryStub(),
    skillBindingValidator: createSkillBindingValidatorStub(),
  });

  await assert.rejects(
    () =>
      (
        service as ProjectsService & {
          updateProjectConversationMessageMetadata(
            context: { actor: { id: string; username: string } },
            projectId: string,
            conversationId: string,
            messageId: string,
            input: { starred?: unknown },
          ): Promise<unknown>;
        }
      ).updateProjectConversationMessageMetadata(
        {
          actor: {
            id: 'user-1',
            username: 'langya',
          },
        },
        project._id.toHexString(),
        'chat-star-not-found',
        'msg-missing',
        {
          starred: true,
        },
      ),
    (error: unknown) => {
      assert.ok(error instanceof AppError);
      assert.equal(error.statusCode, 404);
      return true;
    },
  );
});

test('message star mutation materializes the default conversation before updating metadata', async () => {
  const project: ProjectDocument & {
    _id: NonNullable<ProjectDocument['_id']>;
  } = {
    _id: new ObjectId('507f1f77bcf86cd799439032'),
    name: '默认会话星标',
    description: '验证默认 chat-default 也能更新消息星标',
    ownerId: 'user-1',
    members: [
      {
        userId: 'user-1',
        role: 'admin',
        joinedAt: new Date('2026-03-18T00:00:00.000Z'),
      },
    ],
    knowledgeBaseIds: [],
    agentIds: [],
    skillIds: [],
    conversations: [],
    createdAt: new Date('2026-03-18T00:00:00.000Z'),
    updatedAt: new Date('2026-03-18T09:30:00.000Z'),
  };

  let materializeCalls = 0;
  let updateCalls = 0;
  let persistedConversation: ProjectConversationDocument | null = null;

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
    updateProjectConversationMessageMetadata: async (
      _projectId: string,
      conversationId: string,
      messageId: string,
      patch: {
        starred: boolean;
        starredAt: Date | null;
        starredBy: string | null;
      },
    ) => {
      updateCalls += 1;
      assert.equal(conversationId, 'chat-default');
      assert.equal(messageId, 'msg-default-assistant');
      assert.equal(patch.starred, true);

      if (!persistedConversation) {
        return null;
      }

      persistedConversation = {
        ...persistedConversation,
        messages: persistedConversation.messages.map((message) =>
          message.id === messageId
            ? {
                ...message,
                starredAt: patch.starredAt ?? undefined,
                starredBy: patch.starredBy ?? undefined,
              }
            : message,
        ),
      };

      return {
        ...project,
        conversations: [persistedConversation],
        _id: project._id,
      };
    },
  } as unknown as ProjectsRepository;

  const service = createProjectsService({
    repository,
    authRepository: createAuthRepositoryStub(),
    skillBindingValidator: createSkillBindingValidatorStub(),
  });

  const result = await (
    service as ProjectsService & {
      updateProjectConversationMessageMetadata(
        context: { actor: { id: string; username: string } },
        projectId: string,
        conversationId: string,
        messageId: string,
        input: { starred?: unknown },
      ): Promise<{
        message: {
          id: string;
          starred: boolean;
          starredAt: string | null;
          starredBy: string | null;
        };
      }>;
    }
  ).updateProjectConversationMessageMetadata(
    {
      actor: {
        id: 'user-1',
        username: 'langya',
      },
    },
    project._id.toHexString(),
    'chat-default',
    'msg-default-assistant',
    {
      starred: true,
    },
  );

  assert.equal(materializeCalls, 1);
  assert.equal(updateCalls, 2);
  assert.equal(result.message.id, 'msg-default-assistant');
  assert.equal(result.message.starred, true);
  assert.equal(result.message.starredBy, 'user-1');
  assert.ok(result.message.starredAt);
});

test('message star mutation keeps conversation.updatedAt stable', async () => {
  const conversationUpdatedAt = new Date('2026-03-18T09:30:00.000Z');
  const project: ProjectDocument & {
    _id: NonNullable<ProjectDocument['_id']>;
  } = {
    _id: new ObjectId('507f1f77bcf86cd799439033'),
    name: '更新时间不漂移',
    description: '验证消息星标不会改 conversation.updatedAt',
    ownerId: 'user-1',
    members: [
      {
        userId: 'user-1',
        role: 'admin',
        joinedAt: new Date('2026-03-18T00:00:00.000Z'),
      },
    ],
    knowledgeBaseIds: [],
    agentIds: [],
    skillIds: [],
    conversations: [
      {
        id: 'chat-updated-at-stable',
        title: '更新时间稳定会话',
        messages: [
          {
            id: 'msg-updated-at-target',
            role: 'assistant',
            content: '目标消息',
            createdAt: new Date('2026-03-18T09:00:00.000Z'),
          },
        ],
        createdAt: new Date('2026-03-18T09:00:00.000Z'),
        updatedAt: conversationUpdatedAt,
      },
    ],
    createdAt: new Date('2026-03-18T00:00:00.000Z'),
    updatedAt: new Date('2026-03-18T09:30:00.000Z'),
  };

  let persistedProject = project;

  const repository = {
    findById: async (projectId: string) =>
      projectId === project._id.toHexString() ? persistedProject : null,
    updateProjectConversationMessageMetadata: async (
      _projectId: string,
      conversationId: string,
      messageId: string,
      patch: {
        starred: boolean;
        starredAt: Date | null;
        starredBy: string | null;
      },
    ) => {
      assert.equal(conversationId, 'chat-updated-at-stable');
      assert.equal(messageId, 'msg-updated-at-target');
      assert.equal(patch.starred, true);

      persistedProject = {
        ...persistedProject,
        conversations: persistedProject.conversations.map((conversation) =>
          conversation.id === conversationId
            ? {
                ...conversation,
                messages: conversation.messages.map((message) =>
                  message.id === messageId
                    ? {
                        ...message,
                        starredAt: patch.starredAt ?? undefined,
                        starredBy: patch.starredBy ?? undefined,
                      }
                    : message,
                ),
              }
            : conversation,
        ),
      };

      return persistedProject;
    },
  } as unknown as ProjectsRepository;

  const service = createProjectsService({
    repository,
    authRepository: createAuthRepositoryStub(),
    skillBindingValidator: createSkillBindingValidatorStub(),
  });

  const result = await (
    service as ProjectsService & {
      updateProjectConversationMessageMetadata(
        context: { actor: { id: string; username: string } },
        projectId: string,
        conversationId: string,
        messageId: string,
        input: { starred?: unknown },
      ): Promise<{
        message: {
          starred: boolean;
          starredAt: string | null;
          starredBy: string | null;
          id: string;
          conversationId: string;
          content: string;
        };
      }>;
    }
  ).updateProjectConversationMessageMetadata(
    {
      actor: {
        id: 'user-1',
        username: 'langya',
      },
    },
    project._id.toHexString(),
    'chat-updated-at-stable',
    'msg-updated-at-target',
    {
      starred: true,
    },
  );

  assert.equal(result.message.starred, true);
  assert.equal(result.message.conversationId, 'chat-updated-at-stable');
  assert.equal(result.message.starredBy, 'user-1');
  assert.ok(result.message.starredAt);
  assert.equal(persistedProject.conversations[0]?.updatedAt, conversationUpdatedAt);
  assert.equal(persistedProject.updatedAt, project.updatedAt);
});

test('message star mutation keeps conversation ordering stable', async () => {
  const olderUpdatedAt = new Date('2026-03-18T09:00:00.000Z');
  const newerUpdatedAt = new Date('2026-03-18T10:00:00.000Z');
  const project: ProjectDocument & {
    _id: NonNullable<ProjectDocument['_id']>;
  } = {
    _id: new ObjectId('507f1f77bcf86cd799439034'),
    name: '排序不漂移',
    description: '验证消息星标不会影响列表顺序',
    ownerId: 'user-1',
    members: [
      {
        userId: 'user-1',
        role: 'admin',
        joinedAt: new Date('2026-03-18T00:00:00.000Z'),
      },
    ],
    knowledgeBaseIds: [],
    agentIds: [],
    skillIds: [],
    conversations: [
      {
        id: 'chat-newer',
        title: '较新的会话',
        messages: [
          {
            id: 'msg-newer',
            role: 'assistant',
            content: '较新的会话消息',
            createdAt: newerUpdatedAt,
          },
        ],
        createdAt: newerUpdatedAt,
        updatedAt: newerUpdatedAt,
      },
      {
        id: 'chat-older',
        title: '较旧的会话',
        messages: [
          {
            id: 'msg-older-target',
            role: 'user',
            content: '较旧会话中的目标消息',
            createdAt: olderUpdatedAt,
          },
        ],
        createdAt: olderUpdatedAt,
        updatedAt: olderUpdatedAt,
      },
    ],
    createdAt: new Date('2026-03-18T00:00:00.000Z'),
    updatedAt: newerUpdatedAt,
  };

  let persistedProject = project;

  const repository = {
    findById: async (projectId: string) =>
      projectId === project._id.toHexString() ? persistedProject : null,
    updateProjectConversationMessageMetadata: async (
      _projectId: string,
      conversationId: string,
      messageId: string,
      patch: {
        starred: boolean;
        starredAt: Date | null;
        starredBy: string | null;
      },
    ) => {
      assert.equal(conversationId, 'chat-older');
      assert.equal(messageId, 'msg-older-target');
      assert.equal(patch.starred, true);

      persistedProject = {
        ...persistedProject,
        conversations: persistedProject.conversations.map((conversation) =>
          conversation.id === conversationId
            ? {
                ...conversation,
                messages: conversation.messages.map((message) =>
                  message.id === messageId
                    ? {
                        ...message,
                        starredAt: patch.starredAt ?? undefined,
                        starredBy: patch.starredBy ?? undefined,
                      }
                    : message,
                ),
              }
            : conversation,
        ),
      };

      return persistedProject;
    },
  } as unknown as ProjectsRepository;

  const service = createProjectsService({
    repository,
    authRepository: createAuthRepositoryStub(),
    skillBindingValidator: createSkillBindingValidatorStub(),
  });

  const before = await service.listProjectConversations(
    {
      actor: {
        id: 'user-1',
        username: 'langya',
      },
    },
    project._id.toHexString(),
  );

  await (
    service as ProjectsService & {
      updateProjectConversationMessageMetadata(
        context: { actor: { id: string; username: string } },
        projectId: string,
        conversationId: string,
        messageId: string,
        input: { starred?: unknown },
      ): Promise<unknown>;
    }
  ).updateProjectConversationMessageMetadata(
    {
      actor: {
        id: 'user-1',
        username: 'langya',
      },
    },
    project._id.toHexString(),
    'chat-older',
    'msg-older-target',
    {
      starred: true,
    },
  );

  const after = await service.listProjectConversations(
    {
      actor: {
        id: 'user-1',
        username: 'langya',
      },
    },
    project._id.toHexString(),
  );

  assert.deepEqual(before.items.map((item) => item.id), ['chat-newer', 'chat-older']);
  assert.deepEqual(after.items.map((item) => item.id), ['chat-newer', 'chat-older']);
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
        titleOrigin: 'manual',
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
    conversationRuntime: createConversationRuntimeStub({
      generateAssistantReply: async () => {
        runtimeCalls += 1;

        if (runtimeCalls === 1) {
          throw new Error('llm timeout');
        }

        return {
          content: '第二次重试后已补齐 assistant 回复。',
          sources: [],
        };
      },
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
    conversationRuntime: createConversationRuntimeStub({
      generateAssistantReply: async () => ({
        content: 'assistant 已在重试后写回成功。',
        sources: [],
      }),
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

test('createProjectConversationMessage returns the persisted assistant reply without regenerating it when clientRequestId already resolved', async () => {
  const project: ProjectDocument & {
    _id: NonNullable<ProjectDocument['_id']>;
  } = {
    _id: new ObjectId('507f1f77bcf86cd79943901d'),
    name: '对话已完成重试',
    description: '验证同一 clientRequestId 已完成时不重复生成 assistant',
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
        id: 'chat-retry-resolved',
        title: '已有会话',
        messages: [
          {
            id: 'msg-user-existing',
            role: 'user',
            content: '复用已完成 turn',
            clientRequestId: 'client-request-3',
            createdAt: new Date('2026-03-17T10:00:00.000Z'),
          },
          {
            id: 'msg-assistant-existing',
            role: 'assistant',
            content: 'assistant 已经存在，不应重复生成。',
            createdAt: new Date('2026-03-17T10:00:05.000Z'),
            sources: [],
          },
        ],
        createdAt: new Date('2026-03-17T10:00:00.000Z'),
        updatedAt: new Date('2026-03-17T10:00:05.000Z'),
      },
    ],
    createdAt: new Date('2026-03-17T00:00:00.000Z'),
    updatedAt: new Date('2026-03-17T10:00:05.000Z'),
  };

  let runtimeCalls = 0;

  const repository = {
    findById: async (projectId: string) =>
      projectId === project._id.toHexString() ? project : null,
  } as unknown as ProjectsRepository;

  const service = createProjectsService({
    repository,
    authRepository: createAuthRepositoryStub(),
    skillBindingValidator: createSkillBindingValidatorStub(),
    conversationRuntime: createConversationRuntimeStub({
      generateAssistantReply: async () => {
        runtimeCalls += 1;

        return {
          content: '这条内容不应该出现。',
          sources: [],
        };
      },
    }),
  });

  const result = await service.createProjectConversationMessage(
    {
      actor: {
        id: 'user-1',
        username: 'langya',
      },
    },
    project._id.toHexString(),
    'chat-retry-resolved',
    {
      content: '复用已完成 turn',
      clientRequestId: 'client-request-3',
    },
  );

  assert.equal(runtimeCalls, 0);
  assert.equal(result.conversation.messages.length, 2);
  assert.equal(
    result.conversation.messages[1]?.content,
    'assistant 已经存在，不应重复生成。',
  );
});

test('createProjectConversationMessage retries the latest user message without appending another user turn', async () => {
  const project: ProjectDocument & {
    _id: NonNullable<ProjectDocument['_id']>;
  } = {
    _id: new ObjectId('507f1f77bcf86cd79943901e'),
    name: '重试最新消息',
    description: '验证历史重试不会追加新的 user message',
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
        id: 'chat-retry-latest',
        title: '已有会话',
        titleOrigin: 'manual',
        messages: [
          {
            id: 'msg-user-latest',
            role: 'user',
            content: '请重试这条最新问题',
            clientRequestId: 'request-original',
            createdAt: new Date('2026-03-17T10:00:00.000Z'),
          },
          {
            id: 'msg-assistant-latest',
            role: 'assistant',
            content: '这是旧回答。',
            createdAt: new Date('2026-03-17T10:00:05.000Z'),
            sources: [],
          },
        ],
        createdAt: new Date('2026-03-17T10:00:00.000Z'),
        updatedAt: new Date('2026-03-17T10:00:05.000Z'),
      },
    ],
    createdAt: new Date('2026-03-17T00:00:00.000Z'),
    updatedAt: new Date('2026-03-17T10:00:05.000Z'),
  };

  let persistedConversation = project.conversations[0]!;
  let replaceCalls = 0;
  let appendCalls = 0;

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
    replaceProjectConversationMessages: async (
      _projectId: string,
      conversationId: string,
      messages: ProjectDocument['conversations'][number]['messages'],
      updatedAt: Date,
    ) => {
      replaceCalls += 1;
      assert.equal(conversationId, 'chat-retry-latest');
      persistedConversation = {
        ...persistedConversation,
        messages,
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
      assert.equal(conversationId, 'chat-retry-latest');
      assert.equal(message.role, 'assistant');
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
    conversationRuntime: createConversationRuntimeStub({
      generateAssistantReply: async () => ({
        content: '这是重试后的新回答。',
        sources: [],
      }),
    }),
  });

  const result = await service.createProjectConversationMessage(
    {
      actor: {
        id: 'user-1',
        username: 'langya',
      },
    },
    project._id.toHexString(),
    'chat-retry-latest',
    {
      content: '请重试这条最新问题',
      clientRequestId: 'request-replay-latest',
      targetUserMessageId: 'msg-user-latest',
    },
  );

  assert.equal(replaceCalls, 1);
  assert.equal(appendCalls, 1);
  assert.equal(
    persistedConversation.messages.filter((message) => message.role === 'user')
      .length,
    1,
  );
  assert.equal(
    persistedConversation.messages[0]?.clientRequestId,
    'request-replay-latest',
  );
  assert.equal(persistedConversation.messages[1]?.content, '这是重试后的新回答。');
  assert.equal(result.conversation.messages.length, 2);
});

test('createProjectConversationMessage retries a historical user message by trimming later turns', async () => {
  const project: ProjectDocument & {
    _id: NonNullable<ProjectDocument['_id']>;
  } = {
    _id: new ObjectId('507f1f77bcf86cd79943901f'),
    name: '重试历史消息',
    description: '验证历史 replay 会裁掉后续 turn',
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
        id: 'chat-retry-history',
        title: '已有会话',
        titleOrigin: 'manual',
        messages: [
          {
            id: 'msg-user-history-1',
            role: 'user',
            content: '第一轮问题',
            createdAt: new Date('2026-03-17T10:00:00.000Z'),
          },
          {
            id: 'msg-assistant-history-1',
            role: 'assistant',
            content: '第一轮回答',
            createdAt: new Date('2026-03-17T10:00:05.000Z'),
            sources: [],
          },
          {
            id: 'msg-user-history-2',
            role: 'user',
            content: '第二轮问题',
            createdAt: new Date('2026-03-17T10:01:00.000Z'),
          },
          {
            id: 'msg-assistant-history-2',
            role: 'assistant',
            content: '第二轮回答',
            createdAt: new Date('2026-03-17T10:01:05.000Z'),
            sources: [],
          },
        ],
        createdAt: new Date('2026-03-17T10:00:00.000Z'),
        updatedAt: new Date('2026-03-17T10:01:05.000Z'),
      },
    ],
    createdAt: new Date('2026-03-17T00:00:00.000Z'),
    updatedAt: new Date('2026-03-17T10:01:05.000Z'),
  };

  let persistedConversation = project.conversations[0]!;

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
    replaceProjectConversationMessages: async (
      _projectId: string,
      conversationId: string,
      messages: ProjectDocument['conversations'][number]['messages'],
      updatedAt: Date,
    ) => {
      assert.equal(conversationId, 'chat-retry-history');
      persistedConversation = {
        ...persistedConversation,
        messages,
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
      assert.equal(conversationId, 'chat-retry-history');
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
    conversationRuntime: createConversationRuntimeStub({
      generateAssistantReply: async () => ({
        content: '历史 replay 后的新回答',
        sources: [],
      }),
    }),
  });

  const result = await service.createProjectConversationMessage(
    {
      actor: {
        id: 'user-1',
        username: 'langya',
      },
    },
    project._id.toHexString(),
    'chat-retry-history',
    {
      content: '第一轮问题',
      clientRequestId: 'request-replay-history',
      targetUserMessageId: 'msg-user-history-1',
    },
  );

  assert.deepEqual(
    persistedConversation.messages.map((message) => message.id),
    ['msg-user-history-1', persistedConversation.messages[1]!.id],
  );
  assert.equal(
    persistedConversation.messages[1]?.content,
    '历史 replay 后的新回答',
  );
  assert.equal(
    result.conversation.messages.filter((message) => message.role === 'user')
      .length,
    1,
  );
});

test('createProjectConversationMessage edits a historical user message, trims later turns, and refreshes auto title', async () => {
  const project: ProjectDocument & {
    _id: NonNullable<ProjectDocument['_id']>;
  } = {
    _id: new ObjectId('507f1f77bcf86cd799439021'),
    name: '编辑历史消息',
    description: '验证 edit replay 会更新标题',
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
        id: 'chat-edit-history',
        title: '旧自动标题',
        titleOrigin: 'auto',
        messages: [
          {
            id: 'msg-user-edit-1',
            role: 'user',
            content: '旧的第一轮问题',
            createdAt: new Date('2026-03-17T10:00:00.000Z'),
          },
          {
            id: 'msg-assistant-edit-1',
            role: 'assistant',
            content: '旧的第一轮回答',
            createdAt: new Date('2026-03-17T10:00:05.000Z'),
            sources: [],
          },
          {
            id: 'msg-user-edit-2',
            role: 'user',
            content: '旧的第二轮问题',
            createdAt: new Date('2026-03-17T10:01:00.000Z'),
          },
        ],
        createdAt: new Date('2026-03-17T10:00:00.000Z'),
        updatedAt: new Date('2026-03-17T10:01:00.000Z'),
      },
    ],
    createdAt: new Date('2026-03-17T00:00:00.000Z'),
    updatedAt: new Date('2026-03-17T10:01:00.000Z'),
  };

  let persistedConversation = project.conversations[0]!;

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
    replaceProjectConversationMessages: async (
      _projectId: string,
      conversationId: string,
      messages: ProjectDocument['conversations'][number]['messages'],
      updatedAt: Date,
      options?: {
        title?: string;
        titleOrigin?: 'default' | 'auto' | 'manual';
      },
    ) => {
      assert.equal(conversationId, 'chat-edit-history');
      persistedConversation = {
        ...persistedConversation,
        messages,
        title: options?.title ?? persistedConversation.title,
        titleOrigin: options?.titleOrigin ?? persistedConversation.titleOrigin,
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
      assert.equal(conversationId, 'chat-edit-history');
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
    conversationRuntime: createConversationRuntimeStub({
      generateAssistantReply: async () => ({
        content: '编辑后生成的新回答',
        sources: [],
      }),
    }),
  });

  const result = await service.createProjectConversationMessage(
    {
      actor: {
        id: 'user-1',
        username: 'langya',
      },
    },
    project._id.toHexString(),
    'chat-edit-history',
    {
      content: '请帮我重写知识库治理方案',
      clientRequestId: 'request-edit-history',
      targetUserMessageId: 'msg-user-edit-1',
    },
  );

  assert.equal(
    persistedConversation.messages[0]?.content,
    '请帮我重写知识库治理方案',
  );
  assert.equal(persistedConversation.messages.length, 2);
  assert.equal(persistedConversation.title, '重写知识库治理方案');
  assert.equal(persistedConversation.titleOrigin, 'auto');
  assert.equal(result.conversation.title, '重写知识库治理方案');
});

test('createProjectConversationMessage reuses replayed assistant result for the same targetUserMessageId and clientRequestId', async () => {
  const project: ProjectDocument & {
    _id: NonNullable<ProjectDocument['_id']>;
  } = {
    _id: new ObjectId('507f1f77bcf86cd799439022'),
    name: '历史 replay 已完成',
    description: '验证 replay 幂等完成态',
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
        id: 'chat-replay-resolved',
        title: '已有会话',
        titleOrigin: 'manual',
        messages: [
          {
            id: 'msg-user-replay-resolved',
            role: 'user',
            content: '重放后的问题',
            clientRequestId: 'request-replay-resolved',
            createdAt: new Date('2026-03-17T10:00:00.000Z'),
          },
          {
            id: 'msg-assistant-replay-resolved',
            role: 'assistant',
            content: '已存在的 replay 回答。',
            createdAt: new Date('2026-03-17T10:00:05.000Z'),
            sources: [],
          },
        ],
        createdAt: new Date('2026-03-17T10:00:00.000Z'),
        updatedAt: new Date('2026-03-17T10:00:05.000Z'),
      },
    ],
    createdAt: new Date('2026-03-17T00:00:00.000Z'),
    updatedAt: new Date('2026-03-17T10:00:05.000Z'),
  };

  let runtimeCalls = 0;

  const repository = {
    findById: async (projectId: string) =>
      projectId === project._id.toHexString() ? project : null,
  } as unknown as ProjectsRepository;

  const service = createProjectsService({
    repository,
    authRepository: createAuthRepositoryStub(),
    skillBindingValidator: createSkillBindingValidatorStub(),
    conversationRuntime: createConversationRuntimeStub({
      generateAssistantReply: async () => {
        runtimeCalls += 1;

        return {
          content: '这条 replay assistant 不应该再次生成。',
          sources: [],
        };
      },
    }),
  });

  const result = await service.createProjectConversationMessage(
    {
      actor: {
        id: 'user-1',
        username: 'langya',
      },
    },
    project._id.toHexString(),
    'chat-replay-resolved',
    {
      content: '重放后的问题',
      clientRequestId: 'request-replay-resolved',
      targetUserMessageId: 'msg-user-replay-resolved',
    },
  );

  assert.equal(runtimeCalls, 0);
  assert.equal(result.conversation.messages.length, 2);
  assert.equal(
    result.conversation.messages[1]?.content,
    '已存在的 replay 回答。',
  );
});

test('createProjectConversationMessage keeps persisted history when replay generation fails', async () => {
  const project: ProjectDocument & {
    _id: NonNullable<ProjectDocument['_id']>;
  } = {
    _id: new ObjectId('507f1f77bcf86cd799439024'),
    name: 'replay 失败回滚',
    description: '验证 replay 生成失败不会截断已持久化历史',
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
        id: 'chat-replay-failure',
        title: '已有会话',
        titleOrigin: 'manual',
        messages: [
          {
            id: 'msg-user-failure-1',
            role: 'user',
            content: '第一轮问题',
            createdAt: new Date('2026-03-17T10:00:00.000Z'),
          },
          {
            id: 'msg-assistant-failure-1',
            role: 'assistant',
            content: '第一轮回答',
            createdAt: new Date('2026-03-17T10:00:05.000Z'),
            sources: [],
          },
          {
            id: 'msg-user-failure-2',
            role: 'user',
            content: '第二轮问题',
            createdAt: new Date('2026-03-17T10:01:00.000Z'),
          },
        ],
        createdAt: new Date('2026-03-17T10:00:00.000Z'),
        updatedAt: new Date('2026-03-17T10:01:00.000Z'),
      },
    ],
    createdAt: new Date('2026-03-17T00:00:00.000Z'),
    updatedAt: new Date('2026-03-17T10:01:00.000Z'),
  };

  let persistedConversation = toPersistedConversation(
    project._id.toHexString(),
    project.conversations[0]!,
  );

  const repository = {
    findById: async (projectId: string) =>
      projectId === project._id.toHexString()
        ? {
            ...project,
            conversations: [project.conversations[0]!],
            updatedAt: persistedConversation.updatedAt,
            _id: project._id,
          }
        : null,
    appendProjectConversationMessage: async () => {
      throw new Error('appendProjectConversationMessage should not be called');
    },
  } as unknown as ProjectsRepository;

  const projectConversationsRepository = {
    findByProjectAndConversationId: async () => persistedConversation,
    replaceMessages: async (
      _projectId: string,
      conversationId: string,
      messages: ProjectDocument['conversations'][number]['messages'],
      options?: {
        title?: string;
        titleOrigin?: 'default' | 'auto' | 'manual' | null;
        expectedCurrentUpdatedAt?: Date;
      },
    ) => {
      assert.equal(conversationId, 'chat-replay-failure');

      if (
        options?.expectedCurrentUpdatedAt &&
        options.expectedCurrentUpdatedAt.getTime() !==
          persistedConversation.updatedAt.getTime()
      ) {
        return null;
      }

      const updatedAt = new Date(
        persistedConversation.updatedAt.getTime() + 1_000,
      );
      persistedConversation = {
        ...persistedConversation,
        messages,
        title: options?.title ?? persistedConversation.title,
        titleOrigin:
          options?.titleOrigin === null
            ? undefined
            : options?.titleOrigin ?? persistedConversation.titleOrigin,
        updatedAt,
      };

      return persistedConversation;
    },
  } as unknown as ProjectConversationsRepository;

  const service = createProjectsService({
    repository,
    projectConversationsRepository,
    authRepository: createAuthRepositoryStub(),
    skillBindingValidator: createSkillBindingValidatorStub(),
    conversationRuntime: createConversationRuntimeStub({
      generateAssistantReply: async () => {
        throw new Error('llm failed');
      },
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
        'chat-replay-failure',
        {
          content: '第一轮问题（重试后）',
          clientRequestId: 'request-replay-failure',
          targetUserMessageId: 'msg-user-failure-1',
        },
      ),
    /llm failed/,
  );

  assert.deepEqual(
    persistedConversation.messages.map((message) => ({
      id: message.id,
      content: message.content,
    })),
    [
      {
        id: 'msg-user-failure-1',
        content: '第一轮问题',
      },
      {
        id: 'msg-assistant-failure-1',
        content: '第一轮回答',
      },
      {
        id: 'msg-user-failure-2',
        content: '第二轮问题',
      },
    ],
  );
});

test('createProjectConversationMessage rejects invalid targetUserMessageId values', async () => {
  const project: ProjectDocument & {
    _id: NonNullable<ProjectDocument['_id']>;
  } = {
    _id: new ObjectId('507f1f77bcf86cd799439023'),
    name: '非法 replay target',
    description: '验证 replay target 校验',
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
        id: 'chat-invalid-replay-target',
        title: '已有会话',
        messages: [
          {
            id: 'msg-assistant-only',
            role: 'assistant',
            content: '只有 assistant 的占位消息',
            createdAt: new Date('2026-03-17T10:00:00.000Z'),
            sources: [],
          },
        ],
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
  } as unknown as ProjectsRepository;

  const service = createProjectsService({
    repository,
    authRepository: createAuthRepositoryStub(),
    skillBindingValidator: createSkillBindingValidatorStub(),
    conversationRuntime: createConversationRuntimeStub(),
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
        'chat-invalid-replay-target',
        {
          content: '不会被写入',
          clientRequestId: 'request-invalid-replay',
          targetUserMessageId: 'msg-assistant-only',
        },
      ),
    (error: unknown) => {
      assert.ok(error instanceof AppError);
      assert.equal(error.code, 'VALIDATION_ERROR');
      assert.equal(
        error.message,
        'targetUserMessageId 必须指向当前会话中的用户消息',
      );
      return true;
    },
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
        titleOrigin: 'manual',
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
        titleOrigin: 'manual',
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

test('createProjectConversationMessage localizes canonical default-thread content in sync detail envelopes', async () => {
  const project: ProjectDocument & {
    _id: NonNullable<ProjectDocument['_id']>;
  } = {
    _id: new ObjectId('507f1f77bcf86cd7994390bb'),
    name: '默认线程英文回包',
    description: '验证 sync detail locale',
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

  let persistedProject = project;
  let persistedConversation: ProjectConversationDocument | null = null;

  const repository = {
    findById: async (projectId: string) =>
      projectId === project._id.toHexString() ? persistedProject : null,
    materializeDefaultProjectConversation: async (
      _projectId: string,
      conversation: ProjectConversationDocument,
      updatedAt: Date,
    ) => {
      persistedConversation = conversation;
      persistedProject = {
        ...project,
        conversations: [conversation],
        updatedAt,
        _id: project._id,
      };
      return persistedProject;
    },
    appendProjectConversationMessage: async (
      _projectId: string,
      conversationId: string,
      message: ProjectDocument['conversations'][number]['messages'][number],
      updatedAt: Date,
    ) => {
      assert.equal(conversationId, 'chat-default');
      if (!persistedConversation) {
        return null;
      }

      persistedConversation = {
        ...persistedConversation,
        messages: [...persistedConversation.messages, message],
        updatedAt,
      };
      persistedProject = {
        ...project,
        conversations: [persistedConversation],
        updatedAt,
        _id: project._id,
      };

      return persistedProject;
    },
    updateProjectConversationTitle: async () => null,
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
      locale: 'en',
    },
    project._id.toHexString(),
    'chat-default',
    {
      content: 'Please summarize the project status',
    },
  );

  assert.equal(result.conversation.title, '默认线程英文回包 project context');
  assert.match(
    result.conversation.messages[0]?.content ?? '',
    /project conversation entry/,
  );
});

test('streamProjectConversationMessage emits done before citation_patch and persists citation asynchronously', async () => {
  const project: ProjectDocument & {
    _id: NonNullable<ProjectDocument['_id']>;
  } = {
    _id: new ObjectId('507f1f77bcf86cd799439102'),
    name: '流式对话',
    description: '验证流式 turn 主链路',
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
    conversations: [
      {
        id: 'chat-streaming',
        title: '已有会话',
        messages: [],
        createdAt: new Date('2026-03-17T09:00:00.000Z'),
        updatedAt: new Date('2026-03-17T09:00:00.000Z'),
      },
    ],
    createdAt: new Date('2026-03-17T09:00:00.000Z'),
    updatedAt: new Date('2026-03-17T09:00:00.000Z'),
  };
  let persistedConversation = toPersistedConversation(
    project._id.toHexString(),
    project.conversations[0]!,
  );
  const events: ProjectConversationStreamEvent[] = [];
  let resolveCitationPatchSeen: (() => void) | null = null;
  const citationPatchSeen = new Promise<void>((resolve) => {
    resolveCitationPatchSeen = resolve;
  });
  let resolveDoneSeen: (() => void) | null = null;
  const doneSeen = new Promise<void>((resolve) => {
    resolveDoneSeen = resolve;
  });
  let resolveCitationGeneration!: (() => void) | null;
  const citationGeneration = new Promise<void>((resolve) => {
    resolveCitationGeneration = resolve;
  });

  const repository = {
    findById: async (projectId: string) =>
      projectId === project._id.toHexString() ? project : null,
  } as unknown as ProjectsRepository;

  const projectConversationsRepository = {
    findByProjectAndConversationId: async () => persistedConversation,
    appendMessage: async (
      _projectId: string,
      conversationId: string,
      message: ProjectDocument['conversations'][number]['messages'][number],
      updatedAt: Date,
    ) => {
      assert.equal(conversationId, 'chat-streaming');
      persistedConversation = {
        ...persistedConversation,
        messages: [...persistedConversation.messages, message],
        updatedAt,
      };

      return persistedConversation;
    },
    updateMessageCitationContent: async (
      _projectId: string,
      conversationId: string,
      messageId: string,
      citationContent: ProjectConversationCitationContent,
    ) => {
      assert.equal(conversationId, 'chat-streaming');
      persistedConversation = {
        ...persistedConversation,
        messages: persistedConversation.messages.map((message) =>
          message.id === messageId
            ? {
                ...message,
                citationContent,
              }
            : message,
        ),
      };

      return persistedConversation;
    },
  } as unknown as ProjectConversationsRepository;

  const llmConfig: EffectiveLlmConfig = {
    source: 'environment',
    provider: 'openai',
    baseUrl: 'https://api.openai.com/v1',
    model: 'gpt-5.4',
    apiKey: 'openai-api-key',
    requestTimeoutMs: 30000,
  };

  const service = createProjectsService({
    repository,
    projectConversationsRepository,
    authRepository: createAuthRepositoryStub(),
    skillBindingValidator: createSkillBindingValidatorStub(),
    conversationRuntime: {
      streamAssistantReply: async ({
        onSourcesSeed,
        onDelta,
      }: Parameters<ProjectConversationRuntime['streamAssistantReply']>[0]) => {
        await onSourcesSeed?.([
          {
            id: 's1',
            sourceKey: 'source1',
            knowledgeId: 'kb-1',
            documentId: 'doc-1',
            sourceLabel: 'chat-core.md',
            status: 'seeded',
          },
          {
            id: 's2',
            sourceKey: 'source2',
            knowledgeId: 'kb-2',
            documentId: 'doc-2',
            sourceLabel: 'runtime.md',
            status: 'seeded',
          },
        ]);
        const deltas = [
          '当前项目已经具备最小对话写链路。[[source1]]',
          '项目级检索也已开始接入。[[source2]]',
        ];

        for (const delta of deltas) {
          await onDelta(delta);
        }

        return {
          content:
            '当前项目已经具备最小对话写链路。[[source1]]项目级检索也已开始接入。[[source2]]',
          sources: [
            {
              knowledgeId: 'kb-1',
              documentId: 'doc-1',
              chunkId: 'chunk-1',
              chunkIndex: 0,
              source: 'chat-core.md',
              snippet:
                '项目对话已经具备最小消息写链路，并开始接入项目级 merged retrieval。',
              distance: 0.18,
            },
            {
              knowledgeId: 'kb-2',
              documentId: 'doc-2',
              chunkId: 'chunk-8',
              chunkIndex: 2,
              source: 'runtime.md',
              snippet: '项目资源检索已经接入 runtime 编排与流式事件。',
              distance: 0.27,
            },
          ],
          citationContent: {
            version: 1,
            sentences: [
              {
                id: 'sent-1',
                text: '当前项目已经具备最小对话写链路。',
                sourceIds: ['s1'],
                grounded: true,
              },
              {
                id: 'sent-2',
                text: '项目级检索也已开始接入。',
                sourceIds: ['s2'],
                grounded: true,
              },
            ],
          },
          finishReason: 'stop',
          llmConfig,
        };
      },
      generateCitationContent: async ({
        answer,
        sources,
      }: {
        answer: string;
        sources: ProjectConversationSourceDocument[];
      }) => {
        assert.equal(
          answer,
          '当前项目已经具备最小对话写链路。[[source1]]项目级检索也已开始接入。[[source2]]',
        );
        assert.equal(sources.length, 2);
        await citationGeneration;

        return {
          version: 1,
          sentences: [
            {
              id: 'sent-1',
              text: '当前项目已经具备最小对话写链路。',
              sourceIds: ['s1'],
              grounded: true,
            },
            {
              id: 'sent-2',
              text: '项目级检索也已开始接入。',
              sourceIds: ['s2'],
              grounded: true,
            },
          ],
        };
      },
    } as unknown as ProjectConversationRuntime,
  });

  let streamResolved = false;
  const streamPromise = service
    .streamProjectConversationMessage(
      {
        actor: {
          id: 'user-1',
          username: 'langya',
        },
      },
      project._id.toHexString(),
      'chat-streaming',
      {
        content: '请总结当前项目对话现状',
        clientRequestId: 'stream-request-1',
      },
      {
        onEvent: async (event) => {
          events.push(event);

          if (event.type === 'done') {
            resolveDoneSeen?.();
          }

          if (event.type === 'citation_patch') {
            resolveCitationPatchSeen?.();
          }
        },
      },
    )
    .finally(() => {
      streamResolved = true;
    });

  await doneSeen;
  await delay(0);
  assert.equal(
    streamResolved,
    false,
    'stream should stay open until citation patch work finishes',
  );
  assert.deepEqual(persistedConversation?.messages[1]?.citationContent, {
    version: 1,
    sentences: [
      {
        id: 'placeholder-sent-1',
        text: '当前项目已经具备最小对话写链路。',
        sourceIds: ['s1'],
        grounded: true,
      },
      {
        id: 'placeholder-sent-2',
        text: '项目级检索也已开始接入。',
        sourceIds: ['s2'],
        grounded: true,
      },
    ],
  });

  resolveCitationGeneration?.();
  await streamPromise;

  await Promise.race([
    citationPatchSeen,
    delay(50).then(() => {
      throw new Error('citation patch event not observed');
    }),
  ]);

  assert.deepEqual(
    events.map((event) => event.type),
    ['ack', 'sources_seed', 'delta', 'delta', 'done', 'citation_patch'] as Array<
      ProjectConversationStreamEvent['type'] | 'citation_patch'
    >,
  );
  assert.deepEqual(
    events
      .filter(
        (event): event is Extract<ProjectConversationStreamEvent, { type: 'delta' }> =>
          event.type === 'delta',
      )
      .map((event) => event.delta),
    [
      '当前项目已经具备最小对话写链路。[[source1]]',
      '项目级检索也已开始接入。[[source2]]',
    ],
  );
  assert.deepEqual(
    events.map((event) => event.sequence),
    [1, 2, 3, 4, 5, 6],
  );
  assert.equal(events[0]?.clientRequestId, 'stream-request-1');
  assert.equal(events[0]?.type, 'ack');
  assert.equal(events[1]?.type, 'sources_seed');
  assert.notEqual(events[2]?.type, 'sources_seed');
  const seedEvent = events[1] as unknown as {
    type: 'sources_seed';
    sources?: Array<{
      sourceKey?: string;
      id?: string;
      knowledgeId?: string;
      documentId?: string;
      sourceLabel?: string;
      status?: string;
    }>;
  };
  assert.equal(seedEvent.type, 'sources_seed');
  assert.deepEqual(
    seedEvent.sources?.map((source) => [
      source.sourceKey,
      source.knowledgeId,
      source.documentId,
      source.sourceLabel,
      source.status,
    ]),
    [
      ['source1', 'kb-1', 'doc-1', 'chat-core.md', 'seeded'],
      ['source2', 'kb-2', 'doc-2', 'runtime.md', 'seeded'],
    ],
  );
  const sourceTaggedDeltaIndex = events.findIndex(
    (event) => event.type === 'delta' && event.delta.includes('[[source1]]'),
  );
  assert.notEqual(sourceTaggedDeltaIndex, -1);
  assert.ok(sourceTaggedDeltaIndex > 1);
  const doneEvent = events.find((event) => event.type === 'done');
  if (!doneEvent || doneEvent.type !== 'done') {
    throw new Error('doneEvent should be a stream done event');
  }
  const doneSources = (doneEvent.assistantMessage.sources ?? []) as Array<{
    id: string;
    sourceKey?: string;
    knowledgeId: string;
    documentId: string;
    source: string;
  }>;
  assert.equal(persistedConversation?.messages.length, 2);
  assert.equal(persistedConversation?.messages[0]?.role, 'user');
  assert.equal(persistedConversation?.messages[0]?.clientRequestId, 'stream-request-1');
  assert.equal(persistedConversation?.messages[1]?.role, 'assistant');
  assert.equal(
    persistedConversation?.messages[1]?.content,
    '当前项目已经具备最小对话写链路。项目级检索也已开始接入。',
  );
  assert.equal(
    persistedConversation?.messages[1]?.content.includes('[[source'),
    false,
  );
  assert.equal(
    doneEvent.assistantMessage.content,
    '当前项目已经具备最小对话写链路。项目级检索也已开始接入。',
  );
  assert.deepEqual(
    doneSources.map((source) => [
      source.sourceKey,
      source.knowledgeId,
      source.documentId,
      source.source,
    ]),
    [
      ['source1', 'kb-1', 'doc-1', 'chat-core.md'],
      ['source2', 'kb-2', 'doc-2', 'runtime.md'],
    ],
  );
  assert.deepEqual(
    seedEvent.sources?.map((source) => [
      source.sourceKey,
      source.knowledgeId,
      source.documentId,
      source.sourceLabel,
    ]),
    doneSources.map((source) => [
      source.sourceKey,
      source.knowledgeId,
      source.documentId,
      source.source,
    ]),
  );
  assert.deepEqual(
    doneSources.map((source) => source.id),
    ['s1', 's2'],
  );
  assert.deepEqual(doneEvent.assistantMessage.citationContent, {
    version: 1,
    sentences: [
      {
        id: 'placeholder-sent-1',
        text: '当前项目已经具备最小对话写链路。',
        sourceIds: ['s1'],
        grounded: true,
      },
      {
        id: 'placeholder-sent-2',
        text: '项目级检索也已开始接入。',
        sourceIds: ['s2'],
        grounded: true,
      },
    ],
  });
  assert.equal(doneEvent.conversationSummary.id, 'chat-streaming');
  assert.equal(doneEvent.conversationSummary.title, '已有会话');
  assert.equal(
    doneEvent.conversationSummary.preview,
    '当前项目已经具备最小对话写链路。项目级检索也已开始接入。',
  );
  assert.equal(
    doneEvent.conversationSummary.updatedAt,
    persistedConversation?.updatedAt.toISOString(),
  );
  const citationPatchEvent = events[5] as unknown as {
    type: 'citation_patch';
    assistantMessageId: string;
    citationContent: ProjectConversationCitationContent;
  };
  assert.equal(citationPatchEvent.type, 'citation_patch');
  assert.equal(
    citationPatchEvent.assistantMessageId,
    persistedConversation?.messages[1]?.id,
  );
  assert.deepEqual(citationPatchEvent.citationContent, {
    version: 1,
    sentences: [
      {
        id: 'sent-1',
        text: '当前项目已经具备最小对话写链路。',
        sourceIds: ['s1'],
        grounded: true,
      },
      {
        id: 'sent-2',
        text: '项目级检索也已开始接入。',
        sourceIds: ['s2'],
        grounded: true,
      },
    ],
  });
  assert.deepEqual(citationPatchEvent.citationContent, {
    version: 1,
    sentences: [
      {
        id: 'sent-1',
        text: '当前项目已经具备最小对话写链路。',
        sourceIds: ['s1'],
        grounded: true,
      },
      {
        id: 'sent-2',
        text: '项目级检索也已开始接入。',
        sourceIds: ['s2'],
        grounded: true,
      },
    ],
  });
  assert.deepEqual(persistedConversation?.messages[1]?.citationContent, {
    version: 1,
    sentences: [
      {
        id: 'sent-1',
        text: '当前项目已经具备最小对话写链路。',
        sourceIds: ['s1'],
        grounded: true,
      },
      {
        id: 'sent-2',
        text: '项目级检索也已开始接入。',
        sourceIds: ['s2'],
        grounded: true,
      },
    ],
  });
});

test('streamProjectConversationMessage reuses replayed assistant result without emitting fake source seeds', async () => {
  const project: ProjectDocument & {
    _id: NonNullable<ProjectDocument['_id']>;
  } = {
    _id: new ObjectId('507f1f77bcf86cd799439121'),
    name: '流式 replay 已完成',
    description: '验证流式 replay 幂等完成态',
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
        id: 'chat-stream-replay-resolved',
        title: '已有会话',
        titleOrigin: 'manual',
        messages: [
          {
            id: 'msg-user-stream-replay-resolved',
            role: 'user',
            content: '重放后的问题',
            clientRequestId: 'stream-request-replay-resolved',
            createdAt: new Date('2026-03-17T10:00:00.000Z'),
          },
          {
            id: 'msg-assistant-stream-replay-resolved',
            role: 'assistant',
            content: '已存在的流式 replay 回答。',
            createdAt: new Date('2026-03-17T10:00:05.000Z'),
            sources: [],
          },
        ],
        createdAt: new Date('2026-03-17T10:00:00.000Z'),
        updatedAt: new Date('2026-03-17T10:00:05.000Z'),
      },
    ],
    createdAt: new Date('2026-03-17T00:00:00.000Z'),
    updatedAt: new Date('2026-03-17T10:00:05.000Z'),
  };
  const events: ProjectConversationStreamEvent[] = [];
  let runtimeCalls = 0;

  const repository = {
    findById: async (projectId: string) =>
      projectId === project._id.toHexString() ? project : null,
  } as unknown as ProjectsRepository;

  const service = createProjectsService({
    repository,
    authRepository: createAuthRepositoryStub(),
    skillBindingValidator: createSkillBindingValidatorStub(),
    conversationRuntime: createConversationRuntimeStub({
      streamAssistantReply: async ({ onSourcesSeed, onDelta }) => {
        runtimeCalls += 1;
        await onSourcesSeed?.([
          {
            id: 's1',
            sourceKey: 'source1',
            knowledgeId: 'kb-1',
            documentId: 'doc-1',
            sourceLabel: 'should-not-emit.md',
            status: 'seeded',
          },
        ]);
        await onDelta('这条 delta 不应该被发送');

        return {
          content: '这条 replay assistant 不应该再次生成。',
          sources: [],
          finishReason: 'stop',
        };
      },
    }),
  });

  await service.streamProjectConversationMessage(
    {
      actor: {
        id: 'user-1',
        username: 'langya',
      },
    },
    project._id.toHexString(),
    'chat-stream-replay-resolved',
    {
      content: '重放后的问题',
      clientRequestId: 'stream-request-replay-resolved',
      targetUserMessageId: 'msg-user-stream-replay-resolved',
    },
    {
      onEvent: async (event) => {
        events.push(event);
      },
    },
  );

  assert.equal(runtimeCalls, 0);
  assert.deepEqual(
    events.map((event) => event.type),
    ['ack', 'done'],
  );
  assert.equal(events[1]?.type, 'done');
  assert.notEqual(events[1]?.type, 'sources_seed');
});

test('streamProjectConversationMessage emits an error event and skips assistant persistence when upstream fails', async () => {
  const project: ProjectDocument & {
    _id: NonNullable<ProjectDocument['_id']>;
  } = {
    _id: new ObjectId('507f1f77bcf86cd799439103'),
    name: '流式错误',
    description: '验证流式错误收尾',
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
    conversations: [
      {
        id: 'chat-streaming-error',
        title: '已有会话',
        messages: [],
        createdAt: new Date('2026-03-17T09:00:00.000Z'),
        updatedAt: new Date('2026-03-17T09:00:00.000Z'),
      },
    ],
    createdAt: new Date('2026-03-17T09:00:00.000Z'),
    updatedAt: new Date('2026-03-17T09:00:00.000Z'),
  };
  let persistedProject = project;
  const events: ProjectConversationStreamEvent[] = [];

  const repository = {
    findById: async (projectId: string) =>
      projectId === persistedProject._id.toHexString() ? persistedProject : null,
    appendProjectConversationMessage: async (
      _projectId: string,
      conversationId: string,
      message: ProjectDocument['conversations'][number]['messages'][number],
      updatedAt: Date,
    ) => {
      persistedProject = {
        ...persistedProject,
        conversations: persistedProject.conversations.map((conversation) =>
          conversation.id === conversationId
            ? {
                ...conversation,
                messages: [...conversation.messages, message],
                updatedAt,
              }
            : conversation,
        ),
        updatedAt,
      };

      return persistedProject;
    },
  } as unknown as ProjectsRepository;

  const service = createProjectsService({
    repository,
    authRepository: createAuthRepositoryStub(),
    skillBindingValidator: createSkillBindingValidatorStub(),
    conversationRuntime: createConversationRuntimeStub({
      streamAssistantReply: async ({ onDelta }) => {
        await onDelta('半截回复');

        throw new AppError({
          statusCode: 429,
          code: 'PROJECT_CONVERSATION_LLM_UPSTREAM_ERROR',
          message: 'rate limit exceeded (HTTP 429)',
          messageKey: 'project.conversation.streamFailed',
        });
      },
    }),
  });

  await service.streamProjectConversationMessage(
    {
      actor: {
        id: 'user-1',
        username: 'langya',
      },
      locale: 'en',
    },
    persistedProject._id.toHexString(),
    'chat-streaming-error',
    {
      content: '请验证流式错误',
      clientRequestId: 'stream-request-2',
    },
    {
      onEvent: async (event) => {
        events.push(event);
      },
    },
  );

  assert.deepEqual(
    events.map((event) => event.type),
    ['ack', 'delta', 'error'],
  );
  const errorEvent = events[2];
  assert.equal(errorEvent?.type, 'error');
  if (errorEvent?.type !== 'error') {
    throw new Error('errorEvent should be a stream error');
  }

  assert.equal(errorEvent.code, 'PROJECT_CONVERSATION_LLM_UPSTREAM_ERROR');
  assert.equal(errorEvent.retryable, true);
  assert.equal(errorEvent.message, 'rate limit exceeded (HTTP 429)');
  assert.equal(persistedProject.conversations[0]?.messages.length, 1);
  assert.equal(persistedProject.conversations[0]?.messages[0]?.role, 'user');
});

test('streamProjectConversationMessage does not emit source seeds when upstream fails before the first delta', async () => {
  const project: ProjectDocument & {
    _id: NonNullable<ProjectDocument['_id']>;
  } = {
    _id: new ObjectId('507f1f77bcf86cd799439122'),
    name: '流式预热错误',
    description: '验证首个 delta 前失败不会泄露 source seed',
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
    conversations: [
      {
        id: 'chat-streaming-seed-error',
        title: '已有会话',
        messages: [],
        createdAt: new Date('2026-03-17T09:00:00.000Z'),
        updatedAt: new Date('2026-03-17T09:00:00.000Z'),
      },
    ],
    createdAt: new Date('2026-03-17T09:00:00.000Z'),
    updatedAt: new Date('2026-03-17T09:00:00.000Z'),
  };
  let persistedProject = project;
  const events: ProjectConversationStreamEvent[] = [];

  const repository = {
    findById: async (projectId: string) =>
      projectId === persistedProject._id.toHexString() ? persistedProject : null,
    appendProjectConversationMessage: async (
      _projectId: string,
      conversationId: string,
      message: ProjectDocument['conversations'][number]['messages'][number],
      updatedAt: Date,
    ) => {
      persistedProject = {
        ...persistedProject,
        conversations: persistedProject.conversations.map((conversation) =>
          conversation.id === conversationId
            ? {
                ...conversation,
                messages: [...conversation.messages, message],
                updatedAt,
              }
            : conversation,
        ),
        updatedAt,
      };

      return persistedProject;
    },
  } as unknown as ProjectsRepository;

  const service = createProjectsService({
    repository,
    authRepository: createAuthRepositoryStub(),
    skillBindingValidator: createSkillBindingValidatorStub(),
    conversationRuntime: createConversationRuntimeStub({
      streamAssistantReply: async ({ onSourcesSeed }) => {
        await onSourcesSeed?.([
          {
            id: 's1',
            sourceKey: 'source1',
            knowledgeId: 'kb-1',
            documentId: 'doc-1',
            sourceLabel: 'chat-core.md',
            status: 'seeded',
          },
        ]);

        throw new AppError({
          statusCode: 429,
          code: 'PROJECT_CONVERSATION_LLM_UPSTREAM_ERROR',
          message: 'rate limit exceeded (HTTP 429)',
          messageKey: 'project.conversation.streamFailed',
        });
      },
    }),
  });

  await service.streamProjectConversationMessage(
    {
      actor: {
        id: 'user-1',
        username: 'langya',
      },
      locale: 'en',
    },
    persistedProject._id.toHexString(),
    'chat-streaming-seed-error',
    {
      content: '请验证预热失败',
      clientRequestId: 'stream-request-seed-error',
    },
    {
      onEvent: async (event) => {
        events.push(event);
      },
    },
  );

  assert.deepEqual(
    events.map((event) => event.type),
    ['ack', 'error'],
  );
  assert.equal(events.some((event) => event.type === 'sources_seed'), false);
  assert.equal(persistedProject.conversations[0]?.messages.length, 1);
  assert.equal(persistedProject.conversations[0]?.messages[0]?.role, 'user');
});

test('streamProjectConversationMessage marks setup failures as non-retryable', async () => {
  const project: ProjectDocument & {
    _id: NonNullable<ProjectDocument['_id']>;
  } = {
    _id: new ObjectId('507f1f77bcf86cd799439107'),
    name: '流式配置错误',
    description: '验证非瞬时错误不会标成 retryable',
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
    conversations: [
      {
        id: 'chat-streaming-setup-error',
        title: '已有会话',
        messages: [],
        createdAt: new Date('2026-03-17T09:00:00.000Z'),
        updatedAt: new Date('2026-03-17T09:00:00.000Z'),
      },
    ],
    createdAt: new Date('2026-03-17T09:00:00.000Z'),
    updatedAt: new Date('2026-03-17T09:00:00.000Z'),
  };
  let persistedProject = project;
  const events: ProjectConversationStreamEvent[] = [];

  const repository = {
    findById: async (projectId: string) =>
      projectId === persistedProject._id.toHexString() ? persistedProject : null,
    appendProjectConversationMessage: async (
      _projectId: string,
      conversationId: string,
      message: ProjectDocument['conversations'][number]['messages'][number],
      updatedAt: Date,
    ) => {
      persistedProject = {
        ...persistedProject,
        conversations: persistedProject.conversations.map((conversation) =>
          conversation.id === conversationId
            ? {
                ...conversation,
                messages: [...conversation.messages, message],
                updatedAt,
              }
            : conversation,
        ),
        updatedAt,
      };

      return persistedProject;
    },
  } as unknown as ProjectsRepository;

  const service = createProjectsService({
    repository,
    authRepository: createAuthRepositoryStub(),
    skillBindingValidator: createSkillBindingValidatorStub(),
    conversationRuntime: createConversationRuntimeStub({
      streamAssistantReply: async () => {
        throw new AppError({
          statusCode: 503,
          code: 'PROJECT_CONVERSATION_LLM_UNAVAILABLE',
          message: '当前未配置可用的对话模型，请先完成 LLM 设置',
          messageKey: 'project.conversation.llmUnavailable',
        });
      },
    }),
  });

  await service.streamProjectConversationMessage(
    {
      actor: {
        id: 'user-1',
        username: 'langya',
      },
      locale: 'en',
    },
    persistedProject._id.toHexString(),
    'chat-streaming-setup-error',
    {
      content: '请验证配置错误',
      clientRequestId: 'stream-request-setup-error',
    },
    {
      onEvent: async (event) => {
        events.push(event);
      },
    },
  );

  assert.deepEqual(
    events.map((event) => event.type),
    ['ack', 'error'],
  );
  const errorEvent = events[1];
  assert.equal(errorEvent?.type, 'error');
  if (errorEvent?.type !== 'error') {
    throw new Error('errorEvent should be a stream error');
  }

  assert.equal(errorEvent.code, 'PROJECT_CONVERSATION_LLM_UNAVAILABLE');
  assert.equal(errorEvent.retryable, false);
  assert.equal(
    errorEvent.message,
    'No available conversation model is configured yet',
  );
  assert.equal(persistedProject.conversations[0]?.messages.length, 1);
  assert.equal(persistedProject.conversations[0]?.messages[0]?.role, 'user');
});

test('streamProjectConversationMessage keeps only the persisted user message when the client aborts mid-stream', async () => {
  const project: ProjectDocument & {
    _id: NonNullable<ProjectDocument['_id']>;
  } = {
    _id: new ObjectId('507f1f77bcf86cd799439104'),
    name: '流式取消',
    description: '验证用户主动取消',
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
    conversations: [
      {
        id: 'chat-streaming-cancel',
        title: '已有会话',
        messages: [],
        createdAt: new Date('2026-03-17T09:00:00.000Z'),
        updatedAt: new Date('2026-03-17T09:00:00.000Z'),
      },
    ],
    createdAt: new Date('2026-03-17T09:00:00.000Z'),
    updatedAt: new Date('2026-03-17T09:00:00.000Z'),
  };
  let persistedProject = project;
  const events: ProjectConversationStreamEvent[] = [];
  const abortController = new AbortController();

  const repository = {
    findById: async (projectId: string) =>
      projectId === persistedProject._id.toHexString() ? persistedProject : null,
    appendProjectConversationMessage: async (
      _projectId: string,
      conversationId: string,
      message: ProjectDocument['conversations'][number]['messages'][number],
      updatedAt: Date,
    ) => {
      persistedProject = {
        ...persistedProject,
        conversations: persistedProject.conversations.map((conversation) =>
          conversation.id === conversationId
            ? {
                ...conversation,
                messages: [...conversation.messages, message],
                updatedAt,
              }
            : conversation,
        ),
        updatedAt,
      };

      return persistedProject;
    },
  } as unknown as ProjectsRepository;

  const service = createProjectsService({
    repository,
    authRepository: createAuthRepositoryStub(),
    skillBindingValidator: createSkillBindingValidatorStub(),
    conversationRuntime: createConversationRuntimeStub({
      streamAssistantReply: async ({ signal, onDelta }) => {
        await onDelta('先返回一段');

        if (signal?.aborted) {
          throw new DOMException('Aborted', 'AbortError');
        }

        return {
          content: '这段回复不应该被持久化',
          sources: [],
          finishReason: 'stop',
        };
      },
    }),
  });

  await service.streamProjectConversationMessage(
    {
      actor: {
        id: 'user-1',
        username: 'langya',
      },
    },
    persistedProject._id.toHexString(),
    'chat-streaming-cancel',
    {
      content: '请验证取消',
      clientRequestId: 'stream-request-3',
    },
    {
      signal: abortController.signal,
      onEvent: async (event) => {
        events.push(event);

        if (event.type === 'delta') {
          abortController.abort();
        }
      },
    },
  );

  assert.deepEqual(
    events.map((event) => event.type),
    ['ack', 'delta'],
  );
  assert.equal(events.some((event) => event.type === 'citation_patch'), false);
  assert.equal(persistedProject.conversations[0]?.messages.length, 1);
  assert.equal(persistedProject.conversations[0]?.messages[0]?.role, 'user');
});

test('streamProjectConversationMessage does not emit source seeds when cancelled before the first delta', async () => {
  const project: ProjectDocument & {
    _id: NonNullable<ProjectDocument['_id']>;
  } = {
    _id: new ObjectId('507f1f77bcf86cd799439123'),
    name: '流式预热取消',
    description: '验证首个 delta 前取消不会泄露 source seed',
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
    conversations: [
      {
        id: 'chat-streaming-seed-cancel',
        title: '已有会话',
        messages: [],
        createdAt: new Date('2026-03-17T09:00:00.000Z'),
        updatedAt: new Date('2026-03-17T09:00:00.000Z'),
      },
    ],
    createdAt: new Date('2026-03-17T09:00:00.000Z'),
    updatedAt: new Date('2026-03-17T09:00:00.000Z'),
  };
  let persistedProject = project;
  const events: ProjectConversationStreamEvent[] = [];
  const abortController = new AbortController();

  const repository = {
    findById: async (projectId: string) =>
      projectId === persistedProject._id.toHexString() ? persistedProject : null,
    appendProjectConversationMessage: async (
      _projectId: string,
      conversationId: string,
      message: ProjectDocument['conversations'][number]['messages'][number],
      updatedAt: Date,
    ) => {
      persistedProject = {
        ...persistedProject,
        conversations: persistedProject.conversations.map((conversation) =>
          conversation.id === conversationId
            ? {
                ...conversation,
                messages: [...conversation.messages, message],
                updatedAt,
              }
            : conversation,
        ),
        updatedAt,
      };

      return persistedProject;
    },
  } as unknown as ProjectsRepository;

  const service = createProjectsService({
    repository,
    authRepository: createAuthRepositoryStub(),
    skillBindingValidator: createSkillBindingValidatorStub(),
    conversationRuntime: createConversationRuntimeStub({
      streamAssistantReply: async ({ signal, onSourcesSeed }) => {
        await onSourcesSeed?.([
          {
            id: 's1',
            sourceKey: 'source1',
            knowledgeId: 'kb-1',
            documentId: 'doc-1',
            sourceLabel: 'chat-core.md',
            status: 'seeded',
          },
        ]);

        abortController.abort();

        if (signal?.aborted) {
          throw new DOMException('Aborted', 'AbortError');
        }

        return {
          content: '这段回复不应该被持久化',
          sources: [],
          finishReason: 'cancelled',
        };
      },
    }),
  });

  await service.streamProjectConversationMessage(
    {
      actor: {
        id: 'user-1',
        username: 'langya',
      },
    },
    persistedProject._id.toHexString(),
    'chat-streaming-seed-cancel',
    {
      content: '请验证预热取消',
      clientRequestId: 'stream-request-seed-cancel',
    },
    {
      signal: abortController.signal,
      onEvent: async (event) => {
        events.push(event);
      },
    },
  );

  assert.deepEqual(
    events.map((event) => event.type),
    ['ack'],
  );
  assert.equal(events.some((event) => event.type === 'sources_seed'), false);
  assert.equal(events.some((event) => event.type === 'citation_patch'), false);
  assert.equal(persistedProject.conversations[0]?.messages.length, 1);
  assert.equal(persistedProject.conversations[0]?.messages[0]?.role, 'user');
});

test('streamProjectConversationMessage keeps persisted history when replay is aborted mid-stream', async () => {
  const project: ProjectDocument & {
    _id: NonNullable<ProjectDocument['_id']>;
  } = {
    _id: new ObjectId('507f1f77bcf86cd799439105'),
    name: '流式 replay 取消',
    description: '验证 replay 流式取消不会截断历史',
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
    conversations: [
      {
        id: 'chat-streaming-replay-cancel',
        title: '已有会话',
        titleOrigin: 'manual',
        messages: [
          {
            id: 'msg-user-stream-replay-1',
            role: 'user',
            content: '第一轮问题',
            createdAt: new Date('2026-03-17T09:00:00.000Z'),
          },
          {
            id: 'msg-assistant-stream-replay-1',
            role: 'assistant',
            content: '第一轮回答',
            createdAt: new Date('2026-03-17T09:00:05.000Z'),
            sources: [],
          },
          {
            id: 'msg-user-stream-replay-2',
            role: 'user',
            content: '第二轮问题',
            createdAt: new Date('2026-03-17T09:01:00.000Z'),
          },
        ],
        createdAt: new Date('2026-03-17T09:00:00.000Z'),
        updatedAt: new Date('2026-03-17T09:01:00.000Z'),
      },
    ],
    createdAt: new Date('2026-03-17T09:00:00.000Z'),
    updatedAt: new Date('2026-03-17T09:01:00.000Z'),
  };
  let persistedProject = project;
  const events: ProjectConversationStreamEvent[] = [];
  const abortController = new AbortController();

  const repository = {
    findById: async (projectId: string) =>
      projectId === persistedProject._id.toHexString() ? persistedProject : null,
    replaceProjectConversationMessages: async (
      _projectId: string,
      conversationId: string,
      messages: ProjectDocument['conversations'][number]['messages'],
      updatedAt: Date,
      options?: {
        title?: string;
        titleOrigin?: 'default' | 'auto' | 'manual' | null;
      },
    ) => {
      persistedProject = {
        ...persistedProject,
        conversations: persistedProject.conversations.map((conversation) =>
          conversation.id === conversationId
            ? {
                ...conversation,
                messages,
                title: options?.title ?? conversation.title,
                titleOrigin:
                  options?.titleOrigin === null
                    ? undefined
                    : options?.titleOrigin ?? conversation.titleOrigin,
                updatedAt,
              }
            : conversation,
        ),
        updatedAt,
      };

      return persistedProject;
    },
    appendProjectConversationMessage: async () => {
      throw new Error('appendProjectConversationMessage should not be called');
    },
  } as unknown as ProjectsRepository;

  const service = createProjectsService({
    repository,
    authRepository: createAuthRepositoryStub(),
    skillBindingValidator: createSkillBindingValidatorStub(),
    conversationRuntime: createConversationRuntimeStub({
      streamAssistantReply: async ({ signal, onDelta }) => {
        await onDelta('先返回一段');

        if (signal?.aborted) {
          throw new DOMException('Aborted', 'AbortError');
        }

        return {
          content: '这段回复不应该被持久化',
          sources: [],
          finishReason: 'stop',
        };
      },
    }),
  });

  await service.streamProjectConversationMessage(
    {
      actor: {
        id: 'user-1',
        username: 'langya',
      },
    },
    persistedProject._id.toHexString(),
    'chat-streaming-replay-cancel',
    {
      content: '第一轮问题（重试）',
      clientRequestId: 'stream-request-replay-cancel',
      targetUserMessageId: 'msg-user-stream-replay-1',
    },
    {
      signal: abortController.signal,
      onEvent: async (event) => {
        events.push(event);

        if (event.type === 'delta') {
          abortController.abort();
        }
      },
    },
  );

  assert.deepEqual(
    events.map((event) => event.type),
    ['ack', 'delta'],
  );
  assert.deepEqual(
    persistedProject.conversations[0]?.messages.map((message) => ({
      id: message.id,
      content: message.content,
    })),
    [
      {
        id: 'msg-user-stream-replay-1',
        content: '第一轮问题',
      },
      {
        id: 'msg-assistant-stream-replay-1',
        content: '第一轮回答',
      },
      {
        id: 'msg-user-stream-replay-2',
        content: '第二轮问题',
      },
    ],
  );
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
    locale?: ProjectCommandContext['locale'];
  }> = [];
  const capturedLlmRequests: CapturedLlmRequest[] = [];
  const originalFetch = global.fetch;

  global.fetch = async (input, init) => {
    capturedLlmRequests.push({
      url: typeof input === 'string' ? input : input.toString(),
      body: JSON.parse(String(init?.body ?? '{}')) as CapturedLlmRequest['body'],
    });

    const callIndex = capturedLlmRequests.length;

    return new Response(
      JSON.stringify({
        choices: [
          {
            message: {
              content:
                callIndex === 1
                  ? '当前项目已经接入正式项目知识检索，并区分全局绑定知识与项目私有知识。'
                  : '```json\n{"version":1,"sentences":[{"id":"sent-1","text":"当前项目已经接入正式项目知识检索，并区分全局绑定知识与项目私有知识。","sourceIds":["s1"],"grounded":true}]}\n```',
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
        searchProjectDocuments: async (context, runtimeProjectId, input) => {
          capturedSearchCalls.push({
            projectId: runtimeProjectId,
            query: input.query,
            topK: input.topK,
            locale: context.locale,
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
      locale: 'en',
      project,
      conversation,
      userMessage: conversation.messages[1]!,
    });

    assert.deepEqual(capturedSearchCalls, [
      {
        projectId,
        query: '请总结当前项目知识基线',
        topK: 5,
        locale: 'en',
      },
    ]);
    assert.equal(capturedLlmRequests.length, 2);
    const answerRequest = capturedLlmRequests[0];
    const groundingRequest = capturedLlmRequests[1];

    if (!answerRequest || !groundingRequest) {
      throw new Error('capturedLlmRequests should contain answer and grounding');
    }

    const persistedMessages = answerRequest.body.messages ?? [];
    const latestPromptMessage = persistedMessages[persistedMessages.length - 1];
    assert.match(answerRequest.url, /https:\/\/api\.openai\.com\/v1\/chat\/completions/);
    assert.equal(answerRequest.body.model, 'gpt-5.4');
    assert.match(
      latestPromptMessage?.content ?? '',
      /architecture\.md/,
    );
    assert.match(
      groundingRequest.body.messages?.[1]?.content ?? '',
      /结构化 citation JSON/,
    );
    assert.equal(
      result.content,
      '当前项目已经接入正式项目知识检索，并区分全局绑定知识与项目私有知识。',
    );
    assert.deepEqual(result.sources, [
      {
        id: 's1',
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
    assert.deepEqual(result.citationContent, {
      version: 1,
      sentences: [
        {
          id: 'sent-1',
          text: '当前项目已经接入正式项目知识检索，并区分全局绑定知识与项目私有知识。',
          sourceIds: ['s1'],
          grounded: true,
        },
      ],
    });
  } finally {
    global.fetch = originalFetch;
  }
});

test('createProjectConversationRuntime streams deltas from an OpenAI-compatible SSE response', async () => {
  const projectId = '507f1f77bcf86cd799439105';
  const project: ProjectDocument & {
    _id: NonNullable<ProjectDocument['_id']>;
  } = {
    _id: new ObjectId(projectId),
    name: '流式 runtime',
    description: '验证 runtime 流式编排',
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
    id: 'chat-stream-runtime',
    title: '流式会话',
    messages: [
      {
        id: 'msg-stream-user',
        role: 'user' as const,
        content: '请总结当前流式架构',
        createdAt: new Date('2026-03-17T09:05:00.000Z'),
      },
    ],
    createdAt: new Date('2026-03-17T09:00:00.000Z'),
    updatedAt: new Date('2026-03-17T09:05:00.000Z'),
  };
  const originalFetch = global.fetch;
  const encoder = new TextEncoder();
  const sourceSeeds: Array<
    Array<{
      id: string;
      sourceKey: string;
      knowledgeId: string;
      documentId: string;
      sourceLabel: string;
      status: 'seeded';
    }>
  > = [];
  const receivedDeltas: string[] = [];

  global.fetch = async (_input, init) => {
    const body = JSON.parse(String(init?.body ?? '{}')) as {
      stream?: boolean;
    };

    if (body.stream) {
      return createAbortAwareSseResponse({
        signal: init?.signal ?? undefined,
        encoder,
        steps: [
          {
            afterMs: 0,
            chunk: 'data: {"choices":[{"delta":{"content":"当前项目对话已切到"}}]}\n\n',
          },
          {
            afterMs: 0,
            chunk: 'data: {"choices":[{"delta":{"content":"统一流式编排。"},"finish_reason":"stop"}]}\n\n',
          },
          {
            afterMs: 0,
            chunk: 'data: [DONE]\n\n',
          },
        ],
      });
    }

    return new Response(
      JSON.stringify({
        choices: [
          {
            message: {
              content:
                '{"version":1,"sentences":[{"id":"sent-1","text":"","sourceIds":["s1"],"grounded":true}]}',
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
        searchProjectDocuments: async () => ({
          query: '请总结当前流式架构',
          sourceType: 'global_docs',
          total: 2,
          items: [
            {
              knowledgeId: 'kb-1',
              documentId: 'doc-1',
              chunkId: 'chunk-1',
              chunkIndex: 0,
              type: 'global_docs',
              source: 'streaming-architecture.md',
              content: '流式架构要求服务端统一 turn owner，并在 done 后回读服务端真相。',
              distance: 0.06,
            },
            {
              knowledgeId: 'kb-1',
              documentId: 'doc-1',
              chunkId: 'chunk-2',
              chunkIndex: 1,
              type: 'global_docs',
              source: 'streaming-architecture.md',
              content: '同一文档的第二个 chunk 继续解释 sourceKey 需要按分组稳定。',
              distance: 0.08,
            },
          ],
        }),
      },
    });

    const result = await runtime.streamAssistantReply({
      actor: {
        id: 'user-1',
        username: 'langya',
      },
      project,
      conversation,
      userMessage: conversation.messages[0]!,
      onSourcesSeed: async (sources) => {
        sourceSeeds.push(sources);
      },
      onDelta: async (delta) => {
        receivedDeltas.push(delta);
      },
    });

    assert.deepEqual(sourceSeeds, [
      [
        {
          id: 's1',
          sourceKey: 'source1',
          knowledgeId: 'kb-1',
          documentId: 'doc-1',
          sourceLabel: 'streaming-architecture.md',
          status: 'seeded',
        },
      ],
    ]);
    assert.deepEqual(receivedDeltas, ['当前项目对话已切到', '统一流式编排。']);
    assert.equal(result.content, '当前项目对话已切到统一流式编排。');
    assert.equal(result.finishReason, 'stop');
  assert.equal(result.llmConfig.provider, 'openai');
  assert.equal(result.llmConfig.model, 'gpt-5.4');
    assert.equal(result.sources[0]?.id, 's1');
    assert.equal(result.sources[0]?.source, 'streaming-architecture.md');
    assert.equal(result.sources[0]?.sourceKey, 'source1');
    assert.equal(result.sources[1]?.sourceKey, 'source1');
  } finally {
    global.fetch = originalFetch;
  }
});

test('createProjectConversationRuntime keeps streaming while chunks continue before idle timeout', async () => {
  const projectId = '507f1f77bcf86cd799439115';
  const project: ProjectDocument & {
    _id: NonNullable<ProjectDocument['_id']>;
  } = {
    _id: new ObjectId(projectId),
    name: '流式 idle timeout',
    description: '验证流式空闲超时',
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
    id: 'chat-stream-runtime-timeout',
    title: '流式超时会话',
    messages: [
      {
        id: 'msg-stream-user-timeout',
        role: 'user' as const,
        content: '请总结当前流式超时策略',
        createdAt: new Date('2026-03-17T09:05:00.000Z'),
      },
    ],
    createdAt: new Date('2026-03-17T09:00:00.000Z'),
    updatedAt: new Date('2026-03-17T09:05:00.000Z'),
  };
  const originalFetch = global.fetch;
  const encoder = new TextEncoder();
  const receivedDeltas: string[] = [];
  const env = {
    ...createTestEnv(),
    openai: {
      ...createTestEnv().openai,
      requestTimeoutMs: 20,
    },
  };

  global.fetch = async (_input, init) => {
    return createAbortAwareSseResponse({
      signal: init?.signal ?? undefined,
      encoder,
      steps: [
        {
          afterMs: 15,
          chunk: 'data: {"choices":[{"delta":{"content":"第一段"}}]}\n\n',
        },
        {
          afterMs: 15,
          chunk: 'data: {"choices":[{"delta":{"content":"第二段"},"finish_reason":"stop"}]}\n\n',
        },
        {
          afterMs: 15,
          chunk: 'data: [DONE]\n\n',
        },
      ],
    });
  };

  try {
    const runtime = createProjectConversationRuntime({
      env,
      settingsRepository: createSettingsRepositoryStub(),
      knowledgeSearch: {
        searchProjectDocuments: async () => ({
          query: '请总结当前流式超时策略',
          sourceType: 'global_docs',
          total: 0,
          items: [],
        }),
      },
    });

    const result = await runtime.streamAssistantReply({
      actor: {
        id: 'user-1',
        username: 'langya',
      },
      project,
      conversation,
      userMessage: conversation.messages[0]!,
      onDelta: async (delta) => {
        receivedDeltas.push(delta);
      },
    });

    assert.deepEqual(receivedDeltas, ['第一段', '第二段']);
    assert.equal(result.content, '第一段第二段');
    assert.equal(result.finishReason, 'stop');
  } finally {
    global.fetch = originalFetch;
  }
});

test('createProjectConversationRuntime stops reading after [DONE] even if the socket closes later', async () => {
  const projectId = '507f1f77bcf86cd799439117';
  const project: ProjectDocument & {
    _id: NonNullable<ProjectDocument['_id']>;
  } = {
    _id: new ObjectId(projectId),
    name: '流式 done 延迟关闭',
    description: '验证 [DONE] 后不会继续等到 idle timeout',
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
  const conversation = {
    id: 'chat-stream-runtime-done-delay',
    title: '流式 done 延迟关闭会话',
    messages: [
      {
        id: 'msg-stream-user-done-delay',
        role: 'user' as const,
        content: '请总结当前 done 处理',
        createdAt: new Date('2026-03-17T09:05:00.000Z'),
      },
    ],
    createdAt: new Date('2026-03-17T09:00:00.000Z'),
    updatedAt: new Date('2026-03-17T09:05:00.000Z'),
  };
  const originalFetch = global.fetch;
  const encoder = new TextEncoder();
  const receivedDeltas: string[] = [];
  const env = {
    ...createTestEnv(),
    openai: {
      ...createTestEnv().openai,
      requestTimeoutMs: 20,
    },
  };

  global.fetch = async (_input, init) => {
    return createAbortAwareSseResponse({
      signal: init?.signal ?? undefined,
      encoder,
      steps: [
        {
          afterMs: 0,
          chunk: 'data: {"choices":[{"delta":{"content":"已收到完成前正文"},"finish_reason":"stop"}]}\n\n',
        },
        {
          afterMs: 0,
          chunk: 'data: [DONE]\n\n',
        },
        {
          afterMs: 35,
          chunk: '',
        },
      ],
    });
  };

  try {
    const runtime = createProjectConversationRuntime({
      env,
      settingsRepository: createSettingsRepositoryStub(),
      knowledgeSearch: {
        searchProjectDocuments: async () => ({
          query: '请总结当前 done 处理',
          sourceType: 'global_docs',
          total: 0,
          items: [],
        }),
      },
    });

    const result = await runtime.streamAssistantReply({
      actor: {
        id: 'user-1',
        username: 'langya',
      },
      project,
      conversation,
      userMessage: conversation.messages[0]!,
      onDelta: async (delta) => {
        receivedDeltas.push(delta);
      },
    });

    assert.deepEqual(receivedDeltas, ['已收到完成前正文']);
    assert.equal(result.content, '已收到完成前正文');
    assert.equal(result.finishReason, 'stop');
  } finally {
    global.fetch = originalFetch;
  }
});

test('createProjectConversationRuntime fails when the stream stays idle past timeout', async () => {
  const projectId = '507f1f77bcf86cd799439116';
  const project: ProjectDocument & {
    _id: NonNullable<ProjectDocument['_id']>;
  } = {
    _id: new ObjectId(projectId),
    name: '流式 idle timeout failure',
    description: '验证流式 idle timeout 失败',
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
  const conversation = {
    id: 'chat-stream-runtime-timeout-failure',
    title: '流式超时失败会话',
    messages: [
      {
        id: 'msg-stream-user-timeout-failure',
        role: 'user' as const,
        content: '请总结当前流式超时失败',
        createdAt: new Date('2026-03-17T09:05:00.000Z'),
      },
    ],
    createdAt: new Date('2026-03-17T09:00:00.000Z'),
    updatedAt: new Date('2026-03-17T09:05:00.000Z'),
  };
  const originalFetch = global.fetch;
  const encoder = new TextEncoder();
  const env = {
    ...createTestEnv(),
    openai: {
      ...createTestEnv().openai,
      requestTimeoutMs: 20,
    },
  };

  global.fetch = async (_input, init) => {
    return createAbortAwareSseResponse({
      signal: init?.signal ?? undefined,
      encoder,
      steps: [
        {
          afterMs: 35,
          chunk: 'data: {"choices":[{"delta":{"content":"迟到的第一段"}}]}\n\n',
        },
        {
          afterMs: 0,
          chunk: 'data: [DONE]\n\n',
        },
      ],
    });
  };

  try {
    const runtime = createProjectConversationRuntime({
      env,
      settingsRepository: createSettingsRepositoryStub(),
      knowledgeSearch: {
        searchProjectDocuments: async () => ({
          query: '请总结当前流式超时失败',
          sourceType: 'global_docs',
          total: 0,
          items: [],
        }),
      },
    });

    await assert.rejects(
      () =>
        runtime.streamAssistantReply({
          actor: {
            id: 'user-1',
            username: 'langya',
          },
          project,
          conversation,
          userMessage: conversation.messages[0]!,
          onDelta: async () => undefined,
        }),
      (error: unknown) => {
        assert.ok(error instanceof AppError);
        assert.equal(error.code, 'PROJECT_CONVERSATION_LLM_UPSTREAM_ERROR');
        assert.equal(error.messageKey, 'project.conversation.timeout');
        assert.equal(error.message, '项目对话流式生成超时，请稍后重试');
        assert.deepEqual(error.details, {
          timeoutMs: 20,
        });
        return true;
      },
    );
  } finally {
    global.fetch = originalFetch;
  }
});

test('createProjectConversationRuntime rejects streaming when the provider lacks a supported stream adapter', async () => {
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
          query: 'stream provider drift',
          sourceType: 'global_docs',
          total: 0,
          items: [],
        }),
      },
    });

    await assert.rejects(
      () =>
        runtime.streamAssistantReply({
          actor: {
            id: 'user-1',
            username: 'langya',
          },
          project: {
            _id: new ObjectId('507f1f77bcf86cd799439106'),
            name: 'Anthropic Stream Drift',
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
            createdAt: new Date('2026-03-17T00:00:00.000Z'),
            updatedAt: new Date('2026-03-17T00:00:00.000Z'),
          },
          conversation: {
            id: 'chat-stream-anthropic',
            title: 'Anthropic Stream',
            messages: [],
            createdAt: new Date('2026-03-17T00:00:00.000Z'),
            updatedAt: new Date('2026-03-17T00:00:00.000Z'),
          },
          userMessage: {
            id: 'msg-stream-anthropic',
            role: 'user',
            content: '测试 anthropic stream provider',
            createdAt: new Date('2026-03-17T00:00:00.000Z'),
          },
          onDelta: async () => undefined,
        }),
      (error) =>
        error instanceof AppError &&
        [
          'PROJECT_CONVERSATION_LLM_PROVIDER_UNSUPPORTED',
          'PROJECT_CONVERSATION_LLM_STREAM_UNSUPPORTED',
        ].includes(error.code),
    );
  });
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
      const latestPrompt = body.messages?.[body.messages.length - 1]?.content ?? '';

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

      if (/结构化 citation JSON/.test(latestPrompt)) {
        return new Response(
          JSON.stringify({
            choices: [
              {
                message: {
                  content:
                    '{"version":1,"sentences":[{"id":"sent-1","text":"provider citation","sourceIds":["s1"],"grounded":true}]}',
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

      assert.match(latestPrompt, /项目知识片段/);

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
  const deletedConversationProjectIds: string[] = [];
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
    projectConversationsRepository: {
      deleteByProjectId: async (projectId: string) => {
        deletedConversationProjectIds.push(projectId);
      },
    } as unknown as ProjectConversationsRepository,
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
  assert.deepEqual(deletedConversationProjectIds, [project._id.toHexString()]);
  assert.equal(deletedProjectId, project._id.toHexString());
});
