import assert from "node:assert/strict";
import test from "node:test";
import { readMutationInput } from "./mutation-input.js";

test("readMutationInput returns mutation objects as-is", () => {
  assert.deepEqual(readMutationInput({ name: "Knowject" }), {
    name: "Knowject",
  });
});

test("readMutationInput allows undefined when configured", () => {
  assert.deepEqual(readMutationInput(undefined, { allowUndefined: true }), {});
});

test("readMutationInput rejects non-object payloads", () => {
  assert.throws(
    () => readMutationInput("bad input" as never),
    /请求体必须为对象/,
  );
});
