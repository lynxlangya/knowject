import type { AppEnv } from "@config/env.js";
import { DEFAULT_LOCALE } from "@lib/locale.js";
import { getFallbackMessage, getMessage } from "@lib/locale.messages.js";
import { createKnowledgeChromaCollectionService } from "./knowledge-chroma-collection.service.js";
import type {
  KnowledgeChromaCollectionService,
  KnowledgeSearchDiagnosticsResponse,
  KnowledgeSearchDiagnosticsService,
  SearchDiagnosticsInput,
} from "../types/knowledge.search.types.js";
import { resolveDiagnosticsErrorMessage } from "../utils/knowledge-search.errors.js";

export const createKnowledgeSearchDiagnosticsService = ({
  env,
  collectionService = createKnowledgeChromaCollectionService({ env }),
}: {
  env: AppEnv;
  collectionService?: KnowledgeChromaCollectionService;
}): KnowledgeSearchDiagnosticsService => {
  return {
    getDiagnostics: async ({
      collectionName,
      locale = DEFAULT_LOCALE,
    }: SearchDiagnosticsInput): Promise<KnowledgeSearchDiagnosticsResponse> => {
      if (!env.chroma.url) {
        return {
          collection: {
            name: collectionName,
            exists: false,
            errorMessage:
              getMessage("knowledge.search.chroma.unavailable", locale) ??
              getFallbackMessage("knowledge.search.chroma.unavailable"),
          },
        };
      }

      try {
        const collection = await collectionService.getExistingCollection(
          collectionName,
          {
            bypassCache: true,
          },
        );

        return {
          collection: {
            name: collectionName,
            exists: Boolean(collection),
            errorMessage: null,
          },
        };
      } catch (error) {
        return {
          collection: {
            name: collectionName,
            exists: false,
            errorMessage: resolveDiagnosticsErrorMessage(error, locale),
          },
        };
      }
    },
  };
};
