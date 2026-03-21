import type { AppEnv } from "@config/env.js";
import type { SettingsRepository } from "@modules/settings/settings.repository.js";
import {
  createKnowledgeChromaMutationService,
} from "./search/knowledge-chroma-mutation.service.js";
import {
  createKnowledgeChromaQueryService,
} from "./search/knowledge-chroma-query.service.js";
import {
  createKnowledgeChromaCollectionService,
} from "./search/knowledge-chroma-collection.service.js";
import {
  createKnowledgeEmbeddingService,
} from "./search/knowledge-embedding.service.js";
import {
  createKnowledgeSearchDiagnosticsService,
} from "./search/knowledge-search-diagnostics.service.js";
import type { KnowledgeSearchResponse } from "./knowledge.types.js";
import type {
  KnowledgeSearchDiagnosticsResponse,
  KnowledgeSearchResultGuard,
  SearchDiagnosticsInput,
  SearchDocumentsInput,
} from "./types/knowledge.search.types.js";

const NOOP_SETTINGS_REPOSITORY = {
  getSettings: async () => null,
} as unknown as SettingsRepository;

export interface KnowledgeSearchService {
  ensureCollections(): Promise<void>;
  searchDocuments(
    input: SearchDocumentsInput,
  ): Promise<KnowledgeSearchResponse>;
  getDiagnostics(
    input: SearchDiagnosticsInput,
  ): Promise<KnowledgeSearchDiagnosticsResponse>;
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

const knowledgeSearchResultGuardRegistry = new WeakMap<
  KnowledgeSearchService,
  KnowledgeSearchResultGuard
>();

export const registerKnowledgeSearchResultGuard = (
  searchService: KnowledgeSearchService,
  guard: KnowledgeSearchResultGuard,
): void => {
  knowledgeSearchResultGuardRegistry.set(searchService, guard);
};

export const createKnowledgeSearchService = ({
  env,
  settingsRepository = NOOP_SETTINGS_REPOSITORY,
}: {
  env: AppEnv;
  settingsRepository?: SettingsRepository;
}): KnowledgeSearchService => {
  const collectionService = createKnowledgeChromaCollectionService({ env });
  const embeddingService = createKnowledgeEmbeddingService({
    env,
    settingsRepository,
  });
  const queryService = createKnowledgeChromaQueryService({
    env,
    settingsRepository,
    collectionService,
    embeddingService,
  });
  const diagnosticsService = createKnowledgeSearchDiagnosticsService({
    env,
    collectionService,
  });
  const mutationService = createKnowledgeChromaMutationService({
    env,
    settingsRepository,
    collectionService,
  });

  const service: KnowledgeSearchService = {
    ensureCollections: mutationService.ensureCollections,

    // NOTE: Node 直连 Chroma 读侧 query 是已确认的架构例外条款
    // 参见 docs/contracts/chroma-decision.md
    searchDocuments: async (input) => {
      const result = await queryService.searchDocuments(input);
      const resultGuard = knowledgeSearchResultGuardRegistry.get(service);

      if (!resultGuard || result.items.length === 0) {
        return result;
      }

      const items = await resultGuard(result.items);

      return {
        ...result,
        total: items.length,
        items,
      };
    },

    getDiagnostics: diagnosticsService.getDiagnostics,
    deleteKnowledgeChunks: mutationService.deleteKnowledgeChunks,
    deleteDocumentChunks: mutationService.deleteDocumentChunks,
    deleteCollection: mutationService.deleteCollection,
  };

  return service;
};
