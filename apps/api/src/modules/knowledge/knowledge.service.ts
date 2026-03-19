import type { AppEnv } from "@config/env.js";
import type { AuthRepository } from "@modules/auth/auth.repository.js";
import type { ProjectsRepository } from "@modules/projects/projects.repository.js";
import type { SettingsRepository } from "@modules/settings/settings.repository.js";
import { recoverInterruptedKnowledgeTasks } from "./knowledge.recovery.js";
import type { KnowledgeRepository } from "./knowledge.repository.js";
import type { KnowledgeSearchService } from "./knowledge.search.js";
import { createKnowledgeCatalogHandlers } from "./knowledge.service.catalog.js";
import { createKnowledgeDiagnosticsHandlers } from "./knowledge.service.diagnostics.js";
import { createKnowledgeDocumentHandlers } from "./knowledge.service.documents.js";
import {
  createLegacyNamespaceRebuildRequiredError,
  createNamespaceRebuildRequiredError,
  NOOP_PROJECTS_REPOSITORY,
  NOOP_SETTINGS_REPOSITORY,
} from "./knowledge.service.helpers.js";
import { createKnowledgeReadHandlers } from "./knowledge.service.read.js";
import { createKnowledgeRebuildHandlers } from "./knowledge.service.rebuild.js";
import type {
  CreateKnowledgeInput,
  KnowledgeCommandContext,
  KnowledgeDetailEnvelope,
  KnowledgeDiagnosticsResponse,
  KnowledgeDocumentUploadResponse,
  KnowledgeListResponse,
  KnowledgeMutationResponse,
  KnowledgeSearchResponse,
  SearchKnowledgeDocumentsInput,
  SearchProjectKnowledgeDocumentsInput,
  UpdateKnowledgeInput,
  UploadedKnowledgeFile,
} from "./knowledge.types.js";

export interface KnowledgeService {
  initializeSearchInfrastructure(): Promise<void>;
  listKnowledge(
    context: KnowledgeCommandContext,
  ): Promise<KnowledgeListResponse>;
  listProjectKnowledge(
    context: KnowledgeCommandContext,
    projectId: string,
  ): Promise<KnowledgeListResponse>;
  getKnowledgeDetail(
    context: KnowledgeCommandContext,
    knowledgeId: string,
  ): Promise<KnowledgeDetailEnvelope>;
  getProjectKnowledgeDetail(
    context: KnowledgeCommandContext,
    projectId: string,
    knowledgeId: string,
  ): Promise<KnowledgeDetailEnvelope>;
  createKnowledge(
    context: KnowledgeCommandContext,
    input: CreateKnowledgeInput,
  ): Promise<KnowledgeMutationResponse>;
  createProjectKnowledge(
    context: KnowledgeCommandContext,
    projectId: string,
    input: CreateKnowledgeInput,
  ): Promise<KnowledgeMutationResponse>;
  updateKnowledge(
    context: KnowledgeCommandContext,
    knowledgeId: string,
    input: UpdateKnowledgeInput,
  ): Promise<KnowledgeMutationResponse>;
  deleteKnowledge(
    context: KnowledgeCommandContext,
    knowledgeId: string,
  ): Promise<void>;
  deleteDocument(
    context: KnowledgeCommandContext,
    knowledgeId: string,
    documentId: string,
  ): Promise<void>;
  uploadDocument(
    context: KnowledgeCommandContext,
    knowledgeId: string,
    file: UploadedKnowledgeFile,
  ): Promise<KnowledgeDocumentUploadResponse>;
  uploadProjectKnowledgeDocument(
    context: KnowledgeCommandContext,
    projectId: string,
    knowledgeId: string,
    file: UploadedKnowledgeFile,
  ): Promise<KnowledgeDocumentUploadResponse>;
  retryDocument(
    context: KnowledgeCommandContext,
    knowledgeId: string,
    documentId: string,
  ): Promise<void>;
  rebuildDocument(
    context: KnowledgeCommandContext,
    knowledgeId: string,
    documentId: string,
  ): Promise<void>;
  rebuildKnowledge(
    context: KnowledgeCommandContext,
    knowledgeId: string,
  ): Promise<void>;
  getKnowledgeDiagnostics(
    context: KnowledgeCommandContext,
    knowledgeId: string,
  ): Promise<KnowledgeDiagnosticsResponse>;
  searchDocuments(
    context: KnowledgeCommandContext,
    input: SearchKnowledgeDocumentsInput,
  ): Promise<KnowledgeSearchResponse>;
  searchProjectDocuments(
    context: KnowledgeCommandContext,
    projectId: string,
    input: SearchProjectKnowledgeDocumentsInput,
  ): Promise<KnowledgeSearchResponse>;
}

export const createKnowledgeService = ({
  env,
  repository,
  searchService,
  authRepository,
  projectsRepository = NOOP_PROJECTS_REPOSITORY,
  settingsRepository = NOOP_SETTINGS_REPOSITORY,
}: {
  env: AppEnv;
  repository: KnowledgeRepository;
  searchService: KnowledgeSearchService;
  authRepository: AuthRepository;
  projectsRepository?: ProjectsRepository;
  settingsRepository?: SettingsRepository;
}): KnowledgeService => {
  const serviceDependencies = {
    env,
    repository,
    searchService,
    authRepository,
    projectsRepository,
    settingsRepository,
  };

  return {
    initializeSearchInfrastructure: async () => {
      // Startup 只探活 indexer；collection init 由 indexer-py 在写侧链路内保证。
      await repository.ensureMetadataModel();
      await searchService.ensureCollections();
      await recoverInterruptedKnowledgeTasks({
        env,
        repository,
        searchService,
        settingsRepository,
        createLegacyNamespaceRebuildRequiredError,
        createNamespaceRebuildRequiredError,
      });
    },
    ...createKnowledgeReadHandlers(serviceDependencies),
    ...createKnowledgeCatalogHandlers(serviceDependencies),
    ...createKnowledgeDocumentHandlers(serviceDependencies),
    ...createKnowledgeRebuildHandlers(serviceDependencies),
    ...createKnowledgeDiagnosticsHandlers(serviceDependencies),
  };
};
