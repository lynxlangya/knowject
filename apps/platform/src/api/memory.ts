import {
  unwrapApiData,
  type ApiEnvelope,
} from '@knowject/request';
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
  const response = await client.get<ApiEnvelope<MemoryOverviewResponse>>('/memory/overview');
  return unwrapApiData(response.data);
};

export const queryMemory = async (
  payload: MemoryQueryRequest
): Promise<MemoryQueryResponse> => {
  const response = await client.post<ApiEnvelope<MemoryQueryResponse>>('/memory/query', payload);
  return unwrapApiData(response.data);
};
