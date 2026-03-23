import type {
  KnowledgeDocumentRecord,
  KnowledgeNamespaceIndexStateDocument,
} from "../knowledge.types.js";

export type KnowledgeDocumentCompletionPatch = Pick<
  KnowledgeDocumentRecord,
  | "chunkCount"
  | "embeddingProvider"
  | "embeddingModel"
  | "lastIndexedAt"
  | "processedAt"
  | "updatedAt"
>;

export type KnowledgeDocumentFailurePatch = Pick<
  KnowledgeDocumentRecord,
  | "errorMessage"
  | "errorMessageKey"
  | "errorMessageParams"
  | "processedAt"
  | "updatedAt"
>;

export type KnowledgeSummaryCompletionPatch = {
  previousChunkCount: number;
  nextChunkCount: number;
  updatedAt: Date;
};

export type KnowledgeSummaryFailurePatch = {
  previousChunkCount: number;
  updatedAt: Date;
};

export type KnowledgeSummaryRemovalPatch = {
  removedChunkCount: number;
  updatedAt: Date;
};

export type KnowledgeNamespaceStatePatch = Partial<
  Omit<
    KnowledgeNamespaceIndexStateDocument,
    "_id" | "namespaceKey" | "scope" | "projectId" | "sourceType"
  >
>;
