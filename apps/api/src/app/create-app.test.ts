import assert from "node:assert/strict";
import { once } from "node:events";
import type { AddressInfo } from "node:net";
import { setTimeout as delay } from "node:timers/promises";
import test from "node:test";
import type { AppEnv } from "@config/env.js";
import type {
  DatabaseHealthSnapshot,
  MongoDatabaseManager,
} from "@db/mongo.js";
import { createApp } from "./create-app.js";

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

const withServer = async (
  callback: (baseUrl: string) => Promise<void>,
): Promise<void> => {
  const mongoHealthSnapshot: DatabaseHealthSnapshot = {
    status: "down",
    state: "error",
    database: "knowject_test",
    host: "127.0.0.1",
    checkedAt: new Date().toISOString(),
    lastError: "Mongo unavailable",
  };
  const mongo = {
    connect: async () => {
      throw new Error("Mongo unavailable");
    },
    getDb: () => {
      throw new Error("Mongo unavailable");
    },
    getHealthSnapshot: async () => mongoHealthSnapshot,
  } as unknown as MongoDatabaseManager;
  const app = createApp({
    env: createTestEnv(),
    mongo,
  });
  const server = app.listen(0, "127.0.0.1");
  await once(server, "listening");

  const address = server.address();

  if (!address || typeof address === "string") {
    server.close();
    throw new Error("Test server failed to bind to an ephemeral port");
  }

  try {
    await callback(`http://127.0.0.1:${(address as AddressInfo).port}`);
  } finally {
    server.close();
    await once(server, "close");
  }
};

test("createApp mounts the root status route and tolerates bootstrap failures", async () => {
  const warnings: string[] = [];
  const originalWarn = console.warn;
  console.warn = (message?: unknown, ...args: unknown[]) => {
    warnings.push(
      [message, ...args].filter((value) => value !== undefined).join(" "),
    );
  };

  try {
    await withServer(async (baseUrl) => {
      const response = await fetch(baseUrl);
      const body = (await response.json()) as {
        code: string;
        message: string;
        data: {
          name: string;
          status: string;
          environment: string;
          docs: string[];
        };
      };

      assert.equal(response.status, 200);
      assert.equal(body.code, "SUCCESS");
      assert.equal(body.data.name, "Knowject Test");
      assert.equal(body.data.status, "running");
      assert.equal(body.data.environment, "test");
      assert.ok(body.data.docs.includes("/api/knowledge/search"));
      assert.ok(body.data.docs.includes("/api/settings"));

      await delay(0);
    });
  } finally {
    console.warn = originalWarn;
  }

  assert.equal(warnings.length, 1);
  assert.match(
    warnings[0] ?? "",
    /\[bootstrap\] failed to initialize knowledge search infrastructure: Mongo unavailable/,
  );
});
