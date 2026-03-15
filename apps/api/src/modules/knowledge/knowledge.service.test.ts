import assert from 'node:assert/strict';
import { access, mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import test from 'node:test';
import { ObjectId } from 'mongodb';
import type { AppEnv } from '@config/env.js';
import type { AuthRepository } from '@modules/auth/auth.repository.js';
import type { ProjectsRepository } from '@modules/projects/projects.repository.js';
import type { KnowledgeRepository } from './knowledge.repository.js';
import type { KnowledgeSearchService } from './knowledge.search.js';
import { createKnowledgeService } from './knowledge.service.js';
import type { KnowledgeBaseDocument, KnowledgeDocumentRecord } from './knowledge.types.js';

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
    ...overrides,
  };
};

const createProjectsRepositoryStub = (
  overrides: Partial<ProjectsRepository> = {},
): ProjectsRepository => {
  return {
    findById: async () => null,
    ...overrides,
  } as unknown as ProjectsRepository;
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
      collectionName: 'global_docs',
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
      collectionName: `proj_${projectId}_docs`,
      topK: 2,
    },
  ]);
});

test('deleteKnowledge uses project collection name during Chroma cleanup', async () => {
  const storageRoot = await mkdtemp(join(tmpdir(), 'knowject-project-delete-'));
  const knowledgeId = '507f1f77bcf86cd799439151';
  const projectId = '507f1f77bcf86cd799439161';
  const actorId = '507f1f77bcf86cd799439171';
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

  assert.equal(cleanupCollectionName, `proj_${projectId}_docs`);
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

    assert.equal(response.expectedCollectionName, 'global_docs');
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
      name: 'global_docs',
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
    assert.equal(response.indexer.chunkSize, 1000);
    assert.equal(response.indexer.chunkOverlap, 200);
    assert.deepEqual(response.indexer.supportedFormats, ['md', 'txt']);
    assert.equal(response.indexer.embeddingProvider, null);
    assert.equal(response.indexer.chromaReachable, null);
    assert.equal(response.indexer.errorMessage, null);
  } finally {
    globalThis.fetch = originalFetch;
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
