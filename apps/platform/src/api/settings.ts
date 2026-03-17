import { unwrapApiData, type ApiEnvelope } from '@knowject/request';
import { client } from './client';

export type SettingsSource = 'database' | 'environment';
export type SettingsTestStatus = 'ok' | 'failed';
export const SETTINGS_EMBEDDING_PROVIDERS = [
  'openai',
  'aliyun',
  'zhipu',
  'voyage',
  'custom',
] as const;
export const SETTINGS_LLM_PROVIDERS = [
  'openai',
  'anthropic',
  'gemini',
  'aliyun',
  'deepseek',
  'moonshot',
  'zhipu',
  'custom',
] as const;
export type SettingsEmbeddingProvider = (typeof SETTINGS_EMBEDDING_PROVIDERS)[number];
export type SettingsLlmProvider = (typeof SETTINGS_LLM_PROVIDERS)[number];
export type SettingsSupportedType = 'md' | 'txt';

export interface SettingsAiConfigResponse<TProvider extends string> {
  provider: TProvider;
  baseUrl: string;
  model: string;
  apiKeyHint: string;
  hasKey: boolean;
  source: SettingsSource;
  testedAt: string | null;
  testStatus: SettingsTestStatus | null;
}

export interface SettingsIndexingResponse {
  chunkSize: number;
  chunkOverlap: number;
  supportedTypes: string[];
  indexerTimeoutMs: number;
  source: SettingsSource;
}

export interface SettingsWorkspaceResponse {
  name: string;
  description: string;
}

export interface SettingsResponse {
  embedding: SettingsAiConfigResponse<SettingsEmbeddingProvider>;
  llm: SettingsAiConfigResponse<SettingsLlmProvider>;
  indexing: SettingsIndexingResponse;
  workspace: SettingsWorkspaceResponse;
}

export interface UpdateEmbeddingSettingsRequest {
  provider?: SettingsEmbeddingProvider;
  baseUrl?: string;
  model?: string;
  apiKey?: string;
}

export interface UpdateLlmSettingsRequest {
  provider?: SettingsLlmProvider;
  baseUrl?: string;
  model?: string;
  apiKey?: string;
}

export interface UpdateIndexingSettingsRequest {
  chunkSize?: number;
  chunkOverlap?: number;
  supportedTypes?: SettingsSupportedType[];
  indexerTimeoutMs?: number;
}

export interface UpdateWorkspaceSettingsRequest {
  name?: string;
  description?: string;
}

export interface TestSettingsConnectionRequest {
  provider?: string;
  baseUrl?: string;
  model?: string;
  apiKey?: string;
}

export interface SettingsConnectionTestResponse {
  success: boolean;
  latencyMs?: number;
  error?: string;
}

export type SettingsIndexingTestStatus = 'ok' | 'degraded' | 'unreachable';

export interface TestIndexingConnectionRequest {
  indexerTimeoutMs?: number;
}

export interface SettingsIndexingConnectionTestResponse {
  success: boolean;
  indexerStatus: SettingsIndexingTestStatus;
  latencyMs?: number;
  error?: string;
  service: string | null;
  supportedFormats: string[];
  chunkSize: number | null;
  chunkOverlap: number | null;
  embeddingProvider: string | null;
  chromaReachable: boolean | null;
}

export const getSettings = async (): Promise<SettingsResponse> => {
  const response = await client.get<ApiEnvelope<SettingsResponse>>('/settings');
  return unwrapApiData(response.data);
};

export const updateEmbeddingSettings = async (
  payload: UpdateEmbeddingSettingsRequest,
): Promise<SettingsResponse> => {
  const response = await client.patch<ApiEnvelope<SettingsResponse>>(
    '/settings/embedding',
    payload,
  );

  return unwrapApiData(response.data);
};

export const updateLlmSettings = async (
  payload: UpdateLlmSettingsRequest,
): Promise<SettingsResponse> => {
  const response = await client.patch<ApiEnvelope<SettingsResponse>>(
    '/settings/llm',
    payload,
  );

  return unwrapApiData(response.data);
};

export const updateIndexingSettings = async (
  payload: UpdateIndexingSettingsRequest,
): Promise<SettingsResponse> => {
  const response = await client.patch<ApiEnvelope<SettingsResponse>>(
    '/settings/indexing',
    payload,
  );

  return unwrapApiData(response.data);
};

export const updateWorkspaceSettings = async (
  payload: UpdateWorkspaceSettingsRequest,
): Promise<SettingsResponse> => {
  const response = await client.patch<ApiEnvelope<SettingsResponse>>(
    '/settings/workspace',
    payload,
  );

  return unwrapApiData(response.data);
};

export const testEmbeddingSettings = async (
  payload: TestSettingsConnectionRequest,
): Promise<SettingsConnectionTestResponse> => {
  const response = await client.post<ApiEnvelope<SettingsConnectionTestResponse>>(
    '/settings/embedding/test',
    payload,
  );

  return unwrapApiData(response.data);
};

export const testLlmSettings = async (
  payload: TestSettingsConnectionRequest,
): Promise<SettingsConnectionTestResponse> => {
  const response = await client.post<ApiEnvelope<SettingsConnectionTestResponse>>(
    '/settings/llm/test',
    payload,
  );

  return unwrapApiData(response.data);
};

export const testIndexingSettings = async (
  payload: TestIndexingConnectionRequest,
): Promise<SettingsIndexingConnectionTestResponse> => {
  const response = await client.post<ApiEnvelope<SettingsIndexingConnectionTestResponse>>(
    '/settings/indexing/test',
    payload,
  );

  return unwrapApiData(response.data);
};
