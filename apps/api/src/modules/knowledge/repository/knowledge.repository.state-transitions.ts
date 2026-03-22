import { type WithId } from "mongodb";
import type { KnowledgeRepository } from "../knowledge.repository.js";
import type {
  KnowledgeDocumentRecord,
  KnowledgeNamespaceIndexStateDocument,
} from "../knowledge.types.js";
import type {
  KnowledgeDocumentCompletionPatch,
  KnowledgeDocumentFailurePatch,
  KnowledgeNamespaceStatePatch,
} from "../types/knowledge.repository.types.js";
import { callRepositoryMethodWithFallback } from "../utils/repositoryMethodFallback.js";

export const markKnowledgeDocumentPendingIfRetryable = async (
  repository: KnowledgeRepository,
  documentId: string,
  updatedAt: Date,
): Promise<WithId<KnowledgeDocumentRecord> | null> => {
  return callRepositoryMethodWithFallback(
    repository,
    "markKnowledgeDocumentPendingIfRetryable",
    [documentId, updatedAt],
    async () =>
      repository.updateKnowledgeDocument(documentId, {
        status: "pending",
        errorMessage: null,
        errorMessageKey: null,
        errorMessageParams: null,
        processedAt: null,
        updatedAt,
      }),
  );
};

export const markKnowledgeDocumentPendingForRecovery = async (
  repository: KnowledgeRepository,
  documentId: string,
  updatedAt: Date,
): Promise<WithId<KnowledgeDocumentRecord> | null> => {
  return callRepositoryMethodWithFallback(
    repository,
    "markKnowledgeDocumentPendingForRecovery",
    [documentId, updatedAt],
    async () =>
      repository.updateKnowledgeDocument(documentId, {
        status: "pending",
        errorMessage: null,
        errorMessageKey: null,
        errorMessageParams: null,
        processedAt: null,
        updatedAt,
      }),
  );
};

export const markKnowledgeDocumentProcessingIfPending = async (
  repository: KnowledgeRepository,
  documentId: string,
  updatedAt: Date,
): Promise<WithId<KnowledgeDocumentRecord> | null> => {
  return callRepositoryMethodWithFallback(
    repository,
    "markKnowledgeDocumentProcessingIfPending",
    [documentId, updatedAt],
    async () =>
      repository.updateKnowledgeDocument(documentId, {
        status: "processing",
        errorMessage: null,
        errorMessageKey: null,
        errorMessageParams: null,
        processedAt: null,
        updatedAt,
      }),
  );
};

export const markKnowledgeDocumentCompletedIfProcessing = async (
  repository: KnowledgeRepository,
  documentId: string,
  patch: KnowledgeDocumentCompletionPatch,
): Promise<WithId<KnowledgeDocumentRecord> | null> => {
  return callRepositoryMethodWithFallback(
    repository,
    "markKnowledgeDocumentCompletedIfProcessing",
    [documentId, patch],
    async () =>
      repository.updateKnowledgeDocument(documentId, {
        status: "completed",
        chunkCount: patch.chunkCount,
        embeddingProvider: patch.embeddingProvider,
        embeddingModel: patch.embeddingModel,
        lastIndexedAt: patch.lastIndexedAt,
        errorMessage: null,
        errorMessageKey: null,
        errorMessageParams: null,
        processedAt: patch.processedAt,
        updatedAt: patch.updatedAt,
      }),
  );
};

export const markKnowledgeDocumentFailedIfProcessing = async (
  repository: KnowledgeRepository,
  documentId: string,
  patch: KnowledgeDocumentFailurePatch,
): Promise<WithId<KnowledgeDocumentRecord> | null> => {
  return callRepositoryMethodWithFallback(
    repository,
    "markKnowledgeDocumentFailedIfProcessing",
    [documentId, patch],
    async () =>
      repository.updateKnowledgeDocument(
        documentId,
        {
          status: "failed",
          chunkCount: 0,
          errorMessage: patch.errorMessage,
          errorMessageKey: patch.errorMessageKey,
          errorMessageParams: patch.errorMessageParams,
          processedAt: patch.processedAt,
          updatedAt: patch.updatedAt,
        },
        {
          incrementRetryCount: true,
        },
      ),
  );
};

export const markKnowledgeDocumentFailedIfRecoverable = async (
  repository: KnowledgeRepository,
  documentId: string,
  patch: KnowledgeDocumentFailurePatch,
): Promise<WithId<KnowledgeDocumentRecord> | null> => {
  return callRepositoryMethodWithFallback(
    repository,
    "markKnowledgeDocumentFailedIfRecoverable",
    [documentId, patch],
    async () =>
      repository.updateKnowledgeDocument(
        documentId,
        {
          status: "failed",
          chunkCount: 0,
          errorMessage: patch.errorMessage,
          errorMessageKey: patch.errorMessageKey,
          errorMessageParams: patch.errorMessageParams,
          processedAt: patch.processedAt,
          updatedAt: patch.updatedAt,
        },
        {
          incrementRetryCount: true,
        },
      ),
  );
};

export const markKnowledgeNamespaceRebuildingIfIdle = async (
  repository: KnowledgeRepository,
  namespaceKey: string,
  patch: KnowledgeNamespaceStatePatch,
): Promise<WithId<KnowledgeNamespaceIndexStateDocument> | null> => {
  return callRepositoryMethodWithFallback(
    repository,
    "markKnowledgeNamespaceRebuildingIfIdle",
    [namespaceKey, patch],
    async () => repository.updateKnowledgeNamespaceIndexState(namespaceKey, patch),
  );
};
