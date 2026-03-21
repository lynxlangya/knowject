import assert from 'node:assert/strict';
import { once } from 'node:events';
import type { AddressInfo } from 'node:net';
import test from 'node:test';
import express from 'express';
import type { AppEnv } from '@config/env.js';
import { AppError } from '@lib/app-error.js';
import { createRequiredFieldError } from '@lib/validation.js';
import { createErrorHandler } from '@middleware/error-handler.js';
import { notFoundHandler } from '@middleware/not-found.js';
import { requestContextMiddleware } from '@middleware/request-context.js';
import { sendCreated, sendSuccess } from './api-response.js';

const createTestEnv = (exposeDetails: boolean): AppEnv => {
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
      exposeDetails,
      includeStack: false,
    },
  };
};

const createProtocolTestApp = (exposeDetails: boolean) => {
  const app = express();

  app.use(requestContextMiddleware);
  app.use(express.json());

  app.get('/success', (_req, res) => {
    sendSuccess(res, {
      ok: true,
    });
  });

  app.post('/created', (_req, res) => {
    sendCreated(res, {
      id: 'created-id',
    });
  });

  app.delete('/resource', (_req, res) => {
    sendSuccess(res, null);
  });

  app.get('/error', () => {
    throw new AppError({
      statusCode: 400,
      code: 'VALIDATION_ERROR',
      message: '字段校验失败',
      messageKey: 'api.validation.failed',
      details: {
        field: 'name',
      },
    });
  });

  app.get('/required', () => {
    throw new AppError(createRequiredFieldError('username'));
  });

  app.get('/internal-error', () => {
    throw new Error('boom');
  });

  app.post('/echo', (req, res) => {
    sendSuccess(res, req.body as Record<string, unknown>);
  });

  app.use(notFoundHandler);
  app.use(createErrorHandler(createTestEnv(exposeDetails)));

  return app;
};

const withServer = async (
  app: express.Express,
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

test('success responses use ApiEnvelope defaults', async () => {
  await withServer(createProtocolTestApp(true), async (baseUrl) => {
    const response = await fetch(`${baseUrl}/success`, {
      headers: {
        'Accept-Language': 'en',
      },
    });
    const body = (await response.json()) as {
      code: string;
      message: string;
      data: { ok: boolean };
      meta: { requestId: string; timestamp: string; details?: unknown };
    };

    assert.equal(response.status, 200);
    assert.equal(body.code, 'SUCCESS');
    assert.equal(body.message, 'Request succeeded');
    assert.deepEqual(body.data, { ok: true });
    assert.equal(typeof body.meta.requestId, 'string');
    assert.ok(body.meta.requestId.length > 0);
    assert.ok(!Number.isNaN(Date.parse(body.meta.timestamp)));
    assert.equal('details' in body.meta, false);
  });
});

test('created responses use CREATED code and message', async () => {
  await withServer(createProtocolTestApp(true), async (baseUrl) => {
    const response = await fetch(`${baseUrl}/created`, {
      method: 'POST',
      headers: {
        'Accept-Language': 'en',
      },
    });
    const body = (await response.json()) as {
      code: string;
      message: string;
      data: { id: string };
    };

    assert.equal(response.status, 201);
    assert.equal(body.code, 'CREATED');
    assert.equal(body.message, 'Created successfully');
    assert.deepEqual(body.data, { id: 'created-id' });
  });
});

test('delete responses return 200 envelope with null data', async () => {
  await withServer(createProtocolTestApp(true), async (baseUrl) => {
    const response = await fetch(`${baseUrl}/resource`, {
      method: 'DELETE',
      headers: {
        'Accept-Language': 'en',
      },
    });
    const body = (await response.json()) as {
      code: string;
      message: string;
      data: null;
      meta: { requestId: string; timestamp: string };
    };

    assert.equal(response.status, 200);
    assert.equal(body.code, 'SUCCESS');
    assert.equal(body.message, 'Request succeeded');
    assert.equal(body.data, null);
    assert.equal(typeof body.meta.requestId, 'string');
    assert.ok(!Number.isNaN(Date.parse(body.meta.timestamp)));
  });
});

test('error responses expose details when enabled', async () => {
  await withServer(createProtocolTestApp(true), async (baseUrl) => {
    const response = await fetch(`${baseUrl}/error`, {
      headers: {
        'Accept-Language': 'en',
      },
    });
    const body = (await response.json()) as {
      code: string;
      message: string;
      data: null;
      meta: { requestId: string; timestamp: string; details?: unknown };
    };

    assert.equal(response.status, 400);
    assert.equal(body.code, 'VALIDATION_ERROR');
    assert.equal(body.message, 'Validation failed');
    assert.equal(body.data, null);
    assert.deepEqual(body.meta.details, {
      field: 'name',
    });
  });
});

test('error responses omit details when disabled', async () => {
  await withServer(createProtocolTestApp(false), async (baseUrl) => {
    const response = await fetch(`${baseUrl}/error`, {
      headers: {
        'Accept-Language': 'en',
      },
    });
    const body = (await response.json()) as {
      code: string;
      message: string;
      data: null;
      meta: { requestId: string; timestamp: string; details?: unknown };
    };

    assert.equal(response.status, 400);
    assert.equal(body.code, 'VALIDATION_ERROR');
    assert.equal(body.message, 'Validation failed');
    assert.equal(body.data, null);
    assert.equal('details' in body.meta, false);
  });
});

test('required field validation localizes shared messages', async () => {
  await withServer(createProtocolTestApp(true), async (baseUrl) => {
    const response = await fetch(`${baseUrl}/required`, {
      headers: {
        'Accept-Language': 'en',
      },
    });
    const body = (await response.json()) as {
      code: string;
      message: string;
      data: null;
      meta: { requestId: string; timestamp: string; details?: unknown };
    };

    assert.equal(response.status, 400);
    assert.equal(body.code, 'VALIDATION_ERROR');
    assert.equal(body.message, 'Username is required');
    assert.equal(body.data, null);
    assert.deepEqual(body.meta.details, {
      fields: {
        username: 'Username is required',
      },
    });
  });
});

test('internal errors localize the shared 500 envelope message', async () => {
  await withServer(createProtocolTestApp(true), async (baseUrl) => {
    const response = await fetch(`${baseUrl}/internal-error`, {
      headers: {
        'Accept-Language': 'en',
      },
    });
    const body = (await response.json()) as {
      code: string;
      message: string;
      data: null;
      meta: { requestId: string; timestamp: string; details?: unknown };
    };

    assert.equal(response.status, 500);
    assert.equal(body.code, 'INTERNAL_SERVER_ERROR');
    assert.equal(body.message, 'Service temporarily unavailable');
    assert.equal(body.data, null);
  });
});

test('not-found responses localize the shared 404 envelope message', async () => {
  await withServer(createProtocolTestApp(true), async (baseUrl) => {
    const response = await fetch(`${baseUrl}/missing`, {
      headers: {
        'Accept-Language': 'en',
      },
    });
    const body = (await response.json()) as {
      code: string;
      message: string;
      data: null;
      meta: { requestId: string; timestamp: string; details?: unknown };
    };

    assert.equal(response.status, 404);
    assert.equal(body.code, 'NOT_FOUND');
    assert.equal(body.message, 'Requested endpoint does not exist');
    assert.equal(body.data, null);
  });
});

test('invalid JSON is normalized into the shared error envelope', async () => {
  await withServer(createProtocolTestApp(true), async (baseUrl) => {
    const response = await fetch(`${baseUrl}/echo`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept-Language': 'en',
      },
      body: '{"broken":',
    });
    const body = (await response.json()) as {
      code: string;
      message: string;
      data: null;
      meta: { requestId: string; timestamp: string; details?: unknown };
    };

    assert.equal(response.status, 400);
    assert.equal(body.code, 'VALIDATION_ERROR');
    assert.equal(body.message, 'Request body must be valid JSON');
    assert.equal(body.data, null);
    assert.deepEqual(body.meta.details, {
      body: 'Request body must be valid JSON',
    });
    assert.equal(typeof body.meta.requestId, 'string');
    assert.ok(!Number.isNaN(Date.parse(body.meta.timestamp)));
  });
});
