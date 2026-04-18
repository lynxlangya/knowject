import assert from 'node:assert/strict';
import test from 'node:test';
import argon2 from 'argon2';
import { ObjectId, type WithId } from 'mongodb';
import type { AppEnv } from '@config/env.js';
import type { SupportedLocale } from './auth.types.js';
import type { AuthRepository } from './auth.repository.js';
import { createAuthService } from './auth.service.js';
import type {
  AuthSessionUser,
  AuthUserDocument,
} from './auth.types.js';

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
      encryptionKey:
        '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
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

const createUserDocument = (
  overrides: Partial<AuthUserDocument> = {},
): WithId<AuthUserDocument> => {
  const now = new Date();
  const document: WithId<AuthUserDocument> = {
    _id: new ObjectId(),
    username: 'langya',
    name: 'Langya',
    passwordHash: 'password-hash',
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };

  return document;
};

type AuthServiceWithPreferences = ReturnType<typeof createAuthService> & {
  updatePreferences: (
    userId: string,
    input: { locale?: SupportedLocale },
  ) => Promise<AuthSessionUser>;
};

test('register initializes locale from provided source', async () => {
  let persistedInput: Record<string, unknown> | undefined;
  const repository = {
    findByUsername: async () => null,
    createUser: async (input: Record<string, unknown>) => {
      persistedInput = input;
      return createUserDocument({
        username: input.username as string,
        name: input.name as string,
        passwordHash: input.passwordHash as string,
        preferences: input.preferences as AuthUserDocument['preferences'],
      });
    },
  } as unknown as AuthRepository;

  const service = createAuthService({
    env: createTestEnv(),
    repository,
  });

  const result = await service.register({
    username: 'langya',
    name: 'Langya',
    password: 'password123',
    locale: 'en',
  });

  assert.equal(result.user.locale, 'en');
  assert.equal(
    (persistedInput?.preferences as AuthUserDocument['preferences'])?.locale,
    'en',
  );
});

test('legacy user first login backfills locale', async () => {
  const env = createTestEnv();
  const passwordHash = await argon2.hash('password123', {
    type: argon2.argon2id,
    memoryCost: env.argon2.memoryCost,
    timeCost: env.argon2.timeCost,
    parallelism: env.argon2.parallelism,
  });
  const user = createUserDocument({
    username: 'legacy',
    name: 'Legacy',
    passwordHash,
    preferences: undefined,
  });
  const updateCalls: Array<{
    userId: string;
    input: { locale: SupportedLocale };
  }> = [];
  const repository = {
    findByUsername: async () => user,
    updatePreferences: async (
      userId: string,
      input: { locale: SupportedLocale },
    ) => {
      updateCalls.push({ userId, input });
      return {
        id: userId,
        username: user.username,
        name: user.name,
        locale: input.locale,
      };
    },
  } as unknown as AuthRepository;

  const service = createAuthService({
    env,
    repository,
  });

  const loginResult = await service.login({
    username: 'legacy',
    password: 'password123',
    locale: 'zh-CN',
  });

  assert.equal(loginResult.user.locale, 'zh-CN');
  assert.equal(updateCalls.length, 1);
  assert.equal(updateCalls[0]?.input.locale, 'zh-CN');
});

test('updatePreferences updates locale', async () => {
  const user = createUserDocument({
    username: 'langya',
    name: 'Langya',
  });
  const updateCalls: Array<{
    userId: string;
    input: { locale: SupportedLocale };
  }> = [];
  const repository = {
    updatePreferences: async (
      userId: string,
      input: { locale: SupportedLocale },
    ) => {
      updateCalls.push({ userId, input });
      return {
        id: userId,
        username: user.username,
        name: user.name,
        locale: input.locale,
      };
    },
  } as unknown as AuthRepository;

  const service = createAuthService({
    env: createTestEnv(),
    repository,
  }) as AuthServiceWithPreferences;

  assert.equal(typeof service.updatePreferences, 'function');

  const updated = {
    user: await service.updatePreferences(user._id.toHexString(), {
      locale: 'en',
    }),
  };

  assert.equal(updated.user.locale, 'en');
  assert.equal(updateCalls.length, 1);
});

test('legacy user login still succeeds when locale backfill persistence fails', async () => {
  const env = createTestEnv();
  const passwordHash = await argon2.hash('password123', {
    type: argon2.argon2id,
    memoryCost: env.argon2.memoryCost,
    timeCost: env.argon2.timeCost,
    parallelism: env.argon2.parallelism,
  });
  const user = createUserDocument({
    username: 'legacy',
    name: 'Legacy',
    passwordHash,
    preferences: undefined,
  });
  const warnings: string[] = [];
  const originalWarn = console.warn;
  console.warn = (message?: unknown, ...args: unknown[]) => {
    warnings.push(
      [message, ...args].filter((value) => value !== undefined).join(' '),
    );
  };

  const repository = {
    findByUsername: async () => user,
    updatePreferences: async () => {
      throw new Error('write failed');
    },
  } as unknown as AuthRepository;

  const service = createAuthService({
    env,
    repository,
  });

  try {
    const loginResult = await service.login({
      username: 'legacy',
      password: 'password123',
      locale: 'zh-CN',
    });

    assert.equal(loginResult.user.locale, 'zh-CN');
    assert.equal(loginResult.user.username, 'legacy');
    assert.equal(typeof loginResult.token, 'string');
    assert.ok(loginResult.token.length > 0);
  } finally {
    console.warn = originalWarn;
  }

  assert.equal(warnings.length, 1);
  assert.match(warnings[0] ?? '', /locale backfill/i);
});

test('searchUsers keeps shared profile shape without locale', async () => {
  const repository = {
    searchProfiles: async () => [
      {
        id: 'user-1',
        username: 'langya',
        name: 'Langya',
        locale: 'zh-CN',
      },
    ],
  } as unknown as AuthRepository;

  const service = createAuthService({
    env: createTestEnv(),
    repository,
  });

  const result = await service.searchUsers({
    query: 'lang',
    limit: 10,
  });

  assert.deepEqual(result.items[0], {
    id: 'user-1',
    username: 'langya',
    name: 'Langya',
  });
  assert.equal('locale' in (result.items[0] ?? {}), false);
});

test('searchUsers returns empty results when query is blank', async () => {
  const repository = {
    searchProfiles: async () => {
      throw new Error('searchProfiles should not be called');
    },
  } as unknown as AuthRepository;

  const service = createAuthService({
    env: createTestEnv(),
    repository,
  });

  const result = await service.searchUsers({
    query: '   ',
    limit: 10,
  });

  assert.equal(result.total, 0);
  assert.deepEqual(result.items, []);
});
