import assert from "node:assert/strict";
import test from "node:test";
import { ObjectId } from "mongodb";
import { toObjectId } from "./mongo-id.js";

test("toObjectId returns ObjectId for valid hex strings", () => {
  const objectId = toObjectId("507f1f77bcf86cd799439011");

  assert.ok(objectId instanceof ObjectId);
  assert.equal(objectId?.toHexString(), "507f1f77bcf86cd799439011");
});

test("toObjectId returns null for invalid values", () => {
  assert.equal(toObjectId("bad-id"), null);
});
