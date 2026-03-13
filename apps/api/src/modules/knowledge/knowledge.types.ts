import type { ObjectId } from 'mongodb';
import type { AuthenticatedRequestUser } from '@modules/auth/auth.types.js';

export const KNOWLEDGE_SOURCE_TYPES = ['global_docs', 'global_code'] as const;
export type KnowledgeSourceType = (typeof KNOWLEDGE_SOURCE_TYPES)[number];

export const KNOWLEDGE_INDEX_STATUSES = [
  'idle',
  'pending',
  'processing',
  'completed',
  'failed',
] as const;
export type KnowledgeIndexStatus = (typeof KNOWLEDGE_INDEX_STATUSES)[number];

export const KNOWLEDGE_DOCUMENT_STATUSES = [
  'pending',
  'processing',
  'completed',
  'failed',
] as const;
export type KnowledgeDocumentStatus = (typeof KNOWLEDGE_DOCUMENT_STATUSES)[number];

export const KNOWLEDGE_EMBEDDING_PROVIDERS = ['openai'] as const;
export type KnowledgeEmbeddingProvider = (typeof KNOWLEDGE_EMBEDDING_PROVIDERS)[number];

export const KNOWLEDGE_EMBEDDING_MODELS = ['text-embedding-3-small'] as const;
export type KnowledgeEmbeddingModel = (typeof KNOWLEDGE_EMBEDDING_MODELS)[number];

export interface KnowledgeCommandContext {
  actor: AuthenticatedRequestUser;
}

export interface KnowledgeBaseDocument {
  _id?: ObjectId;
  name: string;
  description: string;
  sourceType: KnowledgeSourceType;
  indexStatus: KnowledgeIndexStatus;
  documentCount: number;
  chunkCount: number;
  maintainerId: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface KnowledgeDocumentRecord {
  _id?: ObjectId;
  knowledgeId: string;
  fileName: string;
  mimeType: string;
  storagePath: string;
  status: KnowledgeDocumentStatus;
  chunkCount: number;
  documentVersionHash: string;
  embeddingProvider: KnowledgeEmbeddingProvider;
  embeddingModel: KnowledgeEmbeddingModel;
  lastIndexedAt: Date | null;
  retryCount: number;
  errorMessage: string | null;
  uploadedBy: string;
  uploadedAt: Date;
  processedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface KnowledgeSummaryResponse {
  id: string;
  name: string;
  description: string;
  sourceType: KnowledgeSourceType;
  indexStatus: KnowledgeIndexStatus;
  documentCount: number;
  chunkCount: number;
  maintainerId: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface KnowledgeDocumentResponse {
  id: string;
  knowledgeId: string;
  fileName: string;
  mimeType: string;
  status: KnowledgeDocumentStatus;
  chunkCount: number;
  embeddingProvider: KnowledgeEmbeddingProvider;
  embeddingModel: KnowledgeEmbeddingModel;
  lastIndexedAt: string | null;
  retryCount: number;
  errorMessage: string | null;
  uploadedBy: string;
  uploadedAt: string;
  processedAt: string | null;
  updatedAt: string;
}

export interface KnowledgeDetailResponse extends KnowledgeSummaryResponse {
  documents: KnowledgeDocumentResponse[];
}

export interface KnowledgeListResponse {
  total: number;
  items: KnowledgeSummaryResponse[];
}
