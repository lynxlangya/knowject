import assert from 'node:assert/strict';
import { access, mkdir, mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { ObjectId } from 'mongodb';
import type { AppEnv } from '@config/env.js';
import type { AuthRepository } from '@modules/auth/auth.repository.js';
import type { KnowledgeRepository } from './knowledge.repository.js';
import type { KnowledgeSearchService } from './knowledge.search.js';
import { createKnowledgeService } from './knowledge.service.js';
import type { KnowledgeBaseDocument } from './knowledge.types.js';

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

test('listKnowledge hydrates maintainer and creator names', async () => {
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

  const repository = {
    ensureMetadataModel: async () => undefined,
    listKnowledgeBases: async () => [knowledge],
  } as unknown as KnowledgeRepository;

  const searchService = {
    ensureCollections: async () => undefined,
    searchDocuments: async () => ({
      query: '',
      sourceType: 'global_docs',
      total: 0,
      items: [],
    }),
    deleteKnowledgeChunks: async () => undefined,
    deleteDocumentChunks: async () => undefined,
  } as KnowledgeSearchService;

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
  });

  const response = await service.listKnowledge({
    actor: {
      id: '507f1f77bcf86cd799439099',
      username: 'langya',
    },
  });

  assert.equal(response.items.length, 1);
  assert.equal(response.items[0]?.maintainerName, '维护人名称');
  assert.equal(response.items[0]?.createdByName, '创建人名称');
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

  const searchService = {
    ensureCollections: async () => undefined,
    searchDocuments: async () => ({
      query: '',
      sourceType: 'global_docs',
      total: 0,
      items: [],
    }),
    deleteKnowledgeChunks: async () => {
      throw new Error('Chroma down');
    },
    deleteDocumentChunks: async () => undefined,
  } as KnowledgeSearchService;

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
