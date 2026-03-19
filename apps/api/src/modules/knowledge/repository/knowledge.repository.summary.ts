import { type WithId } from "mongodb";
import type { KnowledgeRepository } from "../knowledge.repository.js";
import type { KnowledgeBaseDocument } from "../knowledge.types.js";
import type {
  KnowledgeSummaryCompletionPatch,
  KnowledgeSummaryFailurePatch,
  KnowledgeSummaryRemovalPatch,
} from "../types/knowledge.repository.types.js";
import { callRepositoryMethodWithFallback } from "../utils/repositoryMethodFallback.js";

export const markKnowledgeSummaryPending = async (
  repository: KnowledgeRepository,
  knowledgeId: string,
  updatedAt: Date,
): Promise<WithId<KnowledgeBaseDocument> | null> => {
  return callRepositoryMethodWithFallback(
    repository,
    "markKnowledgeSummaryPending",
    [knowledgeId, updatedAt],
    async () => repository.syncKnowledgeSummaryFromDocuments(knowledgeId, updatedAt),
  );
};

export const markKnowledgeSummaryProcessing = async (
  repository: KnowledgeRepository,
  knowledgeId: string,
  updatedAt: Date,
): Promise<WithId<KnowledgeBaseDocument> | null> => {
  return callRepositoryMethodWithFallback(
    repository,
    "markKnowledgeSummaryProcessing",
    [knowledgeId, updatedAt],
    async () => repository.syncKnowledgeSummaryFromDocuments(knowledgeId, updatedAt),
  );
};

export const adjustKnowledgeSummaryAfterDocumentCompletion = async (
  repository: KnowledgeRepository,
  knowledgeId: string,
  patch: KnowledgeSummaryCompletionPatch,
): Promise<WithId<KnowledgeBaseDocument> | null> => {
  return callRepositoryMethodWithFallback(
    repository,
    "adjustKnowledgeSummaryAfterDocumentCompletion",
    [knowledgeId, patch],
    async () =>
      repository.syncKnowledgeSummaryFromDocuments(knowledgeId, patch.updatedAt),
  );
};

export const adjustKnowledgeSummaryAfterDocumentFailure = async (
  repository: KnowledgeRepository,
  knowledgeId: string,
  patch: KnowledgeSummaryFailurePatch,
): Promise<WithId<KnowledgeBaseDocument> | null> => {
  return callRepositoryMethodWithFallback(
    repository,
    "adjustKnowledgeSummaryAfterDocumentFailure",
    [knowledgeId, patch],
    async () =>
      repository.syncKnowledgeSummaryFromDocuments(knowledgeId, patch.updatedAt),
  );
};

export const adjustKnowledgeSummaryAfterDocumentRemoval = async (
  repository: KnowledgeRepository,
  knowledgeId: string,
  patch: KnowledgeSummaryRemovalPatch,
): Promise<WithId<KnowledgeBaseDocument> | null> => {
  return callRepositoryMethodWithFallback(
    repository,
    "adjustKnowledgeSummaryAfterDocumentRemoval",
    [knowledgeId, patch],
    async () =>
      repository.syncKnowledgeSummaryFromDocuments(knowledgeId, patch.updatedAt),
  );
};

export const markKnowledgeDocumentsPendingByKnowledgeIds = async (
  repository: KnowledgeRepository,
  knowledgeIds: string[],
  updatedAt: Date,
): Promise<void> => {
  const uniqueKnowledgeIds = Array.from(new Set(knowledgeIds));

  await callRepositoryMethodWithFallback(
    repository,
    "markKnowledgeDocumentsPendingByKnowledgeIds",
    [knowledgeIds, updatedAt],
    async () => {
      await Promise.all(
        uniqueKnowledgeIds.map((knowledgeId) =>
          repository.syncKnowledgeSummaryFromDocuments(knowledgeId, updatedAt),
        ),
      );
    },
  );
};
