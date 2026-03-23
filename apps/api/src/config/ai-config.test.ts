import assert from 'node:assert/strict';
import test from 'node:test';
import { ObjectId, type WithId } from 'mongodb';
import type { SettingsRepository } from '@modules/settings/settings.repository.js';
import type { WorkspaceSettingsDocument } from '@modules/settings/settings.types.js';
import type { AppEnv } from './env.js';
import {
  getEffectiveIndexingConfig,
  getSettingsResponseFromDocument,
} from './ai-config.js';

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

const createLegacyDefaultSettings = (): WithId<WorkspaceSettingsDocument> => {
  return {
    _id: new ObjectId('507f1f77bcf86cd799439001'),
    singleton: 'default',
    indexing: {
      chunkSize: 1000,
      chunkOverlap: 200,
      supportedTypes: ['md', 'txt'],
      indexerTimeoutMs: 30000,
    },
    updatedAt: new Date('2026-03-20T00:00:00.000Z'),
    updatedBy: 'user-1',
  };
};

test('getSettingsResponseFromDocument upgrades legacy indexing defaults to multiformat support', () => {
  const response = getSettingsResponseFromDocument(
    createTestEnv(),
    createLegacyDefaultSettings(),
  );

  assert.deepEqual(response.indexing.supportedTypes, [
    'md',
    'txt',
    'pdf',
    'docx',
    'xlsx',
  ]);
});

test('getEffectiveIndexingConfig upgrades legacy indexing defaults to multiformat support', async () => {
  const config = await getEffectiveIndexingConfig({
    env: createTestEnv(),
    repository: {
      getSettings: async () => createLegacyDefaultSettings(),
    } as unknown as SettingsRepository,
  });

  assert.deepEqual(config.supportedTypes, [
    'md',
    'txt',
    'pdf',
    'docx',
    'xlsx',
  ]);
});
