import assert from "node:assert/strict";
import test from "node:test";

test("validateChromaQueryResponse preserves valid chroma payload fields and drops invalid shapes", async () => {
  const moduleExports = (await import(
    "./chroma-response.validator.js"
  ).catch(() => ({}))) as Partial<
    typeof import("./chroma-response.validator.js")
  >;
  const validateChromaQueryResponse =
    moduleExports.validateChromaQueryResponse;

  assert.equal(
    typeof validateChromaQueryResponse,
    "function",
    "validateChromaQueryResponse should be exported",
  );
  if (!validateChromaQueryResponse) {
    assert.fail("validateChromaQueryResponse should be exported");
  }

  const validated = validateChromaQueryResponse({
    ids: [["chunk-1"]],
    documents: [["doc body"]],
    metadatas: [[{ knowledgeId: "knowledge-1", chunkIndex: 2 }]],
    distances: [[0.12]],
    ignored: true,
  });

  assert.deepEqual(validated, {
    ids: [["chunk-1"]],
    documents: [["doc body"]],
    metadatas: [[{ knowledgeId: "knowledge-1", chunkIndex: 2 }]],
    distances: [[0.12]],
  });

  const normalized = validateChromaQueryResponse({
    ids: "bad",
    documents: [["doc body"], "bad"],
    metadatas: [null],
    distances: [[null]],
  });

  assert.deepEqual(normalized, {
    distances: [[null]],
  });
});
