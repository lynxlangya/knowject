import type { ObjectId } from 'mongodb';
import type { AuthenticatedRequestUser } from '@modules/auth/auth.types.js';

export const SETTINGS_SINGLETON_ID = 'default';
export const SETTINGS_EMBEDDING_PROVIDERS = ['openai', 'aliyun', 'zhipu', 'voyage', 'custom'] as const;
export const SETTINGS_LLM_PROVIDERS = ['openai', 'aliyun', 'anthropic', 'custom'] as const;
export const SETTINGS_TEST_STATUSES = ['ok', 'failed'] as const;
export const SETTINGS_SOURCES = ['database', 'environment'] as const;
export const SETTINGS_INDEXING_SUPPORTED_TYPES = ['md', 'txt'] as const;

export type SettingsEmbeddingProvider = (typeof SETTINGS_EMBEDDING_PROVIDERS)[number];
export type SettingsLlmProvider = (typeof SETTINGS_LLM_PROVIDERS)[number];
export type SettingsTestStatus = (typeof SETTINGS_TEST_STATUSES)[number];
export type SettingsSource = (typeof SETTINGS_SOURCES)[number];
export type SettingsSupportedType = (typeof SETTINGS_INDEXING_SUPPORTED_TYPES)[number];
export type RuntimeEmbeddingProvider = SettingsEmbeddingProvider | 'local_dev';

export interface SettingsCommandContext {
  actor: AuthenticatedRequestUser;
}

export interface WorkspaceAiConfigDocument<TProvider extends string> {
  provider: TProvider;
  baseUrl: string;
  model: string;
  apiKeyEncrypted: string;
  apiKeyHint: string;
  testedAt: Date | null;
  testStatus: SettingsTestStatus | null;
}

export interface WorkspaceIndexingConfigDocument {
  chunkSize: number;
  chunkOverlap: number;
  supportedTypes: string[];
  indexerTimeoutMs: number;
}

export interface WorkspaceInfoDocument {
  name: string;
  description: string;
}

export interface WorkspaceSettingsDocument {
  _id?: ObjectId;
  singleton: typeof SETTINGS_SINGLETON_ID;
  embedding?: WorkspaceAiConfigDocument<SettingsEmbeddingProvider>;
  llm?: WorkspaceAiConfigDocument<SettingsLlmProvider>;
  indexing?: WorkspaceIndexingConfigDocument;
  workspace?: WorkspaceInfoDocument;
  updatedAt: Date;
  updatedBy: string;
}

export interface EffectiveEmbeddingConfig {
  source: SettingsSource;
  provider: RuntimeEmbeddingProvider;
  apiKey: string | null;
  baseUrl: string;
  model: string;
  requestTimeoutMs: number;
}

export interface EffectiveLlmConfig {
  source: SettingsSource;
  provider: SettingsLlmProvider;
  apiKey: string | null;
  baseUrl: string;
  model: string;
  requestTimeoutMs: number;
}

export interface EffectiveIndexingConfig {
  source: SettingsSource;
  chunkSize: number;
  chunkOverlap: number;
  supportedTypes: string[];
  indexerTimeoutMs: number;
}

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

export interface SettingsEnvelope {
  settings: SettingsResponse;
}

export interface UpdateEmbeddingSettingsInput {
  provider?: unknown;
  baseUrl?: unknown;
  model?: unknown;
  apiKey?: unknown;
}

export interface UpdateLlmSettingsInput {
  provider?: unknown;
  baseUrl?: unknown;
  model?: unknown;
  apiKey?: unknown;
}

export interface UpdateIndexingSettingsInput {
  chunkSize?: unknown;
  chunkOverlap?: unknown;
  supportedTypes?: unknown;
  indexerTimeoutMs?: unknown;
}

export interface UpdateWorkspaceSettingsInput {
  name?: unknown;
  description?: unknown;
}

export interface TestSettingsConnectionInput {
  provider?: unknown;
  baseUrl?: unknown;
  model?: unknown;
  apiKey?: unknown;
}

export interface SettingsConnectionTestResponse {
  success: boolean;
  latencyMs?: number;
  error?: string;
}

export interface EmbeddingConfigOverrideRequest {
  provider?: SettingsEmbeddingProvider;
  apiKey?: string | null;
  baseUrl?: string;
  model?: string;
}

export interface IndexingConfigOverrideRequest {
  chunkSize?: number;
  chunkOverlap?: number;
  supportedTypes?: string[];
  indexerTimeoutMs?: number;
}
