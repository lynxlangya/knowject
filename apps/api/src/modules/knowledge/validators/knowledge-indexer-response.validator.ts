import type { KnowledgeIndexerResponse } from "../knowledge.types.js";

export const isKnowledgeIndexerResponse = (
  value: unknown,
): value is KnowledgeIndexerResponse => {
  if (!value || typeof value !== "object" || !("status" in value)) {
    return false;
  }

  return value.status === "completed" || value.status === "failed";
};

export const assertKnowledgeIndexerResponse = (
  value: unknown,
): KnowledgeIndexerResponse => {
  if (!isKnowledgeIndexerResponse(value)) {
    throw new Error("Python indexer 返回了无法识别的响应");
  }

  return value;
};
