import { client } from './client';

export interface MemoryOverviewResponse {
  projectName: string;
  slogan: string;
  summary: string;
  stats: {
    documents: number;
    codeModules: number;
    designAssets: number;
  };
}

export interface MemoryQueryRequest {
  query: string;
  topK?: number;
}

export interface MemoryItem {
  id: string;
  title: string;
  type: 'document' | 'code' | 'design';
  snippet: string;
  source: string;
  updatedAt: string;
  score: number;
}

export interface MemoryQueryResponse {
  query: string;
  total: number;
  items: MemoryItem[];
}

export const getMemoryOverview = async (): Promise<MemoryOverviewResponse> => {
  const response = await client.get<MemoryOverviewResponse>('/memory/overview');
  return response.data;
};

export const queryMemory = async (
  payload: MemoryQueryRequest
): Promise<MemoryQueryResponse> => {
  const response = await client.post<MemoryQueryResponse>('/memory/query', payload);
  return response.data;
};
