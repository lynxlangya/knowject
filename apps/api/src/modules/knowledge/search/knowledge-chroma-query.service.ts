import type { AppEnv } from "@config/env.js";
import type { SettingsRepository } from "@modules/settings/settings.repository.js";
import { mapChromaQueryResponseToSearchResponse } from "../adapters/chroma-query.adapter.js";
import { createKnowledgeEmbeddingService } from "./knowledge-embedding.service.js";
import { createKnowledgeChromaCollectionService } from "./knowledge-chroma-collection.service.js";
import type {
  KnowledgeChromaCollectionService,
  KnowledgeChromaQueryService,
  KnowledgeEmbeddingService,
  SearchDocumentsInput,
} from "../types/knowledge.search.types.js";
import { validateChromaQueryResponse } from "../validators/chroma-response.validator.js";

const NOOP_SETTINGS_REPOSITORY = {
  getSettings: async () => null,
} as unknown as SettingsRepository;

export const createKnowledgeChromaQueryService = ({
  env,
  settingsRepository = NOOP_SETTINGS_REPOSITORY,
  collectionService = createKnowledgeChromaCollectionService({ env }),
  embeddingService = createKnowledgeEmbeddingService({
    env,
    settingsRepository,
  }),
}: {
  env: AppEnv;
  settingsRepository?: SettingsRepository;
  collectionService?: KnowledgeChromaCollectionService;
  embeddingService?: KnowledgeEmbeddingService;
}): KnowledgeChromaQueryService => {
  return {
    searchDocuments: async ({
      query,
      knowledgeId,
      sourceType,
      collectionName,
      embeddingConfig,
      topK,
    }: SearchDocumentsInput) => {
      const collection = await collectionService.getExistingCollection(
        collectionName ?? collectionService.getCollectionName(sourceType),
      );

      if (!collection) {
        return mapChromaQueryResponseToSearchResponse({
          query,
          sourceType,
          response: {},
        });
      }

      const [queryEmbedding] = await embeddingService.createEmbeddings(
        [query],
        embeddingConfig,
      );

      const response = await collectionService.requestChromaJson({
        path: `/collections/${collection.id}/query`,
        method: "POST",
        body: {
          query_embeddings: [queryEmbedding],
          n_results: topK,
          include: ["documents", "metadatas", "distances"],
          ...(knowledgeId
            ? {
                where: {
                  knowledgeId,
                },
              }
            : {}),
        },
      });

      return mapChromaQueryResponseToSearchResponse({
        query,
        sourceType,
        response: validateChromaQueryResponse(response),
      });
    },
  };
};
