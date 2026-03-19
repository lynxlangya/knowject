import type { AppEnv } from "@config/env.js";
import type { SettingsRepository } from "@modules/settings/settings.repository.js";
import type {
  EffectiveEmbeddingConfig,
  EffectiveIndexingConfig,
} from "@modules/settings/settings.types.js";
import type { WithId } from "mongodb";
import type { ResolvedNamespaceIndexContext } from "../knowledge.namespace.js";
import type { KnowledgeRepository } from "../knowledge.repository.js";
import type { KnowledgeSearchService } from "../knowledge.search.js";
import type {
  KnowledgeDocumentRecord,
  KnowledgeIndexerDocumentRequest,
  KnowledgeSourceType,
} from "../knowledge.types.js";

export interface KnowledgeEmbeddingMetadata {
  embeddingProvider: KnowledgeDocumentRecord["embeddingProvider"];
  embeddingModel: KnowledgeDocumentRecord["embeddingModel"];
}

export interface QueueKnowledgeDocumentProcessingInput {
  env: AppEnv;
  repository: KnowledgeRepository;
  searchService: KnowledgeSearchService;
  settingsRepository: SettingsRepository;
  knowledgeId: string;
  documentId: string;
  storagePath: string;
  fileName: string;
  mimeType: string;
  sourceType: KnowledgeSourceType;
  collectionName: string;
  documentVersionHash: string;
  embeddingConfig: EffectiveEmbeddingConfig;
  indexingConfig: EffectiveIndexingConfig;
  embeddingMetadata: KnowledgeEmbeddingMetadata;
  mode?: KnowledgeIndexerMode;
}

export interface QueueExistingKnowledgeDocumentInput {
  env: AppEnv;
  repository: KnowledgeRepository;
  searchService: KnowledgeSearchService;
  settingsRepository: SettingsRepository;
  knowledgeId: string;
  document: WithId<KnowledgeDocumentRecord>;
  sourceType: KnowledgeSourceType;
  collectionName: string;
  embeddingConfig: EffectiveEmbeddingConfig;
  indexingConfig: EffectiveIndexingConfig;
  embeddingMetadata: KnowledgeEmbeddingMetadata;
  mode: KnowledgeIndexerMode;
  createKnowledgeDocumentNotFoundError: () => Error;
  createKnowledgeDocumentConflictError?: () => Error;
}

export interface QueueRecoverableKnowledgeDocumentInput {
  env: AppEnv;
  repository: KnowledgeRepository;
  searchService: KnowledgeSearchService;
  settingsRepository: SettingsRepository;
  knowledgeId: string;
  document: WithId<KnowledgeDocumentRecord>;
  sourceType: KnowledgeSourceType;
  collectionName: string;
  embeddingConfig: EffectiveEmbeddingConfig;
  indexingConfig: EffectiveIndexingConfig;
  embeddingMetadata: KnowledgeEmbeddingMetadata;
}

export interface PersistProcessingFailureInput {
  repository: KnowledgeRepository;
  knowledgeId: string;
  documentId: string;
  errorMessage: string;
  previousChunkCount?: number;
}

export interface KnowledgeChunkCleanupInput {
  searchService: KnowledgeSearchService;
  documentId: string;
  collectionName: string;
}

export interface CallKnowledgeIndexerInput {
  env: AppEnv;
  settingsRepository: SettingsRepository;
  payload: KnowledgeIndexerDocumentRequest;
  mode?: KnowledgeIndexerMode;
  embeddingConfig?: EffectiveEmbeddingConfig;
  indexingConfig?: EffectiveIndexingConfig;
}

export interface MarkNamespaceDocumentsPendingInput {
  repository: KnowledgeRepository;
  documents: WithId<KnowledgeDocumentRecord>[];
}

export interface RunNamespaceRebuildInput {
  env: AppEnv;
  repository: KnowledgeRepository;
  searchService: KnowledgeSearchService;
  settingsRepository: SettingsRepository;
  namespaceContext: ResolvedNamespaceIndexContext;
  documents: WithId<KnowledgeDocumentRecord>[];
}

export type QueueNamespaceRebuildInput = RunNamespaceRebuildInput;

export type KnowledgeIndexerMode = "index" | "rebuild";
