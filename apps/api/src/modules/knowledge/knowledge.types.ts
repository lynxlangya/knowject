import type { ObjectId } from 'mongodb';
import type { AuthenticatedRequestUser } from '@modules/auth/auth.types.js';
import type { RuntimeEmbeddingProvider } from '@modules/settings/settings.types.js';

export const KNOWLEDGE_SOURCE_TYPES = ['global_docs', 'global_code'] as const;
export type KnowledgeSourceType = (typeof KNOWLEDGE_SOURCE_TYPES)[number];

export const KNOWLEDGE_SCOPES = ['global', 'project'] as const;
export type KnowledgeScope = (typeof KNOWLEDGE_SCOPES)[number];

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

export const KNOWLEDGE_EMBEDDING_PROVIDERS = [
  'openai',
  'aliyun',
  'zhipu',
  'voyage',
  'custom',
  'local_dev',
] as const;
export type KnowledgeEmbeddingProvider = RuntimeEmbeddingProvider;

export type KnowledgeEmbeddingModel = string;

export interface KnowledgeCommandContext {
  actor: AuthenticatedRequestUser;
}

export interface CreateKnowledgeInput {
  name?: unknown;
  description?: unknown;
  sourceType?: unknown;
}

export interface UpdateKnowledgeInput {
  name?: unknown;
  description?: unknown;
}

export interface UploadedKnowledgeFile {
  originalName: string;
  mimeType: string;
  size: number;
  buffer: Buffer;
}

export interface KnowledgeBaseDocument {
  _id?: ObjectId;
  name: string;
  description: string;
  scope?: KnowledgeScope;
  projectId?: string | null;
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
  scope: KnowledgeScope;
  projectId: string | null;
  sourceType: KnowledgeSourceType;
  indexStatus: KnowledgeIndexStatus;
  documentCount: number;
  chunkCount: number;
  maintainerId: string;
  maintainerName: string | null;
  createdBy: string;
  createdByName: string | null;
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

export interface KnowledgeMutationResponse {
  knowledge: KnowledgeSummaryResponse;
}

export interface KnowledgeDetailEnvelope {
  knowledge: KnowledgeDetailResponse;
}

export interface KnowledgeDocumentUploadResponse {
  knowledge: KnowledgeSummaryResponse;
  document: KnowledgeDocumentResponse;
}

export interface KnowledgeDiagnosticsDocumentResponse {
  id: string;
  status: KnowledgeDocumentStatus;
  fileName: string;
  retryCount: number;
  lastIndexedAt: string | null;
  errorMessage: string | null;
  updatedAt: string;
  missingStorage: boolean;
  staleProcessing: boolean;
}

export interface KnowledgeDiagnosticsResponse {
  knowledgeId: string;
  sourceType: KnowledgeSourceType;
  expectedCollectionName: string;
  indexStatus: KnowledgeIndexStatus;
  documentSummary: {
    total: number;
    pending: number;
    processing: number;
    completed: number;
    failed: number;
    missingStorage: number;
    staleProcessing: number;
  };
  collection: {
    name: string;
    exists: boolean;
    errorMessage: string | null;
  };
  indexer: {
    status: 'ok' | 'degraded';
    service: string | null;
    supportedFormats: string[];
    chunkSize: number | null;
    chunkOverlap: number | null;
    embeddingProvider: string | null;
    chromaReachable: boolean | null;
    errorMessage: string | null;
  };
  documents: KnowledgeDiagnosticsDocumentResponse[];
}

export interface KnowledgeIndexerDocumentRequest {
  knowledgeId: string;
  documentId: string;
  sourceType: KnowledgeSourceType;
  collectionName: string;
  fileName: string;
  mimeType: string;
  storagePath: string;
  documentVersionHash: string;
  embeddingConfig?: {
    provider: RuntimeEmbeddingProvider;
    apiKey: string | null;
    baseUrl: string;
    model: string;
  };
  indexingConfig?: {
    chunkSize: number;
    chunkOverlap: number;
    supportedTypes: string[];
    indexerTimeoutMs: number;
  };
}

export interface KnowledgeIndexerSuccessResponse {
  status: 'completed';
  knowledgeId: string;
  documentId: string;
  chunkCount: number;
  characterCount: number;
  parser: string;
  collectionName: string;
}

export interface KnowledgeIndexerFailureResponse {
  status: 'failed';
  knowledgeId: string;
  documentId: string;
  errorMessage: string;
}

export type KnowledgeIndexerResponse =
  | KnowledgeIndexerSuccessResponse
  | KnowledgeIndexerFailureResponse;

export interface KnowledgeIndexerDiagnosticsResponse {
  status: 'ok' | 'degraded';
  service: string;
  chunkSize: number;
  chunkOverlap: number;
  supportedFormats: string[];
  embeddingProvider: string | null;
  chromaReachable: boolean | null;
  errorMessage: string | null;
}

export interface SearchKnowledgeDocumentsInput {
  query?: unknown;
  knowledgeId?: unknown;
  sourceType?: unknown;
  topK?: unknown;
}

export interface KnowledgeSearchHitResponse {
  knowledgeId: string;
  documentId: string;
  chunkId: string;
  chunkIndex: number;
  type: KnowledgeSourceType;
  source: string;
  content: string;
  distance: number | null;
}

export interface KnowledgeSearchResponse {
  query: string;
  sourceType: KnowledgeSourceType;
  total: number;
  items: KnowledgeSearchHitResponse[];
}
