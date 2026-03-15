import assert from 'node:assert/strict';
import test from 'node:test';
import type { AppEnv } from '@config/env.js';
import { createKnowledgeSearchService } from './knowledge.search.js';

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

test('getDiagnostics bypasses cached collection state and re-reads Chroma', async () => {
  const service = createKnowledgeSearchService({
    env: createTestEnv(),
  });
  const fetchCalls: string[] = [];
  let collectionsRequestCount = 0;

  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input, init) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
    fetchCalls.push(url);

    if (url.endsWith('/collections') && init?.method === 'GET') {
      collectionsRequestCount += 1;

      return new Response(
        JSON.stringify(
          collectionsRequestCount === 1
            ? [{ id: 'collection-1', name: 'global_docs' }]
            : [],
        ),
        {
          status: 200,
          headers: {
            'content-type': 'application/json',
          },
        },
      );
    }

    if (url.endsWith('/collections/collection-1/delete') && init?.method === 'POST') {
      return new Response(
        JSON.stringify({}),
        {
          status: 200,
          headers: {
            'content-type': 'application/json',
          },
        },
      );
    }

    throw new Error(`Unexpected fetch: ${init?.method ?? 'GET'} ${url}`);
  };

  try {
    await service.deleteDocumentChunks('document-1', {
      collectionName: 'global_docs',
    });

    const diagnostics = await service.getDiagnostics({
      collectionName: 'global_docs',
    });

    assert.equal(diagnostics.collection.exists, false);
    assert.equal(diagnostics.collection.errorMessage, null);
    assert.equal(collectionsRequestCount, 2);
    assert.deepEqual(fetchCalls, [
      'http://127.0.0.1:8000/api/v2/tenants/default_tenant/databases/default_database/collections',
      'http://127.0.0.1:8000/api/v2/tenants/default_tenant/databases/default_database/collections/collection-1/delete',
      'http://127.0.0.1:8000/api/v2/tenants/default_tenant/databases/default_database/collections',
    ]);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('searchDocuments uses explicit collection name override when provided', async () => {
  const service = createKnowledgeSearchService({
    env: {
      ...createTestEnv(),
      openai: {
        ...createTestEnv().openai,
        apiKey: 'test-key',
      },
    },
  });
  const fetchCalls: string[] = [];
  let queryPath = '';

  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input, init) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
    fetchCalls.push(url);

    if (url.endsWith('/collections') && init?.method === 'GET') {
      return new Response(
        JSON.stringify([{ id: 'collection-project', name: 'proj_project-1_docs' }]),
        {
          status: 200,
          headers: {
            'content-type': 'application/json',
          },
        },
      );
    }

    if (url === 'https://api.openai.com/v1/embeddings' && init?.method === 'POST') {
      return new Response(
        JSON.stringify({
          data: [
            {
              embedding: [0.1, 0.2, 0.3],
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

    if (url.endsWith('/collections/collection-project/query') && init?.method === 'POST') {
      queryPath = url;

      return new Response(
        JSON.stringify({
          ids: [[]],
          documents: [[]],
          metadatas: [[]],
          distances: [[]],
        }),
        {
          status: 200,
          headers: {
            'content-type': 'application/json',
          },
        },
      );
    }

    throw new Error(`Unexpected fetch: ${init?.method ?? 'GET'} ${url}`);
  };

  try {
    const response = await service.searchDocuments({
      query: 'project knowledge',
      knowledgeId: 'knowledge-1',
      sourceType: 'global_docs',
      collectionName: 'proj_project-1_docs',
      topK: 3,
    });

    assert.equal(response.total, 0);
    assert.equal(
      queryPath,
      'http://127.0.0.1:8000/api/v2/tenants/default_tenant/databases/default_database/collections/collection-project/query',
    );
    assert.deepEqual(fetchCalls, [
      'http://127.0.0.1:8000/api/v2/tenants/default_tenant/databases/default_database/collections',
      'https://api.openai.com/v1/embeddings',
      'http://127.0.0.1:8000/api/v2/tenants/default_tenant/databases/default_database/collections/collection-project/query',
    ]);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
