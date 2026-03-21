import type { SupportedLocale } from "@lib/locale.js";
import type { AppEnv } from "@config/env.js";
import type { SettingsRepository } from "@modules/settings/settings.repository.js";
import type { EffectiveEmbeddingConfig } from "@modules/settings/settings.types.js";
import type {
  KnowledgeSearchHitResponse,
  KnowledgeSearchResponse,
  KnowledgeSourceType,
} from "../knowledge.types.js";

export interface ChromaCollectionSummary {
  id: string;
  name: string;
}

export interface SearchDocumentsInput {
  query: string;
  knowledgeId?: string;
  sourceType: KnowledgeSourceType;
  collectionName?: string;
  embeddingConfig?: EffectiveEmbeddingConfig;
  topK: number;
}

export interface SearchDiagnosticsInput {
  collectionName: string;
  locale?: SupportedLocale;
}

export interface KnowledgeSearchDiagnosticsResponse {
  collection: {
    name: string;
    exists: boolean;
    errorMessage: string | null;
  };
}

export interface ChromaQueryResponse {
  ids?: string[][];
  documents?: Array<Array<string | null>> | null;
  metadatas?: Array<Array<Record<string, unknown> | null>> | null;
  distances?: Array<Array<number | null>> | null;
}

export interface ChromaJsonRequestInput {
  path: string;
  method?: "GET" | "POST" | "DELETE";
  body?: Record<string, unknown>;
}

export interface IndexerJsonRequestInput {
  path: string;
  method?: "GET" | "POST";
  body?: Record<string, unknown>;
  failureMessage: string;
}

export interface ChromaCollectionLookupOptions {
  bypassCache?: boolean;
}

export interface KnowledgeSearchServiceDependencies {
  env: AppEnv;
  settingsRepository?: SettingsRepository;
}

export interface KnowledgeChromaCollectionService {
  getCollectionName(sourceType: KnowledgeSourceType): string;
  getExistingCollection(
    name: string,
    options?: ChromaCollectionLookupOptions,
  ): Promise<ChromaCollectionSummary | null>;
  deleteCachedCollection(name: string): void;
  requestChromaJson<T>(input: ChromaJsonRequestInput): Promise<T>;
}

export interface KnowledgeEmbeddingService {
  createEmbeddings(
    texts: string[],
    configOverride?: EffectiveEmbeddingConfig,
  ): Promise<number[][]>;
}

export interface KnowledgeChromaQueryService {
  searchDocuments(input: SearchDocumentsInput): Promise<KnowledgeSearchResponse>;
}

export interface KnowledgeSearchDiagnosticsService {
  getDiagnostics(
    input: SearchDiagnosticsInput,
  ): Promise<KnowledgeSearchDiagnosticsResponse>;
}

export interface KnowledgeChromaMutationService {
  ensureCollections(): Promise<void>;
  deleteKnowledgeChunks(
    knowledgeId: string,
    input: { collectionName: string },
  ): Promise<void>;
  deleteDocumentChunks(
    documentId: string,
    input: { collectionName: string },
  ): Promise<void>;
  deleteCollection(collectionName: string): Promise<void>;
}

export type KnowledgeSearchResultGuard = (
  items: KnowledgeSearchHitResponse[],
) =>
  | KnowledgeSearchHitResponse[]
  | Promise<KnowledgeSearchHitResponse[]>;
