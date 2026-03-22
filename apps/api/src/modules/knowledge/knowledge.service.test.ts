import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { access, mkdir, mkdtemp, readFile, readdir, writeFile } from 'node:fs/promises';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { delimiter, join } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { ObjectId } from 'mongodb';
import type { AppEnv } from '@config/env.js';
import { AppError } from '@lib/app-error.js';
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
import { validateUploadFile } from './knowledge.service.helpers.js';
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

const indexerPyPackageRoot = fileURLToPath(
  new URL('../../../../indexer-py/', import.meta.url),
);
const indexerCaptureServerScriptPath = fileURLToPath(
  new URL('../../../../indexer-py/tests/indexer_capture_server.py', import.meta.url),
);

const reserveAvailablePort = async (): Promise<number> => {
  return await new Promise<number>((resolve, reject) => {
    const server = createServer();

    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      if (!address || typeof address === 'string') {
        server.close();
        reject(new Error('Failed to reserve port for Python indexer capture server'));
        return;
      }

      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }

        resolve(address.port);
      });
    });
  });
};

const waitForHttpOk = async (url: string, timeoutMs = 10000): Promise<void> => {
  const deadline = Date.now() + timeoutMs;
  let lastError: unknown = null;

  while (Date.now() < deadline) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        return;
      }

      lastError = new Error(`Unexpected HTTP ${response.status}`);
    } catch (error) {
      lastError = error;
    }

    await delay(100);
  }

  const message = lastError instanceof Error ? lastError.message : 'unknown error';
  throw new Error(`Timed out waiting for Python indexer capture server: ${message}`);
};

const waitForJsonFile = async (
  filePath: string,
  timeoutMs = 5000,
): Promise<Record<string, unknown>> => {
  const deadline = Date.now() + timeoutMs;
  let lastError: unknown = null;

  while (Date.now() < deadline) {
    try {
      const content = await readFile(filePath, 'utf-8');
      return JSON.parse(content) as Record<string, unknown>;
    } catch (error) {
      lastError = error;
      await delay(100);
    }
  }

  const message = lastError instanceof Error ? lastError.message : 'unknown error';
  throw new Error(`Timed out waiting for capture file ${filePath}: ${message}`);
};

const startIndexerCaptureServer = async (
  capturePath: string,
  storageRoot: string,
): Promise<{ baseUrl: string; stop: () => Promise<void> }> => {
  const port = await reserveAvailablePort();
  const stderrChunks: string[] = [];
  const processHandle = spawn(
    'uv',
    [
      'run',
      'python',
      '-u',
      indexerCaptureServerScriptPath,
      '--host',
      '127.0.0.1',
      '--port',
      String(port),
      '--capture-path',
      capturePath,
    ],
    {
      cwd: indexerPyPackageRoot,
      env: {
        ...process.env,
        KNOWLEDGE_STORAGE_ROOT: storageRoot,
        PYTHONPATH: [indexerPyPackageRoot, process.env.PYTHONPATH]
          .filter((value): value is string => Boolean(value))
          .join(delimiter),
      },
      stdio: ['ignore', 'ignore', 'pipe'],
    },
  );

  processHandle.stderr?.setEncoding('utf-8');
  processHandle.stderr?.on('data', (chunk) => {
    stderrChunks.push(chunk);
  });

  const baseUrl = `http://127.0.0.1:${port}`;

  try {
    await waitForHttpOk(`${baseUrl}/health`);
  } catch (error) {
    if (processHandle.exitCode === null) {
      processHandle.kill('SIGTERM');
    }

    const stderr = stderrChunks.join('').trim();
    const reason = error instanceof Error ? error.message : 'unknown startup error';
    throw new Error(
      stderr
        ? `Python indexer capture server failed to start: ${reason}\n${stderr}`
        : `Python indexer capture server failed to start: ${reason}`,
    );
  }

  return {
    baseUrl,
    stop: async () => {
      if (processHandle.exitCode !== null) {
        return;
      }

      await new Promise<void>((resolve) => {
        const timeout = setTimeout(() => {
          if (processHandle.exitCode === null) {
            processHandle.kill('SIGKILL');
          }
        }, 2000);

        processHandle.once('exit', () => {
          clearTimeout(timeout);
          resolve();
        });

        processHandle.kill('SIGTERM');
      });
    },
  };
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

test('validateUploadFile allows modern text and office formats while rejecting legacy office extensions', () => {
  const allowedFiles = [
    { originalName: 'README.md', mimeType: 'text/markdown' },
    { originalName: 'README.markdown', mimeType: 'text/x-markdown' },
    { originalName: 'notes.txt', mimeType: 'text/plain' },
    { originalName: 'guide.pdf', mimeType: 'application/pdf' },
    {
      originalName: 'spec.docx',
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    },
    {
      originalName: 'metrics.xlsx',
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    },
  ] as const;

  for (const file of allowedFiles) {
    assert.doesNotThrow(() =>
      validateUploadFile('global_docs', {
        ...file,
        size: 16,
        buffer: Buffer.from('content', 'utf-8'),
      }),
    );
  }

  const rejectedLegacyFiles = [
    {
      originalName: 'legacy.doc',
      mimeType: 'application/msword',
    },
    {
      originalName: 'legacy.xls',
      mimeType: 'application/vnd.ms-excel',
    },
  ] as const;

  for (const file of rejectedLegacyFiles) {
    assert.throws(
      () =>
        validateUploadFile('global_docs', {
          ...file,
          size: 16,
          buffer: Buffer.from('legacy', 'utf-8'),
        }),
      (error) =>
        error instanceof AppError &&
        error.code === 'KNOWLEDGE_UPLOAD_UNSUPPORTED_TYPE',
    );
  }
});

test('validateUploadFile rejects mismatched MIME for modern extensions', () => {
  assert.throws(
    () =>
      validateUploadFile('global_docs', {
        originalName: 'guide.pdf',
        mimeType: 'text/plain',
        size: 16,
        buffer: Buffer.from('content', 'utf-8'),
      }),
    (error) =>
      error instanceof AppError &&
      error.code === 'KNOWLEDGE_UPLOAD_UNSUPPORTED_TYPE',
  );

  assert.throws(
    () =>
      validateUploadFile('global_docs', {
        originalName: 'spec.docx',
        mimeType: 'application/msword',
        size: 16,
        buffer: Buffer.from('content', 'utf-8'),
      }),
    (error) =>
      error instanceof AppError &&
      error.code === 'KNOWLEDGE_UPLOAD_UNSUPPORTED_TYPE',
  );

  assert.throws(
    () =>
      validateUploadFile('global_docs', {
        originalName: 'metrics.xlsx',
        mimeType: 'application/vnd.ms-excel',
        size: 16,
        buffer: Buffer.from('content', 'utf-8'),
      }),
    (error) =>
      error instanceof AppError &&
      error.code === 'KNOWLEDGE_UPLOAD_UNSUPPORTED_TYPE',
  );
});

test('uploadDocument rejects files disabled by indexing supportedTypes before persistence', async () => {
  const storageRoot = await mkdtemp(join(tmpdir(), 'knowject-upload-supported-types-'));
  const knowledgeId = '507f1f77bcf86cd7994392a1';
  const actorId = '507f1f77bcf86cd7994392a2';
  const knowledge: KnowledgeBaseDocument & {
    _id: NonNullable<KnowledgeBaseDocument['_id']>;
  } = {
    _id: new ObjectId(knowledgeId),
    name: '知识库 A',
    description: '用于验证 supportedTypes 上传门禁',
    sourceType: 'global_docs',
    indexStatus: 'idle',
    documentCount: 0,
    chunkCount: 0,
    maintainerId: actorId,
    createdBy: actorId,
    createdAt: new Date('2026-03-21T00:00:00.000Z'),
    updatedAt: new Date('2026-03-21T00:00:00.000Z'),
  };
  let createKnowledgeDocumentCalled = false;

  const repository = {
    ensureMetadataModel: async () => undefined,
    findKnowledgeById: async (id: string) => (id === knowledgeId ? knowledge : null),
    findKnowledgeDocumentByVersionHash: async () => null,
    createKnowledgeDocument: async () => {
      createKnowledgeDocumentCalled = true;
      throw new Error('createKnowledgeDocument should not be called');
    },
  } as unknown as KnowledgeRepository;

  const service = createKnowledgeService({
    env: createTestEnv(storageRoot),
    repository,
    searchService: createSearchServiceStub(),
    authRepository: {
      findProfilesByIds: async () => [],
    } as unknown as AuthRepository,
    settingsRepository: createSettingsRepositoryStub({
      getSettings: async () => ({
        singleton: 'default',
        indexing: {
          chunkSize: 960,
          chunkOverlap: 160,
          supportedTypes: ['md', 'txt'],
          indexerTimeoutMs: 30000,
        },
        updatedAt: new Date('2026-03-21T00:00:00.000Z'),
        updatedBy: actorId,
      }),
    }),
  });

  await assert.rejects(
    () =>
      service.uploadDocument(
        {
          actor: {
            id: actorId,
            username: 'langya',
          },
        },
        knowledgeId,
        {
          originalName: 'guide.pdf',
          mimeType: 'application/pdf',
          size: 16,
          buffer: Buffer.from('content', 'utf-8'),
        },
      ),
    (error) =>
      error instanceof AppError &&
      error.code === 'KNOWLEDGE_UPLOAD_UNSUPPORTED_TYPE',
  );

  assert.equal(createKnowledgeDocumentCalled, false);
  assert.deepEqual(await readdir(storageRoot), []);
});

test('uploadProjectKnowledgeDocument payload is accepted by Python indexer override route', async () => {
  const storageRoot = await mkdtemp(join(tmpdir(), 'knowject-project-knowledge-boundary-'));
  const capturePath = join(storageRoot, 'indexer-capture.json');
  const { baseUrl, stop } = await startIndexerCaptureServer(
    capturePath,
    storageRoot,
  );
  const env = createTestEnv(storageRoot);
  env.knowledge.indexerUrl = baseUrl;

  const originalEncryptionKey = process.env.SETTINGS_ENCRYPTION_KEY;
  process.env.SETTINGS_ENCRYPTION_KEY = env.settings.encryptionKey;

  const knowledgeId = '507f1f77bcf86cd799439223';
  const projectId = '507f1f77bcf86cd799439233';
  const actorId = '507f1f77bcf86cd799439243';
  const knowledge: KnowledgeBaseDocument & {
    _id: NonNullable<KnowledgeBaseDocument['_id']>;
  } = {
    _id: new ObjectId(knowledgeId),
    name: '项目知识库',
    description: '用于验证 Node -> Python request override',
    scope: 'project',
    projectId,
    sourceType: 'global_docs',
    indexStatus: 'idle',
    documentCount: 0,
    chunkCount: 0,
    maintainerId: actorId,
    createdBy: actorId,
    createdAt: new Date('2026-03-18T00:00:00.000Z'),
    updatedAt: new Date('2026-03-18T00:00:00.000Z'),
  };

  let createdDocument: (KnowledgeDocumentRecord & {
    _id: NonNullable<KnowledgeDocumentRecord['_id']>;
  }) | null = null;
  let completedChunkCount = 0;
  let resolveCompleted: (() => void) | null = null;
  const processingCompleted = new Promise<void>((resolve) => {
    resolveCompleted = resolve;
  });
  const settingsRepository = createSettingsRepositoryStub({
    getSettings: async () => ({
      _id: new ObjectId('507f1f77bcf86cd799439701'),
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
      updatedAt: new Date('2026-03-18T00:00:00.000Z'),
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
    updateKnowledgeSummaryAfterDocumentUpload: async () => ({
      ...knowledge,
      documentCount: 1,
      updatedAt: new Date('2026-03-18T00:00:01.000Z'),
    }),
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
        uploadedAt: new Date('2026-03-18T00:00:00.000Z'),
        processedAt: patch.processedAt ?? null,
        createdAt: new Date('2026-03-18T00:00:00.000Z'),
        updatedAt: patch.updatedAt ?? new Date('2026-03-18T00:00:00.000Z'),
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
                  joinedAt: new Date('2026-03-18T00:00:00.000Z'),
                },
              ],
              knowledgeBaseIds: [],
              agentIds: [],
              skillIds: [],
              conversations: [],
              createdAt: new Date('2026-03-18T00:00:00.000Z'),
              updatedAt: new Date('2026-03-18T00:00:00.000Z'),
            })
          : null,
    }),
    settingsRepository,
  });

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
      delay(5000).then(() => {
        throw new Error('Timed out waiting for cross-boundary indexer processing');
      }),
    ]);
  } finally {
    await stop();
    process.env.SETTINGS_ENCRYPTION_KEY = originalEncryptionKey;
  }

  assert.notEqual(createdDocument, null);

  const capture = await waitForJsonFile(capturePath);

  assert.equal(
    capture.collectionName,
    buildExpectedCollectionName(`proj_${projectId}_docs`, {
      provider: 'custom',
      baseUrl: 'https://embedding.example.com/v1',
      model: 'text-embedding-custom',
    }),
  );
  assert.deepEqual(capture.embeddingConfig, {
    provider: 'custom',
    apiKey: 'db-embedding-key',
    baseUrl: 'https://embedding.example.com/v1',
    model: 'text-embedding-custom',
  });
  assert.deepEqual(capture.indexingConfig, {
    chunkSize: 860,
    chunkOverlap: 120,
    supportedTypes: ['md', 'txt'],
    indexerTimeoutMs: 45000,
  });
  assert.deepEqual(capture.parsed, {
    embeddingProvider: 'custom',
    embeddingBaseUrl: 'https://embedding.example.com/v1',
    embeddingModel: 'text-embedding-custom',
    chunkSize: 860,
    chunkOverlap: 120,
    supportedTypes: ['md', 'txt'],
    indexerTimeoutMs: 45000,
  });
  assert.equal(completedChunkCount, 1);
});

test('uploadDocument rejects duplicate content within the same global knowledge base', async () => {
  const storageRoot = await mkdtemp(join(tmpdir(), 'knowject-knowledge-duplicate-global-'));
  const knowledgeId = '507f1f77bcf86cd799439511';
  const actorId = '507f1f77bcf86cd799439512';
  const knowledge: KnowledgeBaseDocument & {
    _id: NonNullable<KnowledgeBaseDocument['_id']>;
  } = {
    _id: new ObjectId(knowledgeId),
    name: '全局知识库',
    description: '用于验证重复上传拦截',
    sourceType: 'global_docs',
    indexStatus: 'completed',
    documentCount: 1,
    chunkCount: 3,
    maintainerId: actorId,
    createdBy: actorId,
    createdAt: new Date('2026-03-16T00:00:00.000Z'),
    updatedAt: new Date('2026-03-16T00:00:00.000Z'),
  };
  const duplicateDocumentId = '507f1f77bcf86cd799439513';
  let createCalled = false;
  const duplicateLookups: Array<{ knowledgeId: string; documentVersionHash: string }> = [];
  let recordedDuplicateKnowledgeId: string | null = null;

  const repository = {
    ensureMetadataModel: async () => undefined,
    findKnowledgeById: async (id: string) => (id === knowledgeId ? knowledge : null),
    findKnowledgeDocumentByVersionHash: async (
      scopedKnowledgeId: string,
      documentVersionHash: string,
    ) => {
      duplicateLookups.push({
        knowledgeId: scopedKnowledgeId,
        documentVersionHash,
      });
      recordedDuplicateKnowledgeId = scopedKnowledgeId;

      return {
        _id: new ObjectId(duplicateDocumentId),
        knowledgeId,
        fileName: 'README.md',
        mimeType: 'text/markdown',
        storagePath: `${knowledgeId}/${duplicateDocumentId}/hash-1/README.md`,
        status: 'completed' as const,
        chunkCount: 3,
        documentVersionHash,
        embeddingProvider: 'openai' as const,
        embeddingModel: 'text-embedding-3-small' as const,
        lastIndexedAt: new Date('2026-03-16T00:01:00.000Z'),
        retryCount: 0,
        errorMessage: null,
        uploadedBy: actorId,
        uploadedAt: new Date('2026-03-16T00:00:00.000Z'),
        processedAt: new Date('2026-03-16T00:01:00.000Z'),
        createdAt: new Date('2026-03-16T00:00:00.000Z'),
        updatedAt: new Date('2026-03-16T00:01:00.000Z'),
      };
    },
    createKnowledgeDocument: async () => {
      createCalled = true;
      throw new Error('should not create duplicated document');
    },
  } as unknown as KnowledgeRepository;

  const service = createKnowledgeService({
    env: createTestEnv(storageRoot),
    repository,
    searchService: createSearchServiceStub(),
    authRepository: {
      findProfilesByIds: async () => [],
    } as unknown as AuthRepository,
  });

  await assert.rejects(
    () =>
      service.uploadDocument(
        {
          actor: {
            id: actorId,
            username: 'langya',
          },
        },
        knowledgeId,
        {
          originalName: 'README-copy.md',
          mimeType: 'text/markdown',
          size: 15,
          buffer: Buffer.from('# same content\n', 'utf-8'),
        },
      ),
    (error: unknown) => {
      assert.equal((error as { code?: string }).code, 'KNOWLEDGE_DOCUMENT_DUPLICATE_VERSION');
      assert.equal((error as { statusCode?: number }).statusCode, 409);
      assert.deepEqual((error as { details?: unknown }).details, {
        knowledgeId,
        documentId: duplicateDocumentId,
        fileName: 'README.md',
        status: 'completed',
      });
      return true;
    },
  );

  assert.equal(createCalled, false);
  assert.equal(duplicateLookups.length, 1);
  assert.equal(recordedDuplicateKnowledgeId, knowledgeId);
});

test('uploadDocument converts duplicate key races into duplicate-version conflicts', async () => {
  const storageRoot = await mkdtemp(join(tmpdir(), 'knowject-knowledge-duplicate-race-'));
  const knowledgeId = '507f1f77bcf86cd799439516';
  const actorId = '507f1f77bcf86cd799439517';
  const duplicateDocumentId = '507f1f77bcf86cd799439518';
  const knowledge: KnowledgeBaseDocument & {
    _id: NonNullable<KnowledgeBaseDocument['_id']>;
  } = {
    _id: new ObjectId(knowledgeId),
    name: '全局知识库',
    description: '用于验证重复上传竞态兜底',
    sourceType: 'global_docs',
    indexStatus: 'completed',
    documentCount: 1,
    chunkCount: 3,
    maintainerId: actorId,
    createdBy: actorId,
    createdAt: new Date('2026-03-16T00:00:00.000Z'),
    updatedAt: new Date('2026-03-16T00:00:00.000Z'),
  };
  let duplicateLookupCount = 0;
  let createCalled = false;

  const repository = {
    ensureMetadataModel: async () => undefined,
    findKnowledgeById: async (id: string) => (id === knowledgeId ? knowledge : null),
    findKnowledgeDocumentByVersionHash: async (
      scopedKnowledgeId: string,
      documentVersionHash: string,
    ) => {
      duplicateLookupCount += 1;
      assert.equal(scopedKnowledgeId, knowledgeId);

      if (duplicateLookupCount === 1) {
        return null;
      }

      return {
        _id: new ObjectId(duplicateDocumentId),
        knowledgeId,
        fileName: 'README.md',
        mimeType: 'text/markdown',
        storagePath: `${knowledgeId}/${duplicateDocumentId}/${documentVersionHash}/README.md`,
        status: 'completed' as const,
        chunkCount: 3,
        documentVersionHash,
        embeddingProvider: 'openai' as const,
        embeddingModel: 'text-embedding-3-small' as const,
        lastIndexedAt: new Date('2026-03-16T00:01:00.000Z'),
        retryCount: 0,
        errorMessage: null,
        uploadedBy: actorId,
        uploadedAt: new Date('2026-03-16T00:00:00.000Z'),
        processedAt: new Date('2026-03-16T00:01:00.000Z'),
        createdAt: new Date('2026-03-16T00:00:00.000Z'),
        updatedAt: new Date('2026-03-16T00:01:00.000Z'),
      };
    },
    createKnowledgeDocument: async () => {
      createCalled = true;
      throw {
        code: 11000,
        keyPattern: {
          knowledgeId: 1,
          documentVersionHash: 1,
        },
      };
    },
  } as unknown as KnowledgeRepository;

  const service = createKnowledgeService({
    env: createTestEnv(storageRoot),
    repository,
    searchService: createSearchServiceStub(),
    authRepository: {
      findProfilesByIds: async () => [],
    } as unknown as AuthRepository,
  });

  await assert.rejects(
    () =>
      service.uploadDocument(
        {
          actor: {
            id: actorId,
            username: 'langya',
          },
        },
        knowledgeId,
        {
          originalName: 'README-copy.md',
          mimeType: 'text/markdown',
          size: 15,
          buffer: Buffer.from('# same content\n', 'utf-8'),
        },
      ),
    (error: unknown) => {
      assert.equal((error as { code?: string }).code, 'KNOWLEDGE_DOCUMENT_DUPLICATE_VERSION');
      assert.equal((error as { statusCode?: number }).statusCode, 409);
      assert.deepEqual((error as { details?: unknown }).details, {
        knowledgeId,
        documentId: duplicateDocumentId,
        fileName: 'README.md',
        status: 'completed',
      });
      return true;
    },
  );

  assert.equal(createCalled, true);
  assert.equal(duplicateLookupCount, 2);
});

test('uploadProjectKnowledgeDocument rejects duplicate content within the same project knowledge base', async () => {
  const storageRoot = await mkdtemp(join(tmpdir(), 'knowject-knowledge-duplicate-project-'));
  const knowledgeId = '507f1f77bcf86cd799439521';
  const projectId = '507f1f77bcf86cd799439522';
  const actorId = '507f1f77bcf86cd799439523';
  const duplicateDocumentId = '507f1f77bcf86cd799439524';
  const knowledge: KnowledgeBaseDocument & {
    _id: NonNullable<KnowledgeBaseDocument['_id']>;
  } = {
    _id: new ObjectId(knowledgeId),
    name: '项目知识库',
    description: '用于验证项目重复上传拦截',
    scope: 'project',
    projectId,
    sourceType: 'global_docs',
    indexStatus: 'completed',
    documentCount: 1,
    chunkCount: 2,
    maintainerId: actorId,
    createdBy: actorId,
    createdAt: new Date('2026-03-16T00:00:00.000Z'),
    updatedAt: new Date('2026-03-16T00:00:00.000Z'),
  };
  let createCalled = false;

  const repository = {
    ensureMetadataModel: async () => undefined,
    findKnowledgeById: async (id: string) => (id === knowledgeId ? knowledge : null),
    findKnowledgeDocumentByVersionHash: async (
      scopedKnowledgeId: string,
      documentVersionHash: string,
    ) => {
      assert.equal(scopedKnowledgeId, knowledgeId);

      return {
        _id: new ObjectId(duplicateDocumentId),
        knowledgeId,
        fileName: 'project-doc.md',
        mimeType: 'text/markdown',
        storagePath: `projects/${projectId}/knowledge/${knowledgeId}/${duplicateDocumentId}/${documentVersionHash}/project-doc.md`,
        status: 'failed' as const,
        chunkCount: 0,
        documentVersionHash,
        embeddingProvider: 'openai' as const,
        embeddingModel: 'text-embedding-3-small' as const,
        lastIndexedAt: null,
        retryCount: 1,
        errorMessage: 'embedding timeout',
        uploadedBy: actorId,
        uploadedAt: new Date('2026-03-16T00:00:00.000Z'),
        processedAt: null,
        createdAt: new Date('2026-03-16T00:00:00.000Z'),
        updatedAt: new Date('2026-03-16T00:00:10.000Z'),
      };
    },
    createKnowledgeDocument: async () => {
      createCalled = true;
      throw new Error('should not create duplicated project document');
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
                  joinedAt: new Date('2026-03-16T00:00:00.000Z'),
                },
              ],
              knowledgeBaseIds: [],
              agentIds: [],
              skillIds: [],
              conversations: [],
              createdAt: new Date('2026-03-16T00:00:00.000Z'),
              updatedAt: new Date('2026-03-16T00:00:00.000Z'),
            })
          : null,
    }),
  });

  await assert.rejects(
    () =>
      service.uploadProjectKnowledgeDocument(
        {
          actor: {
            id: actorId,
            username: 'langya',
          },
        },
        projectId,
        knowledgeId,
        {
          originalName: 'project-doc-copy.md',
          mimeType: 'text/markdown',
          size: 18,
          buffer: Buffer.from('# same project doc\n', 'utf-8'),
        },
      ),
    (error: unknown) => {
      assert.equal((error as { code?: string }).code, 'KNOWLEDGE_DOCUMENT_DUPLICATE_VERSION');
      assert.equal((error as { statusCode?: number }).statusCode, 409);
      assert.deepEqual((error as { details?: unknown }).details, {
        knowledgeId,
        documentId: duplicateDocumentId,
        fileName: 'project-doc.md',
        status: 'failed',
      });
      return true;
    },
  );

  assert.equal(createCalled, false);
});

test('uploadDocument scopes duplicate detection to the current knowledge base', async () => {
  const storageRoot = await mkdtemp(join(tmpdir(), 'knowject-knowledge-duplicate-scope-'));
  const knowledgeId = '507f1f77bcf86cd799439531';
  const otherKnowledgeId = '507f1f77bcf86cd799439532';
  const actorId = '507f1f77bcf86cd799439533';
  const knowledge: KnowledgeBaseDocument & {
    _id: NonNullable<KnowledgeBaseDocument['_id']>;
  } = {
    _id: new ObjectId(knowledgeId),
    name: '目标知识库',
    description: '用于验证防重范围',
    sourceType: 'global_docs',
    indexStatus: 'idle',
    documentCount: 0,
    chunkCount: 0,
    maintainerId: actorId,
    createdBy: actorId,
    createdAt: new Date('2026-03-16T00:00:00.000Z'),
    updatedAt: new Date('2026-03-16T00:00:00.000Z'),
  };
  const updatedKnowledge = {
    ...knowledge,
    documentCount: 1,
    updatedAt: new Date('2026-03-16T00:00:01.000Z'),
  };
  let createdDocumentKnowledgeId: string | null = null;
  let createdDocument: (KnowledgeDocumentRecord & {
    _id: NonNullable<KnowledgeDocumentRecord['_id']>;
  }) | null = null;
  let resolveCompleted: (() => void) | null = null;
  const processingCompleted = new Promise<void>((resolve) => {
    resolveCompleted = resolve;
  });
  const duplicateLookups: Array<{ knowledgeId: string; documentVersionHash: string }> = [];
  let recordedDuplicateKnowledgeId: string | null = null;

  const repository = {
    ensureMetadataModel: async () => undefined,
    findKnowledgeById: async (id: string) => (id === knowledgeId ? knowledge : null),
    findKnowledgeDocumentByVersionHash: async (
      scopedKnowledgeId: string,
      documentVersionHash: string,
    ) => {
      duplicateLookups.push({
        knowledgeId: scopedKnowledgeId,
        documentVersionHash,
      });
      recordedDuplicateKnowledgeId = scopedKnowledgeId;

      if (scopedKnowledgeId === otherKnowledgeId) {
        return {
          _id: new ObjectId('507f1f77bcf86cd799439534'),
          knowledgeId: otherKnowledgeId,
          fileName: 'README.md',
          mimeType: 'text/markdown',
          storagePath: `${otherKnowledgeId}/507f1f77bcf86cd799439534/${documentVersionHash}/README.md`,
          status: 'completed' as const,
          chunkCount: 2,
          documentVersionHash,
          embeddingProvider: 'openai' as const,
          embeddingModel: 'text-embedding-3-small' as const,
          lastIndexedAt: new Date('2026-03-16T00:01:00.000Z'),
          retryCount: 0,
          errorMessage: null,
          uploadedBy: actorId,
          uploadedAt: new Date('2026-03-16T00:00:00.000Z'),
          processedAt: new Date('2026-03-16T00:01:00.000Z'),
          createdAt: new Date('2026-03-16T00:00:00.000Z'),
          updatedAt: new Date('2026-03-16T00:01:00.000Z'),
        };
      }

      return null;
    },
    createKnowledgeDocument: async (
      document: KnowledgeDocumentRecord & {
        _id: NonNullable<KnowledgeDocumentRecord['_id']>;
      },
    ) => {
      createdDocument = document;
      createdDocumentKnowledgeId = document.knowledgeId;
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
        embeddingProvider: createdDocument?.embeddingProvider ?? 'openai',
        embeddingModel: createdDocument?.embeddingModel ?? 'text-embedding-3-small',
        lastIndexedAt: patch.lastIndexedAt ?? null,
        retryCount: 0,
        errorMessage: patch.errorMessage ?? null,
        uploadedBy: actorId,
        uploadedAt: new Date('2026-03-16T00:00:00.000Z'),
        processedAt: patch.processedAt ?? null,
        createdAt: new Date('2026-03-16T00:00:00.000Z'),
        updatedAt: patch.updatedAt ?? new Date('2026-03-16T00:00:00.000Z'),
      };
    },
    syncKnowledgeSummaryFromDocuments: async () => undefined,
  } as unknown as KnowledgeRepository;

  const service = createKnowledgeService({
    env: createTestEnv(storageRoot),
    repository,
    searchService: createSearchServiceStub(),
    authRepository: {
      findProfilesByIds: async () => [],
    } as unknown as AuthRepository,
  });

  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () =>
    new Response(
      JSON.stringify({
        status: 'completed',
        knowledgeId,
        documentId: createdDocument?._id.toHexString() ?? '507f1f77bcf86cd799439535',
        chunkCount: 2,
        characterCount: 24,
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

  try {
    const response = await service.uploadDocument(
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
        size: 15,
        buffer: Buffer.from('# same content\n', 'utf-8'),
      },
    );

    assert.equal(response.document.status, 'pending');

    await Promise.race([
      processingCompleted,
      delay(2000).then(() => {
        throw new Error('Timed out waiting for duplicate-scope upload processing');
      }),
    ]);
  } finally {
    globalThis.fetch = originalFetch;
  }

  assert.equal(createdDocumentKnowledgeId, knowledgeId);
  assert.equal(duplicateLookups.length, 1);
  assert.equal(recordedDuplicateKnowledgeId, knowledgeId);
});

test('uploadDocument rolls back knowledge summary when response assembly fails after summary update', async () => {
  const storageRoot = await mkdtemp(join(tmpdir(), 'knowject-knowledge-upload-summary-rollback-'));
  const knowledgeId = '507f1f77bcf86cd799439541';
  const actorId = '507f1f77bcf86cd799439542';
  const knowledge: KnowledgeBaseDocument & {
    _id: NonNullable<KnowledgeBaseDocument['_id']>;
  } = {
    _id: new ObjectId(knowledgeId),
    name: '知识库 A',
    description: '用于验证上传 summary 回滚',
    sourceType: 'global_docs',
    indexStatus: 'idle',
    documentCount: 0,
    chunkCount: 0,
    maintainerId: actorId,
    createdBy: actorId,
    createdAt: new Date('2026-03-16T00:00:00.000Z'),
    updatedAt: new Date('2026-03-16T00:00:00.000Z'),
  };
  const updatedKnowledge = {
    ...knowledge,
    indexStatus: 'pending' as const,
    documentCount: 1,
    updatedAt: new Date('2026-03-16T00:00:01.000Z'),
  };

  let createdDocument: (KnowledgeDocumentRecord & {
    _id: NonNullable<KnowledgeDocumentRecord['_id']>;
  }) | null = null;
  let deletedDocument = false;
  let summaryRolledBack = false;
  let fullSummarySyncCalled = false;

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
    deleteKnowledgeDocumentById: async () => {
      deletedDocument = true;
      return true;
    },
    adjustKnowledgeSummaryAfterDocumentRemoval: async (
      scopedKnowledgeId: string,
      patch: {
        removedChunkCount: number;
        updatedAt: Date;
      },
    ) => {
      assert.equal(scopedKnowledgeId, knowledgeId);
      assert.equal(patch.removedChunkCount, 0);
      summaryRolledBack = true;
      return knowledge;
    },
    syncKnowledgeSummaryFromDocuments: async () => {
      fullSummarySyncCalled = true;
      return knowledge;
    },
  } as unknown as KnowledgeRepository;

  const service = createKnowledgeService({
    env: createTestEnv(storageRoot),
    repository,
    searchService: createSearchServiceStub(),
    authRepository: {
      findProfilesByIds: async () => {
        throw new Error('profile lookup failed');
      },
    } as unknown as AuthRepository,
  });

  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => {
    throw new Error('fetch should not be called when upload response assembly fails');
  };

  try {
    await assert.rejects(
      () =>
        service.uploadDocument(
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
            size: 15,
            buffer: Buffer.from('# rollback\n', 'utf-8'),
          },
        ),
      (error) => error instanceof Error && error.message === 'profile lookup failed',
    );
  } finally {
    globalThis.fetch = originalFetch;
  }

  assert.notEqual(createdDocument, null);
  assert.equal(deletedDocument, true);
  assert.equal(summaryRolledBack, true);
  assert.equal(fullSummarySyncCalled, false);
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

test('searchDocuments accepts legacy limit when topK is absent', async () => {
  const capturedInputs: Array<Parameters<KnowledgeSearchService['searchDocuments']>[0]> = [];

  const repository = {
    ensureMetadataModel: async () => undefined,
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
    env: createTestEnv('/tmp/knowject-knowledge-search-limit'),
    repository,
    searchService,
    authRepository: {
      findProfilesByIds: async () => [],
    } as unknown as AuthRepository,
  });

  await service.searchDocuments(
    {
      actor: {
        id: '507f1f77bcf86cd799439099',
        username: 'langya',
      },
    },
    {
      query: 'knowledge',
      limit: '4',
    } as { query: string; limit: string },
  );

  assert.equal(capturedInputs[0]?.topK, 4);
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

test('searchProjectDocuments merges bound global knowledge and project private knowledge into one ranked result', async () => {
  const capturedInputs: Array<Parameters<KnowledgeSearchService['searchDocuments']>[0]> = [];
  const listKnowledgeBaseCalls: Array<
    Parameters<KnowledgeRepository['listKnowledgeBases']>[0] | undefined
  > = [];
  const globalKnowledgeId = '507f1f77bcf86cd799439221';
  const globalKnowledgeSecondaryId = '507f1f77bcf86cd799439226';
  const globalCodeKnowledgeId = '507f1f77bcf86cd799439222';
  const projectKnowledgeId = '507f1f77bcf86cd799439223';
  const projectKnowledgeSecondaryId = '507f1f77bcf86cd799439227';
  const projectId = '507f1f77bcf86cd799439224';
  const actorId = '507f1f77bcf86cd799439225';
  const globalKnowledge: KnowledgeBaseDocument & {
    _id: NonNullable<KnowledgeBaseDocument['_id']>;
  } = {
    _id: new ObjectId(globalKnowledgeId),
    name: '全局文档知识',
    description: '验证全局绑定 merged retrieval',
    sourceType: 'global_docs',
    indexStatus: 'completed',
    documentCount: 1,
    chunkCount: 4,
    maintainerId: actorId,
    createdBy: actorId,
    createdAt: new Date('2026-03-17T00:00:00.000Z'),
    updatedAt: new Date('2026-03-17T00:00:00.000Z'),
  };
  const globalKnowledgeSecondary: KnowledgeBaseDocument & {
    _id: NonNullable<KnowledgeBaseDocument['_id']>;
  } = {
    _id: new ObjectId(globalKnowledgeSecondaryId),
    name: '全局文档知识 2',
    description: '验证同 namespace 不再重复 embedding',
    sourceType: 'global_docs',
    indexStatus: 'completed',
    documentCount: 1,
    chunkCount: 3,
    maintainerId: actorId,
    createdBy: actorId,
    createdAt: new Date('2026-03-17T00:00:00.000Z'),
    updatedAt: new Date('2026-03-17T00:00:00.000Z'),
  };
  const globalCodeKnowledge: KnowledgeBaseDocument & {
    _id: NonNullable<KnowledgeBaseDocument['_id']>;
  } = {
    _id: new ObjectId(globalCodeKnowledgeId),
    name: '全局代码知识',
    description: '不应进入文档 merged retrieval',
    sourceType: 'global_code',
    indexStatus: 'completed',
    documentCount: 1,
    chunkCount: 2,
    maintainerId: actorId,
    createdBy: actorId,
    createdAt: new Date('2026-03-17T00:00:00.000Z'),
    updatedAt: new Date('2026-03-17T00:00:00.000Z'),
  };
  const projectKnowledge: KnowledgeBaseDocument & {
    _id: NonNullable<KnowledgeBaseDocument['_id']>;
  } = {
    _id: new ObjectId(projectKnowledgeId),
    name: '项目私有知识',
    description: '验证项目私有 merged retrieval',
    scope: 'project',
    projectId,
    sourceType: 'global_docs',
    indexStatus: 'completed',
    documentCount: 1,
    chunkCount: 5,
    maintainerId: actorId,
    createdBy: actorId,
    createdAt: new Date('2026-03-17T00:00:00.000Z'),
    updatedAt: new Date('2026-03-17T00:00:00.000Z'),
  };
  const projectKnowledgeSecondary: KnowledgeBaseDocument & {
    _id: NonNullable<KnowledgeBaseDocument['_id']>;
  } = {
    _id: new ObjectId(projectKnowledgeSecondaryId),
    name: '项目私有知识 2',
    description: '验证项目私有同 namespace 合并',
    scope: 'project',
    projectId,
    sourceType: 'global_docs',
    indexStatus: 'completed',
    documentCount: 1,
    chunkCount: 2,
    maintainerId: actorId,
    createdBy: actorId,
    createdAt: new Date('2026-03-17T00:00:00.000Z'),
    updatedAt: new Date('2026-03-17T00:00:00.000Z'),
  };

  const repository = {
    ensureMetadataModel: async () => undefined,
    findKnowledgeById: async (knowledgeId: string) => {
      if (knowledgeId === globalKnowledgeId) {
        return globalKnowledge;
      }

      if (knowledgeId === globalKnowledgeSecondaryId) {
        return globalKnowledgeSecondary;
      }

      if (knowledgeId === globalCodeKnowledgeId) {
        return globalCodeKnowledge;
      }

      return null;
    },
    listKnowledgeBases: async (options?: Parameters<KnowledgeRepository['listKnowledgeBases']>[0]) => {
      listKnowledgeBaseCalls.push(options);
      return options?.scope === 'project'
        ? [projectKnowledge, projectKnowledgeSecondary]
        : [globalKnowledge, globalKnowledgeSecondary];
    },
  } as unknown as KnowledgeRepository;

  const searchService = createSearchServiceStub({
    searchDocuments: async (input: Parameters<KnowledgeSearchService['searchDocuments']>[0]) => {
      capturedInputs.push(input);

      if ((input.collectionName ?? '').startsWith(`proj_${projectId}_docs`)) {
        return {
          query: input.query,
          sourceType: input.sourceType,
          total: 3,
          items: [
            {
              knowledgeId: projectKnowledgeId,
              documentId: 'doc-project',
              chunkId: 'chunk-project',
              chunkIndex: 1,
              type: 'global_docs',
              source: 'project-brief.md',
              content: '项目私有知识已经接入正式知识上传与项目资源页消费。',
              distance: 0.08,
            },
            {
              knowledgeId: projectKnowledgeSecondaryId,
              documentId: 'doc-project-2',
              chunkId: 'chunk-project-2',
              chunkIndex: 0,
              type: 'global_docs',
              source: 'project-notes.md',
              content: '第二个项目私有知识命中。',
              distance: 0.52,
            },
            {
              knowledgeId: 'project-not-allowed',
              documentId: 'doc-project-x',
              chunkId: 'chunk-project-x',
              chunkIndex: 3,
              type: 'global_docs',
              source: 'project-other.md',
              content: '不应被项目级过滤后的结果带出。',
              distance: 0.02,
            },
          ],
        };
      }

      return {
        query: input.query,
        sourceType: input.sourceType,
        total: 3,
        items: [
          {
            knowledgeId: globalKnowledgeId,
            documentId: 'doc-global',
            chunkId: 'chunk-global',
            chunkIndex: 0,
            type: 'global_docs',
            source: 'architecture.md',
            content: '全局绑定知识已经进入项目级 merged retrieval 编排。',
            distance: 0.22,
          },
          {
            knowledgeId: globalKnowledgeSecondaryId,
            documentId: 'doc-global-2',
            chunkId: 'chunk-global-2',
            chunkIndex: 1,
            type: 'global_docs',
            source: 'sync.md',
            content: '第二个全局绑定知识命中。',
            distance: 0.31,
          },
          {
            knowledgeId: 'global-not-allowed',
            documentId: 'doc-global-x',
            chunkId: 'chunk-global-x',
            chunkIndex: 4,
            type: 'global_docs',
            source: 'other.md',
            content: '不应被全局过滤后的结果带出。',
            distance: 0.01,
          },
        ],
      };
    },
  });

  const service = createKnowledgeService({
    env: createTestEnv('/tmp/knowject-project-merged-search'),
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
                  joinedAt: new Date('2026-03-17T00:00:00.000Z'),
                },
              ],
              knowledgeBaseIds: [
                globalKnowledgeId,
                globalKnowledgeSecondaryId,
                globalCodeKnowledgeId,
                'missing-knowledge',
              ],
              agentIds: [],
              skillIds: [],
              conversations: [],
              createdAt: new Date('2026-03-17T00:00:00.000Z'),
              updatedAt: new Date('2026-03-17T00:00:00.000Z'),
            })
          : null,
    }),
  });

  const response = await service.searchProjectDocuments(
    {
      actor: {
        id: actorId,
        username: 'langya',
      },
    },
    projectId,
    {
      query: '项目知识',
      topK: 2,
    },
  );

  assert.deepEqual(listKnowledgeBaseCalls, [
    {
      scope: 'project',
      projectId,
      sourceType: 'global_docs',
    },
    {
      scope: 'project',
      projectId,
      sourceType: 'global_docs',
    },
    {
      scope: 'global',
      projectId: undefined,
      sourceType: 'global_docs',
    },
  ]);
  assert.equal(capturedInputs.length, 2);
  assert.deepEqual(
    capturedInputs.map((input) => ({
      query: input.query,
      knowledgeId: input.knowledgeId,
      sourceType: input.sourceType,
      topK: input.topK,
      embeddingProvider: input.embeddingConfig?.provider,
      embeddingModel: input.embeddingConfig?.model,
      embeddingBaseUrl: input.embeddingConfig?.baseUrl,
    })),
    [
      {
        query: '项目知识',
        knowledgeId: undefined,
        sourceType: 'global_docs',
        topK: 4,
        embeddingProvider: 'openai',
        embeddingModel: 'text-embedding-3-small',
        embeddingBaseUrl: 'https://api.openai.com/v1',
      },
      {
        query: '项目知识',
        knowledgeId: undefined,
        sourceType: 'global_docs',
        topK: 4,
        embeddingProvider: 'openai',
        embeddingModel: 'text-embedding-3-small',
        embeddingBaseUrl: 'https://api.openai.com/v1',
      },
    ],
  );
  assert.match(capturedInputs[0]?.collectionName ?? '', new RegExp(`^proj_${projectId}_docs`));
  assert.equal(capturedInputs[1]?.collectionName, 'global_docs');
  assert.equal(response.total, 2);
  assert.deepEqual(
    response.items.map((item) => item.knowledgeId),
    [projectKnowledgeId, globalKnowledgeId],
  );
});

test('searchProjectDocuments does not compare raw distances across different embedding spaces', async () => {
  const capturedInputs: Array<Parameters<KnowledgeSearchService['searchDocuments']>[0]> = [];
  const globalKnowledgeId = '507f1f77bcf86cd799439228';
  const projectKnowledgeId = '507f1f77bcf86cd799439229';
  const projectId = '507f1f77bcf86cd799439230';
  const actorId = '507f1f77bcf86cd799439231';
  const globalKnowledge: KnowledgeBaseDocument & {
    _id: NonNullable<KnowledgeBaseDocument['_id']>;
  } = {
    _id: new ObjectId(globalKnowledgeId),
    name: '全局知识',
    description: '验证不同 embedding space 不直接比较 distance',
    sourceType: 'global_docs',
    indexStatus: 'completed',
    documentCount: 1,
    chunkCount: 4,
    maintainerId: actorId,
    createdBy: actorId,
    createdAt: new Date('2026-03-17T00:00:00.000Z'),
    updatedAt: new Date('2026-03-17T00:00:00.000Z'),
  };
  const projectKnowledge: KnowledgeBaseDocument & {
    _id: NonNullable<KnowledgeBaseDocument['_id']>;
  } = {
    _id: new ObjectId(projectKnowledgeId),
    name: '项目私有知识',
    description: '验证不同 embedding space 需要保守合并',
    scope: 'project',
    projectId,
    sourceType: 'global_docs',
    indexStatus: 'completed',
    documentCount: 1,
    chunkCount: 5,
    maintainerId: actorId,
    createdBy: actorId,
    createdAt: new Date('2026-03-17T00:00:00.000Z'),
    updatedAt: new Date('2026-03-17T00:00:00.000Z'),
  };
  const globalCollectionName = buildExpectedCollectionName('global_docs');
  const projectCollectionName = buildExpectedCollectionName(`proj_${projectId}_docs`, {
    provider: 'openai',
    baseUrl: 'https://api.openai.com/v1',
    model: 'text-embedding-3-large',
  });
  const repository = {
    ensureMetadataModel: async () => undefined,
    findKnowledgeById: async (knowledgeId: string) =>
      knowledgeId === globalKnowledgeId ? globalKnowledge : null,
    listKnowledgeBases: async (options?: Parameters<KnowledgeRepository['listKnowledgeBases']>[0]) =>
      options?.scope === 'project' ? [projectKnowledge] : [globalKnowledge],
    findKnowledgeNamespaceIndexState: async (namespaceKey: string) => {
      if (namespaceKey === 'global_docs') {
        return {
          _id: new ObjectId('507f1f77bcf86cd799439232'),
          namespaceKey,
          scope: 'global' as const,
          projectId: null,
          sourceType: 'global_docs' as const,
          activeCollectionName: globalCollectionName,
          activeEmbeddingProvider: 'openai' as const,
          activeApiKeyEncrypted: null,
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
          createdAt: new Date('2026-03-17T00:00:00.000Z'),
          updatedAt: new Date('2026-03-17T00:00:00.000Z'),
        };
      }

      return {
        _id: new ObjectId('507f1f77bcf86cd799439233'),
        namespaceKey,
        scope: 'project' as const,
        projectId,
        sourceType: 'global_docs' as const,
        activeCollectionName: projectCollectionName,
        activeEmbeddingProvider: 'openai' as const,
        activeApiKeyEncrypted: null,
        activeEmbeddingBaseUrl: 'https://api.openai.com/v1',
        activeEmbeddingModel: 'text-embedding-3-large',
        activeEmbeddingFingerprint: buildKnowledgeEmbeddingFingerprint({
          provider: 'openai',
          baseUrl: 'https://api.openai.com/v1',
          model: 'text-embedding-3-large',
        } as never),
        rebuildStatus: 'idle' as const,
        targetCollectionName: null,
        targetEmbeddingProvider: null,
        targetEmbeddingBaseUrl: null,
        targetEmbeddingModel: null,
        targetEmbeddingFingerprint: null,
        lastErrorMessage: null,
        createdAt: new Date('2026-03-17T00:00:00.000Z'),
        updatedAt: new Date('2026-03-17T00:00:00.000Z'),
      };
    },
  } as unknown as KnowledgeRepository;

  const searchService = createSearchServiceStub({
    searchDocuments: async (input: Parameters<KnowledgeSearchService['searchDocuments']>[0]) => {
      capturedInputs.push(input);

      if (input.collectionName === projectCollectionName) {
        return {
          query: input.query,
          sourceType: input.sourceType,
          total: 1,
          items: [
            {
              knowledgeId: projectKnowledgeId,
              documentId: 'doc-project',
              chunkId: 'chunk-project',
              chunkIndex: 0,
              type: 'global_docs',
              source: 'project-brief.md',
              content: '项目私有知识来自另一套 embedding space。',
              distance: 0.92,
            },
          ],
        };
      }

      return {
        query: input.query,
        sourceType: input.sourceType,
        total: 1,
        items: [
          {
            knowledgeId: globalKnowledgeId,
            documentId: 'doc-global',
            chunkId: 'chunk-global',
            chunkIndex: 0,
            type: 'global_docs',
            source: 'architecture.md',
            content: '全局知识来自旧的 embedding space。',
            distance: 0.03,
          },
        ],
      };
    },
  });

  const service = createKnowledgeService({
    env: createTestEnv('/tmp/knowject-project-merged-search-multi-space'),
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
                  joinedAt: new Date('2026-03-17T00:00:00.000Z'),
                },
              ],
              knowledgeBaseIds: [globalKnowledgeId],
              agentIds: [],
              skillIds: [],
              conversations: [],
              createdAt: new Date('2026-03-17T00:00:00.000Z'),
              updatedAt: new Date('2026-03-17T00:00:00.000Z'),
            })
          : null,
    }),
  });

  const response = await service.searchProjectDocuments(
    {
      actor: {
        id: actorId,
        username: 'langya',
      },
    },
    projectId,
    {
      query: '项目知识',
      topK: 2,
    },
  );

  assert.equal(capturedInputs.length, 2);
  assert.deepEqual(
    response.items.map((item) => item.knowledgeId),
    [projectKnowledgeId, globalKnowledgeId],
  );
});

test('initializeSearchInfrastructure requeues pending knowledge documents on startup', async () => {
  const storageRoot = await mkdtemp(join(tmpdir(), 'knowject-knowledge-recover-pending-'));
  const knowledgeId = '507f1f77bcf86cd799439401';
  const documentId = '507f1f77bcf86cd799439402';
  const storagePath = `${knowledgeId}/${documentId}/hash-1/README.md`;
  await mkdir(join(storageRoot, knowledgeId, documentId, 'hash-1'), { recursive: true });
  await writeFile(join(storageRoot, storagePath), '# README\n');

  const knowledge: KnowledgeBaseDocument & {
    _id: NonNullable<KnowledgeBaseDocument['_id']>;
  } = {
    _id: new ObjectId(knowledgeId),
    name: '知识库恢复',
    description: '',
    sourceType: 'global_docs',
    indexStatus: 'pending',
    documentCount: 1,
    chunkCount: 0,
    maintainerId: 'user-1',
    createdBy: 'user-1',
    createdAt: new Date('2026-03-16T00:00:00.000Z'),
    updatedAt: new Date('2026-03-16T00:00:00.000Z'),
  };
  let currentDocument: KnowledgeDocumentRecord & { _id: ObjectId } = {
    _id: new ObjectId(documentId),
    knowledgeId,
    fileName: 'README.md',
    mimeType: 'text/markdown',
    storagePath,
    status: 'pending',
    chunkCount: 0,
    documentVersionHash: 'hash-1',
    embeddingProvider: 'openai',
    embeddingModel: 'text-embedding-3-small',
    lastIndexedAt: null,
    retryCount: 0,
    errorMessage: null,
    uploadedBy: 'user-1',
    uploadedAt: new Date('2026-03-16T00:00:00.000Z'),
    processedAt: null,
    createdAt: new Date('2026-03-16T00:00:00.000Z'),
    updatedAt: new Date('2026-03-16T00:00:00.000Z'),
  };
  const fetchCalls: string[] = [];
  let resolveCompleted: (() => void) | null = null;
  const completed = new Promise<void>((resolve) => {
    resolveCompleted = resolve;
  });

  const repository = {
    ensureMetadataModel: async () => undefined,
    listKnowledgeBases: async () => [knowledge],
    listKnowledgeBasesByNamespace: async () => [knowledge],
    listDocumentsByKnowledgeIds: async () => [currentDocument],
    findKnowledgeNamespaceIndexState: async () => ({
      _id: new ObjectId('507f1f77bcf86cd799439403'),
      namespaceKey: 'global_docs',
      scope: 'global' as const,
      projectId: null,
      sourceType: 'global_docs' as const,
      activeCollectionName: buildExpectedCollectionName('global_docs'),
      activeEmbeddingProvider: 'openai' as const,
      activeApiKeyEncrypted: null,
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
      createdAt: new Date('2026-03-16T00:00:00.000Z'),
      updatedAt: new Date('2026-03-16T00:00:00.000Z'),
    }),
    updateKnowledgeDocument: async (
      _documentId: string,
      patch: Partial<
        Pick<
          KnowledgeDocumentRecord,
          | 'status'
          | 'chunkCount'
          | 'embeddingProvider'
          | 'embeddingModel'
          | 'lastIndexedAt'
          | 'errorMessage'
          | 'processedAt'
          | 'updatedAt'
        >
      >,
    ) => {
      currentDocument = {
        ...currentDocument,
        ...patch,
      };

      if (patch.status === 'completed') {
        resolveCompleted?.();
      }

      return currentDocument;
    },
    syncKnowledgeSummaryFromDocuments: async () => undefined,
  } as unknown as KnowledgeRepository;

  const service = createKnowledgeService({
    env: createTestEnv(storageRoot),
    repository,
    searchService: createSearchServiceStub(),
    authRepository: {
      findProfilesByIds: async () => [],
    } as unknown as AuthRepository,
  });

  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input) => {
    const url =
      typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
    fetchCalls.push(url);

    return new Response(
      JSON.stringify({
        status: 'completed',
        knowledgeId,
        documentId,
        chunkCount: 2,
        characterCount: 16,
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
    await service.initializeSearchInfrastructure();

    await Promise.race([
      completed,
      delay(2000).then(() => {
        throw new Error('Timed out waiting for startup recovery processing');
      }),
    ]);
  } finally {
    globalThis.fetch = originalFetch;
  }

  assert.equal(currentDocument.status, 'completed');
  assert.deepEqual(fetchCalls, ['http://127.0.0.1:8001/internal/v1/index/documents']);
});

test('initializeSearchInfrastructure prefers status-scoped recovery queries and recovery transitions', async () => {
  const storageRoot = await mkdtemp(join(tmpdir(), 'knowject-knowledge-recover-query-'));
  const knowledgeId = '507f1f77bcf86cd799439431';
  const documentId = '507f1f77bcf86cd799439432';
  const storagePath = `${knowledgeId}/${documentId}/hash-1/README.md`;
  await mkdir(join(storageRoot, knowledgeId, documentId, 'hash-1'), { recursive: true });
  await writeFile(join(storageRoot, storagePath), '# README\n');

  const knowledge: KnowledgeBaseDocument & {
    _id: NonNullable<KnowledgeBaseDocument['_id']>;
  } = {
    _id: new ObjectId(knowledgeId),
    name: '知识库恢复',
    description: '',
    sourceType: 'global_docs',
    indexStatus: 'pending',
    documentCount: 1,
    chunkCount: 0,
    maintainerId: 'user-1',
    createdBy: 'user-1',
    createdAt: new Date('2026-03-16T00:00:00.000Z'),
    updatedAt: new Date('2026-03-16T00:00:00.000Z'),
  };
  const document: KnowledgeDocumentRecord & { _id: ObjectId } = {
    _id: new ObjectId(documentId),
    knowledgeId,
    fileName: 'README.md',
    mimeType: 'text/markdown',
    storagePath,
    status: 'processing',
    chunkCount: 0,
    documentVersionHash: 'hash-1',
    embeddingProvider: 'openai',
    embeddingModel: 'text-embedding-3-small',
    lastIndexedAt: null,
    retryCount: 0,
    errorMessage: null,
    uploadedBy: 'user-1',
    uploadedAt: new Date('2026-03-16T00:00:00.000Z'),
    processedAt: null,
    createdAt: new Date('2026-03-16T00:00:00.000Z'),
    updatedAt: new Date(Date.now() - 20 * 60 * 1000),
  };

  let recoveryQueryCalled = false;
  let fullDocumentScanCalled = false;
  let pendingTransitionCalled = false;
  let pendingSummaryMarked = false;
  let processingSummaryMarked = false;
  let completionSummaryPatch:
    | {
        previousChunkCount: number;
        nextChunkCount: number;
      }
    | null = null;
  let resolveCompleted: (() => void) | null = null;
  const completed = new Promise<void>((resolve) => {
    resolveCompleted = resolve;
  });

  const repository = {
    ensureMetadataModel: async () => undefined,
    listKnowledgeBases: async () => [knowledge],
    listKnowledgeDocumentsForRecovery: async (staleProcessingBefore: Date) => {
      recoveryQueryCalled = true;
      assert.equal(staleProcessingBefore.getTime() <= Date.now(), true);
      return [document];
    },
    listKnowledgeNamespaceIndexStatesByRebuildStatus: async () => [],
    listDocumentsByKnowledgeIds: async () => {
      fullDocumentScanCalled = true;
      return [document];
    },
    listKnowledgeBasesByNamespace: async () => [knowledge],
    findKnowledgeNamespaceIndexState: async () => ({
      _id: new ObjectId('507f1f77bcf86cd799439433'),
      namespaceKey: 'global_docs',
      scope: 'global' as const,
      projectId: null,
      sourceType: 'global_docs' as const,
      activeCollectionName: buildExpectedCollectionName('global_docs'),
      activeEmbeddingProvider: 'openai' as const,
      activeApiKeyEncrypted: null,
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
      createdAt: new Date('2026-03-16T00:00:00.000Z'),
      updatedAt: new Date('2026-03-16T00:00:00.000Z'),
    }),
    markKnowledgeDocumentPendingForRecovery: async () => {
      pendingTransitionCalled = true;
      return {
        ...document,
        status: 'pending' as const,
        processedAt: null,
        errorMessage: null,
        updatedAt: new Date('2026-03-16T00:10:00.000Z'),
      };
    },
    markKnowledgeSummaryPending: async () => {
      pendingSummaryMarked = true;
      return knowledge;
    },
    markKnowledgeDocumentProcessingIfPending: async () => ({
      ...document,
      status: 'processing' as const,
      updatedAt: new Date('2026-03-16T00:10:01.000Z'),
    }),
    markKnowledgeSummaryProcessing: async () => {
      processingSummaryMarked = true;
      return knowledge;
    },
    markKnowledgeDocumentCompletedIfProcessing: async (
      _documentId: string,
      patch: Pick<
        KnowledgeDocumentRecord,
        | 'chunkCount'
        | 'embeddingProvider'
        | 'embeddingModel'
        | 'lastIndexedAt'
        | 'processedAt'
        | 'updatedAt'
      >,
    ) => ({
      ...document,
      status: 'completed' as const,
      chunkCount: patch.chunkCount,
      embeddingProvider: patch.embeddingProvider,
      embeddingModel: patch.embeddingModel,
      lastIndexedAt: patch.lastIndexedAt,
      processedAt: patch.processedAt,
      updatedAt: patch.updatedAt,
    }),
    adjustKnowledgeSummaryAfterDocumentCompletion: async (
      scopedKnowledgeId: string,
      patch: {
        previousChunkCount: number;
        nextChunkCount: number;
        updatedAt: Date;
      },
    ) => {
      assert.equal(scopedKnowledgeId, knowledgeId);
      completionSummaryPatch = {
        previousChunkCount: patch.previousChunkCount,
        nextChunkCount: patch.nextChunkCount,
      };
      resolveCompleted?.();
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
  });

  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () =>
    new Response(
      JSON.stringify({
        status: 'completed',
        knowledgeId,
        documentId,
        chunkCount: 2,
        characterCount: 16,
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

  try {
    await service.initializeSearchInfrastructure();

    await Promise.race([
      completed,
      delay(2000).then(() => {
        throw new Error('Timed out waiting for recovery query processing');
      }),
    ]);
  } finally {
    globalThis.fetch = originalFetch;
  }

  assert.equal(recoveryQueryCalled, true);
  assert.equal(fullDocumentScanCalled, false);
  assert.equal(pendingTransitionCalled, true);
  assert.equal(pendingSummaryMarked, true);
  assert.equal(processingSummaryMarked, true);
  assert.deepEqual(completionSummaryPatch, {
    previousChunkCount: 0,
    nextChunkCount: 2,
  });
});

test('initializeSearchInfrastructure marks orphan pending documents as failed during startup recovery', async () => {
  const orphanKnowledgeId = '507f1f77bcf86cd799439461';
  const orphanDocumentId = '507f1f77bcf86cd799439462';
  const orphanDocument: KnowledgeDocumentRecord & { _id: ObjectId } = {
    _id: new ObjectId(orphanDocumentId),
    knowledgeId: orphanKnowledgeId,
    fileName: 'README.md',
    mimeType: 'text/markdown',
    storagePath: `${orphanKnowledgeId}/${orphanDocumentId}/hash-1/README.md`,
    status: 'pending',
    chunkCount: 0,
    documentVersionHash: 'hash-1',
    embeddingProvider: 'openai',
    embeddingModel: 'text-embedding-3-small',
    lastIndexedAt: null,
    retryCount: 0,
    errorMessage: null,
    uploadedBy: 'user-1',
    uploadedAt: new Date('2026-03-16T00:00:00.000Z'),
    processedAt: null,
    createdAt: new Date('2026-03-16T00:00:00.000Z'),
    updatedAt: new Date('2026-03-16T00:00:00.000Z'),
  };

  let failedDocumentId: string | null = null;
  let failedErrorMessage: string | null = null;
  let summarySyncKnowledgeId: string | null = null;

  const repository = {
    ensureMetadataModel: async () => undefined,
    listKnowledgeBases: async () => [],
    listKnowledgeDocumentsForRecovery: async () => [orphanDocument],
    listKnowledgeNamespaceIndexStatesByRebuildStatus: async () => [],
    markKnowledgeDocumentFailedIfRecoverable: async (
      documentId: string,
      patch: Pick<
        KnowledgeDocumentRecord,
        'errorMessage' | 'processedAt' | 'updatedAt'
      >,
    ) => {
      failedDocumentId = documentId;
      failedErrorMessage = patch.errorMessage;
      return {
        ...orphanDocument,
        status: 'failed' as const,
        errorMessage: patch.errorMessage,
        processedAt: patch.processedAt,
        updatedAt: patch.updatedAt,
      };
    },
    adjustKnowledgeSummaryAfterDocumentFailure: async (knowledgeId: string) => {
      summarySyncKnowledgeId = knowledgeId;
      return null;
    },
  } as unknown as KnowledgeRepository;

  const service = createKnowledgeService({
    env: createTestEnv('/tmp/knowject-knowledge-recover-orphan'),
    repository,
    searchService: createSearchServiceStub(),
    authRepository: {
      findProfilesByIds: async () => [],
    } as unknown as AuthRepository,
  });

  await service.initializeSearchInfrastructure();

  assert.equal(failedDocumentId, orphanDocumentId);
  assert.equal(failedErrorMessage, '所属知识库不存在，无法恢复索引任务');
  assert.equal(summarySyncKnowledgeId, orphanKnowledgeId);
});

test('initializeSearchInfrastructure marks pending and stale processing documents as failed when the namespace is still legacy', async () => {
  const knowledgeId = '507f1f77bcf86cd799439471';
  const pendingDocumentId = '507f1f77bcf86cd799439472';
  const processingDocumentId = '507f1f77bcf86cd799439473';
  const knowledge = {
    _id: new ObjectId(knowledgeId),
    name: '知识库恢复',
    description: '',
    sourceType: 'global_docs' as const,
    indexStatus: 'pending' as const,
    documentCount: 2,
    chunkCount: 0,
    maintainerId: 'user-1',
    createdBy: 'user-1',
    createdAt: new Date('2026-03-16T00:00:00.000Z'),
    updatedAt: new Date('2026-03-16T00:00:00.000Z'),
  };
  const recoveryDocuments: Array<KnowledgeDocumentRecord & { _id: ObjectId }> = [
    {
      _id: new ObjectId(pendingDocumentId),
      knowledgeId,
      fileName: 'README-pending.md',
      mimeType: 'text/markdown',
      storagePath: `${knowledgeId}/${pendingDocumentId}/hash-p/README-pending.md`,
      status: 'pending',
      chunkCount: 0,
      documentVersionHash: 'hash-p',
      embeddingProvider: 'openai',
      embeddingModel: 'text-embedding-3-small',
      lastIndexedAt: null,
      retryCount: 0,
      errorMessage: null,
      uploadedBy: 'user-1',
      uploadedAt: new Date('2026-03-16T00:00:00.000Z'),
      processedAt: null,
      createdAt: new Date('2026-03-16T00:00:00.000Z'),
      updatedAt: new Date('2026-03-16T00:00:00.000Z'),
    },
    {
      _id: new ObjectId(processingDocumentId),
      knowledgeId,
      fileName: 'README-processing.md',
      mimeType: 'text/markdown',
      storagePath: `${knowledgeId}/${processingDocumentId}/hash-q/README-processing.md`,
      status: 'processing',
      chunkCount: 4,
      documentVersionHash: 'hash-q',
      embeddingProvider: 'openai',
      embeddingModel: 'text-embedding-3-small',
      lastIndexedAt: new Date('2026-03-16T00:00:00.000Z'),
      retryCount: 1,
      errorMessage: null,
      uploadedBy: 'user-1',
      uploadedAt: new Date('2026-03-16T00:00:00.000Z'),
      processedAt: null,
      createdAt: new Date('2026-03-16T00:00:00.000Z'),
      updatedAt: new Date(Date.now() - 20 * 60 * 1000),
    },
  ];

  const failedTransitions: Array<{
    documentId: string;
    errorMessage: string;
  }> = [];
  const failedSummaryPatches: Array<{
    knowledgeId: string;
    previousChunkCount: number;
  }> = [];

  const repository = {
    ensureMetadataModel: async () => undefined,
    listKnowledgeBases: async () => [knowledge],
    listKnowledgeDocumentsForRecovery: async () => recoveryDocuments,
    listKnowledgeNamespaceIndexStatesByRebuildStatus: async () => [],
    listKnowledgeBasesByNamespace: async () => [knowledge],
    findKnowledgeNamespaceIndexState: async () => null,
    markKnowledgeDocumentFailedIfRecoverable: async (
      documentId: string,
      patch: Pick<
        KnowledgeDocumentRecord,
        'errorMessage' | 'processedAt' | 'updatedAt'
      >,
    ) => {
      const currentDocument =
        recoveryDocuments.find((document) => document._id.toHexString() === documentId) ?? null;
      if (!currentDocument) {
        return null;
      }

      failedTransitions.push({
        documentId,
        errorMessage: patch.errorMessage ?? '',
      });
      Object.assign(currentDocument, {
        status: 'failed',
        chunkCount: 0,
        errorMessage: patch.errorMessage,
        processedAt: patch.processedAt,
        updatedAt: patch.updatedAt,
      });
      return currentDocument;
    },
    adjustKnowledgeSummaryAfterDocumentFailure: async (
      scopedKnowledgeId: string,
      patch: {
        previousChunkCount: number;
        updatedAt: Date;
      },
    ) => {
      failedSummaryPatches.push({
        knowledgeId: scopedKnowledgeId,
        previousChunkCount: patch.previousChunkCount,
      });
      return knowledge;
    },
  } as unknown as KnowledgeRepository;

  const service = createKnowledgeService({
    env: createTestEnv('/tmp/knowject-knowledge-recover-legacy'),
    repository,
    searchService: createSearchServiceStub(),
    authRepository: {
      findProfilesByIds: async () => [],
    } as unknown as AuthRepository,
  });

  await service.initializeSearchInfrastructure();

  assert.deepEqual(
    failedTransitions.map((item) => item.documentId),
    [pendingDocumentId, processingDocumentId],
  );
  assert.equal(
    failedTransitions.every(
      (item) =>
        item.errorMessage === '当前索引缺少模型版本元数据，请先执行一次知识库全量重建',
    ),
    true,
  );
  assert.deepEqual(
    failedSummaryPatches,
    [
      {
        knowledgeId,
        previousChunkCount: 0,
      },
      {
        knowledgeId,
        previousChunkCount: 4,
      },
    ],
  );
});

test('initializeSearchInfrastructure marks pending and stale processing documents as failed when the embedding fingerprint drifts', async () => {
  const originalEncryptionKey = process.env.SETTINGS_ENCRYPTION_KEY;
  process.env.SETTINGS_ENCRYPTION_KEY =
    '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
  const knowledgeId = '507f1f77bcf86cd799439481';
  const pendingDocumentId = '507f1f77bcf86cd799439482';
  const processingDocumentId = '507f1f77bcf86cd799439483';
  const knowledge = {
    _id: new ObjectId(knowledgeId),
    name: '知识库恢复',
    description: '',
    sourceType: 'global_docs' as const,
    indexStatus: 'pending' as const,
    documentCount: 2,
    chunkCount: 0,
    maintainerId: 'user-1',
    createdBy: 'user-1',
    createdAt: new Date('2026-03-16T00:00:00.000Z'),
    updatedAt: new Date('2026-03-16T00:00:00.000Z'),
  };
  const recoveryDocuments: Array<KnowledgeDocumentRecord & { _id: ObjectId }> = [
    {
      _id: new ObjectId(pendingDocumentId),
      knowledgeId,
      fileName: 'README-pending.md',
      mimeType: 'text/markdown',
      storagePath: `${knowledgeId}/${pendingDocumentId}/hash-p/README-pending.md`,
      status: 'pending',
      chunkCount: 0,
      documentVersionHash: 'hash-p',
      embeddingProvider: 'openai',
      embeddingModel: 'text-embedding-3-small',
      lastIndexedAt: null,
      retryCount: 0,
      errorMessage: null,
      uploadedBy: 'user-1',
      uploadedAt: new Date('2026-03-16T00:00:00.000Z'),
      processedAt: null,
      createdAt: new Date('2026-03-16T00:00:00.000Z'),
      updatedAt: new Date('2026-03-16T00:00:00.000Z'),
    },
    {
      _id: new ObjectId(processingDocumentId),
      knowledgeId,
      fileName: 'README-processing.md',
      mimeType: 'text/markdown',
      storagePath: `${knowledgeId}/${processingDocumentId}/hash-q/README-processing.md`,
      status: 'processing',
      chunkCount: 2,
      documentVersionHash: 'hash-q',
      embeddingProvider: 'openai',
      embeddingModel: 'text-embedding-3-small',
      lastIndexedAt: new Date('2026-03-16T00:00:00.000Z'),
      retryCount: 1,
      errorMessage: null,
      uploadedBy: 'user-1',
      uploadedAt: new Date('2026-03-16T00:00:00.000Z'),
      processedAt: null,
      createdAt: new Date('2026-03-16T00:00:00.000Z'),
      updatedAt: new Date(Date.now() - 20 * 60 * 1000),
    },
  ];
  const failedTransitions: Array<{
    documentId: string;
    errorMessage: string;
  }> = [];
  const failedSummaryPatches: Array<{
    knowledgeId: string;
    previousChunkCount: number;
  }> = [];

  let namespaceState: KnowledgeNamespaceIndexStateDocument & { _id: ObjectId } = {
    _id: new ObjectId('507f1f77bcf86cd799439484'),
    namespaceKey: 'global_docs',
    scope: 'global',
    projectId: null,
    sourceType: 'global_docs',
    activeCollectionName: buildExpectedCollectionName('global_docs'),
    activeEmbeddingProvider: 'openai',
    activeApiKeyEncrypted: encryptApiKey('sk-old-openai'),
    activeEmbeddingBaseUrl: 'https://api.openai.com/v1',
    activeEmbeddingModel: 'text-embedding-3-small',
    activeEmbeddingFingerprint: buildKnowledgeEmbeddingFingerprint({
      provider: 'openai',
      baseUrl: 'https://api.openai.com/v1',
      model: 'text-embedding-3-small',
    } as never),
    rebuildStatus: 'idle',
    targetCollectionName: null,
    targetEmbeddingProvider: null,
    targetEmbeddingBaseUrl: null,
    targetEmbeddingModel: null,
    targetEmbeddingFingerprint: null,
    lastErrorMessage: null,
    createdAt: new Date('2026-03-16T00:00:00.000Z'),
    updatedAt: new Date('2026-03-16T00:00:00.000Z'),
  };

  const repository = {
    ensureMetadataModel: async () => undefined,
    listKnowledgeBases: async () => [knowledge],
    listKnowledgeDocumentsForRecovery: async () => recoveryDocuments,
    listKnowledgeNamespaceIndexStatesByRebuildStatus: async () => [],
    listKnowledgeBasesByNamespace: async () => [knowledge],
    findKnowledgeNamespaceIndexState: async () => namespaceState,
    markKnowledgeDocumentFailedIfRecoverable: async (
      documentId: string,
      patch: Pick<
        KnowledgeDocumentRecord,
        'errorMessage' | 'processedAt' | 'updatedAt'
      >,
    ) => {
      const currentDocument =
        recoveryDocuments.find((document) => document._id.toHexString() === documentId) ?? null;
      if (!currentDocument) {
        return null;
      }

      failedTransitions.push({
        documentId,
        errorMessage: patch.errorMessage ?? '',
      });
      Object.assign(currentDocument, {
        status: 'failed',
        chunkCount: 0,
        errorMessage: patch.errorMessage,
        processedAt: patch.processedAt,
        updatedAt: patch.updatedAt,
      });
      return currentDocument;
    },
    adjustKnowledgeSummaryAfterDocumentFailure: async (
      scopedKnowledgeId: string,
      patch: {
        previousChunkCount: number;
        updatedAt: Date;
      },
    ) => {
      failedSummaryPatches.push({
        knowledgeId: scopedKnowledgeId,
        previousChunkCount: patch.previousChunkCount,
      });
      return knowledge;
    },
    updateKnowledgeNamespaceIndexState: async (_namespaceKey: string, patch: Record<string, unknown>) => {
      namespaceState = {
        ...namespaceState,
        ...patch,
      };
      return namespaceState;
    },
  } as unknown as KnowledgeRepository;

  const service = createKnowledgeService({
    env: createTestEnv('/tmp/knowject-knowledge-recover-fingerprint'),
    repository,
    searchService: createSearchServiceStub(),
    authRepository: {
      findProfilesByIds: async () => [],
    } as unknown as AuthRepository,
    settingsRepository: createSettingsRepositoryStub({
      getSettings: async () => ({
        _id: new ObjectId('507f1f77bcf86cd799439485'),
        singleton: 'default',
        embedding: {
          provider: 'custom',
          baseUrl: 'https://embedding.example.com/v1',
          model: 'text-embedding-custom',
          apiKeyEncrypted: encryptApiKey('db-embedding-key'),
          apiKeyHint: 'db-e...-key',
          testedAt: null,
          testStatus: null,
        },
        updatedAt: new Date('2026-03-16T00:00:00.000Z'),
        updatedBy: 'user-1',
      }),
    }),
  });

  try {
    await service.initializeSearchInfrastructure();
  } finally {
    process.env.SETTINGS_ENCRYPTION_KEY = originalEncryptionKey;
  }

  assert.deepEqual(
    failedTransitions.map((item) => item.documentId),
    [pendingDocumentId, processingDocumentId],
  );
  assert.equal(
    failedTransitions.every(
      (item) => item.errorMessage === '当前向量模型已变更，请先执行知识库全量重建',
    ),
    true,
  );
  assert.deepEqual(
    failedSummaryPatches,
    [
      {
        knowledgeId,
        previousChunkCount: 0,
      },
      {
        knowledgeId,
        previousChunkCount: 2,
      },
    ],
  );
});

test('initializeSearchInfrastructure resumes namespace rebuilds marked as rebuilding', async () => {
  const storageRoot = await mkdtemp(join(tmpdir(), 'knowject-knowledge-recover-rebuild-'));
  const knowledgeId = '507f1f77bcf86cd799439411';
  const siblingKnowledgeId = '507f1f77bcf86cd799439412';
  let currentDocuments: Array<KnowledgeDocumentRecord & { _id: ObjectId }> = [
    {
      _id: new ObjectId('507f1f77bcf86cd799439413'),
      knowledgeId,
      fileName: 'README-A.md',
      mimeType: 'text/markdown',
      storagePath: `${knowledgeId}/507f1f77bcf86cd799439413/hash-a/README-A.md`,
      status: 'pending',
      chunkCount: 0,
      documentVersionHash: 'hash-a',
      embeddingProvider: 'openai',
      embeddingModel: 'text-embedding-3-small',
      lastIndexedAt: null,
      retryCount: 0,
      errorMessage: null,
      uploadedBy: 'user-1',
      uploadedAt: new Date('2026-03-16T00:00:00.000Z'),
      processedAt: null,
      createdAt: new Date('2026-03-16T00:00:00.000Z'),
      updatedAt: new Date('2026-03-16T00:00:00.000Z'),
    },
    {
      _id: new ObjectId('507f1f77bcf86cd799439414'),
      knowledgeId: siblingKnowledgeId,
      fileName: 'README-B.md',
      mimeType: 'text/markdown',
      storagePath: `${siblingKnowledgeId}/507f1f77bcf86cd799439414/hash-b/README-B.md`,
      status: 'completed',
      chunkCount: 1,
      documentVersionHash: 'hash-b',
      embeddingProvider: 'openai',
      embeddingModel: 'text-embedding-3-small',
      lastIndexedAt: new Date('2026-03-16T00:00:10.000Z'),
      retryCount: 0,
      errorMessage: null,
      uploadedBy: 'user-1',
      uploadedAt: new Date('2026-03-16T00:00:00.000Z'),
      processedAt: new Date('2026-03-16T00:00:10.000Z'),
      createdAt: new Date('2026-03-16T00:00:00.000Z'),
      updatedAt: new Date('2026-03-16T00:00:10.000Z'),
    },
  ];
  for (const document of currentDocuments) {
    await mkdir(join(storageRoot, ...document.storagePath.split('/').slice(0, -1)), {
      recursive: true,
    });
    await writeFile(join(storageRoot, document.storagePath), `# ${document.fileName}\n`);
  }

  const knowledge = {
    _id: new ObjectId(knowledgeId),
    name: '知识库 A',
    description: '',
    sourceType: 'global_docs' as const,
    indexStatus: 'pending' as const,
    documentCount: 1,
    chunkCount: 0,
    maintainerId: 'user-1',
    createdBy: 'user-1',
    createdAt: new Date('2026-03-16T00:00:00.000Z'),
    updatedAt: new Date('2026-03-16T00:00:00.000Z'),
  };
  const siblingKnowledge = {
    _id: new ObjectId(siblingKnowledgeId),
    name: '知识库 B',
    description: '',
    sourceType: 'global_docs' as const,
    indexStatus: 'completed' as const,
    documentCount: 1,
    chunkCount: 1,
    maintainerId: 'user-1',
    createdBy: 'user-1',
    createdAt: new Date('2026-03-16T00:00:00.000Z'),
    updatedAt: new Date('2026-03-16T00:00:00.000Z'),
  };
  let namespaceState: KnowledgeNamespaceIndexStateDocument & { _id: ObjectId } = {
    _id: new ObjectId('507f1f77bcf86cd799439415'),
    namespaceKey: 'global_docs',
    scope: 'global',
    projectId: null,
    sourceType: 'global_docs',
    activeCollectionName: 'global_docs__emb_old',
    activeEmbeddingProvider: 'openai',
    activeApiKeyEncrypted: null,
    activeEmbeddingBaseUrl: 'https://api.openai.com/v1',
    activeEmbeddingModel: 'text-embedding-3-small',
    activeEmbeddingFingerprint: buildKnowledgeEmbeddingFingerprint({
      provider: 'openai',
      baseUrl: 'https://api.openai.com/v1',
      model: 'text-embedding-3-small',
    } as never),
    rebuildStatus: 'rebuilding',
    targetCollectionName: buildExpectedCollectionName('global_docs'),
    targetEmbeddingProvider: 'openai',
    targetEmbeddingBaseUrl: 'https://api.openai.com/v1',
    targetEmbeddingModel: 'text-embedding-3-small',
    targetEmbeddingFingerprint: buildKnowledgeEmbeddingFingerprint({
      provider: 'openai',
      baseUrl: 'https://api.openai.com/v1',
      model: 'text-embedding-3-small',
    } as never),
    lastErrorMessage: null,
    createdAt: new Date('2026-03-16T00:00:00.000Z'),
    updatedAt: new Date('2026-03-16T00:00:00.000Z'),
  };
  let completedCount = 0;
  let resolveCompleted: (() => void) | null = null;
  const rebuildCompleted = new Promise<void>((resolve) => {
    resolveCompleted = resolve;
  });
  const fetchCalls: string[] = [];

  const repository = {
    ensureMetadataModel: async () => undefined,
    listKnowledgeBases: async () => [knowledge, siblingKnowledge],
    listKnowledgeBasesByNamespace: async () => [knowledge, siblingKnowledge],
    listDocumentsByKnowledgeIds: async (knowledgeIds: string[]) =>
      currentDocuments.filter((document) => knowledgeIds.includes(document.knowledgeId)),
    findKnowledgeNamespaceIndexState: async () => namespaceState,
    updateKnowledgeDocument: async (
      documentId: string,
      patch: Partial<
        Pick<
          KnowledgeDocumentRecord,
          | 'status'
          | 'chunkCount'
          | 'embeddingProvider'
          | 'embeddingModel'
          | 'lastIndexedAt'
          | 'errorMessage'
          | 'processedAt'
          | 'updatedAt'
        >
      >,
    ) => {
      currentDocuments = currentDocuments.map((document) =>
        document._id.toHexString() === documentId
          ? {
              ...document,
              ...patch,
            }
          : document,
      );

      const updated =
        currentDocuments.find((document) => document._id.toHexString() === documentId) ?? null;
      if (patch.status === 'completed') {
        completedCount += 1;
        if (completedCount === 2) {
          resolveCompleted?.();
        }
      }

      return updated;
    },
    syncKnowledgeSummaryFromDocuments: async () => undefined,
    updateKnowledgeNamespaceIndexState: async (_namespaceKey: string, patch: Record<string, unknown>) => {
      namespaceState = {
        ...namespaceState,
        ...patch,
      };

      return namespaceState;
    },
  } as unknown as KnowledgeRepository;

  const service = createKnowledgeService({
    env: createTestEnv(storageRoot),
    repository,
    searchService: createSearchServiceStub({
      deleteCollection: async () => undefined,
    }),
    authRepository: {
      findProfilesByIds: async () => [],
    } as unknown as AuthRepository,
  });

  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input, init) => {
    const url =
      typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
    fetchCalls.push(url);
    const body = JSON.parse(String(init?.body ?? '{}')) as {
      documentId?: string;
      knowledgeId?: string;
    };

    return new Response(
      JSON.stringify({
        status: 'completed',
        knowledgeId: body.knowledgeId,
        documentId: body.documentId,
        chunkCount: 2,
        characterCount: 24,
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
    await service.initializeSearchInfrastructure();

    await Promise.race([
      rebuildCompleted,
      delay(2000).then(() => {
        throw new Error('Timed out waiting for namespace rebuild recovery');
      }),
    ]);

    await Promise.race([
      (async () => {
        while (namespaceState.rebuildStatus !== 'idle') {
          await delay(10);
        }
      })(),
      delay(2000).then(() => {
        throw new Error('Timed out waiting for namespace rebuild state reset');
      }),
    ]);
  } finally {
    globalThis.fetch = originalFetch;
  }

  assert.equal(namespaceState.rebuildStatus, 'idle');
  assert.equal(namespaceState.activeCollectionName, buildExpectedCollectionName('global_docs'));
  assert.equal(fetchCalls.length, 2);
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

test('deleteKnowledge stops deleting records when Chroma cleanup fails', async () => {
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

  await assert.rejects(
    () =>
      service.deleteKnowledge(
        {
          actor: {
            id: 'user-1',
            username: 'langya',
          },
        },
        knowledgeId,
      ),
    (error: unknown) => {
      assert.ok(error instanceof AppError);
      assert.equal(error.code, 'KNOWLEDGE_VECTOR_DELETE_FAILED');
      assert.equal(error.statusCode, 502);
      return true;
    },
  );

  assert.equal(deletedDocuments, false);
  assert.equal(deletedKnowledge, false);
  await access(knowledgeDir);
});

test('deleteKnowledge cleans up empty namespace state and collections after removing the last knowledge base', async () => {
  const storageRoot = await mkdtemp(join(tmpdir(), 'knowject-knowledge-empty-namespace-'));
  const knowledgeId = '507f1f77bcf86cd799439181';
  const knowledgeDir = join(storageRoot, knowledgeId);
  await mkdir(knowledgeDir, { recursive: true });

  const knowledge: KnowledgeBaseDocument & {
    _id: NonNullable<KnowledgeBaseDocument['_id']>;
  } = {
    _id: new ObjectId(knowledgeId),
    name: '知识库 A',
    description: '用于验证空 namespace 清理',
    sourceType: 'global_docs',
    indexStatus: 'completed',
    documentCount: 1,
    chunkCount: 3,
    maintainerId: 'user-1',
    createdBy: 'user-1',
    createdAt: new Date('2026-03-16T00:00:00.000Z'),
    updatedAt: new Date('2026-03-16T00:00:00.000Z'),
  };
  let knowledgeDeleted = false;
  let namespaceStateDeleted = false;
  const deletedCollections: string[] = [];

  const repository = {
    ensureMetadataModel: async () => undefined,
    findKnowledgeById: async (id: string) => (id === knowledgeId ? knowledge : null),
    listKnowledgeBasesByNamespace: async () => (knowledgeDeleted ? [] : [knowledge]),
    findKnowledgeNamespaceIndexState: async () => ({
      _id: new ObjectId('507f1f77bcf86cd799439182'),
      namespaceKey: 'global_docs',
      scope: 'global' as const,
      projectId: null,
      sourceType: 'global_docs' as const,
      activeCollectionName: buildExpectedCollectionName('global_docs'),
      activeEmbeddingProvider: 'openai' as const,
      activeApiKeyEncrypted: null,
      activeEmbeddingBaseUrl: 'https://api.openai.com/v1',
      activeEmbeddingModel: 'text-embedding-3-small',
      activeEmbeddingFingerprint: buildKnowledgeEmbeddingFingerprint({
        provider: 'openai',
        baseUrl: 'https://api.openai.com/v1',
        model: 'text-embedding-3-small',
      } as never),
      rebuildStatus: 'failed' as const,
      targetCollectionName: buildExpectedCollectionName('global_docs', {
        provider: 'custom',
        baseUrl: 'https://embedding.example.com/v1',
        model: 'text-embedding-custom',
      }),
      targetEmbeddingProvider: 'custom' as const,
      targetEmbeddingBaseUrl: 'https://embedding.example.com/v1',
      targetEmbeddingModel: 'text-embedding-custom',
      targetEmbeddingFingerprint: buildKnowledgeEmbeddingFingerprint({
        provider: 'custom',
        baseUrl: 'https://embedding.example.com/v1',
        model: 'text-embedding-custom',
      } as never),
      lastErrorMessage: 'failed rebuild',
      createdAt: new Date('2026-03-16T00:00:00.000Z'),
      updatedAt: new Date('2026-03-16T00:00:00.000Z'),
    }),
    deleteKnowledgeDocumentsByKnowledgeId: async () => 1,
    deleteKnowledgeBase: async () => {
      knowledgeDeleted = true;
      return true;
    },
    deleteKnowledgeNamespaceIndexState: async () => {
      namespaceStateDeleted = true;
      return true;
    },
  } as unknown as KnowledgeRepository;

  const service = createKnowledgeService({
    env: createTestEnv(storageRoot),
    repository,
    searchService: createSearchServiceStub({
      deleteCollection: async (collectionName) => {
        deletedCollections.push(collectionName);
      },
    }),
    authRepository: {
      findProfilesByIds: async () => [],
    } as unknown as AuthRepository,
  });

  await service.deleteKnowledge(
    {
      actor: {
        id: 'user-1',
        username: 'langya',
      },
    },
    knowledgeId,
  );

  assert.equal(namespaceStateDeleted, true);
  assert.deepEqual(
    new Set(deletedCollections),
    new Set([
      buildExpectedCollectionName('global_docs'),
      buildExpectedCollectionName('global_docs', {
        provider: 'custom',
        baseUrl: 'https://embedding.example.com/v1',
        model: 'text-embedding-custom',
      }),
    ]),
  );
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

test('rebuildDocument uses incremental knowledge summary helpers during detached processing', async () => {
  const storageRoot = await mkdtemp(join(tmpdir(), 'knowject-knowledge-rebuild-summary-'));
  const knowledgeId = '507f1f77bcf86cd799439131';
  const documentId = '507f1f77bcf86cd799439132';
  const knowledge: KnowledgeBaseDocument & {
    _id: NonNullable<KnowledgeBaseDocument['_id']>;
  } = {
    _id: new ObjectId(knowledgeId),
    name: '知识库 A',
    description: '用于验证 rebuild summary 增量维护',
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

  let pendingSummaryMarked = false;
  let processingSummaryMarked = false;
  let completionSummaryPatch:
    | {
        previousChunkCount: number;
        nextChunkCount: number;
      }
    | null = null;
  let fullSummarySyncCalled = false;
  let resolveCompleted: (() => void) | null = null;
  const processingCompleted = new Promise<void>((resolve) => {
    resolveCompleted = resolve;
  });

  const repository = {
    ensureMetadataModel: async () => undefined,
    findKnowledgeById: async (id: string) => (id === knowledgeId ? knowledge : null),
    findKnowledgeDocumentById: async (id: string) => (id === documentId ? document : null),
    markKnowledgeDocumentPendingIfRetryable: async () => ({
      ...document,
      status: 'pending' as const,
      errorMessage: null,
      processedAt: null,
      updatedAt: new Date('2026-03-14T00:10:00.000Z'),
    }),
    markKnowledgeSummaryPending: async () => {
      pendingSummaryMarked = true;
      return knowledge;
    },
    markKnowledgeDocumentProcessingIfPending: async () => ({
      ...document,
      status: 'processing' as const,
      errorMessage: null,
      processedAt: null,
      updatedAt: new Date('2026-03-14T00:10:01.000Z'),
    }),
    markKnowledgeSummaryProcessing: async () => {
      processingSummaryMarked = true;
      return knowledge;
    },
    markKnowledgeDocumentCompletedIfProcessing: async (
      _documentId: string,
      patch: Pick<
        KnowledgeDocumentRecord,
        | 'chunkCount'
        | 'embeddingProvider'
        | 'embeddingModel'
        | 'lastIndexedAt'
        | 'processedAt'
        | 'updatedAt'
      >,
    ) => ({
      ...document,
      status: 'completed' as const,
      chunkCount: patch.chunkCount,
      embeddingProvider: patch.embeddingProvider,
      embeddingModel: patch.embeddingModel,
      lastIndexedAt: patch.lastIndexedAt,
      processedAt: patch.processedAt,
      updatedAt: patch.updatedAt,
    }),
    adjustKnowledgeSummaryAfterDocumentCompletion: async (
      scopedKnowledgeId: string,
      patch: {
        previousChunkCount: number;
        nextChunkCount: number;
        updatedAt: Date;
      },
    ) => {
      assert.equal(scopedKnowledgeId, knowledgeId);
      completionSummaryPatch = {
        previousChunkCount: patch.previousChunkCount,
        nextChunkCount: patch.nextChunkCount,
      };
      resolveCompleted?.();
      return {
        ...knowledge,
        chunkCount:
          knowledge.chunkCount -
          patch.previousChunkCount +
          patch.nextChunkCount,
      };
    },
    syncKnowledgeSummaryFromDocuments: async () => {
      fullSummarySyncCalled = true;
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
  });

  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () =>
    new Response(
      JSON.stringify({
        status: 'completed',
        knowledgeId,
        documentId,
        chunkCount: 6,
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
        throw new Error('Timed out waiting for detached rebuild summary processing');
      }),
    ]);
  } finally {
    globalThis.fetch = originalFetch;
  }

  assert.equal(pendingSummaryMarked, true);
  assert.equal(processingSummaryMarked, true);
  assert.deepEqual(completionSummaryPatch, {
    previousChunkCount: 4,
    nextChunkCount: 6,
  });
  assert.equal(fullSummarySyncCalled, false);
});

test('retryDocument rejects when pending transition loses the compare-and-set race', async () => {
  const storageRoot = await mkdtemp(join(tmpdir(), 'knowject-knowledge-retry-race-'));
  const knowledgeId = '507f1f77bcf86cd799439101';
  const documentId = '507f1f77bcf86cd799439102';
  const knowledge: KnowledgeBaseDocument & {
    _id: NonNullable<KnowledgeBaseDocument['_id']>;
  } = {
    _id: new ObjectId(knowledgeId),
    name: '知识库 A',
    description: '用于验证 retry compare-and-set 冲突',
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
    fileName: 'retry-race.txt',
    mimeType: 'text/plain',
    storagePath: `${knowledgeId}/${documentId}/hash-1/retry-race.txt`,
    status: 'failed' as const,
    chunkCount: 0,
    documentVersionHash: 'hash-1',
    embeddingProvider: 'local_dev' as const,
    embeddingModel: 'hash-1536-dev' as const,
    lastIndexedAt: null,
    retryCount: 1,
    errorMessage: '旧错误',
    uploadedBy: '507f1f77bcf86cd799439012',
    uploadedAt: new Date('2026-03-14T00:00:00.000Z'),
    processedAt: new Date('2026-03-14T00:00:10.000Z'),
    createdAt: new Date('2026-03-14T00:00:00.000Z'),
    updatedAt: new Date('2026-03-14T00:00:10.000Z'),
  };

  let fetchCalled = false;

  const repository = {
    ensureMetadataModel: async () => undefined,
    findKnowledgeById: async (id: string) => (id === knowledgeId ? knowledge : null),
    findKnowledgeDocumentById: async (id: string) => (id === documentId ? document : null),
    markKnowledgeDocumentPendingIfRetryable: async () => null,
  } as unknown as KnowledgeRepository;

  const service = createKnowledgeService({
    env: createTestEnv(storageRoot),
    repository,
    searchService: createSearchServiceStub(),
    authRepository: {
      findProfilesByIds: async () => [],
    } as unknown as AuthRepository,
  });

  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => {
    fetchCalled = true;
    throw new Error('fetch should not be called when compare-and-set fails');
  };

  try {
    await assert.rejects(
      () =>
        service.retryDocument(
          {
            actor: {
              id: '507f1f77bcf86cd799439012',
              username: 'langya',
            },
          },
          knowledgeId,
          documentId,
        ),
      (error) => error instanceof Error && error.message === '文档已在索引中，请稍后刷新状态',
    );
  } finally {
    globalThis.fetch = originalFetch;
  }

  assert.equal(fetchCalled, false);
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
  let namespaceState: KnowledgeNamespaceIndexStateDocument & { _id: ObjectId } = {
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

test('rebuildKnowledge keeps the previous active collection searchable when a same-fingerprint rebuild fails', async () => {
  const originalEncryptionKey = process.env.SETTINGS_ENCRYPTION_KEY;
  process.env.SETTINGS_ENCRYPTION_KEY =
    '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
  const knowledgeId = '507f1f77bcf86cd799439241';
  const actorId = '507f1f77bcf86cd799439012';
  const knowledge = {
    _id: new ObjectId(knowledgeId),
    name: '知识库 A',
    description: '用于验证同 fingerprint rebuild 失败回退',
    sourceType: 'global_docs' as const,
    indexStatus: 'completed' as const,
    documentCount: 1,
    chunkCount: 3,
    maintainerId: actorId,
    createdBy: actorId,
    createdAt: new Date('2026-03-14T00:00:00.000Z'),
    updatedAt: new Date('2026-03-14T00:00:00.000Z'),
  };
  const documents: Array<KnowledgeDocumentRecord & { _id: ObjectId }> = [
    {
      _id: new ObjectId('507f1f77bcf86cd799439242'),
      knowledgeId,
      fileName: 'README.md',
      mimeType: 'text/markdown',
      storagePath: `${knowledgeId}/507f1f77bcf86cd799439242/hash-1/README.md`,
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
    },
  ];
  const oldCollectionName = buildExpectedCollectionName('global_docs');
  let namespaceState = {
    _id: new ObjectId('507f1f77bcf86cd799439243'),
    namespaceKey: 'global_docs',
    scope: 'global' as const,
    projectId: null,
    sourceType: 'global_docs' as const,
    activeCollectionName: oldCollectionName,
    activeEmbeddingProvider: 'openai' as const,
    activeApiKeyEncrypted: encryptApiKey('db-embedding-key'),
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
  let lastSearchCollectionName = '';
  let resolveFailure: (() => void) | null = null;
  const rebuildFailed = new Promise<void>((resolve) => {
    resolveFailure = resolve;
  });

  const repository = {
    ensureMetadataModel: async () => undefined,
    findKnowledgeById: async (id: string) => (id === knowledgeId ? knowledge : null),
    listDocumentsByKnowledgeId: async () => documents,
    listKnowledgeBasesByNamespace: async () => [knowledge],
    listDocumentsByKnowledgeIds: async () => documents,
    findKnowledgeNamespaceIndexState: async () => namespaceState,
    markKnowledgeNamespaceRebuildingIfIdle: async (
      _namespaceKey: string,
      patch: Record<string, unknown>,
    ) => {
      namespaceState = {
        ...namespaceState,
        ...patch,
      };
      return namespaceState;
    },
    updateKnowledgeNamespaceIndexState: async (_namespaceKey: string, patch: Record<string, unknown>) => {
      namespaceState = {
        ...namespaceState,
        ...patch,
      };

      if (patch.rebuildStatus === 'failed') {
        resolveFailure?.();
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
    syncKnowledgeSummaryFromDocuments: async () => knowledge,
  } as unknown as KnowledgeRepository;

  const service = createKnowledgeService({
    env: createTestEnv('/tmp/knowject-knowledge-same-fingerprint-rebuild'),
    repository,
    searchService: createSearchServiceStub({
      searchDocuments: async ({ collectionName, query, sourceType }) => {
        lastSearchCollectionName = collectionName ?? '';
        return {
          query,
          sourceType,
          total: 0,
          items: [],
        };
      },
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
          provider: 'openai',
          baseUrl: 'https://api.openai.com/v1',
          model: 'text-embedding-3-small',
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
        status: 'failed',
        knowledgeId: payload.knowledgeId,
        documentId: payload.documentId,
        errorMessage: 'Python indexer 重建失败',
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
      rebuildFailed,
      delay(2000).then(() => {
        throw new Error('Timed out waiting for same-fingerprint rebuild failure');
      }),
    ]);

    await service.searchDocuments(
      {
        actor: {
          id: actorId,
          username: 'langya',
        },
      },
      {
        knowledgeId,
        query: 'README',
        sourceType: 'global_docs',
        topK: 5,
      },
    );
  } finally {
    globalThis.fetch = originalFetch;
    process.env.SETTINGS_ENCRYPTION_KEY = originalEncryptionKey;
  }

  assert.equal(fetchPayloads.length, 1);
  assert.equal(
    String(fetchPayloads[0]?.collectionName).startsWith(`${oldCollectionName}__stage_`),
    true,
  );
  assert.equal(namespaceState.activeCollectionName, oldCollectionName);
  assert.equal(namespaceState.rebuildStatus, 'failed');
  assert.equal(deletedCollectionName, '');
  assert.equal(lastSearchCollectionName, oldCollectionName);
});

test('rebuildKnowledge rejects when namespace rebuild lock is taken during compare-and-set', async () => {
  const originalEncryptionKey = process.env.SETTINGS_ENCRYPTION_KEY;
  process.env.SETTINGS_ENCRYPTION_KEY =
    '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
  const knowledgeId = '507f1f77bcf86cd799439251';
  const actorId = '507f1f77bcf86cd799439012';
  const knowledge = {
    _id: new ObjectId(knowledgeId),
    name: '知识库 A',
    description: '用于验证 namespace rebuild CAS',
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
    _id: new ObjectId('507f1f77bcf86cd799439252'),
    knowledgeId,
    fileName: 'README.md',
    mimeType: 'text/markdown',
    storagePath: `${knowledgeId}/507f1f77bcf86cd799439252/hash-1/README.md`,
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
  const namespaceState = {
    _id: new ObjectId('507f1f77bcf86cd799439253'),
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
    listDocumentsByKnowledgeId: async () => [document],
    listKnowledgeBasesByNamespace: async () => [knowledge],
    findKnowledgeNamespaceIndexState: async () => namespaceState,
    markKnowledgeNamespaceRebuildingIfIdle: async () => null,
  } as unknown as KnowledgeRepository;

  const service = createKnowledgeService({
    env: createTestEnv('/tmp/knowject-knowledge-rebuild-lock-race'),
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
        service.rebuildKnowledge(
          {
            actor: {
              id: actorId,
              username: 'langya',
            },
          },
          knowledgeId,
        ),
      (error) =>
        error instanceof Error &&
        error.message === '当前命名空间正在重建，请稍后再试',
    );
  } finally {
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
      getDiagnostics: async ({ collectionName, locale }) => ({
        collection: {
          name: collectionName,
          exists: false,
          errorMessage:
            locale === 'en' ? 'Chroma request failed' : 'Chroma 请求失败',
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
        locale: 'en',
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
      errorMessage: 'Chroma request failed',
    });
    assert.equal(response.indexer.status, 'degraded');
    assert.equal(response.indexer.service, null);
    assert.deepEqual(response.indexer.supportedFormats, []);
    assert.equal(response.indexer.chunkSize, null);
    assert.equal(response.indexer.chunkOverlap, null);
    assert.equal(response.indexer.embeddingProvider, null);
    assert.equal(response.indexer.chromaReachable, null);
    assert.equal(
      response.indexer.errorMessage?.includes('Python indexer health check failed'),
      true,
    );
    assert.deepEqual(response.indexer.expected, {
      supportedFormats: ['md', 'txt', 'pdf', 'docx', 'xlsx'],
      chunkSize: 1000,
      chunkOverlap: 200,
      embeddingProvider: 'openai',
    });
    assert.equal(response.documents.length, 2);
    assert.equal(response.documents[0]?.missingStorage, false);
    assert.equal(response.documents[1]?.missingStorage, true);
    assert.equal(response.documents[1]?.staleProcessing, true);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('getKnowledgeDiagnostics preserves indexer actual embedding provider when settings and Python runtime diverge', async () => {
  const storageRoot = await mkdtemp(join(tmpdir(), 'knowject-knowledge-diagnostics-provider-drift-'));
  const env = createTestEnv(storageRoot);
  const originalEncryptionKey = process.env.SETTINGS_ENCRYPTION_KEY;
  process.env.SETTINGS_ENCRYPTION_KEY = env.settings.encryptionKey;
  const knowledgeId = '507f1f77bcf86cd799439019';
  const knowledge: KnowledgeBaseDocument & {
    _id: NonNullable<KnowledgeBaseDocument['_id']>;
  } = {
    _id: new ObjectId(knowledgeId),
    name: '知识库 Provider Drift',
    description: '用于验证 diagnostics 的实际值与期望值分离',
    sourceType: 'global_docs',
    indexStatus: 'completed',
    documentCount: 0,
    chunkCount: 0,
    maintainerId: '507f1f77bcf86cd799439012',
    createdBy: '507f1f77bcf86cd799439013',
    createdAt: new Date('2026-03-14T00:00:00.000Z'),
    updatedAt: new Date('2026-03-14T00:00:00.000Z'),
  };

  const repository = {
    ensureMetadataModel: async () => undefined,
    findKnowledgeById: async (id: string) => (id === knowledgeId ? knowledge : null),
    listDocumentsByKnowledgeId: async () => [],
  } as unknown as KnowledgeRepository;

  const service = createKnowledgeService({
    env,
    repository,
    searchService: createSearchServiceStub(),
    authRepository: {
      findProfilesByIds: async () => [],
    } as unknown as AuthRepository,
    settingsRepository: createSettingsRepositoryStub({
      getSettings: async () => ({
        _id: new ObjectId('507f1f77bcf86cd799439620'),
        singleton: 'default',
        embedding: {
          provider: 'voyage',
          baseUrl: 'https://api.voyageai.com/v1',
          model: 'voyage-3-large',
          apiKeyEncrypted: encryptApiKey('db-voyage-key'),
          apiKeyHint: '...-key',
          testedAt: null,
          testStatus: null,
        },
        updatedAt: new Date('2026-03-16T00:00:00.000Z'),
        updatedBy: 'user-1',
      }),
    }),
  });

  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () =>
    new Response(
      JSON.stringify({
        status: 'degraded',
        service: 'knowject-indexer-py',
        chunkSize: 1000,
        chunkOverlap: 200,
        supportedFormats: ['md', 'txt'],
        embeddingProvider: 'unconfigured',
        chromaReachable: true,
        errorMessage: 'OPENAI_API_KEY 未配置，无法生成 embedding',
      }),
      {
        status: 200,
        headers: {
          'content-type': 'application/json',
        },
      },
    );

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

    assert.equal(response.indexer.status, 'degraded');
    assert.equal(response.indexer.service, 'knowject-indexer-py');
    assert.deepEqual(response.indexer.supportedFormats, ['md', 'txt']);
    assert.equal(response.indexer.chunkSize, 1000);
    assert.equal(response.indexer.chunkOverlap, 200);
    assert.equal(response.indexer.embeddingProvider, 'unconfigured');
    assert.equal(
      response.indexer.errorMessage,
      'OPENAI_API_KEY 未配置，无法生成 embedding',
    );
    assert.deepEqual(response.indexer.expected, {
      supportedFormats: ['md', 'txt', 'pdf', 'docx', 'xlsx'],
      chunkSize: 1000,
      chunkOverlap: 200,
      embeddingProvider: 'voyage',
    });
  } finally {
    globalThis.fetch = originalFetch;
    process.env.SETTINGS_ENCRYPTION_KEY = originalEncryptionKey;
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
    assert.equal(response.indexer.chunkSize, 1000);
    assert.equal(response.indexer.chunkOverlap, 200);
    assert.deepEqual(response.indexer.supportedFormats, ['md', 'txt']);
    assert.equal(response.indexer.embeddingProvider, null);
    assert.equal(response.indexer.chromaReachable, null);
    assert.equal(response.indexer.errorMessage, null);
    assert.deepEqual(response.indexer.expected, {
      supportedFormats: ['md'],
      chunkSize: 860,
      chunkOverlap: 120,
      embeddingProvider: 'voyage',
    });
  } finally {
    globalThis.fetch = originalFetch;
    process.env.SETTINGS_ENCRYPTION_KEY = originalEncryptionKey;
  }
});

test('getKnowledgeDiagnostics localizes representable document failure messages for english requests', async () => {
  const storageRoot = await mkdtemp(join(tmpdir(), 'knowject-knowledge-diagnostics-doc-en-'));
  const knowledgeId = '507f1f77bcf86cd7994390aa';
  const knowledge: KnowledgeBaseDocument & {
    _id: NonNullable<KnowledgeBaseDocument['_id']>;
  } = {
    _id: new ObjectId(knowledgeId),
    name: '知识库文档失败',
    description: '验证 diagnostics 文档错误本地化',
    sourceType: 'global_docs',
    indexStatus: 'failed',
    documentCount: 1,
    chunkCount: 0,
    maintainerId: '507f1f77bcf86cd799439012',
    createdBy: '507f1f77bcf86cd799439013',
    createdAt: new Date('2026-03-14T00:00:00.000Z'),
    updatedAt: new Date('2026-03-14T00:00:00.000Z'),
  };
  const documents = [
    {
      _id: new ObjectId('507f1f77bcf86cd7994390ab'),
      knowledgeId,
      fileName: 'failed.md',
      mimeType: 'text/markdown',
      storagePath: `${knowledgeId}/failed.md`,
      status: 'failed' as const,
      chunkCount: 0,
      documentVersionHash: 'hash-failed',
      embeddingProvider: 'openai' as const,
      embeddingModel: 'text-embedding-3-small' as const,
      lastIndexedAt: null,
      retryCount: 1,
      errorMessage: '所属知识库不存在，无法恢复索引任务',
      errorMessageKey: 'knowledge.recovery.missingKnowledge' as const,
      errorMessageParams: null,
      uploadedBy: '507f1f77bcf86cd799439012',
      uploadedAt: new Date('2026-03-14T00:00:00.000Z'),
      processedAt: new Date('2026-03-14T00:10:00.000Z'),
      createdAt: new Date('2026-03-14T00:00:00.000Z'),
      updatedAt: new Date('2026-03-14T00:10:00.000Z'),
    },
  ];

  const service = createKnowledgeService({
    env: createTestEnv(storageRoot),
    repository: {
      ensureMetadataModel: async () => undefined,
      findKnowledgeById: async (id: string) => (id === knowledgeId ? knowledge : null),
      listDocumentsByKnowledgeId: async () => documents,
    } as unknown as KnowledgeRepository,
    searchService: createSearchServiceStub(),
    authRepository: {
      findProfilesByIds: async () => [],
    } as unknown as AuthRepository,
  });

  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () =>
    new Response(
      JSON.stringify({
        status: 'ok',
        service: 'knowject-indexer-py',
        chunkSize: 1000,
        chunkOverlap: 200,
        supportedFormats: ['md'],
      }),
      {
        status: 200,
        headers: {
          'content-type': 'application/json',
        },
      },
    );

  try {
    const response = await service.getKnowledgeDiagnostics(
      {
        actor: {
          id: '507f1f77bcf86cd799439012',
          username: 'langya',
        },
        locale: 'en',
      },
      knowledgeId,
    );

    assert.equal(
      response.documents[0]?.errorMessage,
      'Knowledge base no longer exists; the indexing task cannot be recovered',
    );
    assert.equal(
      response.documents[0]?.errorMessageKey,
      'knowledge.recovery.missingKnowledge',
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('deleteDocument stops deleting records when Chroma cleanup fails', async () => {
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

  await assert.rejects(
    () =>
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
    (error: unknown) => {
      assert.ok(error instanceof AppError);
      assert.equal(error.code, 'KNOWLEDGE_DOCUMENT_VECTOR_DELETE_FAILED');
      assert.equal(error.statusCode, 502);
      return true;
    },
  );

  assert.equal(deletedDocument, false);
  assert.equal(summarySynced, false);
  await access(documentDir);
});

test('deleteDocument prefers incremental summary adjustment over full reconciliation', async () => {
  const storageRoot = await mkdtemp(join(tmpdir(), 'knowject-knowledge-document-delete-incremental-'));
  const knowledgeId = '507f1f77bcf86cd799439161';
  const documentId = '507f1f77bcf86cd799439162';
  const documentDir = join(storageRoot, knowledgeId, documentId, 'hash-1');
  await mkdir(documentDir, { recursive: true });

  const knowledge: KnowledgeBaseDocument & {
    _id: NonNullable<KnowledgeBaseDocument['_id']>;
  } = {
    _id: new ObjectId(knowledgeId),
    name: '知识库 A',
    description: '用于验证单文档删除增量 summary',
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

  let incrementalSummaryAdjusted = false;
  let fullSummarySyncCalled = false;

  const repository = {
    ensureMetadataModel: async () => undefined,
    findKnowledgeById: async (id: string) => (id === knowledgeId ? knowledge : null),
    findKnowledgeDocumentById: async (id: string) => (id === documentId ? document : null),
    deleteKnowledgeDocumentById: async () => true,
    adjustKnowledgeSummaryAfterDocumentRemoval: async (
      scopedKnowledgeId: string,
      patch: {
        removedChunkCount: number;
        updatedAt: Date;
      },
    ) => {
      assert.equal(scopedKnowledgeId, knowledgeId);
      assert.equal(patch.removedChunkCount, 8);
      incrementalSummaryAdjusted = true;
      return {
        ...knowledge,
        indexStatus: 'idle' as const,
        documentCount: 0,
        chunkCount: 0,
      };
    },
    syncKnowledgeSummaryFromDocuments: async () => {
      fullSummarySyncCalled = true;
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

  assert.equal(incrementalSummaryAdjusted, true);
  assert.equal(fullSummarySyncCalled, false);
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
