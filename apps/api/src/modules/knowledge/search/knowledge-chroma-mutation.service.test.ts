import assert from "node:assert/strict";
import test from "node:test";
import type { AppEnv } from "@config/env.js";
import { AppError } from "@lib/app-error.js";

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

test("createKnowledgeChromaMutationService falls back to direct Chroma delete when the indexer delete route returns 404", async () => {
  const moduleExports = (await import(
    "./knowledge-chroma-mutation.service.js"
  ).catch(() => ({}))) as Partial<
    typeof import("./knowledge-chroma-mutation.service.js")
  >;

  assert.equal(
    typeof moduleExports.createKnowledgeChromaMutationService,
    "function",
    "createKnowledgeChromaMutationService should be exported",
  );
  const createKnowledgeChromaMutationService =
    moduleExports.createKnowledgeChromaMutationService;
  if (!createKnowledgeChromaMutationService) {
    assert.fail("createKnowledgeChromaMutationService should be exported");
  }

  const fetchCalls: string[] = [];
  const originalFetch = globalThis.fetch;

  assert.equal(
    typeof createKnowledgeChromaMutationService,
    "function",
    "createKnowledgeChromaMutationService should be exported",
  );

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
      url.endsWith("/collections/collection-1/delete") &&
      init?.method === "POST"
    ) {
      return new Response(JSON.stringify({ status: "deleted" }), {
        status: 200,
        headers: {
          "content-type": "application/json",
        },
      });
    }

    throw new Error(`Unexpected fetch: ${init?.method ?? "GET"} ${url}`);
  };

  try {
    const service = createKnowledgeChromaMutationService({
      env: createTestEnv(),
      getExistingCollection: async () => ({
        id: "collection-1",
        name: "global_docs",
      }),
      deleteCachedCollection: () => {},
    });

    await service.deleteDocumentChunks("document-1", {
      collectionName: "global_docs",
    });

    assert.deepEqual(fetchCalls, [
      "http://127.0.0.1:8001/internal/v1/index/documents/document-1/delete",
      "http://127.0.0.1:8000/api/v2/tenants/default_tenant/databases/default_database/collections/collection-1/delete",
    ]);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("createKnowledgeChromaMutationService tags indexer 404 errors with a message key", async () => {
  const { createKnowledgeChromaMutationService } = await import(
    "./knowledge-chroma-mutation.service.js"
  );
  const env = createTestEnv();
  const service = createKnowledgeChromaMutationService({
    env: {
      ...env,
      chroma: {
        ...env.chroma,
        url: null,
      },
    },
  });

  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input, init) => {
    const url =
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.toString()
          : input.url;

    if (
      url === "http://127.0.0.1:8001/internal/v1/index/documents/document-404/delete" &&
      init?.method === "POST"
    ) {
      return new Response(JSON.stringify({ status: "not_found" }), {
        status: 404,
        headers: {
          "content-type": "application/json",
        },
      });
    }

    throw new Error(`Unexpected fetch: ${init?.method ?? "GET"} ${url}`);
  };

  try {
    await assert.rejects(
      () =>
        service.deleteDocumentChunks("document-404", {
          collectionName: "global_docs",
        }),
      (error: unknown) => {
        assert.ok(error instanceof AppError);
        assert.equal(error.code, "KNOWLEDGE_SEARCH_INDEXER_ROUTE_NOT_FOUND");
        assert.equal(
          error.messageKey,
          "knowledge.search.indexer.requestFailed",
        );
        return true;
      },
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});
