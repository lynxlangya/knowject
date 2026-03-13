import { client } from './client';

export type KnowledgeSourceType = 'global_docs' | 'global_code';
export type KnowledgeIndexStatus =
  | 'idle'
  | 'pending'
  | 'processing'
  | 'completed'
  | 'failed';
export type KnowledgeDocumentStatus =
  | 'pending'
  | 'processing'
  | 'completed'
  | 'failed';
export type KnowledgeEmbeddingProvider = 'openai';
export type KnowledgeEmbeddingModel = 'text-embedding-3-small';

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
  const response = await client.get<KnowledgeListResponse>('/knowledge');
  return response.data;
};

export const getKnowledgeDetail = async (
  knowledgeId: string,
): Promise<KnowledgeDetailEnvelope> => {
  const response = await client.get<KnowledgeDetailEnvelope>(
    `/knowledge/${encodeURIComponent(knowledgeId)}`,
  );

  return response.data;
};

export const createKnowledge = async (
  payload: CreateKnowledgeRequest,
): Promise<KnowledgeMutationResponse> => {
  const response = await client.post<KnowledgeMutationResponse>(
    '/knowledge',
    payload,
  );

  return response.data;
};

export const updateKnowledge = async (
  knowledgeId: string,
  payload: UpdateKnowledgeRequest,
): Promise<KnowledgeMutationResponse> => {
  const response = await client.patch<KnowledgeMutationResponse>(
    `/knowledge/${encodeURIComponent(knowledgeId)}`,
    payload,
  );

  return response.data;
};

export const deleteKnowledge = async (knowledgeId: string): Promise<void> => {
  await client.delete(`/knowledge/${encodeURIComponent(knowledgeId)}`);
};

export const uploadKnowledgeDocument = async (
  knowledgeId: string,
  file: File,
): Promise<KnowledgeDocumentUploadResponse> => {
  const formData = new FormData();

  formData.append('file', file);

  const response = await client.post<KnowledgeDocumentUploadResponse>(
    `/knowledge/${encodeURIComponent(knowledgeId)}/documents`,
    formData,
    {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    },
  );

  return response.data;
};
