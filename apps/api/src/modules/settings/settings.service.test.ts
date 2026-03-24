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

test('updateLlm accepts chat-completions compatible providers and persists encrypted key', async () => {
  await withEncryptionKey(async () => {
    for (const providerCase of SUPPORTED_LLM_PROVIDER_CASES) {
      let persistedPatch:
        | Parameters<SettingsRepository['upsertSettings']>[0]
        | undefined;

      const repository = {
        getSettings: async () => null,
        upsertSettings: async (
          patch: Parameters<SettingsRepository['upsertSettings']>[0],
        ) => {
          persistedPatch = patch;

          return {
            singleton: 'default' as const,
            llm: patch.llm,
            updatedAt: patch.updatedAt ?? new Date(),
            updatedBy: patch.updatedBy ?? ACTOR.id,
          };
        },
      } as unknown as SettingsRepository;

      const service = createSettingsService({
        env: createTestEnv(),
        repository,
      });

      const response = await service.updateLlm(
        {
          actor: ACTOR,
        },
        {
          provider: providerCase.provider,
          baseUrl: providerCase.baseUrl,
          model: providerCase.model,
          apiKey: `${providerCase.provider}-api-key`,
        },
      );

      assert.equal(response.llm.provider, providerCase.provider);
      assert.equal(response.llm.baseUrl, providerCase.baseUrl);
      assert.equal(response.llm.model, providerCase.model);
      assert.equal(response.llm.source, 'database');
      assert.equal(response.llm.hasKey, true);
      assert.ok(persistedPatch?.llm);
      assert.equal(persistedPatch?.llm?.provider, providerCase.provider);
      assert.equal(persistedPatch?.llm?.baseUrl, providerCase.baseUrl);
      assert.equal(persistedPatch?.llm?.model, providerCase.model);
      assert.notEqual(
        persistedPatch?.llm?.apiKeyEncrypted,
        `${providerCase.provider}-api-key`,
      );
      assert.ok(persistedPatch?.llm?.apiKeyHint);
    }
  });
});

test('updateLlm rejects base URL switch without a new api key', async () => {
  await withEncryptionKey(async () => {
    const repository = {
      getSettings: async () => ({
        singleton: 'default' as const,
        llm: {
          provider: 'openai' as const,
          baseUrl: 'https://api.openai.com/v1',
          model: 'gpt-5.4',
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
        service.updateLlm(
          {
            actor: ACTOR,
          },
          {
            provider: 'openai',
            baseUrl: 'https://openai-proxy.example.com/v1',
            model: 'gpt-5.4',
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

test('testLlm accepts chat-completions compatible providers', async () => {
  await withEncryptionKey(async () => {
    const originalFetch = globalThis.fetch;
    let activeProviderCase:
      | (typeof SUPPORTED_LLM_PROVIDER_CASES)[number]
      | null = null;

    globalThis.fetch = async (input, init) => {
      if (!activeProviderCase) {
        throw new Error('activeProviderCase should not be null');
      }

      const url =
        typeof input === 'string'
          ? input
          : input instanceof URL
            ? input.toString()
            : input.url;
      const body = JSON.parse(String(init?.body ?? '{}')) as {
        model?: string;
        messages?: Array<{ role?: string; content?: string }>;
        max_tokens?: number;
        max_completion_tokens?: number;
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
      assert.equal(body.messages?.[0]?.role, 'user');
      assert.equal(body.messages?.[0]?.content, 'test');
      if (activeProviderCase.provider === 'openai') {
        assert.equal(body.max_completion_tokens, 8);
        assert.equal(body.max_tokens, undefined);
      } else {
        assert.equal(body.max_tokens, 8);
        assert.equal(body.max_completion_tokens, undefined);
      }

      return new Response('{}', {
        status: 200,
        headers: {
          'content-type': 'application/json',
        },
      });
    };

    try {
      for (const providerCase of SUPPORTED_LLM_PROVIDER_CASES) {
        activeProviderCase = providerCase;
        const service = createSettingsService({
          env: createTestEnv(),
          repository: createRepositoryStub(),
        });

        const result = await service.testLlm(
          {
            actor: ACTOR,
          },
          {
            provider: providerCase.provider,
            baseUrl: providerCase.baseUrl,
            model: providerCase.model,
            apiKey: `${providerCase.provider}-api-key`,
          },
        );

        assert.equal(result.success, true);
        assert.equal(typeof result.latencyMs, 'number');
      }
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});

test('updateLlm rejects anthropic until a provider-specific adapter exists', async () => {
  await withEncryptionKey(async () => {
    const service = createSettingsService({
      env: createTestEnv(),
      repository: createRepositoryStub(),
    });

    await assert.rejects(
      () =>
        service.updateLlm(
          {
            actor: ACTOR,
          },
          {
            provider: 'anthropic',
            baseUrl: 'https://api.anthropic.com/v1',
            model: 'claude-sonnet-4-6',
            apiKey: 'anthropic-api-key',
          },
        ),
      (error: unknown) => {
        assert.ok(error instanceof AppError);
        assert.equal(error.statusCode, 400);
        assert.equal(error.message, 'provider 不合法');
        return true;
      },
    );
  });
});

test('testLlm rejects base URL switch without a new api key', async () => {
  await withEncryptionKey(async () => {
    const repository = {
      getSettings: async () => ({
        singleton: 'default' as const,
        llm: {
          provider: 'openai' as const,
          baseUrl: 'https://api.openai.com/v1',
          model: 'gpt-5.4',
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
        service.testLlm(
          {
            actor: ACTOR,
          },
          {
            provider: 'openai',
            baseUrl: 'https://openai-proxy.example.com/v1',
            model: 'gpt-5.4',
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

test('updateIndexing rejects unsupported supportedTypes entry', async () => {
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
          supportedTypes: ['md', 'csv'],
          indexerTimeoutMs: 30000,
        },
      ),
    (error: unknown) => {
      assert.ok(error instanceof AppError);
      assert.equal(error.statusCode, 400);
      assert.equal(error.code, 'VALIDATION_ERROR');
      assert.equal(error.message, 'supportedTypes 只支持 md、txt、pdf、docx、xlsx');
      return true;
    },
  );
});

test('updateIndexing rejects merged chunkSize changes that invalidate existing chunkOverlap', async () => {
  const service = createSettingsService({
    env: createTestEnv(),
    repository: {
      getSettings: async () => ({
        _id: 'settings-1',
        singleton: 'default',
        indexing: {
          chunkSize: 1000,
          chunkOverlap: 400,
          supportedTypes: ['md', 'txt'],
          indexerTimeoutMs: 30000,
        },
        updatedAt: new Date('2026-03-18T00:00:00.000Z'),
        updatedBy: ACTOR.id,
      }),
      upsertSettings: async () => {
        throw new Error('upsertSettings should not be called for invalid merged input');
      },
    } as unknown as SettingsRepository,
  });

  await assert.rejects(
    async () =>
      service.updateIndexing(
        {
          actor: ACTOR,
        },
        {
          chunkSize: 300,
        },
      ),
    (error: unknown) => {
      assert.ok(error instanceof AppError);
      assert.equal(error.statusCode, 400);
      assert.equal(error.code, 'VALIDATION_ERROR');
      assert.equal(error.messageKey, 'validation.chunkOverlap.lessThanChunkSize');
      return true;
    },
  );
});

test('testIndexing returns success when indexer diagnostics and Chroma are reachable', async () => {
  const env = createTestEnv();
  env.knowledge.indexerInternalToken = 'internal-secret';
  const service = createSettingsService({
    env,
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
    assert.equal(
      new Headers(init?.headers).get('authorization'),
      'Bearer internal-secret',
    );

    return new Response(
      JSON.stringify({
        status: 'ok',
        service: 'knowject-indexer-py',
        chunkSize: 1000,
        chunkOverlap: 200,
        supportedFormats: ['md', 'txt', 'pdf', 'docx', 'xlsx'],
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
    assert.deepEqual(result.supportedFormats, ['md', 'txt', 'pdf', 'docx', 'xlsx']);
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
        supportedFormats: ['md', 'txt', 'pdf', 'docx', 'xlsx'],
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
