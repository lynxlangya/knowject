import assert from "node:assert/strict";
import test from "node:test";
import type { AppEnv } from "@config/env.js";

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
      apiKey: "test-key",
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

test("createKnowledgeChromaQueryService queries the explicit collection and maps the search response", async () => {
  const moduleExports = (await import(
    "./knowledge-chroma-query.service.js"
  ).catch(() => ({}))) as Partial<
    typeof import("./knowledge-chroma-query.service.js")
  >;

  assert.equal(
    typeof moduleExports.createKnowledgeChromaQueryService,
    "function",
    "createKnowledgeChromaQueryService should be exported",
  );
  const createKnowledgeChromaQueryService =
    moduleExports.createKnowledgeChromaQueryService;
  if (!createKnowledgeChromaQueryService) {
    assert.fail("createKnowledgeChromaQueryService should be exported");
  }

  const fetchCalls: string[] = [];
  const originalFetch = globalThis.fetch;

  assert.equal(
    typeof createKnowledgeChromaQueryService,
    "function",
    "createKnowledgeChromaQueryService should be exported",
  );

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
        JSON.stringify([{ id: "collection-1", name: "proj_project-1_docs" }]),
        {
          status: 200,
          headers: {
            "content-type": "application/json",
          },
        },
      );
    }

    if (url === "https://api.openai.com/v1/embeddings" && init?.method === "POST") {
      return new Response(
        JSON.stringify({
          data: [{ embedding: [0.1, 0.2, 0.3] }],
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
      url.endsWith("/collections/collection-1/query") &&
      init?.method === "POST"
    ) {
      return new Response(
        JSON.stringify({
          ids: [["chunk-1"]],
          documents: [["hello world"]],
          metadatas: [[{
            knowledgeId: "knowledge-1",
            documentId: "document-1",
            chunkId: "chunk-1",
            chunkIndex: 0,
            source: "demo.md",
          }]],
          distances: [[0.25]],
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
    const service = createKnowledgeChromaQueryService({
      env: createTestEnv(),
    });

    const result = await service.searchDocuments({
      query: "hello",
      sourceType: "global_docs",
      collectionName: "proj_project-1_docs",
      topK: 3,
    });

    assert.deepEqual(result, {
      query: "hello",
      sourceType: "global_docs",
      total: 1,
      items: [
        {
          knowledgeId: "knowledge-1",
          documentId: "document-1",
          chunkId: "chunk-1",
          chunkIndex: 0,
          type: "global_docs",
          source: "demo.md",
          content: "hello world",
          distance: 0.25,
        },
      ],
    });

    assert.deepEqual(fetchCalls, [
      "http://127.0.0.1:8000/api/v2/tenants/default_tenant/databases/default_database/collections",
      "https://api.openai.com/v1/embeddings",
      "http://127.0.0.1:8000/api/v2/tenants/default_tenant/databases/default_database/collections/collection-1/query",
    ]);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
