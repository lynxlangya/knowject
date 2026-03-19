import assert from "node:assert/strict";
import test from "node:test";
import { ObjectId } from "mongodb";
import type { AppEnv } from "@config/env.js";
import { encryptApiKey } from "@lib/crypto.js";
import type { SettingsRepository } from "@modules/settings/settings.repository.js";
import {
  buildKnowledgeNamespaceDescriptor,
  resolveActiveEmbeddingConfig,
  resolveNamespaceIndexContext,
} from "./knowledge.namespace.js";
import type { KnowledgeRepository } from "./knowledge.repository.js";

const TEST_ENCRYPTION_KEY =
  "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";

const withEncryptionKey = <T>(callback: () => T): T => {
  const previousKey = process.env.SETTINGS_ENCRYPTION_KEY;
  process.env.SETTINGS_ENCRYPTION_KEY = TEST_ENCRYPTION_KEY;

  try {
    return callback();
  } finally {
    if (previousKey === undefined) {
      delete process.env.SETTINGS_ENCRYPTION_KEY;
    } else {
      process.env.SETTINGS_ENCRYPTION_KEY = previousKey;
    }
  }
};

const createTestEnv = (): AppEnv => {
  return {
    workspaceRoot: "/tmp/knowject-workspace",
    packageRoot: "/tmp/knowject-workspace/apps/api",
    nodeEnv: "test",
    appName: "Knowject Test",
    port: 3100,
    logLevel: "silent",
    corsOrigin: "*",
    mongo: {
      uri: "mongodb://127.0.0.1:27017",
      dbName: "knowject_test",
      host: "127.0.0.1",
    },
    chroma: {
      url: "http://127.0.0.1:8000",
      host: "127.0.0.1",
      heartbeatPath: "/api/v2/heartbeat",
      tenant: "default_tenant",
      database: "default_database",
      requestTimeoutMs: 1000,
    },
    knowledge: {
      storageRoot: "/tmp/knowject-knowledge",
      indexerUrl: "http://127.0.0.1:8001",
      indexerRequestTimeoutMs: 1000,
    },
    skills: {
      storageRoot: "/tmp/knowject-skills",
    },
    openai: {
      apiKey: null,
      baseUrl: "https://api.openai.com/v1",
      embeddingModel: "text-embedding-3-small",
      requestTimeoutMs: 1000,
    },
    settings: {
      encryptionKey: TEST_ENCRYPTION_KEY,
    },
    jwt: {
      secret: "test-secret",
      expiresIn: "1h",
      issuer: "knowject-test",
      audience: "knowject-test",
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

test("buildKnowledgeNamespaceDescriptor returns project namespace metadata", () => {
  const descriptor = buildKnowledgeNamespaceDescriptor({
    scope: "project",
    projectId: "project-1",
    sourceType: "global_docs",
  });

  assert.deepEqual(descriptor, {
    namespaceKey: "proj_project-1_docs",
    scope: "project",
    projectId: "project-1",
    sourceType: "global_docs",
  });
});

test("resolveActiveEmbeddingConfig falls back to active namespace embedding metadata on mismatch", () => {
  const resolved = withEncryptionKey(() =>
    resolveActiveEmbeddingConfig({
      mode: "versioned",
      namespace: {
        namespaceKey: "global_docs",
        scope: "global",
        projectId: null,
        sourceType: "global_docs",
      },
      currentEmbeddingConfig: {
        source: "database",
        provider: "custom",
        apiKey: "current-key",
        baseUrl: "https://embeddings.current/v1",
        model: "text-embedding-current",
        requestTimeoutMs: 1234,
      },
      currentEmbeddingFingerprint: "fingerprint-current",
      namespaceDocumentCount: 1,
      state: {
        _id: new ObjectId("507f1f77bcf86cd799439211"),
        namespaceKey: "global_docs",
        scope: "global",
        projectId: null,
        sourceType: "global_docs",
        activeCollectionName: "global_docs__emb_active",
        activeEmbeddingProvider: "openai",
        activeApiKeyEncrypted: encryptApiKey("active-key"),
        activeEmbeddingBaseUrl: "https://api.openai.com/v1",
        activeEmbeddingModel: "text-embedding-3-small",
        activeEmbeddingFingerprint: "fingerprint-active",
        rebuildStatus: "idle",
        targetCollectionName: null,
        targetEmbeddingProvider: null,
        targetEmbeddingBaseUrl: null,
        targetEmbeddingModel: null,
        targetEmbeddingFingerprint: null,
        lastErrorMessage: null,
        createdAt: new Date("2026-03-18T00:00:00.000Z"),
        updatedAt: new Date("2026-03-18T00:00:00.000Z"),
      },
    }),
  );

  assert.deepEqual(resolved, {
    source: "database",
    provider: "openai",
    apiKey: "active-key",
    baseUrl: "https://api.openai.com/v1",
    model: "text-embedding-3-small",
    requestTimeoutMs: 1234,
  });
});

test("resolveNamespaceIndexContext returns legacy_untracked when namespace has documents but no state", async () => {
  const context = await resolveNamespaceIndexContext({
    env: createTestEnv(),
    repository: {
      listKnowledgeBasesByNamespace: async () => [
        {
          _id: new ObjectId("507f1f77bcf86cd799439221"),
          name: "知识库",
          description: "",
          scope: "global",
          projectId: null,
          sourceType: "global_docs",
          indexStatus: "completed",
          documentCount: 2,
          chunkCount: 4,
          maintainerId: "user-1",
          createdBy: "user-1",
          createdAt: new Date("2026-03-18T00:00:00.000Z"),
          updatedAt: new Date("2026-03-18T00:00:00.000Z"),
        },
      ],
    } as unknown as KnowledgeRepository,
    settingsRepository: {
      getSettings: async () => null,
    } as SettingsRepository,
    knowledge: {
      scope: "global",
      projectId: null,
      sourceType: "global_docs",
    },
  });

  assert.equal(context.mode, "legacy_untracked");
  assert.equal(context.namespace.namespaceKey, "global_docs");
  assert.equal(context.namespaceDocumentCount, 2);
});
