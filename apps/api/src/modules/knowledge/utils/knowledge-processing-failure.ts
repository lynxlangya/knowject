import { normalizeIndexerErrorMessage } from "@lib/http.js";
import {
  adjustKnowledgeSummaryAfterDocumentFailure,
  markKnowledgeDocumentFailedIfRecoverable,
} from "../knowledge.repository.js";
import type { PersistProcessingFailureInput } from "../types/knowledge-index-orchestrator.types.js";

export const persistProcessingFailure = async ({
  repository,
  knowledgeId,
  documentId,
  errorMessage,
  previousChunkCount = 0,
}: PersistProcessingFailureInput): Promise<void> => {
  const failedAt = new Date();

  try {
    const failedDocument = await markKnowledgeDocumentFailedIfRecoverable(
      repository,
      documentId,
      {
        errorMessage,
        updatedAt: failedAt,
        processedAt: failedAt,
      },
    );

    if (failedDocument) {
      await adjustKnowledgeSummaryAfterDocumentFailure(repository, knowledgeId, {
        previousChunkCount,
        updatedAt: failedAt,
      });
    }
  } catch (persistenceError) {
    console.error(
      `[knowledge-indexer] document ${documentId} failure state persistence failed: ${normalizeIndexerErrorMessage(
        persistenceError,
        "MongoDB 状态回写失败",
      )}`,
    );
  }

  console.error(
    `[knowledge-indexer] document ${documentId} processing failed: ${errorMessage}`,
  );
};
