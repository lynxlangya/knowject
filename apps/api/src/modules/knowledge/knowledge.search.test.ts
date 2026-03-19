import assert from "node:assert/strict";
import test from "node:test";
import type { AppEnv } from "@config/env.js";
import { encryptApiKey } from "@lib/crypto.js";
import { createKnowledgeSearchService } from "./knowledge.search.js";

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

test("deleteDocumentChunks falls back to legacy Chroma delete when the indexer route is unavailable", async () => {
  const service = createKnowledgeSearchService({
    env: createTestEnv(),
  });
  const fetchCalls: string[] = [];
  let collectionsRequestCount = 0;

  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input, init) => {
    const url =
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.toString()
          : input.url;
    fetchCalls.push(url);

    if (
      url === "http://127.0.0.1:8001/internal/v1/index/documents/document-1/delete" &&
      init?.method === "POST"
    ) {
      return new Response(
        JSON.stringify({
          status: "not_found",
          message: "Unknown route",
        }),
        {
          status: 404,
          headers: {
            "content-type": "application/json",
          },
        },
      );
    }

    if (url.endsWith("/collections") && init?.method === "GET") {
      collectionsRequestCount += 1;

      return new Response(
        JSON.stringify(
          collectionsRequestCount === 1
            ? [{ id: "collection-1", name: "global_docs" }]
            : [],
        ),
        {
          status: 200,
          headers: {
            "content-type": "application/json",
          },
        },
      );
    }

    if (
      url.endsWith("/collections/collection-1/delete") &&
      init?.method === "POST"
    ) {
      return new Response(JSON.stringify({}), {
        status: 200,
        headers: {
          "content-type": "application/json",
        },
      });
    }

    throw new Error(`Unexpected fetch: ${init?.method ?? "GET"} ${url}`);
  };

  try {
    await service.deleteDocumentChunks("document-1", {
      collectionName: "global_docs",
    });

    const diagnostics = await service.getDiagnostics({
      collectionName: "global_docs",
    });

    assert.equal(diagnostics.collection.exists, false);
    assert.equal(diagnostics.collection.errorMessage, null);
    assert.equal(collectionsRequestCount, 2);
    assert.deepEqual(fetchCalls, [
      "http://127.0.0.1:8001/internal/v1/index/documents/document-1/delete",
      "http://127.0.0.1:8000/api/v2/tenants/default_tenant/databases/default_database/collections",
      "http://127.0.0.1:8000/api/v2/tenants/default_tenant/databases/default_database/collections/collection-1/delete",
      "http://127.0.0.1:8000/api/v2/tenants/default_tenant/databases/default_database/collections",
    ]);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("deleteKnowledgeChunks prefers the indexer delete endpoint when available", async () => {
  const service = createKnowledgeSearchService({
    env: createTestEnv(),
  });
  const fetchCalls: string[] = [];

  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input, init) => {
    const url =
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.toString()
          : input.url;
    fetchCalls.push(url);

    if (
      url === "http://127.0.0.1:8001/internal/v1/index/knowledge/knowledge-1/delete" &&
      init?.method === "POST"
    ) {
      return new Response(
        JSON.stringify({
          status: "completed",
          knowledgeId: "knowledge-1",
          collectionName: "global_docs",
        }),
        {
          status: 200,
          headers: {
            "content-type": "application/json",
          },
        },
      );
    }

    throw new Error(`Unexpected fetch: ${init?.method ?? "GET"} ${url}`);
  };

  try {
    await service.deleteKnowledgeChunks("knowledge-1", {
      collectionName: "global_docs",
    });

    assert.deepEqual(fetchCalls, [
      "http://127.0.0.1:8001/internal/v1/index/knowledge/knowledge-1/delete",
    ]);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("searchDocuments uses explicit collection name override when provided", async () => {
  const service = createKnowledgeSearchService({
    env: {
      ...createTestEnv(),
      openai: {
        ...createTestEnv().openai,
        apiKey: "test-key",
      },
    },
  });
  const fetchCalls: string[] = [];
  let queryPath = "";

  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input, init) => {
    const url =
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.toString()
          : input.url;
    fetchCalls.push(url);

    if (url.endsWith("/collections") && init?.method === "GET") {
      return new Response(
        JSON.stringify([
          { id: "collection-project", name: "proj_project-1_docs" },
        ]),
        {
          status: 200,
          headers: {
            "content-type": "application/json",
          },
        },
      );
    }

    if (
      url === "https://api.openai.com/v1/embeddings" &&
      init?.method === "POST"
    ) {
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
            "content-type": "application/json",
          },
        },
      );
    }

    if (
      url.endsWith("/collections/collection-project/query") &&
      init?.method === "POST"
    ) {
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
            "content-type": "application/json",
          },
        },
      );
    }

    throw new Error(`Unexpected fetch: ${init?.method ?? "GET"} ${url}`);
  };

  try {
    const response = await service.searchDocuments({
      query: "project knowledge",
      knowledgeId: "knowledge-1",
      sourceType: "global_docs",
      collectionName: "proj_project-1_docs",
      topK: 3,
    });

    assert.equal(response.total, 0);
    assert.equal(
      queryPath,
      "http://127.0.0.1:8000/api/v2/tenants/default_tenant/databases/default_database/collections/collection-project/query",
    );
    assert.deepEqual(fetchCalls, [
      "http://127.0.0.1:8000/api/v2/tenants/default_tenant/databases/default_database/collections",
      "https://api.openai.com/v1/embeddings",
      "http://127.0.0.1:8000/api/v2/tenants/default_tenant/databases/default_database/collections/collection-project/query",
    ]);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("searchDocuments prefers database embedding settings when configured", async () => {
  const env = createTestEnv();
  const originalEncryptionKey = process.env.SETTINGS_ENCRYPTION_KEY;
  process.env.SETTINGS_ENCRYPTION_KEY = env.settings.encryptionKey;

  const service = createKnowledgeSearchService({
    env,
    settingsRepository: {
      getSettings: async () => ({
        singleton: "default",
        embedding: {
          provider: "custom",
          baseUrl: "https://embedding.example.com/v1",
          model: "text-embedding-custom",
          apiKeyEncrypted: encryptApiKey("db-embedding-key"),
          apiKeyHint: "...-key",
          testedAt: null,
          testStatus: null,
        },
        updatedAt: new Date("2026-03-16T00:00:00.000Z"),
        updatedBy: "user-1",
      }),
    } as never,
  });
  const fetchCalls: string[] = [];
  let embeddingRequestBody: { model?: unknown } | null = null;
  let embeddingAuthorization = "";

  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input, init) => {
    const url =
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.toString()
          : input.url;
    fetchCalls.push(url);

    if (url.endsWith("/collections") && init?.method === "GET") {
      return new Response(
        JSON.stringify([{ id: "collection-1", name: "global_docs" }]),
        {
          status: 200,
          headers: {
            "content-type": "application/json",
          },
        },
      );
    }

    if (
      url === "https://embedding.example.com/v1/embeddings" &&
      init?.method === "POST"
    ) {
      embeddingRequestBody =
        typeof init.body === "string"
          ? (JSON.parse(init.body) as { model?: unknown })
          : null;
      embeddingAuthorization =
        typeof init.headers === "object" &&
        init.headers !== null &&
        "authorization" in init.headers
          ? String(init.headers.authorization)
          : "";

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
            "content-type": "application/json",
          },
        },
      );
    }

    if (url.endsWith("/collections/collection-1/query") && init?.method === "POST") {
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
            "content-type": "application/json",
          },
        },
      );
    }

    throw new Error(`Unexpected fetch: ${init?.method ?? "GET"} ${url}`);
  };

  try {
    const response = await service.searchDocuments({
      query: "database embedding",
      sourceType: "global_docs",
      topK: 3,
    });

    assert.equal(response.total, 0);
    assert.equal(
      (embeddingRequestBody as { model?: unknown } | null)?.model,
      "text-embedding-custom",
    );
    assert.equal(embeddingAuthorization, "Bearer db-embedding-key");
    assert.deepEqual(fetchCalls, [
      "http://127.0.0.1:8000/api/v2/tenants/default_tenant/databases/default_database/collections",
      "https://embedding.example.com/v1/embeddings",
      "http://127.0.0.1:8000/api/v2/tenants/default_tenant/databases/default_database/collections/collection-1/query",
    ]);
  } finally {
    globalThis.fetch = originalFetch;
    process.env.SETTINGS_ENCRYPTION_KEY = originalEncryptionKey;
  }
});

test("searchDocuments reports provider-aware embedding errors for aliyun", async () => {
  const env = createTestEnv();
  const originalEncryptionKey = process.env.SETTINGS_ENCRYPTION_KEY;
  process.env.SETTINGS_ENCRYPTION_KEY = env.settings.encryptionKey;

  const service = createKnowledgeSearchService({
    env,
    settingsRepository: {
      getSettings: async () => ({
        singleton: "default",
        embedding: {
          provider: "aliyun",
          baseUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1",
          model: "text-embedding-v3",
          apiKeyEncrypted: encryptApiKey("aliyun-embedding-key"),
          apiKeyHint: "...-key",
          testedAt: null,
          testStatus: null,
        },
        updatedAt: new Date("2026-03-16T00:00:00.000Z"),
        updatedBy: "user-1",
      }),
    } as never,
  });

  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input, init) => {
    const url =
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.toString()
          : input.url;

    if (url.endsWith("/collections") && init?.method === "GET") {
      return new Response(
        JSON.stringify([{ id: "collection-1", name: "global_docs" }]),
        {
          status: 200,
          headers: {
            "content-type": "application/json",
          },
        },
      );
    }

    if (
      url === "https://dashscope.aliyuncs.com/compatible-mode/v1/embeddings" &&
      init?.method === "POST"
    ) {
      return new Response("", { status: 400 });
    }

    throw new Error(`Unexpected fetch: ${init?.method ?? "GET"} ${url}`);
  };

  try {
    await assert.rejects(
      service.searchDocuments({
        query: "database embedding",
        sourceType: "global_docs",
        topK: 3,
      }),
      (error: unknown) => {
        assert.ok(error instanceof Error);
        assert.equal(error.message, "阿里云 embedding 请求失败（HTTP 400）");
        return true;
      },
    );
  } finally {
    globalThis.fetch = originalFetch;
    process.env.SETTINGS_ENCRYPTION_KEY = originalEncryptionKey;
  }
});

test("searchDocuments falls back to local development embedding in development without api key", async () => {
  const service = createKnowledgeSearchService({
    env: {
      ...createTestEnv(),
      nodeEnv: "development",
    },
  });
  const fetchCalls: string[] = [];
  let queryBody: { query_embeddings?: unknown } | null = null;

  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input, init) => {
    const url =
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.toString()
          : input.url;
    fetchCalls.push(url);

    if (url.endsWith("/collections") && init?.method === "GET") {
      return new Response(
        JSON.stringify([{ id: "collection-dev", name: "global_docs" }]),
        {
          status: 200,
          headers: {
            "content-type": "application/json",
          },
        },
      );
    }

    if (
      url.endsWith("/collections/collection-dev/query") &&
      init?.method === "POST"
    ) {
      queryBody =
        typeof init.body === "string"
          ? (JSON.parse(init.body) as { query_embeddings?: unknown })
          : null;

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
            "content-type": "application/json",
          },
        },
      );
    }

    throw new Error(`Unexpected fetch: ${init?.method ?? "GET"} ${url}`);
  };

  try {
    const response = await service.searchDocuments({
      query: "project knowledge",
      knowledgeId: "knowledge-1",
      sourceType: "global_docs",
      topK: 5,
    });

    assert.equal(response.total, 0);
    if (!queryBody) {
      throw new Error("Expected query body to be captured");
    }
    const queryEmbeddings = (queryBody as { query_embeddings?: unknown })
      .query_embeddings;
    assert.ok(Array.isArray(queryEmbeddings));
    assert.equal(queryEmbeddings.length, 1);
    assert.ok(Array.isArray(queryEmbeddings[0]));
    assert.equal(queryEmbeddings[0].length, 1536);
    assert.ok(
      queryEmbeddings[0].some(
        (value: unknown) => typeof value === "number" && value !== 0,
      ),
    );
    assert.deepEqual(fetchCalls, [
      "http://127.0.0.1:8000/api/v2/tenants/default_tenant/databases/default_database/collections",
      "http://127.0.0.1:8000/api/v2/tenants/default_tenant/databases/default_database/collections/collection-dev/query",
    ]);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
