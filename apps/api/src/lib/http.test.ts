import assert from "node:assert/strict";
import test from "node:test";
import {
  buildApiUrl,
  normalizeIndexerErrorMessage,
  normalizeOpenAiCompatibleErrorMessage,
  parseResponseBody,
} from "./http.js";

test("buildApiUrl normalizes leading and trailing slashes", () => {
  assert.equal(
    buildApiUrl("https://api.example.com/v1", "/chat/completions"),
    "https://api.example.com/v1/chat/completions",
  );
  assert.equal(
    buildApiUrl("https://api.example.com/v1/", "embeddings"),
    "https://api.example.com/v1/embeddings",
  );
});

test("parseResponseBody parses json and falls back to plain text", async () => {
  const jsonResponse = new Response(JSON.stringify({ ok: true }), {
    headers: {
      "content-type": "application/json",
    },
  });
  const textResponse = new Response("plain error");
  const emptyResponse = new Response(null);

  assert.deepEqual(await parseResponseBody(jsonResponse), { ok: true });
  assert.equal(await parseResponseBody(textResponse), "plain error");
  assert.equal(await parseResponseBody(emptyResponse), null);
});

test("normalizeOpenAiCompatibleErrorMessage prefers nested error messages", () => {
  assert.equal(
    normalizeOpenAiCompatibleErrorMessage(
      {
        error: {
          message: "upstream refused request",
        },
      },
      "fallback",
    ),
    "upstream refused request",
  );
  assert.equal(
    normalizeOpenAiCompatibleErrorMessage(
      {
        message: "top-level error",
      },
      "fallback",
    ),
    "top-level error",
  );
  assert.equal(
    normalizeOpenAiCompatibleErrorMessage(null, "fallback"),
    "fallback",
  );
});

test("normalizeIndexerErrorMessage reads indexer payloads and generic errors", () => {
  assert.equal(
    normalizeIndexerErrorMessage(
      {
        errorMessage: "indexer degraded",
      },
      "fallback",
    ),
    "indexer degraded",
  );
  assert.equal(
    normalizeIndexerErrorMessage(new Error("network timeout"), "fallback"),
    "network timeout",
  );
  assert.equal(normalizeIndexerErrorMessage(undefined, "fallback"), "fallback");
});
