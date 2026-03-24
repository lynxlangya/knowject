import assert from "node:assert/strict";
import test from "node:test";
import type { AppEnv } from "@config/env.js";
import { KnowledgeIndexerRequestError, requestKnowledgeIndexer } from "./knowledge-indexer-request.js";

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
      indexerInternalToken: "internal-secret",
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

test("requestKnowledgeIndexer adds a bearer token for internal routes", async () => {
  const originalFetch = globalThis.fetch;
  let authorization = "";

  globalThis.fetch = async (_input, init) => {
    authorization = new Headers(init?.headers).get("authorization") ?? "";

    return new Response(JSON.stringify({ status: "ok" }), {
      status: 200,
      headers: {
        "content-type": "application/json",
      },
    });
  };

  try {
    const result = await requestKnowledgeIndexer({
      env: createTestEnv(),
      path: "/internal/v1/index/diagnostics",
      timeoutMs: 1200,
    });

    assert.equal(authorization, "Bearer internal-secret");
    assert.deepEqual(result.responseBody, { status: "ok" });
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("requestKnowledgeIndexer omits the bearer token for non-internal routes", async () => {
  const originalFetch = globalThis.fetch;
  let authorization = "unset";

  globalThis.fetch = async (_input, init) => {
    authorization = new Headers(init?.headers).get("authorization") ?? "";

    return new Response(JSON.stringify({ status: "ok" }), {
      status: 200,
      headers: {
        "content-type": "application/json",
      },
    });
  };

  try {
    const result = await requestKnowledgeIndexer({
      env: createTestEnv(),
      path: "/health",
      timeoutMs: 1200,
    });

    assert.equal(authorization, "");
    assert.deepEqual(result.responseBody, { status: "ok" });
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("requestKnowledgeIndexer throws a typed error for non-ok responses", async () => {
  const originalFetch = globalThis.fetch;

  globalThis.fetch = async () =>
    new Response(
      JSON.stringify({
        status: "failed",
        errorMessage: "Unauthorized internal request",
      }),
      {
        status: 401,
        headers: {
          "content-type": "application/json",
        },
      },
    );

  try {
    await assert.rejects(
      () =>
        requestKnowledgeIndexer({
          env: createTestEnv(),
          path: "/internal/v1/index/diagnostics",
          timeoutMs: 1200,
        }),
      (error: unknown) => {
        assert.ok(error instanceof KnowledgeIndexerRequestError);
        assert.equal(error.statusCode, 401);
        assert.equal(error.message, "Unauthorized internal request");
        return true;
      },
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});
