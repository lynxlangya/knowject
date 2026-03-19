import {
  isDistanceMatrix,
  isDocumentMatrix,
  isMetadataMatrix,
  isStringMatrix,
} from "../schema/chroma-response.schema.js";
import type { ChromaQueryResponse } from "../types/knowledge.search.types.js";

export const validateChromaQueryResponse = (
  value: unknown,
): ChromaQueryResponse => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  const candidate = value as Record<string, unknown>;
  const response: ChromaQueryResponse = {};

  if (isStringMatrix(candidate.ids)) {
    response.ids = candidate.ids;
  }

  if (candidate.documents === null || isDocumentMatrix(candidate.documents)) {
    response.documents = candidate.documents;
  }

  if (candidate.metadatas === null || isMetadataMatrix(candidate.metadatas)) {
    response.metadatas = candidate.metadatas;
  }

  if (candidate.distances === null || isDistanceMatrix(candidate.distances)) {
    response.distances = candidate.distances;
  }

  return response;
};
