import { normalizeIndexerErrorMessage } from "@lib/http.js";
import type { KnowledgeChunkCleanupInput } from "../types/knowledge-index-orchestrator.types.js";

export const cleanupDetachedDocumentChunks = async ({
  searchService,
  documentId,
  collectionName,
}: KnowledgeChunkCleanupInput): Promise<void> => {
  try {
    await searchService.deleteDocumentChunks(documentId, {
      collectionName,
    });
  } catch (cleanupError) {
    console.warn(
      `[knowledge-indexer] orphan chunk cleanup failed for document ${documentId}: ${normalizeIndexerErrorMessage(
        cleanupError,
        "Chroma 文档向量清理失败",
      )}`,
    );
  }
};
