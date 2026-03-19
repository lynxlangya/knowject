import { unwrapApiData, type ApiEnvelope } from "@knowject/request";
import { client } from "./client";

export type KnowledgeSourceType = "global_docs" | "global_code";
export type KnowledgeScope = "global" | "project";
export type KnowledgeIndexStatus =
  | "idle"
  | "pending"
  | "processing"
  | "completed"
  | "failed";
export type KnowledgeDocumentStatus =
  | "pending"
  | "processing"
  | "completed"
  | "failed";
export type KnowledgeEmbeddingProvider = "openai" | "local_dev";
export type KnowledgeEmbeddingModel =
  | "text-embedding-3-small"
  | "hash-1536-dev";

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
    status: "ok" | "degraded";
    service: string | null;
    supportedFormats: string[];
    chunkSize: number | null;
    chunkOverlap: number | null;
    embeddingProvider: string | null;
    chromaReachable: boolean | null;
    errorMessage: string | null;
    expected: {
      supportedFormats: string[];
      chunkSize: number;
      chunkOverlap: number;
      embeddingProvider: string;
    };
  };
  documents: KnowledgeDiagnosticsDocumentResponse[];
}

export interface SearchKnowledgeRequest {
  knowledgeId: string;
  query: string;
  topK?: number;
  limit?: number;
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

export interface CreateKnowledgeRequest {
  name: string;
  description?: string;
  sourceType?: KnowledgeSourceType;
}

export interface UpdateKnowledgeRequest {
  name?: string;
  description?: string;
}

export const listKnowledge = async (): Promise<KnowledgeListResponse> => {
  const response =
    await client.get<ApiEnvelope<KnowledgeListResponse>>("/knowledge");
  return unwrapApiData(response.data);
};

export const listProjectKnowledge = async (
  projectId: string,
): Promise<KnowledgeListResponse> => {
  const response = await client.get<ApiEnvelope<KnowledgeListResponse>>(
    `/projects/${encodeURIComponent(projectId)}/knowledge`,
  );

  return unwrapApiData(response.data);
};

export const getKnowledgeDetail = async (
  knowledgeId: string,
): Promise<KnowledgeDetailEnvelope> => {
  const response = await client.get<ApiEnvelope<KnowledgeDetailEnvelope>>(
    `/knowledge/${encodeURIComponent(knowledgeId)}`,
  );

  return unwrapApiData(response.data);
};

export const createKnowledge = async (
  payload: CreateKnowledgeRequest,
): Promise<KnowledgeMutationResponse> => {
  const response = await client.post<ApiEnvelope<KnowledgeMutationResponse>>(
    "/knowledge",
    payload,
  );

  return unwrapApiData(response.data);
};

export const createProjectKnowledge = async (
  projectId: string,
  payload: CreateKnowledgeRequest,
): Promise<KnowledgeMutationResponse> => {
  const response = await client.post<ApiEnvelope<KnowledgeMutationResponse>>(
    `/projects/${encodeURIComponent(projectId)}/knowledge`,
    payload,
  );

  return unwrapApiData(response.data);
};

export const updateKnowledge = async (
  knowledgeId: string,
  payload: UpdateKnowledgeRequest,
): Promise<KnowledgeMutationResponse> => {
  const response = await client.patch<ApiEnvelope<KnowledgeMutationResponse>>(
    `/knowledge/${encodeURIComponent(knowledgeId)}`,
    payload,
  );

  return unwrapApiData(response.data);
};

export const deleteKnowledge = async (knowledgeId: string): Promise<void> => {
  const response = await client.delete<ApiEnvelope<null>>(
    `/knowledge/${encodeURIComponent(knowledgeId)}`,
  );
  unwrapApiData(response.data);
};

export const uploadKnowledgeDocument = async (
  knowledgeId: string,
  file: File,
): Promise<KnowledgeDocumentUploadResponse> => {
  const formData = new FormData();

  formData.append("file", file);

  const response = await client.post<
    ApiEnvelope<KnowledgeDocumentUploadResponse>
  >(`/knowledge/${encodeURIComponent(knowledgeId)}/documents`, formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });

  return unwrapApiData(response.data);
};

export const uploadProjectKnowledgeDocument = async (
  projectId: string,
  knowledgeId: string,
  file: File,
): Promise<KnowledgeDocumentUploadResponse> => {
  const formData = new FormData();

  formData.append("file", file);

  const response = await client.post<
    ApiEnvelope<KnowledgeDocumentUploadResponse>
  >(
    `/projects/${encodeURIComponent(projectId)}/knowledge/${encodeURIComponent(knowledgeId)}/documents`,
    formData,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    },
  );

  return unwrapApiData(response.data);
};

export const retryKnowledgeDocument = async (
  knowledgeId: string,
  documentId: string,
): Promise<void> => {
  const response = await client.post<ApiEnvelope<null>>(
    `/knowledge/${encodeURIComponent(knowledgeId)}/documents/${encodeURIComponent(documentId)}/retry`,
  );

  unwrapApiData(response.data);
};

export const rebuildKnowledgeDocument = async (
  knowledgeId: string,
  documentId: string,
): Promise<void> => {
  const response = await client.post<ApiEnvelope<null>>(
    `/knowledge/${encodeURIComponent(knowledgeId)}/documents/${encodeURIComponent(documentId)}/rebuild`,
  );

  unwrapApiData(response.data);
};

export const rebuildKnowledge = async (knowledgeId: string): Promise<void> => {
  const response = await client.post<ApiEnvelope<null>>(
    `/knowledge/${encodeURIComponent(knowledgeId)}/rebuild`,
  );

  unwrapApiData(response.data);
};

export const getKnowledgeDiagnostics = async (
  knowledgeId: string,
): Promise<KnowledgeDiagnosticsResponse> => {
  const response = await client.get<ApiEnvelope<KnowledgeDiagnosticsResponse>>(
    `/knowledge/${encodeURIComponent(knowledgeId)}/diagnostics`,
  );

  return unwrapApiData(response.data);
};

export const searchKnowledgeDocuments = async (
  payload: SearchKnowledgeRequest,
): Promise<KnowledgeSearchResponse> => {
  const { limit, topK, ...rest } = payload;
  const response = await client.post<ApiEnvelope<KnowledgeSearchResponse>>(
    "/knowledge/search",
    {
      ...rest,
      ...(topK !== undefined ? { topK } : limit !== undefined ? { topK: limit } : {}),
    },
  );

  return unwrapApiData(response.data);
};

export const deleteKnowledgeDocument = async (
  knowledgeId: string,
  documentId: string,
): Promise<void> => {
  const response = await client.delete<ApiEnvelope<null>>(
    `/knowledge/${encodeURIComponent(knowledgeId)}/documents/${encodeURIComponent(documentId)}`,
  );

  unwrapApiData(response.data);
};
