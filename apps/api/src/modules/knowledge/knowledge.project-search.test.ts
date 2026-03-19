import assert from "node:assert/strict";
import test from "node:test";
import { ObjectId } from "mongodb";
import type { AppEnv } from "@config/env.js";
import type { SettingsRepository } from "@modules/settings/settings.repository.js";
import type { KnowledgeRepository } from "./knowledge.repository.js";
import type { KnowledgeSearchService } from "./knowledge.search.js";
import {
  mergeKnowledgeSearchHitGroups,
  searchKnowledgeNamespaceDocuments,
} from "./knowledge.project-search.js";
import type { KnowledgeSearchHitResponse } from "./knowledge.types.js";

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
      encryptionKey:
        "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
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

const createHit = (
  overrides: Partial<KnowledgeSearchHitResponse> & {
    knowledgeId: string;
    documentId: string;
    chunkId: string;
  },
): KnowledgeSearchHitResponse => {
  return {
    knowledgeId: overrides.knowledgeId,
    documentId: overrides.documentId,
    chunkId: overrides.chunkId,
    chunkIndex: overrides.chunkIndex ?? 0,
    type: overrides.type ?? "global_docs",
    source: overrides.source ?? "knowledge",
    content: overrides.content ?? "chunk",
    distance: overrides.distance ?? 0,
  };
};

test("mergeKnowledgeSearchHitGroups round-robins across embedding spaces", () => {
  const merged = mergeKnowledgeSearchHitGroups(
    [
      {
        embeddingSpaceKey: "space-a",
        mergePriority: 0,
        items: [
          createHit({
            knowledgeId: "k1",
            documentId: "d1",
            chunkId: "c1",
            distance: 0.1,
          }),
          createHit({
            knowledgeId: "k1",
            documentId: "d1",
            chunkId: "c2",
            distance: 0.2,
          }),
        ],
      },
      {
        embeddingSpaceKey: "space-b",
        mergePriority: 1,
        items: [
          createHit({
            knowledgeId: "k2",
            documentId: "d2",
            chunkId: "c3",
            distance: 0.01,
          }),
          createHit({
            knowledgeId: "k2",
            documentId: "d2",
            chunkId: "c4",
            distance: 0.02,
          }),
        ],
      },
    ],
    4,
  );

  assert.deepEqual(
    merged.map((item) => item.chunkId),
    ["c1", "c3", "c2", "c4"],
  );
});

test("searchKnowledgeNamespaceDocuments filters allowed ids and uses namespace context", async () => {
  let receivedCollectionName: string | null = null;
  let receivedTopK: number | null = null;

  const result = await searchKnowledgeNamespaceDocuments({
    env: createTestEnv(),
    repository: {
      listKnowledgeBasesByNamespace: async () => [
        {
          _id: new ObjectId("507f1f77bcf86cd799439241"),
          name: "项目知识",
          description: "",
          scope: "project",
          projectId: "project-1",
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
      findKnowledgeNamespaceIndexState: async () => ({
        _id: new ObjectId("507f1f77bcf86cd799439242"),
        namespaceKey: "proj_project-1_docs",
        scope: "project",
        projectId: "project-1",
        sourceType: "global_docs",
        activeCollectionName: "proj_project-1_docs__emb_active",
        activeEmbeddingProvider: "openai",
        activeApiKeyEncrypted: null,
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
      }),
    } as unknown as KnowledgeRepository,
    settingsRepository: {
      getSettings: async () => null,
    } as SettingsRepository,
    searchService: {
      ensureCollections: async () => undefined,
      searchDocuments: async (input) => {
        receivedCollectionName = input.collectionName ?? null;
        receivedTopK = input.topK;

        return {
          query: input.query,
          sourceType: input.sourceType,
          total: 3,
          items: [
            createHit({
              knowledgeId: "507f1f77bcf86cd799439241",
              documentId: "d1",
              chunkId: "c1",
              distance: 0.2,
            }),
            createHit({
              knowledgeId: "other-knowledge",
              documentId: "d2",
              chunkId: "c2",
              distance: 0.1,
            }),
            createHit({
              knowledgeId: "507f1f77bcf86cd799439241",
              documentId: "d1",
              chunkId: "c1",
              distance: 0.05,
            }),
          ],
        };
      },
      getDiagnostics: async () => ({
        collection: {
          name: "unused",
          exists: true,
          errorMessage: null,
        },
      }),
      deleteKnowledgeChunks: async () => undefined,
      deleteDocumentChunks: async () => undefined,
      deleteCollection: async () => undefined,
    } as KnowledgeSearchService,
    namespace: {
      scope: "project",
      projectId: "project-1",
      sourceType: "global_docs",
    },
    allowedKnowledgeIds: new Set(["507f1f77bcf86cd799439241"]),
    query: "test query",
    topK: 3,
    mergePriority: 0,
  });

  assert.equal(receivedCollectionName, "proj_project-1_docs__emb_active");
  assert.equal(receivedTopK, 3);
  assert.equal(result?.embeddingSpaceKey, "fingerprint-active");
  assert.deepEqual(
    result?.items.map((item) => [
      item.knowledgeId,
      item.chunkId,
      item.distance,
    ]),
    [["507f1f77bcf86cd799439241", "c1", 0.05]],
  );
});
