import type { AppEnv } from "@config/env.js";
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
    }: SearchDiagnosticsInput): Promise<KnowledgeSearchDiagnosticsResponse> => {
      if (!env.chroma.url) {
        return {
          collection: {
            name: collectionName,
            exists: false,
            errorMessage: "Chroma 未配置，当前无法执行知识索引和检索",
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
            errorMessage: resolveDiagnosticsErrorMessage(error),
          },
        };
      }
    },
  };
};
