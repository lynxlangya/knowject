import assert from 'node:assert/strict';
import { access, mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import test from 'node:test';
import { ObjectId } from 'mongodb';
import type { AppEnv } from '@config/env.js';
import { decryptApiKey, encryptApiKey } from '@lib/crypto.js';
import type { AuthRepository } from '@modules/auth/auth.repository.js';
import type { ProjectsRepository } from '@modules/projects/projects.repository.js';
import type { SettingsRepository } from '@modules/settings/settings.repository.js';
import type { KnowledgeRepository } from './knowledge.repository.js';
import type { KnowledgeSearchService } from './knowledge.search.js';
import {
  buildKnowledgeEmbeddingFingerprint,
  buildVersionedKnowledgeCollectionName,
} from './knowledge.shared.js';
import { createKnowledgeService } from './knowledge.service.js';
import type {
  KnowledgeBaseDocument,
  KnowledgeDocumentRecord,
  KnowledgeNamespaceIndexStateDocument,
} from './knowledge.types.js';

const createTestEnv = (storageRoot: string): AppEnv => {
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
      storageRoot,
      indexerUrl: 'http://127.0.0.1:8001',
      indexerRequestTimeoutMs: 1000,
    },
    skills: {
      storageRoot: '/tmp/knowject-skills',
    },
    openai: {
      apiKey: null,
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

const createSearchServiceStub = (
  overrides: Partial<KnowledgeSearchService> = {},
): KnowledgeSearchService => {
  return {
    ensureCollections: async () => undefined,
    searchDocuments: async () => ({
      query: '',
      sourceType: 'global_docs',
      total: 0,
      items: [],
    }),
    getDiagnostics: async ({ collectionName }) => ({
      collection: {
        name: collectionName,
        exists: true,
        errorMessage: null,
      },
    }),
    deleteKnowledgeChunks: async () => undefined,
    deleteDocumentChunks: async () => undefined,
    deleteCollection: async () => undefined,
    ...overrides,
  };
};

const buildExpectedCollectionName = (
  namespaceKey: string,
  config?: {
    provider: string;
    baseUrl: string;
    model: string;
  },
): string => {
  const fingerprint = buildKnowledgeEmbeddingFingerprint({
    provider: config?.provider ?? 'openai',
    baseUrl: config?.baseUrl ?? 'https://api.openai.com/v1',
    model: config?.model ?? 'text-embedding-3-small',
  } as {
    provider: 'openai';
    baseUrl: string;
    model: string;
  });

  return buildVersionedKnowledgeCollectionName(namespaceKey, fingerprint);
};

const createProjectsRepositoryStub = (
  overrides: Partial<ProjectsRepository> = {},
): ProjectsRepository => {
  return {
    findById: async () => null,
    ...overrides,
  } as unknown as ProjectsRepository;
};

const createSettingsRepositoryStub = (
  overrides: Partial<SettingsRepository> = {},
): SettingsRepository => {
  return {
    getSettings: async () => null,
    ...overrides,
  } as unknown as SettingsRepository;
};

test('listKnowledge only returns global scope knowledge and hydrates actor names', async () => {
  const knowledge: KnowledgeBaseDocument & {
    _id: NonNullable<KnowledgeBaseDocument['_id']>;
  } = {
    _id: new ObjectId('507f1f77bcf86cd799439011'),
    name: '知识库 A',
    description: '用于验证展示名称',
    sourceType: 'global_docs',
    indexStatus: 'completed',
    documentCount: 2,
    chunkCount: 18,
    maintainerId: '507f1f77bcf86cd799439012',
    createdBy: '507f1f77bcf86cd799439013',
    createdAt: new Date('2026-03-13T00:00:00.000Z'),
    updatedAt: new Date('2026-03-13T00:00:00.000Z'),
  };
  let listOptions: Parameters<KnowledgeRepository['listKnowledgeBases']>[0] | undefined;

  const repository = {
    ensureMetadataModel: async () => undefined,
    listKnowledgeBases: async (options?: Parameters<KnowledgeRepository['listKnowledgeBases']>[0]) => {
      listOptions = options;
      return [knowledge];
    },
  } as unknown as KnowledgeRepository;

  const searchService = createSearchServiceStub();

  const authRepository = {
    findProfilesByIds: async (userIds: string[]) =>
      userIds.map((userId) => ({
        id: userId,
        username: userId === knowledge.maintainerId ? 'maintainer' : 'creator',
        name: userId === knowledge.maintainerId ? '维护人名称' : '创建人名称',
      })),
  } as unknown as AuthRepository;

  const service = createKnowledgeService({
    env: createTestEnv('/tmp/knowject-knowledge-service'),
    repository,
    searchService,
    authRepository,
    projectsRepository: createProjectsRepositoryStub(),
  });

  const response = await service.listKnowledge({
    actor: {
      id: '507f1f77bcf86cd799439099',
      username: 'langya',
    },
  });

  assert.equal(response.items.length, 1);
  assert.deepEqual(listOptions, { scope: 'global' });
  assert.equal(response.items[0]?.scope, 'global');
  assert.equal(response.items[0]?.projectId, null);
  assert.equal(response.items[0]?.maintainerName, '维护人名称');
  assert.equal(response.items[0]?.createdByName, '创建人名称');
});

test('getKnowledgeDetail allows project scope knowledge for visible project members', async () => {
  const knowledgeId = '507f1f77bcf86cd799439021';
  const projectId = '507f1f77bcf86cd799439031';
  const actorId = '507f1f77bcf86cd799439041';
  const knowledge: KnowledgeBaseDocument & {
    _id: NonNullable<KnowledgeBaseDocument['_id']>;
  } = {
    _id: new ObjectId(knowledgeId),
    name: '项目知识库',
    description: '仅项目成员可见',
    scope: 'project',
    projectId,
    sourceType: 'global_docs',
    indexStatus: 'idle',
    documentCount: 0,
    chunkCount: 0,
    maintainerId: actorId,
    createdBy: actorId,
    createdAt: new Date('2026-03-15T00:00:00.000Z'),
    updatedAt: new Date('2026-03-15T00:00:00.000Z'),
  };

  const repository = {
    ensureMetadataModel: async () => undefined,
    findKnowledgeById: async (id: string) => (id === knowledgeId ? knowledge : null),
    listDocumentsByKnowledgeId: async () => [],
  } as unknown as KnowledgeRepository;

  const service = createKnowledgeService({
    env: createTestEnv('/tmp/knowject-project-knowledge-detail'),
    repository,
    searchService: createSearchServiceStub(),
    authRepository: {
      findProfilesByIds: async () => [],
    } as unknown as AuthRepository,
    projectsRepository: createProjectsRepositoryStub({
      findById: async (id: string) =>
        id === projectId
          ? ({
              _id: new ObjectId(projectId),
              name: '项目 A',
              description: '',
              ownerId: actorId,
              members: [
                {
                  userId: actorId,
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
            })
          : null,
    }),
  });

  const response = await service.getKnowledgeDetail(
    {
      actor: {
        id: actorId,
        username: 'langya',
      },
    },
    knowledgeId,
  );

  assert.equal(response.knowledge.scope, 'project');
  assert.equal(response.knowledge.projectId, projectId);
});

test('getKnowledgeDetail hides project scope knowledge from non-members', async () => {
  const knowledgeId = '507f1f77bcf86cd799439051';
  const projectId = '507f1f77bcf86cd799439061';
  const actorId = '507f1f77bcf86cd799439071';
  const knowledge: KnowledgeBaseDocument & {
    _id: NonNullable<KnowledgeBaseDocument['_id']>;
  } = {
    _id: new ObjectId(knowledgeId),
    name: '项目知识库',
    description: '仅项目成员可见',
    scope: 'project',
    projectId,
    sourceType: 'global_docs',
    indexStatus: 'idle',
    documentCount: 0,
    chunkCount: 0,
    maintainerId: actorId,
    createdBy: actorId,
    createdAt: new Date('2026-03-15T00:00:00.000Z'),
    updatedAt: new Date('2026-03-15T00:00:00.000Z'),
  };

  const repository = {
    ensureMetadataModel: async () => undefined,
    findKnowledgeById: async (id: string) => (id === knowledgeId ? knowledge : null),
  } as unknown as KnowledgeRepository;

  const service = createKnowledgeService({
    env: createTestEnv('/tmp/knowject-project-knowledge-forbidden'),
    repository,
    searchService: createSearchServiceStub(),
    authRepository: {
      findProfilesByIds: async () => [],
    } as unknown as AuthRepository,
    projectsRepository: createProjectsRepositoryStub({
      findById: async (id: string) =>
        id === projectId
          ? ({
              _id: new ObjectId(projectId),
              name: '项目 A',
              description: '',
              ownerId: 'owner-1',
              members: [],
              knowledgeBaseIds: [],
              agentIds: [],
              skillIds: [],
              conversations: [],
              createdAt: new Date('2026-03-15T00:00:00.000Z'),
              updatedAt: new Date('2026-03-15T00:00:00.000Z'),
            })
          : null,
    }),
  });

  await assert.rejects(
    () =>
      service.getKnowledgeDetail(
        {
          actor: {
            id: actorId,
            username: 'langya',
          },
        },
        knowledgeId,
      ),
    (error: unknown) => {
      assert.equal(error instanceof Error, true);
      assert.equal((error as Error).message, '知识库不存在');
      return true;
    },
  );
});

test('listProjectKnowledge only returns project scope knowledge for the target project', async () => {
  const projectId = '507f1f77bcf86cd799439081';
  const actorId = '507f1f77bcf86cd799439091';
  const knowledge: KnowledgeBaseDocument & {
    _id: NonNullable<KnowledgeBaseDocument['_id']>;
  } = {
    _id: new ObjectId('507f1f77bcf86cd799439082'),
    name: '项目知识库',
    description: '只返回当前项目私有知识',
    scope: 'project',
    projectId,
    sourceType: 'global_docs',
    indexStatus: 'idle',
    documentCount: 0,
    chunkCount: 0,
    maintainerId: actorId,
    createdBy: actorId,
    createdAt: new Date('2026-03-15T00:00:00.000Z'),
    updatedAt: new Date('2026-03-15T00:00:00.000Z'),
  };
  let listOptions: Parameters<KnowledgeRepository['listKnowledgeBases']>[0] | undefined;

  const repository = {
    ensureMetadataModel: async () => undefined,
    listKnowledgeBases: async (
      options?: Parameters<KnowledgeRepository['listKnowledgeBases']>[0],
    ) => {
      listOptions = options;
      return [knowledge];
    },
  } as unknown as KnowledgeRepository;

  const service = createKnowledgeService({
    env: createTestEnv('/tmp/knowject-project-knowledge-list'),
    repository,
    searchService: createSearchServiceStub(),
    authRepository: {
      findProfilesByIds: async () => [],
    } as unknown as AuthRepository,
    projectsRepository: createProjectsRepositoryStub({
      findById: async (id: string) =>
        id === projectId
          ? ({
              _id: new ObjectId(projectId),
              name: '项目 A',
              description: '',
              ownerId: actorId,
              members: [
                {
                  userId: actorId,
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
            })
          : null,
    }),
  });

  const response = await service.listProjectKnowledge(
    {
      actor: {
        id: actorId,
        username: 'langya',
      },
    },
    projectId,
  );

  assert.deepEqual(listOptions, {
    scope: 'project',
    projectId,
  });
  assert.equal(response.total, 1);
  assert.equal(response.items[0]?.scope, 'project');
  assert.equal(response.items[0]?.projectId, projectId);
});

test('createProjectKnowledge persists project scope metadata and rejects global_code', async () => {
  const projectId = '507f1f77bcf86cd799439101';
  const actorId = '507f1f77bcf86cd799439111';
  let createdKnowledge: Omit<KnowledgeBaseDocument, '_id'> | null = null;

  const repository = {
    ensureMetadataModel: async () => undefined,
    createKnowledgeBase: async (document: Omit<KnowledgeBaseDocument, '_id'>) => {
      createdKnowledge = document;
      return {
        ...document,
        _id: new ObjectId('507f1f77bcf86cd799439112'),
      };
    },
  } as unknown as KnowledgeRepository;

  const service = createKnowledgeService({
    env: createTestEnv('/tmp/knowject-project-knowledge-create'),
    repository,
    searchService: createSearchServiceStub(),
    authRepository: {
      findProfilesByIds: async () => [],
    } as unknown as AuthRepository,
    projectsRepository: createProjectsRepositoryStub({
      findById: async (id: string) =>
        id === projectId
          ? ({
              _id: new ObjectId(projectId),
              name: '项目 A',
              description: '',
              ownerId: actorId,
              members: [
                {
                  userId: actorId,
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
            })
          : null,
    }),
  });

  const response = await service.createProjectKnowledge(
    {
      actor: {
        id: actorId,
        username: 'langya',
      },
    },
    projectId,
    {
      name: '项目知识库',
    },
  );

  assert.notEqual(createdKnowledge, null);
  if (!createdKnowledge) {
    throw new Error('createdKnowledge should not be null');
  }

  const persistedKnowledge: Omit<KnowledgeBaseDocument, '_id'> = createdKnowledge;

  assert.equal(persistedKnowledge.scope, 'project');
  assert.equal(persistedKnowledge.projectId, projectId);
  assert.equal(persistedKnowledge.sourceType, 'global_docs');
  assert.equal(response.knowledge.scope, 'project');
  assert.equal(response.knowledge.projectId, projectId);

  await assert.rejects(
    () =>
      service.createProjectKnowledge(
        {
          actor: {
            id: actorId,
            username: 'langya',
          },
        },
        projectId,
        {
          name: '非法项目知识',
          sourceType: 'global_code',
        },
      ),
    /当前项目知识只支持 global_docs/,
  );
});

test('uploadProjectKnowledgeDocument writes project storage path and project collection name', async () => {
  const storageRoot = await mkdtemp(join(tmpdir(), 'knowject-project-knowledge-upload-'));
  const env = createTestEnv(storageRoot);
  const originalEncryptionKey = process.env.SETTINGS_ENCRYPTION_KEY;
  process.env.SETTINGS_ENCRYPTION_KEY = env.settings.encryptionKey;
  const knowledgeId = '507f1f77bcf86cd799439122';
  const projectId = '507f1f77bcf86cd799439132';
  const actorId = '507f1f77bcf86cd799439142';
  const knowledge: KnowledgeBaseDocument & {
    _id: NonNullable<KnowledgeBaseDocument['_id']>;
  } = {
    _id: new ObjectId(knowledgeId),
    name: '项目知识库',
    description: '用于验证项目上传写侧',
    scope: 'project',
    projectId,
    sourceType: 'global_docs',
    indexStatus: 'idle',
    documentCount: 0,
    chunkCount: 0,
    maintainerId: actorId,
    createdBy: actorId,
    createdAt: new Date('2026-03-15T00:00:00.000Z'),
    updatedAt: new Date('2026-03-15T00:00:00.000Z'),
  };
  const updatedKnowledge = {
    ...knowledge,
    documentCount: 1,
    updatedAt: new Date('2026-03-15T00:00:01.000Z'),
  };

  let createdDocument: (KnowledgeDocumentRecord & {
    _id: NonNullable<KnowledgeDocumentRecord['_id']>;
  }) | null = null;
  let completedChunkCount = 0;
  let resolveCompleted: (() => void) | null = null;
  const processingCompleted = new Promise<void>((resolve) => {
    resolveCompleted = resolve;
  });
  const fetchPayloads: Array<Record<string, unknown>> = [];
  const settingsRepository = createSettingsRepositoryStub({
    getSettings: async () => ({
      _id: new ObjectId('507f1f77bcf86cd799439501'),
      singleton: 'default',
      embedding: {
        provider: 'custom',
        baseUrl: 'https://embedding.example.com/v1',
        model: 'text-embedding-custom',
        apiKeyEncrypted: encryptApiKey('db-embedding-key'),
        apiKeyHint: '...-key',
        testedAt: null,
        testStatus: null,
      },
      indexing: {
        chunkSize: 860,
        chunkOverlap: 120,
        supportedTypes: ['md', 'txt'],
        indexerTimeoutMs: 45000,
      },
      updatedAt: new Date('2026-03-16T00:00:00.000Z'),
      updatedBy: actorId,
    }),
  });

  const repository = {
    ensureMetadataModel: async () => undefined,
    findKnowledgeById: async (id: string) => (id === knowledgeId ? knowledge : null),
    createKnowledgeDocument: async (
      document: KnowledgeDocumentRecord & {
        _id: NonNullable<KnowledgeDocumentRecord['_id']>;
      },
    ) => {
      createdDocument = document;
      return document;
    },
    updateKnowledgeSummaryAfterDocumentUpload: async () => updatedKnowledge,
    updateKnowledgeDocument: async (
      documentId: string,
      patch: Partial<
        Pick<
          KnowledgeDocumentRecord,
          'status' | 'chunkCount' | 'lastIndexedAt' | 'errorMessage' | 'processedAt' | 'updatedAt'
        >
      >,
    ) => {
      if (patch.status === 'completed') {
        completedChunkCount = patch.chunkCount ?? 0;
        resolveCompleted?.();
      }

      return {
        _id: new ObjectId(documentId),
        knowledgeId,
        fileName: createdDocument?.fileName ?? 'README.md',
        mimeType: createdDocument?.mimeType ?? 'text/markdown',
        storagePath: createdDocument?.storagePath ?? '',
        status: patch.status ?? 'pending',
        chunkCount: patch.chunkCount ?? 0,
        documentVersionHash: createdDocument?.documentVersionHash ?? 'hash-1',
        embeddingProvider: createdDocument?.embeddingProvider ?? 'local_dev',
        embeddingModel: createdDocument?.embeddingModel ?? 'hash-1536-dev',
        lastIndexedAt: patch.lastIndexedAt ?? null,
        retryCount: 0,
        errorMessage: patch.errorMessage ?? null,
        uploadedBy: actorId,
        uploadedAt: new Date('2026-03-15T00:00:00.000Z'),
        processedAt: patch.processedAt ?? null,
        createdAt: new Date('2026-03-15T00:00:00.000Z'),
        updatedAt: patch.updatedAt ?? new Date('2026-03-15T00:00:00.000Z'),
      };
    },
    syncKnowledgeSummaryFromDocuments: async () => undefined,
  } as unknown as KnowledgeRepository;

  const service = createKnowledgeService({
    env,
    repository,
    searchService: createSearchServiceStub(),
    authRepository: {
      findProfilesByIds: async () => [],
    } as unknown as AuthRepository,
    projectsRepository: createProjectsRepositoryStub({
      findById: async (id: string) =>
        id === projectId
          ? ({
              _id: new ObjectId(projectId),
              name: '项目 A',
              description: '',
              ownerId: actorId,
              members: [
                {
                  userId: actorId,
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
            })
          : null,
    }),
    settingsRepository,
  });

  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (_input, init) => {
    fetchPayloads.push(JSON.parse(String(init?.body ?? '{}')) as Record<string, unknown>);
    return new Response(
      JSON.stringify({
        status: 'completed',
        knowledgeId,
        documentId: createdDocument?._id.toHexString() ?? 'document-1',
        chunkCount: 4,
        characterCount: 64,
        parser: 'markdown',
        collectionName: `proj_${projectId}_docs`,
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
    await service.uploadProjectKnowledgeDocument(
      {
        actor: {
          id: actorId,
          username: 'langya',
        },
      },
      projectId,
      knowledgeId,
      {
        originalName: 'README.md',
        mimeType: 'text/markdown',
        size: 20,
        buffer: Buffer.from('# hello project\n', 'utf-8'),
      },
    );

    await Promise.race([
      processingCompleted,
      delay(2000).then(() => {
        throw new Error('Timed out waiting for project detached indexer processing');
      }),
    ]);
  } finally {
    globalThis.fetch = originalFetch;
    process.env.SETTINGS_ENCRYPTION_KEY = originalEncryptionKey;
  }

  assert.notEqual(createdDocument, null);
  if (!createdDocument) {
    throw new Error('createdDocument should not be null');
  }

  const persistedDocument: KnowledgeDocumentRecord & {
    _id: NonNullable<KnowledgeDocumentRecord['_id']>;
  } = createdDocument;

  assert.equal(
    persistedDocument.storagePath.startsWith(`projects/${projectId}/knowledge/${knowledgeId}/`),
    true,
  );
  assert.equal(persistedDocument.embeddingProvider, 'custom');
  assert.equal(persistedDocument.embeddingModel, 'text-embedding-custom');
  assert.equal(
    fetchPayloads[0]?.collectionName,
    buildExpectedCollectionName(`proj_${projectId}_docs`, {
      provider: 'custom',
      baseUrl: 'https://embedding.example.com/v1',
      model: 'text-embedding-custom',
    }),
  );
  assert.deepEqual(fetchPayloads[0]?.embeddingConfig, {
    provider: 'custom',
    apiKey: 'db-embedding-key',
    baseUrl: 'https://embedding.example.com/v1',
    model: 'text-embedding-custom',
  });
  assert.deepEqual(fetchPayloads[0]?.indexingConfig, {
    chunkSize: 860,
    chunkOverlap: 120,
    supportedTypes: ['md', 'txt'],
    indexerTimeoutMs: 45000,
  });
  assert.equal(completedChunkCount, 4);
});

test('searchDocuments normalizes query filters and delegates to the shared search service', async () => {
  const capturedInputs: Array<{
    query: string;
    knowledgeId?: string;
    sourceType: 'global_docs' | 'global_code';
    collectionName?: string;
    topK: number;
  }> = [];
  const knowledgeId = '507f1f77bcf86cd799439011';
  const knowledge: KnowledgeBaseDocument & {
    _id: NonNullable<KnowledgeBaseDocument['_id']>;
  } = {
    _id: new ObjectId(knowledgeId),
    name: '全局知识库',
    description: '',
    sourceType: 'global_docs',
    indexStatus: 'completed',
    documentCount: 1,
    chunkCount: 3,
    maintainerId: 'user-1',
    createdBy: 'user-1',
    createdAt: new Date('2026-03-15T00:00:00.000Z'),
    updatedAt: new Date('2026-03-15T00:00:00.000Z'),
  };

  const repository = {
    ensureMetadataModel: async () => undefined,
    findKnowledgeById: async (id: string) => (id === knowledgeId ? knowledge : null),
  } as unknown as KnowledgeRepository;

  const searchService = createSearchServiceStub({
    searchDocuments: async (input: Parameters<KnowledgeSearchService['searchDocuments']>[0]) => {
      capturedInputs.push(input);

      return {
      query: input.query,
      sourceType: input.sourceType,
      total: 1,
      items: [
        {
          knowledgeId: input.knowledgeId ?? knowledgeId,
          documentId: '507f1f77bcf86cd799439099',
          chunkId: 'chunk-1',
          chunkIndex: 0,
            type: input.sourceType,
            source: 'README.md',
            content: 'project knowledge',
            distance: 0.12,
          },
        ],
      };
    },
  });

  const authRepository = {
    findProfilesByIds: async () => [],
  } as unknown as AuthRepository;

  const service = createKnowledgeService({
    env: createTestEnv('/tmp/knowject-knowledge-search'),
    repository,
    searchService,
    authRepository,
  });

  const response = await service.searchDocuments(
    {
      actor: {
        id: '507f1f77bcf86cd799439099',
        username: 'langya',
      },
    },
    {
      query: '  project knowledge  ',
      knowledgeId: ' 507f1f77bcf86cd799439011 ',
      topK: '3',
    },
  );

  assert.deepEqual(capturedInputs, [
    {
      query: 'project knowledge',
      knowledgeId,
      sourceType: 'global_docs',
      collectionName: buildExpectedCollectionName('global_docs'),
      embeddingConfig: {
        source: 'environment',
        provider: 'openai',
        apiKey: null,
        baseUrl: 'https://api.openai.com/v1',
        model: 'text-embedding-3-small',
        requestTimeoutMs: 1000,
      },
      topK: 3,
    },
  ]);
  assert.equal(response.total, 1);
  assert.equal(response.items[0]?.type, 'global_docs');
});

test('searchDocuments resolves project scope knowledge to project collection for visible members', async () => {
  const capturedInputs: Array<Parameters<KnowledgeSearchService['searchDocuments']>[0]> = [];
  const knowledgeId = '507f1f77bcf86cd799439121';
  const projectId = '507f1f77bcf86cd799439131';
  const actorId = '507f1f77bcf86cd799439141';
  const knowledge: KnowledgeBaseDocument & {
    _id: NonNullable<KnowledgeBaseDocument['_id']>;
  } = {
    _id: new ObjectId(knowledgeId),
    name: '项目知识库',
    description: '用于验证 project collection',
    scope: 'project',
    projectId,
    sourceType: 'global_docs',
    indexStatus: 'completed',
    documentCount: 1,
    chunkCount: 3,
    maintainerId: actorId,
    createdBy: actorId,
    createdAt: new Date('2026-03-15T00:00:00.000Z'),
    updatedAt: new Date('2026-03-15T00:00:00.000Z'),
  };

  const repository = {
    ensureMetadataModel: async () => undefined,
    findKnowledgeById: async (id: string) => (id === knowledgeId ? knowledge : null),
  } as unknown as KnowledgeRepository;

  const searchService = createSearchServiceStub({
    searchDocuments: async (input: Parameters<KnowledgeSearchService['searchDocuments']>[0]) => {
      capturedInputs.push(input);
      return {
        query: input.query,
        sourceType: input.sourceType,
        total: 0,
        items: [],
      };
    },
  });

  const service = createKnowledgeService({
    env: createTestEnv('/tmp/knowject-project-knowledge-search'),
    repository,
    searchService,
    authRepository: {
      findProfilesByIds: async () => [],
    } as unknown as AuthRepository,
    projectsRepository: createProjectsRepositoryStub({
      findById: async (id: string) =>
        id === projectId
          ? ({
              _id: new ObjectId(projectId),
              name: '项目 A',
              description: '',
              ownerId: actorId,
              members: [
                {
                  userId: actorId,
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
            })
          : null,
    }),
  });

  await service.searchDocuments(
    {
      actor: {
        id: actorId,
        username: 'langya',
      },
    },
    {
      query: 'project knowledge',
      knowledgeId,
      topK: 2,
    },
  );

  assert.deepEqual(capturedInputs, [
    {
      query: 'project knowledge',
      knowledgeId,
      sourceType: 'global_docs',
      collectionName: buildExpectedCollectionName(`proj_${projectId}_docs`),
      embeddingConfig: {
        source: 'environment',
        provider: 'openai',
        apiKey: null,
        baseUrl: 'https://api.openai.com/v1',
        model: 'text-embedding-3-small',
        requestTimeoutMs: 1000,
      },
      topK: 2,
    },
  ]);
});

test('deleteKnowledge uses project collection name during Chroma cleanup', async () => {
  const storageRoot = await mkdtemp(join(tmpdir(), 'knowject-project-delete-'));
  const knowledgeId = '507f1f77bcf86cd799439151';
  const projectId = '507f1f77bcf86cd799439161';
  const actorId = '507f1f77bcf86cd799439171';
  const knowledgeDir = join(storageRoot, 'projects', projectId, 'knowledge', knowledgeId);
  await mkdir(knowledgeDir, { recursive: true });
  const knowledge: KnowledgeBaseDocument & {
    _id: NonNullable<KnowledgeBaseDocument['_id']>;
  } = {
    _id: new ObjectId(knowledgeId),
    name: '项目知识库',
    description: '',
    scope: 'project',
    projectId,
    sourceType: 'global_docs',
    indexStatus: 'completed',
    documentCount: 1,
    chunkCount: 3,
    maintainerId: actorId,
    createdBy: actorId,
    createdAt: new Date('2026-03-15T00:00:00.000Z'),
    updatedAt: new Date('2026-03-15T00:00:00.000Z'),
  };
  let cleanupCollectionName = '';

  const repository = {
    ensureMetadataModel: async () => undefined,
    findKnowledgeById: async (id: string) => (id === knowledgeId ? knowledge : null),
    deleteKnowledgeDocumentsByKnowledgeId: async () => 1,
    deleteKnowledgeBase: async () => true,
  } as unknown as KnowledgeRepository;

  const searchService = createSearchServiceStub({
    deleteKnowledgeChunks: async (_knowledgeId, { collectionName }) => {
      cleanupCollectionName = collectionName;
    },
  });

  const service = createKnowledgeService({
    env: createTestEnv(storageRoot),
    repository,
    searchService,
    authRepository: {
      findProfilesByIds: async () => [],
    } as unknown as AuthRepository,
    projectsRepository: createProjectsRepositoryStub({
      findById: async (id: string) =>
        id === projectId
          ? ({
              _id: new ObjectId(projectId),
              name: '项目 A',
              description: '',
              ownerId: actorId,
              members: [
                {
                  userId: actorId,
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
            })
          : null,
    }),
  });

  await service.deleteKnowledge(
    {
      actor: {
        id: actorId,
        username: 'langya',
      },
    },
    knowledgeId,
  );

  assert.equal(cleanupCollectionName, buildExpectedCollectionName(`proj_${projectId}_docs`));
  await assert.rejects(access(knowledgeDir));
});

test('deleteKnowledge continues when Chroma cleanup fails', async () => {
  const storageRoot = await mkdtemp(join(tmpdir(), 'knowject-knowledge-service-'));
  const knowledgeId = '507f1f77bcf86cd799439011';
  const knowledgeDir = join(storageRoot, knowledgeId);
  await mkdir(knowledgeDir, { recursive: true });

  const knowledge: KnowledgeBaseDocument = {
    _id: undefined,
    name: 'Knowledge',
    description: 'Test knowledge base',
    sourceType: 'global_docs',
    indexStatus: 'completed',
    documentCount: 1,
    chunkCount: 1,
    maintainerId: 'user-1',
    createdBy: 'user-1',
    createdAt: new Date('2026-03-13T00:00:00.000Z'),
    updatedAt: new Date('2026-03-13T00:00:00.000Z'),
  };

  let deletedDocuments = false;
  let deletedKnowledge = false;

  const repository = {
    ensureMetadataModel: async () => undefined,
    findKnowledgeById: async (id: string) => (id === knowledgeId ? knowledge : null),
    deleteKnowledgeDocumentsByKnowledgeId: async () => {
      deletedDocuments = true;
      return 1;
    },
    deleteKnowledgeBase: async () => {
      deletedKnowledge = true;
      return true;
    },
  } as unknown as KnowledgeRepository;

  const searchService = createSearchServiceStub({
    deleteKnowledgeChunks: async () => {
      throw new Error('Chroma down');
    },
  });

  const authRepository = {
    findProfilesByIds: async () => [],
  } as unknown as AuthRepository;

  const service = createKnowledgeService({
    env: createTestEnv(storageRoot),
    repository,
    searchService,
    authRepository,
  });

  await assert.doesNotReject(() =>
    service.deleteKnowledge(
      {
        actor: {
          id: 'user-1',
          username: 'langya',
        },
      },
      knowledgeId,
    ),
  );

  assert.equal(deletedDocuments, true);
  assert.equal(deletedKnowledge, true);
  await assert.rejects(access(knowledgeDir));
});

test('uploadDocument falls back to legacy indexer route after 404 on versioned path', async () => {
  const storageRoot = await mkdtemp(join(tmpdir(), 'knowject-knowledge-upload-'));
  const knowledgeId = '507f1f77bcf86cd799439011';
  const knowledge: KnowledgeBaseDocument & {
    _id: NonNullable<KnowledgeBaseDocument['_id']>;
  } = {
    _id: new ObjectId(knowledgeId),
    name: '知识库 A',
    description: '用于验证索引器兼容路由',
    sourceType: 'global_docs',
    indexStatus: 'idle',
    documentCount: 0,
    chunkCount: 0,
    maintainerId: '507f1f77bcf86cd799439012',
    createdBy: '507f1f77bcf86cd799439013',
    createdAt: new Date('2026-03-14T00:00:00.000Z'),
    updatedAt: new Date('2026-03-14T00:00:00.000Z'),
  };
  const updatedKnowledge = {
    ...knowledge,
    documentCount: 1,
    updatedAt: new Date('2026-03-14T00:00:01.000Z'),
  };

  let createdDocumentId = '';
  let completedChunkCount = 0;
  let resolveCompleted: (() => void) | null = null;
  const processingCompleted = new Promise<void>((resolve) => {
    resolveCompleted = resolve;
  });
  const fetchCalls: string[] = [];

  const repository = {
    ensureMetadataModel: async () => undefined,
    findKnowledgeById: async (id: string) => (id === knowledgeId ? knowledge : null),
    createKnowledgeDocument: async (
      document: KnowledgeDocumentRecord & {
        _id: NonNullable<KnowledgeDocumentRecord['_id']>;
      },
    ) => {
      createdDocumentId = document._id.toHexString();
      return document;
    },
    updateKnowledgeSummaryAfterDocumentUpload: async () => updatedKnowledge,
    updateKnowledgeDocument: async (
      _documentId: string,
      patch: Partial<
        Pick<
          KnowledgeDocumentRecord,
          'status' | 'chunkCount' | 'lastIndexedAt' | 'errorMessage' | 'processedAt' | 'updatedAt'
        >
      >,
    ) => {
      if (patch.status === 'completed') {
        completedChunkCount = patch.chunkCount ?? 0;
        resolveCompleted?.();
      }

      return {
        _id: new ObjectId(createdDocumentId || '507f1f77bcf86cd799439099'),
        knowledgeId,
        fileName: 'github address.txt',
        mimeType: 'text/plain',
        storagePath: 'knowledge/document/hash/github_address.txt',
        status: patch.status ?? 'pending',
        chunkCount: patch.chunkCount ?? 0,
        documentVersionHash: 'hash-1',
        embeddingProvider: 'local_dev',
        embeddingModel: 'hash-1536-dev',
        lastIndexedAt: patch.lastIndexedAt ?? null,
        retryCount: 0,
        errorMessage: patch.errorMessage ?? null,
        uploadedBy: '507f1f77bcf86cd799439012',
        uploadedAt: new Date('2026-03-14T00:00:00.000Z'),
        processedAt: patch.processedAt ?? null,
        createdAt: new Date('2026-03-14T00:00:00.000Z'),
        updatedAt: patch.updatedAt ?? new Date('2026-03-14T00:00:00.000Z'),
      };
    },
    syncKnowledgeSummaryFromDocuments: async () => undefined,
  } as unknown as KnowledgeRepository;

  const searchService = createSearchServiceStub();

  const authRepository = {
    findProfilesByIds: async () => [],
  } as unknown as AuthRepository;

  const service = createKnowledgeService({
    env: createTestEnv(storageRoot),
    repository,
    searchService,
    authRepository,
  });

  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input, init) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
    fetchCalls.push(url);

    if (url.endsWith('/internal/v1/index/documents')) {
      return new Response(
        JSON.stringify({
          status: 'not_found',
          message: 'Unknown route',
        }),
        {
          status: 404,
          headers: {
            'content-type': 'application/json',
          },
        },
      );
    }

    if (url.endsWith('/internal/index-documents')) {
      const payload = JSON.parse(String(init?.body ?? '{}')) as { documentId?: string; knowledgeId?: string };
      return new Response(
        JSON.stringify({
          status: 'completed',
          knowledgeId: payload.knowledgeId ?? knowledgeId,
          documentId: payload.documentId ?? createdDocumentId,
          chunkCount: 3,
          characterCount: 42,
          parser: 'text',
          collectionName: 'global_docs',
        }),
        {
          status: 200,
          headers: {
            'content-type': 'application/json',
          },
        },
      );
    }

    throw new Error(`Unexpected fetch URL: ${url}`);
  };

  try {
    const uploadResponse = await service.uploadDocument(
      {
        actor: {
          id: '507f1f77bcf86cd799439012',
          username: 'langya',
        },
      },
      knowledgeId,
      {
        originalName: 'github address.txt',
        mimeType: 'text/plain',
        size: 21,
        buffer: Buffer.from('https://github.com\n', 'utf-8'),
      },
    );

    assert.equal(uploadResponse.document.status, 'pending');

    await Promise.race([
      processingCompleted,
      delay(2000).then(() => {
        throw new Error('Timed out waiting for detached indexer processing');
      }),
    ]);
  } finally {
    globalThis.fetch = originalFetch;
  }

  assert.deepEqual(fetchCalls, [
    'http://127.0.0.1:8001/internal/v1/index/documents',
    'http://127.0.0.1:8001/internal/index-documents',
  ]);
  assert.equal(completedChunkCount, 3);
});

test('retryDocument marks document pending and schedules detached processing', async () => {
  const storageRoot = await mkdtemp(join(tmpdir(), 'knowject-knowledge-retry-'));
  const knowledgeId = '507f1f77bcf86cd799439011';
  const documentId = '507f1f77bcf86cd799439099';
  const knowledge: KnowledgeBaseDocument & {
    _id: NonNullable<KnowledgeBaseDocument['_id']>;
  } = {
    _id: new ObjectId(knowledgeId),
    name: '知识库 A',
    description: '用于验证 retry',
    sourceType: 'global_docs',
    indexStatus: 'failed',
    documentCount: 1,
    chunkCount: 0,
    maintainerId: '507f1f77bcf86cd799439012',
    createdBy: '507f1f77bcf86cd799439013',
    createdAt: new Date('2026-03-14T00:00:00.000Z'),
    updatedAt: new Date('2026-03-14T00:00:00.000Z'),
  };
  const document = {
    _id: new ObjectId(documentId),
    knowledgeId,
    fileName: 'github address.txt',
    mimeType: 'text/plain',
    storagePath: `${knowledgeId}/${documentId}/hash-1/github_address.txt`,
    status: 'failed' as const,
    chunkCount: 0,
    documentVersionHash: 'hash-1',
    embeddingProvider: 'local_dev' as const,
    embeddingModel: 'hash-1536-dev' as const,
    lastIndexedAt: null,
    retryCount: 1,
    errorMessage: 'Python indexer 请求失败（HTTP 404）',
    uploadedBy: '507f1f77bcf86cd799439012',
    uploadedAt: new Date('2026-03-14T00:00:00.000Z'),
    processedAt: new Date('2026-03-14T00:00:10.000Z'),
    createdAt: new Date('2026-03-14T00:00:00.000Z'),
    updatedAt: new Date('2026-03-14T00:00:10.000Z'),
  };

  let updatedToPending = false;
  let completedChunkCount = 0;
  let resolveCompleted: (() => void) | null = null;
  const processingCompleted = new Promise<void>((resolve) => {
    resolveCompleted = resolve;
  });
  const fetchCalls: string[] = [];

  const repository = {
    ensureMetadataModel: async () => undefined,
    findKnowledgeById: async (id: string) => (id === knowledgeId ? knowledge : null),
    findKnowledgeDocumentById: async (id: string) => (id === documentId ? document : null),
    updateKnowledgeDocument: async (
      _documentId: string,
      patch: Partial<
        Pick<
          KnowledgeDocumentRecord,
          'status' | 'chunkCount' | 'lastIndexedAt' | 'errorMessage' | 'processedAt' | 'updatedAt'
        >
      >,
    ) => {
      if (patch.status === 'pending') {
        updatedToPending = true;
      }

      if (patch.status === 'completed') {
        completedChunkCount = patch.chunkCount ?? 0;
        resolveCompleted?.();
      }

      return {
        ...document,
        status: patch.status ?? document.status,
        chunkCount: patch.chunkCount ?? document.chunkCount,
        lastIndexedAt: patch.lastIndexedAt ?? document.lastIndexedAt,
        errorMessage: patch.errorMessage ?? document.errorMessage,
        processedAt: patch.processedAt ?? document.processedAt,
        updatedAt: patch.updatedAt ?? document.updatedAt,
      };
    },
    syncKnowledgeSummaryFromDocuments: async () => undefined,
  } as unknown as KnowledgeRepository;

  const searchService = createSearchServiceStub();

  const authRepository = {
    findProfilesByIds: async () => [],
  } as unknown as AuthRepository;

  const service = createKnowledgeService({
    env: createTestEnv(storageRoot),
    repository,
    searchService,
    authRepository,
  });

  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
    fetchCalls.push(url);

    return new Response(
      JSON.stringify({
        status: 'completed',
        knowledgeId,
        documentId,
        chunkCount: 2,
        characterCount: 32,
        parser: 'text',
        collectionName: 'global_docs',
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
    await service.retryDocument(
      {
        actor: {
          id: '507f1f77bcf86cd799439012',
          username: 'langya',
        },
      },
      knowledgeId,
      documentId,
    );

    await Promise.race([
      processingCompleted,
      delay(2000).then(() => {
        throw new Error('Timed out waiting for detached retry processing');
      }),
    ]);
  } finally {
    globalThis.fetch = originalFetch;
  }

  assert.equal(updatedToPending, true);
  assert.equal(completedChunkCount, 2);
  assert.deepEqual(fetchCalls, [
    'http://127.0.0.1:8001/internal/v1/index/documents',
  ]);
});

test('rebuildDocument uses the document-scoped rebuild endpoint and refreshes document status', async () => {
  const storageRoot = await mkdtemp(join(tmpdir(), 'knowject-knowledge-rebuild-document-'));
  const knowledgeId = '507f1f77bcf86cd799439011';
  const documentId = '507f1f77bcf86cd799439099';
  const knowledge: KnowledgeBaseDocument & {
    _id: NonNullable<KnowledgeBaseDocument['_id']>;
  } = {
    _id: new ObjectId(knowledgeId),
    name: '知识库 A',
    description: '用于验证 rebuild document',
    sourceType: 'global_docs',
    indexStatus: 'completed',
    documentCount: 1,
    chunkCount: 4,
    maintainerId: '507f1f77bcf86cd799439012',
    createdBy: '507f1f77bcf86cd799439013',
    createdAt: new Date('2026-03-14T00:00:00.000Z'),
    updatedAt: new Date('2026-03-14T00:00:00.000Z'),
  };
  const document = {
    _id: new ObjectId(documentId),
    knowledgeId,
    fileName: 'README.md',
    mimeType: 'text/markdown',
    storagePath: `${knowledgeId}/${documentId}/hash-1/README.md`,
    status: 'completed' as const,
    chunkCount: 4,
    documentVersionHash: 'hash-1',
    embeddingProvider: 'openai' as const,
    embeddingModel: 'text-embedding-3-small' as const,
    lastIndexedAt: new Date('2026-03-14T00:00:10.000Z'),
    retryCount: 0,
    errorMessage: null,
    uploadedBy: '507f1f77bcf86cd799439012',
    uploadedAt: new Date('2026-03-14T00:00:00.000Z'),
    processedAt: new Date('2026-03-14T00:00:10.000Z'),
    createdAt: new Date('2026-03-14T00:00:00.000Z'),
    updatedAt: new Date('2026-03-14T00:00:10.000Z'),
  };

  let updatedToPending = false;
  let completedChunkCount = 0;
  let resolveCompleted: (() => void) | null = null;
  const processingCompleted = new Promise<void>((resolve) => {
    resolveCompleted = resolve;
  });
  const fetchCalls: string[] = [];

  const repository = {
    ensureMetadataModel: async () => undefined,
    findKnowledgeById: async (id: string) => (id === knowledgeId ? knowledge : null),
    findKnowledgeDocumentById: async (id: string) => (id === documentId ? document : null),
    updateKnowledgeDocument: async (
      _documentId: string,
      patch: Partial<
        Pick<
          KnowledgeDocumentRecord,
          'status' | 'chunkCount' | 'lastIndexedAt' | 'errorMessage' | 'processedAt' | 'updatedAt'
        >
      >,
    ) => {
      if (patch.status === 'pending') {
        updatedToPending = true;
      }

      if (patch.status === 'completed') {
        completedChunkCount = patch.chunkCount ?? 0;
        resolveCompleted?.();
      }

      return {
        ...document,
        status: patch.status ?? document.status,
        chunkCount: patch.chunkCount ?? document.chunkCount,
        lastIndexedAt: patch.lastIndexedAt ?? document.lastIndexedAt,
        errorMessage: patch.errorMessage ?? document.errorMessage,
        processedAt: patch.processedAt ?? document.processedAt,
        updatedAt: patch.updatedAt ?? document.updatedAt,
      };
    },
    syncKnowledgeSummaryFromDocuments: async () => undefined,
  } as unknown as KnowledgeRepository;

  const authRepository = {
    findProfilesByIds: async () => [],
  } as unknown as AuthRepository;

  const service = createKnowledgeService({
    env: createTestEnv(storageRoot),
    repository,
    searchService: createSearchServiceStub(),
    authRepository,
  });

  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
    fetchCalls.push(url);

    return new Response(
      JSON.stringify({
        status: 'completed',
        knowledgeId,
        documentId,
        chunkCount: 6,
        characterCount: 120,
        parser: 'markdown',
        collectionName: 'global_docs',
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
    await service.rebuildDocument(
      {
        actor: {
          id: '507f1f77bcf86cd799439012',
          username: 'langya',
        },
      },
      knowledgeId,
      documentId,
    );

    await Promise.race([
      processingCompleted,
      delay(2000).then(() => {
        throw new Error('Timed out waiting for detached rebuild processing');
      }),
    ]);
  } finally {
    globalThis.fetch = originalFetch;
  }

  assert.equal(updatedToPending, true);
  assert.equal(completedChunkCount, 6);
  assert.deepEqual(fetchCalls, [
    `http://127.0.0.1:8001/internal/v1/index/documents/${documentId}/rebuild`,
  ]);
});

test('rebuildDocument rejects when the active namespace embedding fingerprint no longer matches settings', async () => {
  const originalEncryptionKey = process.env.SETTINGS_ENCRYPTION_KEY;
  process.env.SETTINGS_ENCRYPTION_KEY =
    '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
  const knowledgeId = '507f1f77bcf86cd799439201';
  const documentId = '507f1f77bcf86cd799439202';
  const knowledge: KnowledgeBaseDocument & {
    _id: NonNullable<KnowledgeBaseDocument['_id']>;
  } = {
    _id: new ObjectId(knowledgeId),
    name: '知识库 A',
    description: '用于验证模型切换后的重建拦截',
    sourceType: 'global_docs',
    indexStatus: 'completed',
    documentCount: 1,
    chunkCount: 4,
    maintainerId: '507f1f77bcf86cd799439012',
    createdBy: '507f1f77bcf86cd799439013',
    createdAt: new Date('2026-03-14T00:00:00.000Z'),
    updatedAt: new Date('2026-03-14T00:00:00.000Z'),
  };
  const document = {
    _id: new ObjectId(documentId),
    knowledgeId,
    fileName: 'README.md',
    mimeType: 'text/markdown',
    storagePath: `${knowledgeId}/${documentId}/hash-1/README.md`,
    status: 'completed' as const,
    chunkCount: 4,
    documentVersionHash: 'hash-1',
    embeddingProvider: 'openai' as const,
    embeddingModel: 'text-embedding-3-small' as const,
    lastIndexedAt: new Date('2026-03-14T00:00:10.000Z'),
    retryCount: 0,
    errorMessage: null,
    uploadedBy: '507f1f77bcf86cd799439012',
    uploadedAt: new Date('2026-03-14T00:00:00.000Z'),
    processedAt: new Date('2026-03-14T00:00:10.000Z'),
    createdAt: new Date('2026-03-14T00:00:00.000Z'),
    updatedAt: new Date('2026-03-14T00:00:10.000Z'),
  };
  const activeCollectionName = buildExpectedCollectionName('global_docs');
  const repository = {
    ensureMetadataModel: async () => undefined,
    findKnowledgeById: async (id: string) => (id === knowledgeId ? knowledge : null),
    findKnowledgeDocumentById: async (id: string) => (id === documentId ? document : null),
    findKnowledgeNamespaceIndexState: async () => ({
      _id: new ObjectId('507f1f77bcf86cd799439203'),
      namespaceKey: 'global_docs',
      scope: 'global' as const,
      projectId: null,
      sourceType: 'global_docs' as const,
      activeCollectionName,
      activeEmbeddingProvider: 'openai' as const,
      activeApiKeyEncrypted: encryptApiKey('sk-old-openai'),
      activeEmbeddingBaseUrl: 'https://api.openai.com/v1',
      activeEmbeddingModel: 'text-embedding-3-small',
      activeEmbeddingFingerprint: buildKnowledgeEmbeddingFingerprint({
        provider: 'openai',
        baseUrl: 'https://api.openai.com/v1',
        model: 'text-embedding-3-small',
      } as never),
      rebuildStatus: 'idle' as const,
      targetCollectionName: null,
      targetEmbeddingProvider: null,
      targetEmbeddingBaseUrl: null,
      targetEmbeddingModel: null,
      targetEmbeddingFingerprint: null,
      lastErrorMessage: null,
      createdAt: new Date('2026-03-14T00:00:00.000Z'),
      updatedAt: new Date('2026-03-14T00:00:00.000Z'),
    }),
    listKnowledgeBases: async () => [knowledge],
  } as unknown as KnowledgeRepository;

  const service = createKnowledgeService({
    env: createTestEnv('/tmp/knowject-knowledge-rebuild-document-mismatch'),
    repository,
    searchService: createSearchServiceStub(),
    authRepository: {
      findProfilesByIds: async () => [],
    } as unknown as AuthRepository,
    settingsRepository: {
      getSettings: async () => ({
        embedding: {
          provider: 'custom',
          baseUrl: 'https://embedding.example.com/v1',
          model: 'text-embedding-custom',
          apiKeyEncrypted: encryptApiKey('db-embedding-key'),
          apiKeyHint: 'db-e...-key',
          testedAt: null,
          testStatus: null,
        },
      }),
    } as unknown as SettingsRepository,
  });

  try {
    await assert.rejects(
      () =>
        service.rebuildDocument(
          {
            actor: {
              id: '507f1f77bcf86cd799439012',
              username: 'langya',
            },
          },
          knowledgeId,
          documentId,
        ),
      (error) => error instanceof Error && error.message === '当前向量模型已变更，请先执行知识库全量重建',
    );
  } finally {
    process.env.SETTINGS_ENCRYPTION_KEY = originalEncryptionKey;
  }
});

test('searchDocuments uses the namespace active embedding config instead of current settings during a model transition', async () => {
  const originalEncryptionKey = process.env.SETTINGS_ENCRYPTION_KEY;
  process.env.SETTINGS_ENCRYPTION_KEY =
    '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
  const knowledgeId = '507f1f77bcf86cd799439211';
  const knowledge: KnowledgeBaseDocument & {
    _id: NonNullable<KnowledgeBaseDocument['_id']>;
  } = {
    _id: new ObjectId(knowledgeId),
    name: '知识库 A',
    description: '用于验证搜索读侧绑定 active embedding config',
    sourceType: 'global_docs',
    indexStatus: 'completed',
    documentCount: 1,
    chunkCount: 3,
    maintainerId: '507f1f77bcf86cd799439012',
    createdBy: '507f1f77bcf86cd799439013',
    createdAt: new Date('2026-03-14T00:00:00.000Z'),
    updatedAt: new Date('2026-03-14T00:00:00.000Z'),
  };
  const capturedInputs: Array<Parameters<KnowledgeSearchService['searchDocuments']>[0]> = [];
  const activeCollectionName = buildExpectedCollectionName('global_docs');
  const repository = {
    ensureMetadataModel: async () => undefined,
    findKnowledgeById: async (id: string) => (id === knowledgeId ? knowledge : null),
    findKnowledgeNamespaceIndexState: async () => ({
      _id: new ObjectId('507f1f77bcf86cd799439212'),
      namespaceKey: 'global_docs',
      scope: 'global' as const,
      projectId: null,
      sourceType: 'global_docs' as const,
      activeCollectionName,
      activeEmbeddingProvider: 'openai' as const,
      activeApiKeyEncrypted: encryptApiKey('sk-active-openai'),
      activeEmbeddingBaseUrl: 'https://api.openai.com/v1',
      activeEmbeddingModel: 'text-embedding-3-small',
      activeEmbeddingFingerprint: buildKnowledgeEmbeddingFingerprint({
        provider: 'openai',
        baseUrl: 'https://api.openai.com/v1',
        model: 'text-embedding-3-small',
      } as never),
      rebuildStatus: 'idle' as const,
      targetCollectionName: null,
      targetEmbeddingProvider: null,
      targetEmbeddingBaseUrl: null,
      targetEmbeddingModel: null,
      targetEmbeddingFingerprint: null,
      lastErrorMessage: null,
      createdAt: new Date('2026-03-14T00:00:00.000Z'),
      updatedAt: new Date('2026-03-14T00:00:00.000Z'),
    }),
    listKnowledgeBases: async () => [knowledge],
  } as unknown as KnowledgeRepository;

  const service = createKnowledgeService({
    env: createTestEnv('/tmp/knowject-knowledge-search-active-config'),
    repository,
    searchService: createSearchServiceStub({
      searchDocuments: async (input) => {
        capturedInputs.push(input);
        return {
          query: input.query,
          sourceType: input.sourceType,
          total: 0,
          items: [],
        };
      },
    }),
    authRepository: {
      findProfilesByIds: async () => [],
    } as unknown as AuthRepository,
    settingsRepository: {
      getSettings: async () => ({
        embedding: {
          provider: 'custom',
          baseUrl: 'https://embedding.example.com/v1',
          model: 'text-embedding-custom',
          apiKeyEncrypted: encryptApiKey('db-embedding-key'),
          apiKeyHint: 'db-e...-key',
          testedAt: null,
          testStatus: null,
        },
      }),
    } as unknown as SettingsRepository,
  });

  try {
    await service.searchDocuments(
      {
        actor: {
          id: '507f1f77bcf86cd799439012',
          username: 'langya',
        },
      },
      {
        query: 'knowledge query',
        knowledgeId,
        topK: 2,
      },
    );

    assert.deepEqual(capturedInputs, [
      {
        query: 'knowledge query',
        knowledgeId,
        sourceType: 'global_docs',
        collectionName: activeCollectionName,
        embeddingConfig: {
          source: 'database',
          provider: 'openai',
          apiKey: 'sk-active-openai',
          baseUrl: 'https://api.openai.com/v1',
          model: 'text-embedding-3-small',
          requestTimeoutMs: 1000,
        },
        topK: 2,
      },
    ]);
  } finally {
    process.env.SETTINGS_ENCRYPTION_KEY = originalEncryptionKey;
  }
});

test('searchDocuments refreshes the namespace active api key when the fingerprint still matches', async () => {
  const originalEncryptionKey = process.env.SETTINGS_ENCRYPTION_KEY;
  process.env.SETTINGS_ENCRYPTION_KEY =
    '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
  const knowledgeId = '507f1f77bcf86cd799439213';
  const knowledge: KnowledgeBaseDocument & {
    _id: NonNullable<KnowledgeBaseDocument['_id']>;
  } = {
    _id: new ObjectId(knowledgeId),
    name: '知识库 A',
    description: '用于验证同 fingerprint 下 API Key 轮换',
    sourceType: 'global_docs',
    indexStatus: 'completed',
    documentCount: 1,
    chunkCount: 3,
    maintainerId: '507f1f77bcf86cd799439012',
    createdBy: '507f1f77bcf86cd799439013',
    createdAt: new Date('2026-03-14T00:00:00.000Z'),
    updatedAt: new Date('2026-03-14T00:00:00.000Z'),
  };
  const capturedInputs: Array<Parameters<KnowledgeSearchService['searchDocuments']>[0]> = [];
  const activeCollectionName = buildExpectedCollectionName('global_docs');
  let namespaceState = {
    _id: new ObjectId('507f1f77bcf86cd799439214'),
    namespaceKey: 'global_docs',
    scope: 'global' as const,
    projectId: null,
    sourceType: 'global_docs' as const,
    activeCollectionName,
    activeEmbeddingProvider: 'openai' as const,
    activeApiKeyEncrypted: encryptApiKey('sk-stale-openai'),
    activeEmbeddingBaseUrl: 'https://api.openai.com/v1',
    activeEmbeddingModel: 'text-embedding-3-small',
    activeEmbeddingFingerprint: buildKnowledgeEmbeddingFingerprint({
      provider: 'openai',
      baseUrl: 'https://api.openai.com/v1',
      model: 'text-embedding-3-small',
    } as never),
    rebuildStatus: 'idle' as const,
    targetCollectionName: null,
    targetEmbeddingProvider: null,
    targetEmbeddingBaseUrl: null,
    targetEmbeddingModel: null,
    targetEmbeddingFingerprint: null,
    lastErrorMessage: null,
    createdAt: new Date('2026-03-14T00:00:00.000Z'),
    updatedAt: new Date('2026-03-14T00:00:00.000Z'),
  };

  const repository = {
    ensureMetadataModel: async () => undefined,
    findKnowledgeById: async (id: string) => (id === knowledgeId ? knowledge : null),
    findKnowledgeNamespaceIndexState: async () => namespaceState,
    updateKnowledgeNamespaceIndexState: async (_namespaceKey: string, patch: Record<string, unknown>) => {
      namespaceState = {
        ...namespaceState,
        ...patch,
      };
      return namespaceState;
    },
    listKnowledgeBases: async () => [knowledge],
  } as unknown as KnowledgeRepository;

  const service = createKnowledgeService({
    env: createTestEnv('/tmp/knowject-knowledge-search-active-key-refresh'),
    repository,
    searchService: createSearchServiceStub({
      searchDocuments: async (input) => {
        capturedInputs.push(input);
        return {
          query: input.query,
          sourceType: input.sourceType,
          total: 0,
          items: [],
        };
      },
    }),
    authRepository: {
      findProfilesByIds: async () => [],
    } as unknown as AuthRepository,
    settingsRepository: {
      getSettings: async () => ({
        embedding: {
          provider: 'openai',
          baseUrl: 'https://api.openai.com/v1',
          model: 'text-embedding-3-small',
          apiKeyEncrypted: encryptApiKey('sk-current-openai'),
          apiKeyHint: 'db-e...-key',
          testedAt: null,
          testStatus: null,
        },
      }),
    } as unknown as SettingsRepository,
  });

  try {
    await service.searchDocuments(
      {
        actor: {
          id: '507f1f77bcf86cd799439012',
          username: 'langya',
        },
      },
      {
        query: 'knowledge query',
        knowledgeId,
        topK: 2,
      },
    );

    assert.deepEqual(capturedInputs, [
      {
        query: 'knowledge query',
        knowledgeId,
        sourceType: 'global_docs',
        collectionName: activeCollectionName,
        embeddingConfig: {
          source: 'database',
          provider: 'openai',
          apiKey: 'sk-current-openai',
          baseUrl: 'https://api.openai.com/v1',
          model: 'text-embedding-3-small',
          requestTimeoutMs: 1000,
        },
        topK: 2,
      },
    ]);
    assert.equal(
      decryptApiKey(namespaceState.activeApiKeyEncrypted ?? ''),
      'sk-current-openai',
    );
  } finally {
    process.env.SETTINGS_ENCRYPTION_KEY = originalEncryptionKey;
  }
});

test('uploadDocument reinitializes an empty namespace state before indexing with a new embedding fingerprint', async () => {
  const storageRoot = await mkdtemp(join(tmpdir(), 'knowject-knowledge-upload-empty-namespace-'));
  const env = createTestEnv(storageRoot);
  const originalEncryptionKey = process.env.SETTINGS_ENCRYPTION_KEY;
  process.env.SETTINGS_ENCRYPTION_KEY = env.settings.encryptionKey;
  const knowledgeId = '507f1f77bcf86cd799439215';
  const actorId = '507f1f77bcf86cd799439012';
  const knowledge: KnowledgeBaseDocument & {
    _id: NonNullable<KnowledgeBaseDocument['_id']>;
  } = {
    _id: new ObjectId(knowledgeId),
    name: '空知识库',
    description: '用于验证空 namespace state 自愈',
    sourceType: 'global_docs',
    indexStatus: 'idle',
    documentCount: 0,
    chunkCount: 0,
    maintainerId: actorId,
    createdBy: actorId,
    createdAt: new Date('2026-03-15T00:00:00.000Z'),
    updatedAt: new Date('2026-03-15T00:00:00.000Z'),
  };
  const updatedKnowledge = {
    ...knowledge,
    documentCount: 1,
    updatedAt: new Date('2026-03-15T00:00:01.000Z'),
  };
  const targetCollectionName = buildExpectedCollectionName('global_docs', {
    provider: 'custom',
    baseUrl: 'https://embedding.example.com/v1',
    model: 'text-embedding-custom',
  });
  let namespaceState = {
    _id: new ObjectId('507f1f77bcf86cd799439216'),
    namespaceKey: 'global_docs',
    scope: 'global' as const,
    projectId: null,
    sourceType: 'global_docs' as const,
    activeCollectionName: buildExpectedCollectionName('global_docs'),
    activeEmbeddingProvider: 'openai' as const,
    activeApiKeyEncrypted: encryptApiKey('sk-old-openai'),
    activeEmbeddingBaseUrl: 'https://api.openai.com/v1',
    activeEmbeddingModel: 'text-embedding-3-small',
    activeEmbeddingFingerprint: buildKnowledgeEmbeddingFingerprint({
      provider: 'openai',
      baseUrl: 'https://api.openai.com/v1',
      model: 'text-embedding-3-small',
    } as never),
    rebuildStatus: 'failed' as const,
    targetCollectionName: 'global_docs__emb_stale',
    targetEmbeddingProvider: 'custom' as const,
    targetEmbeddingBaseUrl: 'https://embedding.old.example.com/v1',
    targetEmbeddingModel: 'text-embedding-custom',
    targetEmbeddingFingerprint: 'stale-fingerprint',
    lastErrorMessage: '旧状态残留',
    createdAt: new Date('2026-03-14T00:00:00.000Z'),
    updatedAt: new Date('2026-03-14T00:00:00.000Z'),
  };
  let createdDocument: (KnowledgeDocumentRecord & {
    _id: NonNullable<KnowledgeDocumentRecord['_id']>;
  }) | null = null;
  let resolveCompleted: (() => void) | null = null;
  const processingCompleted = new Promise<void>((resolve) => {
    resolveCompleted = resolve;
  });
  const fetchPayloads: Array<Record<string, unknown>> = [];

  const repository = {
    ensureMetadataModel: async () => undefined,
    findKnowledgeById: async (id: string) => (id === knowledgeId ? knowledge : null),
    findKnowledgeNamespaceIndexState: async () => namespaceState,
    updateKnowledgeNamespaceIndexState: async (_namespaceKey: string, patch: Record<string, unknown>) => {
      namespaceState = {
        ...namespaceState,
        ...patch,
      };
      return namespaceState;
    },
    listKnowledgeBases: async () => [knowledge],
    createKnowledgeDocument: async (
      document: KnowledgeDocumentRecord & {
        _id: NonNullable<KnowledgeDocumentRecord['_id']>;
      },
    ) => {
      createdDocument = document;
      return document;
    },
    updateKnowledgeSummaryAfterDocumentUpload: async () => updatedKnowledge,
    updateKnowledgeDocument: async (
      documentId: string,
      patch: Partial<
        Pick<
          KnowledgeDocumentRecord,
          'status' | 'chunkCount' | 'lastIndexedAt' | 'errorMessage' | 'processedAt' | 'updatedAt'
        >
      >,
    ) => {
      if (patch.status === 'completed') {
        resolveCompleted?.();
      }

      return {
        _id: new ObjectId(documentId),
        knowledgeId,
        fileName: createdDocument?.fileName ?? 'README.md',
        mimeType: createdDocument?.mimeType ?? 'text/markdown',
        storagePath: createdDocument?.storagePath ?? '',
        status: patch.status ?? 'pending',
        chunkCount: patch.chunkCount ?? 0,
        documentVersionHash: createdDocument?.documentVersionHash ?? 'hash-1',
        embeddingProvider: createdDocument?.embeddingProvider ?? 'custom',
        embeddingModel: createdDocument?.embeddingModel ?? 'text-embedding-custom',
        lastIndexedAt: patch.lastIndexedAt ?? null,
        retryCount: 0,
        errorMessage: patch.errorMessage ?? null,
        uploadedBy: actorId,
        uploadedAt: new Date('2026-03-15T00:00:00.000Z'),
        processedAt: patch.processedAt ?? null,
        createdAt: new Date('2026-03-15T00:00:00.000Z'),
        updatedAt: patch.updatedAt ?? new Date('2026-03-15T00:00:00.000Z'),
      };
    },
    syncKnowledgeSummaryFromDocuments: async () => undefined,
  } as unknown as KnowledgeRepository;

  const service = createKnowledgeService({
    env,
    repository,
    searchService: createSearchServiceStub(),
    authRepository: {
      findProfilesByIds: async () => [],
    } as unknown as AuthRepository,
    settingsRepository: {
      getSettings: async () => ({
        embedding: {
          provider: 'custom',
          baseUrl: 'https://embedding.example.com/v1',
          model: 'text-embedding-custom',
          apiKeyEncrypted: encryptApiKey('db-embedding-key'),
          apiKeyHint: 'db-e...-key',
          testedAt: null,
          testStatus: null,
        },
      }),
    } as unknown as SettingsRepository,
  });

  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (_input, init) => {
    fetchPayloads.push(JSON.parse(String(init?.body ?? '{}')) as Record<string, unknown>);
    return new Response(
      JSON.stringify({
        status: 'completed',
        knowledgeId,
        documentId: createdDocument?._id.toHexString() ?? 'document-1',
        chunkCount: 4,
        characterCount: 64,
        parser: 'markdown',
        collectionName: targetCollectionName,
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
    const uploadResponse = await service.uploadDocument(
      {
        actor: {
          id: actorId,
          username: 'langya',
        },
      },
      knowledgeId,
      {
        originalName: 'README.md',
        mimeType: 'text/markdown',
        size: 20,
        buffer: Buffer.from('# hello namespace\n', 'utf-8'),
      },
    );

    assert.equal(uploadResponse.document.status, 'pending');

    await Promise.race([
      processingCompleted,
      delay(2000).then(() => {
        throw new Error('Timed out waiting for empty namespace upload processing');
      }),
    ]);
  } finally {
    globalThis.fetch = originalFetch;
    process.env.SETTINGS_ENCRYPTION_KEY = originalEncryptionKey;
  }

  assert.equal(namespaceState.activeCollectionName, targetCollectionName);
  assert.equal(namespaceState.activeEmbeddingProvider, 'custom');
  assert.equal(namespaceState.activeEmbeddingModel, 'text-embedding-custom');
  assert.equal(namespaceState.rebuildStatus, 'idle');
  assert.equal(namespaceState.targetCollectionName, null);
  assert.equal(namespaceState.lastErrorMessage, null);
  assert.equal(fetchPayloads[0]?.collectionName, targetCollectionName);
});

test('rebuildKnowledge rebuilds the whole namespace into a new collection when the embedding model changes', async () => {
  const originalEncryptionKey = process.env.SETTINGS_ENCRYPTION_KEY;
  process.env.SETTINGS_ENCRYPTION_KEY =
    '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
  const knowledgeId = '507f1f77bcf86cd799439221';
  const siblingKnowledgeId = '507f1f77bcf86cd799439222';
  const actorId = '507f1f77bcf86cd799439012';
  const knowledge = {
    _id: new ObjectId(knowledgeId),
    name: '知识库 A',
    description: '用于验证命名空间级重建',
    sourceType: 'global_docs',
    indexStatus: 'completed' as const,
    documentCount: 1,
    chunkCount: 3,
    maintainerId: actorId,
    createdBy: actorId,
    createdAt: new Date('2026-03-14T00:00:00.000Z'),
    updatedAt: new Date('2026-03-14T00:00:00.000Z'),
  };
  const siblingKnowledge = {
    _id: new ObjectId(siblingKnowledgeId),
    name: '知识库 B',
    description: '同 namespace 的另一个知识库',
    sourceType: 'global_docs' as const,
    indexStatus: 'completed' as const,
    documentCount: 1,
    chunkCount: 2,
    maintainerId: actorId,
    createdBy: actorId,
    createdAt: new Date('2026-03-14T00:00:00.000Z'),
    updatedAt: new Date('2026-03-14T00:00:00.000Z'),
  };
  const documents: Array<KnowledgeDocumentRecord & { _id: ObjectId }> = [
    {
      _id: new ObjectId('507f1f77bcf86cd799439223'),
      knowledgeId,
      fileName: 'README-A.md',
      mimeType: 'text/markdown',
      storagePath: `${knowledgeId}/507f1f77bcf86cd799439223/hash-a/README-A.md`,
      status: 'completed',
      chunkCount: 3,
      documentVersionHash: 'hash-a',
      embeddingProvider: 'openai',
      embeddingModel: 'text-embedding-3-small',
      lastIndexedAt: new Date('2026-03-14T00:00:10.000Z'),
      retryCount: 0,
      errorMessage: null,
      uploadedBy: actorId,
      uploadedAt: new Date('2026-03-14T00:00:00.000Z'),
      processedAt: new Date('2026-03-14T00:00:10.000Z'),
      createdAt: new Date('2026-03-14T00:00:00.000Z'),
      updatedAt: new Date('2026-03-14T00:00:10.000Z'),
    },
    {
      _id: new ObjectId('507f1f77bcf86cd799439224'),
      knowledgeId: siblingKnowledgeId,
      fileName: 'README-B.md',
      mimeType: 'text/markdown',
      storagePath: `${siblingKnowledgeId}/507f1f77bcf86cd799439224/hash-b/README-B.md`,
      status: 'completed',
      chunkCount: 2,
      documentVersionHash: 'hash-b',
      embeddingProvider: 'openai',
      embeddingModel: 'text-embedding-3-small',
      lastIndexedAt: new Date('2026-03-14T00:00:10.000Z'),
      retryCount: 0,
      errorMessage: null,
      uploadedBy: actorId,
      uploadedAt: new Date('2026-03-14T00:00:00.000Z'),
      processedAt: new Date('2026-03-14T00:00:10.000Z'),
      createdAt: new Date('2026-03-14T00:00:00.000Z'),
      updatedAt: new Date('2026-03-14T00:00:10.000Z'),
    },
  ];
  const oldCollectionName = buildExpectedCollectionName('global_docs');
  const targetCollectionName = buildExpectedCollectionName('global_docs', {
    provider: 'custom',
    baseUrl: 'https://embedding.example.com/v1',
    model: 'text-embedding-custom',
  });
  let namespaceState = {
    _id: new ObjectId('507f1f77bcf86cd799439225'),
    namespaceKey: 'global_docs',
    scope: 'global' as const,
    projectId: null,
    sourceType: 'global_docs' as const,
    activeCollectionName: oldCollectionName,
    activeEmbeddingProvider: 'openai' as const,
    activeApiKeyEncrypted: encryptApiKey('sk-old-openai'),
    activeEmbeddingBaseUrl: 'https://api.openai.com/v1',
    activeEmbeddingModel: 'text-embedding-3-small',
    activeEmbeddingFingerprint: buildKnowledgeEmbeddingFingerprint({
      provider: 'openai',
      baseUrl: 'https://api.openai.com/v1',
      model: 'text-embedding-3-small',
    } as never),
    rebuildStatus: 'idle' as const,
    targetCollectionName: null,
    targetEmbeddingProvider: null,
    targetEmbeddingBaseUrl: null,
    targetEmbeddingModel: null,
    targetEmbeddingFingerprint: null,
    lastErrorMessage: null,
    createdAt: new Date('2026-03-14T00:00:00.000Z'),
    updatedAt: new Date('2026-03-14T00:00:00.000Z'),
  };
  const fetchPayloads: Array<Record<string, unknown>> = [];
  let deletedCollectionName = '';
  let resolveCompleted: (() => void) | null = null;
  const rebuildCompleted = new Promise<void>((resolve) => {
    resolveCompleted = resolve;
  });

  const repository = {
    ensureMetadataModel: async () => undefined,
    findKnowledgeById: async (id: string) => {
      if (id === knowledgeId) {
        return knowledge;
      }

      if (id === siblingKnowledgeId) {
        return siblingKnowledge;
      }

      return null;
    },
    listDocumentsByKnowledgeId: async (id: string) => documents.filter((document) => document.knowledgeId === id),
    listKnowledgeBasesByNamespace: async () => [knowledge, siblingKnowledge],
    listDocumentsByKnowledgeIds: async (ids: string[]) =>
      documents.filter((document) => ids.includes(document.knowledgeId)),
    findKnowledgeNamespaceIndexState: async () => namespaceState,
    updateKnowledgeNamespaceIndexState: async (_namespaceKey: string, patch: Record<string, unknown>) => {
      namespaceState = {
        ...namespaceState,
        ...patch,
      };

      if (
        namespaceState.rebuildStatus === 'idle' &&
        namespaceState.activeCollectionName === targetCollectionName
      ) {
        resolveCompleted?.();
      }

      return namespaceState;
    },
    updateKnowledgeDocument: async (documentId: string, patch: Record<string, unknown>) => {
      const current = documents.find((document) => document._id.toHexString() === documentId) ?? null;
      if (!current) {
        return null;
      }

      Object.assign(current, patch);
      return current;
    },
    syncKnowledgeSummaryFromDocuments: async () => undefined,
  } as unknown as KnowledgeRepository;

  const service = createKnowledgeService({
    env: createTestEnv('/tmp/knowject-knowledge-namespace-rebuild'),
    repository,
    searchService: createSearchServiceStub({
      deleteCollection: async (collectionName) => {
        deletedCollectionName = collectionName;
      },
    }),
    authRepository: {
      findProfilesByIds: async () => [],
    } as unknown as AuthRepository,
    settingsRepository: {
      getSettings: async () => ({
        embedding: {
          provider: 'custom',
          baseUrl: 'https://embedding.example.com/v1',
          model: 'text-embedding-custom',
          apiKeyEncrypted: encryptApiKey('db-embedding-key'),
          apiKeyHint: 'db-e...-key',
          testedAt: null,
          testStatus: null,
        },
      }),
    } as unknown as SettingsRepository,
  });

  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (_input, init) => {
    const payload = JSON.parse(String(init?.body ?? '{}')) as Record<string, unknown>;
    fetchPayloads.push(payload);

    return new Response(
      JSON.stringify({
        status: 'completed',
        knowledgeId: payload.knowledgeId,
        documentId: payload.documentId,
        chunkCount: 5,
        characterCount: 120,
        parser: 'markdown',
        collectionName: targetCollectionName,
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
    await service.rebuildKnowledge(
      {
        actor: {
          id: actorId,
          username: 'langya',
        },
      },
      knowledgeId,
    );

    await Promise.race([
      rebuildCompleted,
      delay(2000).then(() => {
        throw new Error('Timed out waiting for namespace rebuild completion');
      }),
    ]);
    await delay(0);

    assert.equal(fetchPayloads.length, 2);
    assert.equal(fetchPayloads.every((payload) => payload.collectionName === targetCollectionName), true);
    assert.deepEqual(
      new Set(fetchPayloads.map((payload) => String(payload.knowledgeId))),
      new Set([knowledgeId, siblingKnowledgeId]),
    );
    assert.equal(namespaceState.activeCollectionName, targetCollectionName);
    assert.equal(namespaceState.rebuildStatus, 'idle');
    assert.equal(deletedCollectionName, oldCollectionName);
    assert.equal(
      documents.every((document) => document.embeddingModel === 'text-embedding-custom'),
      true,
    );
  } finally {
    globalThis.fetch = originalFetch;
    process.env.SETTINGS_ENCRYPTION_KEY = originalEncryptionKey;
  }
});

test('rebuildKnowledge marks a legacy namespace as rebuilding before concurrent deletes can proceed', async () => {
  const storageRoot = await mkdtemp(join(tmpdir(), 'knowject-knowledge-legacy-rebuild-'));
  const knowledgeId = '507f1f77bcf86cd799439226';
  const documentId = '507f1f77bcf86cd799439227';
  const actorId = '507f1f77bcf86cd799439012';
  const knowledge = {
    _id: new ObjectId(knowledgeId),
    name: '知识库 A',
    description: '用于验证 legacy namespace rebuild 锁定',
    sourceType: 'global_docs' as const,
    indexStatus: 'completed' as const,
    documentCount: 1,
    chunkCount: 3,
    maintainerId: actorId,
    createdBy: actorId,
    createdAt: new Date('2026-03-14T00:00:00.000Z'),
    updatedAt: new Date('2026-03-14T00:00:00.000Z'),
  };
  const document: KnowledgeDocumentRecord & { _id: ObjectId } = {
    _id: new ObjectId(documentId),
    knowledgeId,
    fileName: 'README.md',
    mimeType: 'text/markdown',
    storagePath: `${knowledgeId}/${documentId}/hash-1/README.md`,
    status: 'completed',
    chunkCount: 3,
    documentVersionHash: 'hash-1',
    embeddingProvider: 'openai',
    embeddingModel: 'text-embedding-3-small',
    lastIndexedAt: new Date('2026-03-14T00:00:10.000Z'),
    retryCount: 0,
    errorMessage: null,
    uploadedBy: actorId,
    uploadedAt: new Date('2026-03-14T00:00:00.000Z'),
    processedAt: new Date('2026-03-14T00:00:10.000Z'),
    createdAt: new Date('2026-03-14T00:00:00.000Z'),
    updatedAt: new Date('2026-03-14T00:00:10.000Z'),
  };
  let namespaceState: (KnowledgeNamespaceIndexStateDocument & { _id: ObjectId }) | null = null;
  let deleteDocumentChunksCalled = false;
  let deleteKnowledgeDocumentCalled = false;
  let resolveFetch!: () => void;
  let resolveCompleted!: () => void;
  const fetchReleased = new Promise<void>((resolve) => {
    resolveFetch = resolve;
  });
  const rebuildCompleted = new Promise<void>((resolve) => {
    resolveCompleted = resolve;
  });

  const repository = {
    ensureMetadataModel: async () => undefined,
    findKnowledgeById: async (id: string) => (id === knowledgeId ? knowledge : null),
    findKnowledgeNamespaceIndexState: async () => namespaceState,
    createKnowledgeNamespaceIndexState: async (
      state: Omit<KnowledgeNamespaceIndexStateDocument, '_id'>,
    ) => {
      namespaceState = {
        _id: new ObjectId('507f1f77bcf86cd799439228'),
        ...state,
      };
      return namespaceState;
    },
    updateKnowledgeNamespaceIndexState: async (
      _namespaceKey: string,
      patch: Partial<
        Omit<
          KnowledgeNamespaceIndexStateDocument,
          '_id' | 'namespaceKey' | 'scope' | 'projectId' | 'sourceType'
        >
      >,
    ) => {
      if (!namespaceState) {
        return null;
      }

      namespaceState = {
        ...namespaceState,
        ...patch,
      };

      if (namespaceState.rebuildStatus === 'idle') {
        resolveCompleted?.();
      }

      return namespaceState;
    },
    listDocumentsByKnowledgeId: async () => [document],
    listKnowledgeBasesByNamespace: async () => [knowledge],
    listDocumentsByKnowledgeIds: async () => [document],
    findKnowledgeDocumentById: async (id: string) => (id === documentId ? document : null),
    updateKnowledgeDocument: async (_documentId: string, patch: Record<string, unknown>) => {
      Object.assign(document, patch);
      return document;
    },
    syncKnowledgeSummaryFromDocuments: async () => undefined,
    deleteKnowledgeDocumentById: async () => {
      deleteKnowledgeDocumentCalled = true;
      return true;
    },
  } as unknown as KnowledgeRepository;

  const service = createKnowledgeService({
    env: createTestEnv(storageRoot),
    repository,
    searchService: createSearchServiceStub({
      deleteDocumentChunks: async () => {
        deleteDocumentChunksCalled = true;
      },
    }),
    authRepository: {
      findProfilesByIds: async () => [],
    } as unknown as AuthRepository,
  });

  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (_input, init) => {
    await fetchReleased;

    const payload = JSON.parse(String(init?.body ?? '{}')) as Record<string, unknown>;
    return new Response(
      JSON.stringify({
        status: 'completed',
        knowledgeId: payload.knowledgeId,
        documentId: payload.documentId,
        chunkCount: 3,
        characterCount: 64,
        parser: 'markdown',
        collectionName: buildExpectedCollectionName('global_docs'),
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
    await service.rebuildKnowledge(
      {
        actor: {
          id: actorId,
          username: 'langya',
        },
      },
      knowledgeId,
    );

    assert.notEqual(namespaceState, null);
    if (!namespaceState) {
      throw new Error('namespaceState should be created before deleteDocument');
    }
    const rebuildingNamespaceState = namespaceState as KnowledgeNamespaceIndexStateDocument & {
      _id: ObjectId;
    };

    assert.equal(rebuildingNamespaceState.rebuildStatus, 'rebuilding');
    assert.equal(rebuildingNamespaceState.activeCollectionName, 'global_docs');
    assert.equal(
      rebuildingNamespaceState.targetCollectionName,
      buildExpectedCollectionName('global_docs'),
    );

    await assert.rejects(
      () =>
        service.deleteDocument(
          {
            actor: {
              id: actorId,
              username: 'langya',
            },
          },
          knowledgeId,
          documentId,
        ),
      (error) => error instanceof Error && error.message === '当前命名空间正在重建，请稍后再试',
    );

    assert.equal(deleteDocumentChunksCalled, false);
    assert.equal(deleteKnowledgeDocumentCalled, false);

    resolveFetch();
    await Promise.race([
      rebuildCompleted,
      delay(2000).then(() => {
        throw new Error('Timed out waiting for legacy namespace rebuild completion');
      }),
    ]);
  } finally {
    resolveFetch();
    globalThis.fetch = originalFetch;
  }

  assert.notEqual(namespaceState, null);
  if (!namespaceState) {
    throw new Error('namespaceState should remain available after rebuild');
  }
  const completedNamespaceState = namespaceState as KnowledgeNamespaceIndexStateDocument & {
    _id: ObjectId;
  };

  assert.equal(completedNamespaceState.rebuildStatus, 'idle');
  assert.equal(
    completedNamespaceState.activeCollectionName,
    buildExpectedCollectionName('global_docs'),
  );
});

test('rebuildKnowledge rejects when there are documents still indexing', async () => {
  const knowledgeId = '507f1f77bcf86cd799439011';
  const knowledge: KnowledgeBaseDocument & {
    _id: NonNullable<KnowledgeBaseDocument['_id']>;
  } = {
    _id: new ObjectId(knowledgeId),
    name: '知识库 A',
    description: '用于验证 rebuild knowledge 冲突',
    sourceType: 'global_docs',
    indexStatus: 'processing',
    documentCount: 2,
    chunkCount: 4,
    maintainerId: '507f1f77bcf86cd799439012',
    createdBy: '507f1f77bcf86cd799439013',
    createdAt: new Date('2026-03-14T00:00:00.000Z'),
    updatedAt: new Date('2026-03-14T00:00:00.000Z'),
  };

  let updateCalled = false;

  const repository = {
    ensureMetadataModel: async () => undefined,
    findKnowledgeById: async (id: string) => (id === knowledgeId ? knowledge : null),
    listDocumentsByKnowledgeId: async () => [
      {
        _id: new ObjectId('507f1f77bcf86cd799439099'),
        knowledgeId,
        fileName: 'README.md',
        mimeType: 'text/markdown',
        storagePath: `${knowledgeId}/507f1f77bcf86cd799439099/hash-1/README.md`,
        status: 'processing' as const,
        chunkCount: 2,
        documentVersionHash: 'hash-1',
        embeddingProvider: 'openai' as const,
        embeddingModel: 'text-embedding-3-small' as const,
        lastIndexedAt: null,
        retryCount: 0,
        errorMessage: null,
        uploadedBy: '507f1f77bcf86cd799439012',
        uploadedAt: new Date('2026-03-14T00:00:00.000Z'),
        processedAt: null,
        createdAt: new Date('2026-03-14T00:00:00.000Z'),
        updatedAt: new Date('2026-03-14T00:05:00.000Z'),
      },
    ],
    updateKnowledgeDocument: async () => {
      updateCalled = true;
      return null;
    },
  } as unknown as KnowledgeRepository;

  const authRepository = {
    findProfilesByIds: async () => [],
  } as unknown as AuthRepository;

  const service = createKnowledgeService({
    env: createTestEnv('/tmp/knowject-knowledge-rebuild-conflict'),
    repository,
    searchService: createSearchServiceStub(),
    authRepository,
  });

  await assert.rejects(
    () =>
      service.rebuildKnowledge(
        {
          actor: {
            id: '507f1f77bcf86cd799439012',
            username: 'langya',
          },
        },
        knowledgeId,
      ),
    (error) => error instanceof Error && error.message === '知识库存在正在索引的文档，请稍后再试',
  );

  assert.equal(updateCalled, false);
});

test('getKnowledgeDiagnostics degrades gracefully when collection or indexer checks fail', async () => {
  const storageRoot = await mkdtemp(join(tmpdir(), 'knowject-knowledge-diagnostics-'));
  const knowledgeId = '507f1f77bcf86cd799439011';
  const existingDocumentId = '507f1f77bcf86cd799439099';
  const staleDocumentId = '507f1f77bcf86cd799439098';
  const existingStoragePath = `${knowledgeId}/${existingDocumentId}/hash-1/README.md`;
  const existingStorageAbsolutePath = join(storageRoot, existingStoragePath);

  await mkdir(join(storageRoot, knowledgeId, existingDocumentId, 'hash-1'), { recursive: true });
  await writeFile(existingStorageAbsolutePath, '# hello\n', 'utf-8');

  const knowledge: KnowledgeBaseDocument & {
    _id: NonNullable<KnowledgeBaseDocument['_id']>;
  } = {
    _id: new ObjectId(knowledgeId),
    name: '知识库 A',
    description: '用于验证 diagnostics',
    sourceType: 'global_docs',
    indexStatus: 'processing',
    documentCount: 2,
    chunkCount: 2,
    maintainerId: '507f1f77bcf86cd799439012',
    createdBy: '507f1f77bcf86cd799439013',
    createdAt: new Date('2026-03-14T00:00:00.000Z'),
    updatedAt: new Date('2026-03-14T00:00:00.000Z'),
  };
  const documents = [
    {
      _id: new ObjectId(existingDocumentId),
      knowledgeId,
      fileName: 'README.md',
      mimeType: 'text/markdown',
      storagePath: existingStoragePath,
      status: 'completed' as const,
      chunkCount: 2,
      documentVersionHash: 'hash-1',
      embeddingProvider: 'openai' as const,
      embeddingModel: 'text-embedding-3-small' as const,
      lastIndexedAt: new Date('2026-03-14T00:10:00.000Z'),
      retryCount: 0,
      errorMessage: null,
      uploadedBy: '507f1f77bcf86cd799439012',
      uploadedAt: new Date('2026-03-14T00:00:00.000Z'),
      processedAt: new Date('2026-03-14T00:10:00.000Z'),
      createdAt: new Date('2026-03-14T00:00:00.000Z'),
      updatedAt: new Date('2026-03-14T00:10:00.000Z'),
    },
    {
      _id: new ObjectId(staleDocumentId),
      knowledgeId,
      fileName: 'missing.md',
      mimeType: 'text/markdown',
      storagePath: `${knowledgeId}/${staleDocumentId}/hash-2/missing.md`,
      status: 'processing' as const,
      chunkCount: 0,
      documentVersionHash: 'hash-2',
      embeddingProvider: 'openai' as const,
      embeddingModel: 'text-embedding-3-small' as const,
      lastIndexedAt: null,
      retryCount: 2,
      errorMessage: null,
      uploadedBy: '507f1f77bcf86cd799439012',
      uploadedAt: new Date('2026-03-14T00:00:00.000Z'),
      processedAt: null,
      createdAt: new Date('2026-03-14T00:00:00.000Z'),
      updatedAt: new Date(Date.now() - 16 * 60 * 1000),
    },
  ];

  const repository = {
    ensureMetadataModel: async () => undefined,
    findKnowledgeById: async (id: string) => (id === knowledgeId ? knowledge : null),
    listDocumentsByKnowledgeId: async () => documents,
  } as unknown as KnowledgeRepository;

  const authRepository = {
    findProfilesByIds: async () => [],
  } as unknown as AuthRepository;

  const service = createKnowledgeService({
    env: createTestEnv(storageRoot),
    repository,
    searchService: createSearchServiceStub({
      getDiagnostics: async ({ collectionName }) => ({
        collection: {
          name: collectionName,
          exists: false,
          errorMessage: 'Chroma 请求失败',
        },
      }),
    }),
    authRepository,
  });

  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => {
    throw new Error('connection refused');
  };

  try {
    const response = await service.getKnowledgeDiagnostics(
      {
        actor: {
          id: '507f1f77bcf86cd799439012',
          username: 'langya',
        },
      },
      knowledgeId,
    );

    assert.equal(response.expectedCollectionName, buildExpectedCollectionName('global_docs'));
    assert.deepEqual(response.documentSummary, {
      total: 2,
      pending: 0,
      processing: 1,
      completed: 1,
      failed: 0,
      missingStorage: 1,
      staleProcessing: 1,
    });
    assert.deepEqual(response.collection, {
      name: buildExpectedCollectionName('global_docs'),
      exists: false,
      errorMessage: 'Chroma 请求失败',
    });
    assert.equal(response.indexer.status, 'degraded');
    assert.equal(response.indexer.service, null);
    assert.equal(response.indexer.chromaReachable, null);
    assert.equal(response.indexer.errorMessage?.includes('Python indexer 诊断不可达'), true);
    assert.equal(response.documents.length, 2);
    assert.equal(response.documents[0]?.missingStorage, false);
    assert.equal(response.documents[1]?.missingStorage, true);
    assert.equal(response.documents[1]?.staleProcessing, true);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('getKnowledgeDiagnostics accepts legacy /health fallback when versioned diagnostics is unavailable', async () => {
  const storageRoot = await mkdtemp(join(tmpdir(), 'knowject-knowledge-diagnostics-health-'));
  const env = createTestEnv(storageRoot);
  const originalEncryptionKey = process.env.SETTINGS_ENCRYPTION_KEY;
  process.env.SETTINGS_ENCRYPTION_KEY = env.settings.encryptionKey;
  const knowledgeId = '507f1f77bcf86cd799439011';
  const knowledge: KnowledgeBaseDocument & {
    _id: NonNullable<KnowledgeBaseDocument['_id']>;
  } = {
    _id: new ObjectId(knowledgeId),
    name: '知识库 A',
    description: '用于验证 diagnostics health fallback',
    sourceType: 'global_docs',
    indexStatus: 'completed',
    documentCount: 0,
    chunkCount: 0,
    maintainerId: '507f1f77bcf86cd799439012',
    createdBy: '507f1f77bcf86cd799439013',
    createdAt: new Date('2026-03-14T00:00:00.000Z'),
    updatedAt: new Date('2026-03-14T00:00:00.000Z'),
  };
  const fetchCalls: string[] = [];

  const repository = {
    ensureMetadataModel: async () => undefined,
    findKnowledgeById: async (id: string) => (id === knowledgeId ? knowledge : null),
    listDocumentsByKnowledgeId: async () => [],
  } as unknown as KnowledgeRepository;

  const authRepository = {
    findProfilesByIds: async () => [],
  } as unknown as AuthRepository;
  const settingsRepository = createSettingsRepositoryStub({
    getSettings: async () => ({
      _id: new ObjectId('507f1f77bcf86cd799439601'),
      singleton: 'default',
      embedding: {
        provider: 'voyage',
        baseUrl: 'https://embedding.example.com/v1',
        model: 'voyage-3-large',
        apiKeyEncrypted: encryptApiKey('db-embedding-key'),
        apiKeyHint: '...-key',
        testedAt: null,
        testStatus: null,
      },
      indexing: {
        chunkSize: 860,
        chunkOverlap: 120,
        supportedTypes: ['md'],
        indexerTimeoutMs: 45000,
      },
      updatedAt: new Date('2026-03-16T00:00:00.000Z'),
      updatedBy: 'user-1',
    }),
  });

  const service = createKnowledgeService({
    env,
    repository,
    searchService: createSearchServiceStub(),
    authRepository,
    settingsRepository,
  });

  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
    fetchCalls.push(url);

    if (url.endsWith('/internal/v1/index/diagnostics')) {
      return new Response(
        JSON.stringify({
          status: 'not_found',
          message: 'Unknown route',
        }),
        {
          status: 404,
          headers: {
            'content-type': 'application/json',
          },
        },
      );
    }

    if (url.endsWith('/health')) {
      return new Response(
        JSON.stringify({
          status: 'ok',
          service: 'knowject-indexer-py',
          chunkSize: 1000,
          chunkOverlap: 200,
          supportedFormats: ['md', 'txt'],
        }),
        {
          status: 200,
          headers: {
            'content-type': 'application/json',
          },
        },
      );
    }

    throw new Error(`Unexpected fetch url: ${url}`);
  };

  try {
    const response = await service.getKnowledgeDiagnostics(
      {
        actor: {
          id: '507f1f77bcf86cd799439012',
          username: 'langya',
        },
      },
      knowledgeId,
    );

    assert.deepEqual(fetchCalls, [
      'http://127.0.0.1:8001/internal/v1/index/diagnostics',
      'http://127.0.0.1:8001/health',
    ]);
    assert.equal(response.indexer.status, 'ok');
    assert.equal(response.indexer.service, 'knowject-indexer-py');
    assert.equal(response.indexer.chunkSize, 860);
    assert.equal(response.indexer.chunkOverlap, 120);
    assert.deepEqual(response.indexer.supportedFormats, ['md']);
    assert.equal(response.indexer.embeddingProvider, 'voyage');
    assert.equal(response.indexer.chromaReachable, null);
    assert.equal(response.indexer.errorMessage, null);
  } finally {
    globalThis.fetch = originalFetch;
    process.env.SETTINGS_ENCRYPTION_KEY = originalEncryptionKey;
  }
});

test('deleteDocument deletes record and syncs knowledge summary even if Chroma cleanup fails', async () => {
  const storageRoot = await mkdtemp(join(tmpdir(), 'knowject-knowledge-document-delete-'));
  const knowledgeId = '507f1f77bcf86cd799439011';
  const documentId = '507f1f77bcf86cd799439099';
  const documentDir = join(storageRoot, knowledgeId, documentId, 'hash-1');
  await mkdir(documentDir, { recursive: true });

  const knowledge: KnowledgeBaseDocument & {
    _id: NonNullable<KnowledgeBaseDocument['_id']>;
  } = {
    _id: new ObjectId(knowledgeId),
    name: '知识库 A',
    description: '用于验证单文档删除',
    sourceType: 'global_docs',
    indexStatus: 'completed',
    documentCount: 1,
    chunkCount: 8,
    maintainerId: '507f1f77bcf86cd799439012',
    createdBy: '507f1f77bcf86cd799439013',
    createdAt: new Date('2026-03-14T00:00:00.000Z'),
    updatedAt: new Date('2026-03-14T00:00:00.000Z'),
  };
  const document = {
    _id: new ObjectId(documentId),
    knowledgeId,
    fileName: 'README.md',
    mimeType: 'text/markdown',
    storagePath: `${knowledgeId}/${documentId}/hash-1/README.md`,
    status: 'completed' as const,
    chunkCount: 8,
    documentVersionHash: 'hash-1',
    embeddingProvider: 'openai' as const,
    embeddingModel: 'text-embedding-3-small' as const,
    lastIndexedAt: new Date('2026-03-14T00:00:10.000Z'),
    retryCount: 0,
    errorMessage: null,
    uploadedBy: '507f1f77bcf86cd799439012',
    uploadedAt: new Date('2026-03-14T00:00:00.000Z'),
    processedAt: new Date('2026-03-14T00:00:10.000Z'),
    createdAt: new Date('2026-03-14T00:00:00.000Z'),
    updatedAt: new Date('2026-03-14T00:00:10.000Z'),
  };

  let deletedDocument = false;
  let summarySynced = false;

  const repository = {
    ensureMetadataModel: async () => undefined,
    findKnowledgeById: async (id: string) => (id === knowledgeId ? knowledge : null),
    findKnowledgeDocumentById: async (id: string) => (id === documentId ? document : null),
    deleteKnowledgeDocumentById: async () => {
      deletedDocument = true;
      return true;
    },
    syncKnowledgeSummaryFromDocuments: async () => {
      summarySynced = true;
      return knowledge;
    },
  } as unknown as KnowledgeRepository;

  const searchService = createSearchServiceStub({
    deleteDocumentChunks: async () => {
      throw new Error('Chroma down');
    },
  });

  const authRepository = {
    findProfilesByIds: async () => [],
  } as unknown as AuthRepository;

  const service = createKnowledgeService({
    env: createTestEnv(storageRoot),
    repository,
    searchService,
    authRepository,
  });

  await assert.doesNotReject(() =>
    service.deleteDocument(
      {
        actor: {
          id: '507f1f77bcf86cd799439012',
          username: 'langya',
        },
      },
      knowledgeId,
      documentId,
    ),
  );

  assert.equal(deletedDocument, true);
  assert.equal(summarySynced, true);
  await assert.rejects(access(documentDir));
});

test('deleteDocument removes project-scoped storage directories', async () => {
  const storageRoot = await mkdtemp(join(tmpdir(), 'knowject-project-document-delete-'));
  const knowledgeId = '507f1f77bcf86cd799439211';
  const documentId = '507f1f77bcf86cd799439212';
  const projectId = '507f1f77bcf86cd799439213';
  const actorId = '507f1f77bcf86cd799439214';
  const documentDir = join(
    storageRoot,
    'projects',
    projectId,
    'knowledge',
    knowledgeId,
    documentId,
    'hash-1',
  );
  await mkdir(documentDir, { recursive: true });
  await writeFile(join(documentDir, 'README.md'), '# project document\n', 'utf8');

  const knowledge: KnowledgeBaseDocument & {
    _id: NonNullable<KnowledgeBaseDocument['_id']>;
  } = {
    _id: new ObjectId(knowledgeId),
    name: '项目知识库 A',
    description: '用于验证项目单文档删除',
    scope: 'project',
    projectId,
    sourceType: 'global_docs',
    indexStatus: 'completed',
    documentCount: 1,
    chunkCount: 8,
    maintainerId: actorId,
    createdBy: actorId,
    createdAt: new Date('2026-03-15T00:00:00.000Z'),
    updatedAt: new Date('2026-03-15T00:00:00.000Z'),
  };
  const document = {
    _id: new ObjectId(documentId),
    knowledgeId,
    fileName: 'README.md',
    mimeType: 'text/markdown',
    storagePath: `projects/${projectId}/knowledge/${knowledgeId}/${documentId}/hash-1/README.md`,
    status: 'completed' as const,
    chunkCount: 8,
    documentVersionHash: 'hash-1',
    embeddingProvider: 'openai' as const,
    embeddingModel: 'text-embedding-3-small' as const,
    lastIndexedAt: new Date('2026-03-15T00:00:10.000Z'),
    retryCount: 0,
    errorMessage: null,
    uploadedBy: actorId,
    uploadedAt: new Date('2026-03-15T00:00:00.000Z'),
    processedAt: new Date('2026-03-15T00:00:10.000Z'),
    createdAt: new Date('2026-03-15T00:00:00.000Z'),
    updatedAt: new Date('2026-03-15T00:00:10.000Z'),
  };

  let deletedDocument = false;
  let summarySynced = false;

  const repository = {
    ensureMetadataModel: async () => undefined,
    findKnowledgeById: async (id: string) => (id === knowledgeId ? knowledge : null),
    findKnowledgeDocumentById: async (id: string) => (id === documentId ? document : null),
    deleteKnowledgeDocumentById: async () => {
      deletedDocument = true;
      return true;
    },
    syncKnowledgeSummaryFromDocuments: async () => {
      summarySynced = true;
      return knowledge;
    },
  } as unknown as KnowledgeRepository;

  const service = createKnowledgeService({
    env: createTestEnv(storageRoot),
    repository,
    searchService: createSearchServiceStub(),
    authRepository: {
      findProfilesByIds: async () => [],
    } as unknown as AuthRepository,
    projectsRepository: createProjectsRepositoryStub({
      findById: async (id: string) =>
        id === projectId
          ? ({
              _id: new ObjectId(projectId),
              name: '项目 A',
              description: '',
              ownerId: actorId,
              members: [
                {
                  userId: actorId,
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
            })
          : null,
    }),
  });

  await service.deleteDocument(
    {
      actor: {
        id: actorId,
        username: 'langya',
      },
    },
    knowledgeId,
    documentId,
  );

  assert.equal(deletedDocument, true);
  assert.equal(summarySynced, true);
  await assert.rejects(access(documentDir));
});
