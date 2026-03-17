import assert from 'node:assert/strict';
import test from 'node:test';
import type { AppEnv } from '@config/env.js';
import { AppError } from '@lib/app-error.js';
import { encryptApiKey } from '@lib/crypto.js';
import type { SettingsRepository } from './settings.repository.js';
import { createSettingsService } from './settings.service.js';

const ACTOR = {
  id: 'user-1',
  username: 'langya',
};

const TEST_ENCRYPTION_KEY =
  '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

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

const createRepositoryStub = (): SettingsRepository => {
  return {
    getSettings: async () => null,
    upsertSettings: async () => {
      throw new Error('upsertSettings should not be called for invalid input');
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

test('updateEmbedding accepts zhipu provider and persists encrypted key', async () => {
  let persistedPatch:
    | Parameters<SettingsRepository['upsertSettings']>[0]
    | undefined;

  const repository = {
    getSettings: async () => null,
    upsertSettings: async (patch: Parameters<SettingsRepository['upsertSettings']>[0]) => {
      persistedPatch = patch;

      return {
        singleton: 'default',
        embedding: patch.embedding,
        updatedAt: patch.updatedAt ?? new Date(),
        updatedBy: patch.updatedBy ?? ACTOR.id,
      };
    },
  } as unknown as SettingsRepository;

  const service = createSettingsService({
    env: createTestEnv(),
    repository,
  });

  await withEncryptionKey(async () => {
    const response = await service.updateEmbedding(
      {
        actor: ACTOR,
      },
      {
        provider: 'zhipu',
        baseUrl: 'https://open.bigmodel.cn/api/paas/v4',
        model: 'embedding-3',
        apiKey: 'zhipu-api-key',
      },
    );

    assert.equal(response.embedding.provider, 'zhipu');
    assert.equal(response.embedding.baseUrl, 'https://open.bigmodel.cn/api/paas/v4');
    assert.equal(response.embedding.model, 'embedding-3');
    assert.equal(response.embedding.source, 'database');
    assert.equal(response.embedding.hasKey, true);
    assert.ok(persistedPatch?.embedding);
    assert.equal(persistedPatch?.embedding?.provider, 'zhipu');
    assert.equal(persistedPatch?.embedding?.baseUrl, 'https://open.bigmodel.cn/api/paas/v4');
    assert.equal(persistedPatch?.embedding?.model, 'embedding-3');
    assert.notEqual(persistedPatch?.embedding?.apiKeyEncrypted, 'zhipu-api-key');
    assert.ok(persistedPatch?.embedding?.apiKeyHint);
  });
});

test('updateEmbedding rejects provider switch without a new api key', async () => {
  await withEncryptionKey(async () => {
    const repository = {
      getSettings: async () => ({
        singleton: 'default' as const,
        embedding: {
          provider: 'openai' as const,
          baseUrl: 'https://api.openai.com/v1',
          model: 'text-embedding-3-small',
          apiKeyEncrypted: encryptApiKey('sk-existing-openai'),
          apiKeyHint: '...nAI',
          testedAt: null,
          testStatus: null,
        },
        updatedAt: new Date(),
        updatedBy: ACTOR.id,
      }),
      upsertSettings: async () => {
        throw new Error('upsertSettings should not be called when new key is missing');
      },
    } as unknown as SettingsRepository;

    const service = createSettingsService({
      env: createTestEnv(),
      repository,
    });

    await assert.rejects(
      async () =>
        service.updateEmbedding(
          {
            actor: ACTOR,
          },
          {
            provider: 'zhipu',
            baseUrl: 'https://open.bigmodel.cn/api/paas/v4',
            model: 'embedding-3',
          },
        ),
      (error: unknown) => {
        assert.ok(error instanceof AppError);
        assert.equal(error.statusCode, 400);
        assert.equal(error.code, 'SETTINGS_API_KEY_REENTRY_REQUIRED');
        assert.equal(error.message, '切换 Provider 或 Base URL 后，请重新输入新的 API Key');
        return true;
      },
    );
  });
});

test('updateEmbedding allows model-only change without re-entering api key', async () => {
  await withEncryptionKey(async () => {
    let persistedPatch:
      | Parameters<SettingsRepository['upsertSettings']>[0]
      | undefined;

    const repository = {
      getSettings: async () => ({
        singleton: 'default' as const,
        embedding: {
          provider: 'openai' as const,
          baseUrl: 'https://api.openai.com/v1',
          model: 'text-embedding-3-small',
          apiKeyEncrypted: encryptApiKey('sk-existing-openai'),
          apiKeyHint: '...nAI',
          testedAt: new Date('2026-03-16T00:00:00.000Z'),
          testStatus: 'ok' as const,
        },
        updatedAt: new Date(),
        updatedBy: ACTOR.id,
      }),
      upsertSettings: async (patch: Parameters<SettingsRepository['upsertSettings']>[0]) => {
        persistedPatch = patch;

        return {
          singleton: 'default' as const,
          embedding: patch.embedding,
          updatedAt: patch.updatedAt ?? new Date(),
          updatedBy: patch.updatedBy ?? ACTOR.id,
        };
      },
    } as unknown as SettingsRepository;

    const service = createSettingsService({
      env: createTestEnv(),
      repository,
    });

    const response = await service.updateEmbedding(
      {
        actor: ACTOR,
      },
      {
        model: 'text-embedding-3-large',
      },
    );

    assert.equal(response.embedding.provider, 'openai');
    assert.equal(response.embedding.model, 'text-embedding-3-large');
    assert.equal(persistedPatch?.embedding?.apiKeyHint, '...nAI');
    assert.ok(persistedPatch?.embedding?.apiKeyEncrypted);
  });
});

test('testEmbedding rejects provider switch without a new api key', async () => {
  await withEncryptionKey(async () => {
    const repository = {
      getSettings: async () => ({
        singleton: 'default' as const,
        embedding: {
          provider: 'openai' as const,
          baseUrl: 'https://api.openai.com/v1',
          model: 'text-embedding-3-small',
          apiKeyEncrypted: encryptApiKey('sk-existing-openai'),
          apiKeyHint: '...nAI',
          testedAt: null,
          testStatus: null,
        },
        updatedAt: new Date(),
        updatedBy: ACTOR.id,
      }),
      upsertSettings: async () => {
        throw new Error('upsertSettings should not be called when test preconditions fail');
      },
    } as unknown as SettingsRepository;

    const service = createSettingsService({
      env: createTestEnv(),
      repository,
    });

    await assert.rejects(
      async () =>
        service.testEmbedding(
          {
            actor: ACTOR,
          },
          {
            provider: 'zhipu',
            baseUrl: 'https://open.bigmodel.cn/api/paas/v4',
            model: 'embedding-3',
          },
        ),
      (error: unknown) => {
        assert.ok(error instanceof AppError);
        assert.equal(error.statusCode, 400);
        assert.equal(error.code, 'SETTINGS_API_KEY_REENTRY_REQUIRED');
        assert.equal(error.message, '切换 Provider 或 Base URL 后，请重新输入新的 API Key');
        return true;
      },
    );
  });
});

test('updateIndexing rejects empty supportedTypes', async () => {
  const service = createSettingsService({
    env: createTestEnv(),
    repository: createRepositoryStub(),
  });

  await assert.rejects(
    async () =>
      service.updateIndexing(
        {
          actor: ACTOR,
        },
        {
          chunkSize: 1000,
          chunkOverlap: 200,
          supportedTypes: [],
          indexerTimeoutMs: 30000,
        },
      ),
    (error: unknown) => {
      assert.ok(error instanceof AppError);
      assert.equal(error.statusCode, 400);
      assert.equal(error.code, 'VALIDATION_ERROR');
      assert.equal(error.message, 'supportedTypes 至少需要保留一种文件类型');
      return true;
    },
  );
});

test('testIndexing returns success when indexer diagnostics and Chroma are reachable', async () => {
  const service = createSettingsService({
    env: createTestEnv(),
    repository: createRepositoryStub(),
  });
  const originalFetch = globalThis.fetch;
  const fetchCalls: string[] = [];

  globalThis.fetch = async (input, init) => {
    const url =
      typeof input === 'string'
        ? input
        : input instanceof URL
          ? input.toString()
          : input.url;
    fetchCalls.push(url);

    assert.equal(init?.method, 'GET');

    return new Response(
      JSON.stringify({
        status: 'ok',
        service: 'knowject-indexer-py',
        chunkSize: 1000,
        chunkOverlap: 200,
        supportedFormats: ['md', 'txt'],
        embeddingProvider: 'openai',
        chromaReachable: true,
        errorMessage: null,
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
    const result = await service.testIndexing(
      {
        actor: ACTOR,
      },
      {
        indexerTimeoutMs: 45000,
      },
    );

    assert.equal(result.success, true);
    assert.equal(result.indexerStatus, 'ok');
    assert.equal(result.service, 'knowject-indexer-py');
    assert.deepEqual(result.supportedFormats, ['md', 'txt']);
    assert.equal(result.chromaReachable, true);
    assert.equal(typeof result.latencyMs, 'number');
    assert.equal(result.error, undefined);
    assert.deepEqual(fetchCalls, ['http://127.0.0.1:8001/internal/v1/index/diagnostics']);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('testIndexing reports degraded status when Chroma is unreachable', async () => {
  const service = createSettingsService({
    env: createTestEnv(),
    repository: createRepositoryStub(),
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
        embeddingProvider: 'custom',
        chromaReachable: false,
        errorMessage: 'Chroma 诊断失败: connection refused',
      }),
      {
        status: 200,
        headers: {
          'content-type': 'application/json',
        },
      },
    );

  try {
    const result = await service.testIndexing(
      {
        actor: ACTOR,
      },
      {},
    );

    assert.equal(result.success, false);
    assert.equal(result.indexerStatus, 'degraded');
    assert.equal(result.service, 'knowject-indexer-py');
    assert.equal(result.chromaReachable, false);
    assert.equal(result.error, 'Chroma 诊断失败: connection refused');
  } finally {
    globalThis.fetch = originalFetch;
  }
});
