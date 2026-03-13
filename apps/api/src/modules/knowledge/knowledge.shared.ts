import type { WithId } from 'mongodb';
import type {
  KnowledgeBaseDocument,
  KnowledgeDocumentRecord,
  KnowledgeDocumentResponse,
  KnowledgeSummaryResponse,
} from './knowledge.types.js';

export const KNOWLEDGE_COLLECTION_NAME = 'knowledge_bases';
export const KNOWLEDGE_DOCUMENT_COLLECTION_NAME = 'knowledge_documents';

export const toKnowledgeSummaryResponse = (
  knowledge: WithId<KnowledgeBaseDocument>,
): KnowledgeSummaryResponse => {
  return {
    id: knowledge._id.toHexString(),
    name: knowledge.name,
    description: knowledge.description,
    sourceType: knowledge.sourceType,
    indexStatus: knowledge.indexStatus,
    documentCount: knowledge.documentCount,
    chunkCount: knowledge.chunkCount,
    maintainerId: knowledge.maintainerId,
    createdBy: knowledge.createdBy,
    createdAt: knowledge.createdAt.toISOString(),
    updatedAt: knowledge.updatedAt.toISOString(),
  };
};

export const toKnowledgeDocumentResponse = (
  document: WithId<KnowledgeDocumentRecord>,
): KnowledgeDocumentResponse => {
  return {
    id: document._id.toHexString(),
    knowledgeId: document.knowledgeId,
    fileName: document.fileName,
    mimeType: document.mimeType,
    status: document.status,
    chunkCount: document.chunkCount,
    embeddingProvider: document.embeddingProvider,
    embeddingModel: document.embeddingModel,
    lastIndexedAt: document.lastIndexedAt?.toISOString() ?? null,
    retryCount: document.retryCount,
    errorMessage: document.errorMessage,
    uploadedBy: document.uploadedBy,
    uploadedAt: document.uploadedAt.toISOString(),
    processedAt: document.processedAt?.toISOString() ?? null,
    updatedAt: document.updatedAt.toISOString(),
  };
};
