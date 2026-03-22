import assert from 'node:assert/strict';
import { once } from 'node:events';
import type { AddressInfo } from 'node:net';
import test from 'node:test';
import argon2 from 'argon2';
import express, { type RequestHandler } from 'express';
import type { AppEnv } from '@config/env.js';
import { createRequireAuth } from './auth.middleware.js';
import { createAuthService } from './auth.service.js';
import { createValidationAppError } from '@lib/validation.js';
import { requestContextMiddleware } from '@middleware/request-context.js';
import { createErrorHandler } from '@middleware/error-handler.js';
import { createAuthRouter } from './auth.router.js';
import type { AuthRepository } from './auth.repository.js';
import type { AuthService } from './auth.service.js';

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

const withServer = async (
  app: ReturnType<typeof express>,
  callback: (baseUrl: string) => Promise<void>,
): Promise<void> => {
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');

  const address = server.address();

  if (!address || typeof address === 'string') {
    server.close();
    throw new Error('Test server failed to bind to an ephemeral port');
  }

  try {
    await callback(`http://127.0.0.1:${(address as AddressInfo).port}`);
  } finally {
    server.close();
    await once(server, 'close');
  }
};

const createRequireAuthStub = (): RequestHandler => {
  return (req, _res, next) => {
    req.authUser = {
      id: 'user-1',
      username: 'langya',
    };
    next();
  };
};

const createTestApp = (
  authService: AuthService,
  requireAuth: RequestHandler,
): ReturnType<typeof express> => {
  const app = express();
  app.use(express.json());
  app.use(requestContextMiddleware);
  app.use('/api/auth', createAuthRouter(authService, requireAuth));
  app.use(createErrorHandler(createTestEnv()));
  return app;
};

test('PATCH /api/auth/me/preferences persists locale', async () => {
  const authService = {
    updatePreferences: async (_userId: string, input: { locale: string }) => {
      return {
        id: 'user-1',
        username: 'langya',
        name: 'Langya',
        locale: input.locale,
      };
    },
  } as unknown as AuthService;

  const app = createTestApp(authService, createRequireAuthStub());

  await withServer(app, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/auth/me/preferences`, {
      method: 'PATCH',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({ locale: 'zh-CN' }),
    });

    const body = (await response.json()) as {
      code: string;
      data: { user: { locale?: string } };
    };

    assert.equal(response.status, 200);
    assert.equal(body.code, 'SUCCESS');
    assert.equal(body.data.user.locale, 'zh-CN');
  });
});

test('PATCH /api/auth/me/preferences rejects invalid locale', async () => {
  const authService = {
    updatePreferences: async () => {
      throw createValidationAppError('locale 不受支持', {
        locale: 'locale 不受支持',
      });
    },
  } as unknown as AuthService;

  const app = createTestApp(authService, createRequireAuthStub());

  await withServer(app, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/auth/me/preferences`, {
      method: 'PATCH',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({ locale: 'fr' }),
    });

    const body = (await response.json()) as {
      code: string;
    };

    assert.equal(response.status, 400);
    assert.equal(body.code, 'VALIDATION_ERROR');
  });
});

test('POST /api/auth/register localizes username conflict in english', async () => {
  const authService = createAuthService({
    env: createTestEnv(),
    repository: {
      findByUsername: async () => ({
        _id: { toHexString: () => 'user-1' },
      }),
    } as unknown as AuthRepository,
  });
  const app = createTestApp(authService, createRequireAuth(authService));

  await withServer(app, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'Accept-Language': 'en',
      },
      body: JSON.stringify({
        username: 'langya',
        name: 'Langya',
        password: 'password123',
      }),
    });
    const body = (await response.json()) as { message: string; code: string };

    assert.equal(response.status, 409);
    assert.equal(body.code, 'AUTH_USERNAME_CONFLICT');
    assert.equal(body.message, 'Username already exists');
  });
});

test('POST /api/auth/login localizes invalid credentials in english', async () => {
  const env = createTestEnv();
  const passwordHash = await argon2.hash('correct-password', {
    type: argon2.argon2id,
    memoryCost: env.argon2.memoryCost,
    timeCost: env.argon2.timeCost,
    parallelism: env.argon2.parallelism,
  });
  const authService = createAuthService({
    env,
    repository: {
      findByUsername: async () => ({
        _id: { toHexString: () => 'user-1' },
        username: 'langya',
        name: 'Langya',
        passwordHash,
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
    } as unknown as AuthRepository,
  });
  const app = createTestApp(authService, createRequireAuth(authService));

  await withServer(app, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'Accept-Language': 'en',
      },
      body: JSON.stringify({
        username: 'langya',
        password: 'wrong-password',
      }),
    });
    const body = (await response.json()) as { message: string; code: string };

    assert.equal(response.status, 401);
    assert.equal(body.code, 'AUTH_INVALID_CREDENTIALS');
    assert.equal(body.message, 'Invalid username or password');
  });
});

test('PATCH /api/auth/me/preferences localizes invalid locale in english', async () => {
  const authService = createAuthService({
    env: createTestEnv(),
    repository: {} as AuthRepository,
  });
  const app = createTestApp(authService, createRequireAuthStub());

  await withServer(app, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/auth/me/preferences`, {
      method: 'PATCH',
      headers: {
        'content-type': 'application/json',
        'Accept-Language': 'en',
      },
      body: JSON.stringify({ locale: 'fr' }),
    });
    const body = (await response.json()) as { message: string; code: string };

    assert.equal(response.status, 400);
    assert.equal(body.code, 'VALIDATION_ERROR');
    assert.equal(body.message, 'Locale is not supported');
  });
});

test('GET /api/auth/users without bearer token localizes auth error in english', async () => {
  const authService = {
    verifyAccessToken: async () => ({
      id: 'user-1',
      username: 'langya',
    }),
  } as unknown as AuthService;
  const app = createTestApp(authService, createRequireAuth(authService));

  await withServer(app, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/auth/users`, {
      headers: {
        'Accept-Language': 'en',
      },
    });
    const body = (await response.json()) as { message: string; code: string };

    assert.equal(response.status, 401);
    assert.equal(body.code, 'AUTH_TOKEN_INVALID');
    assert.equal(body.message, 'A valid access token is required');
  });
});
