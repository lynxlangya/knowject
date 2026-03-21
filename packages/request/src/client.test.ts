import assert from "node:assert/strict";
import { createServer } from "node:http";
import { once } from "node:events";
import type { IncomingMessage, ServerResponse } from "node:http";
import type { AddressInfo } from "node:net";
import test from "node:test";
import { createHttpClient } from "./client";
import { normalizeLocale } from "./locale";
import { ApiError, unwrapApiData } from "./types";

const withServer = async (
  callback: (baseUrl: string) => Promise<void>,
): Promise<void> => {
  const server = createServer((req: IncomingMessage, res: ServerResponse) => {
    if (req.url === "/profile") {
      res.writeHead(200, {
        "content-type": "application/json",
      });
      res.end(
        JSON.stringify({
          code: "SUCCESS",
          message: "请求成功",
          data: {
            ok: true,
            authorization: req.headers.authorization ?? null,
            requestId: req.headers["x-request-id"] ?? null,
            locale: req.headers["accept-language"] ?? null,
          },
          meta: {
            requestId: "server-request-id",
            timestamp: "2026-03-18T00:00:00.000Z",
          },
        }),
      );
      return;
    }

    if (req.url === "/protected") {
      res.writeHead(401, {
        "content-type": "application/json",
      });
      res.end(
        JSON.stringify({
          code: "TOKEN_EXPIRED",
          message: "登录状态已过期",
          data: null,
          meta: {
            requestId: "req-401",
            timestamp: "2026-03-18T00:00:00.000Z",
            details: {
              action: "reauth",
            },
          },
        }),
      );
      return;
    }

    res.writeHead(404, {
      "content-type": "application/json",
    });
    res.end(
      JSON.stringify({
        code: "NOT_FOUND",
        message: "未找到资源",
        data: null,
        meta: {
          requestId: "req-404",
          timestamp: "2026-03-18T00:00:00.000Z",
        },
      }),
    );
  });

  server.listen(0, "127.0.0.1");
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

test("createHttpClient injects auth token and unwrapApiData returns envelope data", async () => {
  await withServer(async (baseUrl) => {
    const client = createHttpClient({
      baseURL: baseUrl,
      getToken: () => "test-token",
      getLocale: () => "zh-CN",
    });
    const response = await client.get<{
      code: string;
      message: string;
      data: {
        ok: boolean;
        authorization: string | null;
        requestId: string | string[] | null;
        locale: string | string[] | null;
      };
      meta: {
        requestId: string;
        timestamp: string;
      };
    }>("/profile");
    const data = unwrapApiData(response.data);

    assert.equal(data.ok, true);
    assert.equal(data.authorization, "Bearer test-token");
    assert.equal(typeof data.requestId, "string");
    assert.ok((data.requestId as string).length > 0);
    assert.equal(data.locale, "zh-CN");
  });
});

test("createHttpClient normalizes ApiError and triggers unauthorized hook", async () => {
  await withServer(async (baseUrl) => {
    let unauthorizedTriggered = false;
    const client = createHttpClient({
      baseURL: baseUrl,
      onUnauthorized: () => {
        unauthorizedTriggered = true;
      },
    });

    await assert.rejects(
      () => client.get("/protected"),
      (error: unknown) => {
        assert.ok(error instanceof ApiError);
        if (!(error instanceof ApiError)) {
          return false;
        }
        assert.equal(error.status, 401);
        assert.equal(error.code, "TOKEN_EXPIRED");
        assert.equal(error.message, "登录状态已过期");
        assert.deepEqual(error.detail, {
          action: "reauth",
        });
        assert.equal(error.requestId, "req-401");
        return true;
      },
    );

    assert.equal(unauthorizedTriggered, true);
  });
});

test("normalizeLocale maps raw locale values", () => {
  assert.equal(normalizeLocale("zh"), "zh-CN");
  assert.equal(normalizeLocale("en-US"), "en");
  assert.equal(normalizeLocale("fr"), "en");
});
