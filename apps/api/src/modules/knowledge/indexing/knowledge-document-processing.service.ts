import type { WithId } from "mongodb";
import { normalizeIndexerErrorMessage } from "@lib/http.js";
import { callKnowledgeIndexer } from "../adapters/knowledge-indexer-client.js";
import {
  adjustKnowledgeSummaryAfterDocumentCompletion,
  markKnowledgeDocumentCompletedIfProcessing,
  markKnowledgeDocumentProcessingIfPending,
  markKnowledgeSummaryProcessing,
} from "../knowledge.repository.js";
import type { KnowledgeDocumentRecord } from "../knowledge.types.js";
import type { QueueKnowledgeDocumentProcessingInput } from "../types/knowledge-index-orchestrator.types.js";
import { cleanupDetachedDocumentChunks } from "../utils/knowledge-chunk-cleanup.js";
import { persistProcessingFailure } from "../utils/knowledge-processing-failure.js";

export const processUploadedDocument = async ({
  env,
  repository,
  searchService,
  settingsRepository,
  knowledgeId,
  documentId,
  storagePath,
  fileName,
  mimeType,
  sourceType,
  collectionName,
  documentVersionHash,
  embeddingConfig,
  indexingConfig,
  embeddingMetadata,
  mode = "index",
}: QueueKnowledgeDocumentProcessingInput): Promise<void> => {
  let processingDocument: WithId<KnowledgeDocumentRecord> | null = null;

  try {
    const processingAt = new Date();
    processingDocument = await markKnowledgeDocumentProcessingIfPending(
      repository,
      documentId,
      processingAt,
    );

    if (!processingDocument) {
      return;
    }

    await markKnowledgeSummaryProcessing(repository, knowledgeId, processingAt);

    const result = await callKnowledgeIndexer({
      env,
      settingsRepository,
      payload: {
        knowledgeId,
        documentId,
        sourceType,
        collectionName,
        fileName,
        mimeType,
        storagePath,
        documentVersionHash,
      },
      mode,
      embeddingConfig,
      indexingConfig,
    });

    if (result.status === "failed") {
      throw new Error(result.errorMessage);
    }

    const completedAt = new Date();
    const completedDocument = await markKnowledgeDocumentCompletedIfProcessing(
      repository,
      documentId,
      {
        chunkCount: result.chunkCount,
        embeddingProvider: embeddingMetadata.embeddingProvider,
        embeddingModel: embeddingMetadata.embeddingModel,
        lastIndexedAt: completedAt,
        processedAt: completedAt,
        updatedAt: completedAt,
      },
    );

    if (!completedDocument) {
      const latestDocument = await repository.findKnowledgeDocumentById(
        documentId,
      );
      if (latestDocument) {
        return;
      }

      await cleanupDetachedDocumentChunks({
        searchService,
        documentId,
        collectionName,
      });
      return;
    }

    await adjustKnowledgeSummaryAfterDocumentCompletion(repository, knowledgeId, {
      previousChunkCount: processingDocument.chunkCount,
      nextChunkCount: result.chunkCount,
      updatedAt: completedAt,
    });
  } catch (error) {
    await persistProcessingFailure({
      repository,
      knowledgeId,
      documentId,
      errorMessage: normalizeIndexerErrorMessage(error),
      previousChunkCount: processingDocument?.chunkCount ?? 0,
    });
  }
};
