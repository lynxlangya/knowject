import {
  getEffectiveEmbeddingConfig,
  getEffectiveIndexingConfig,
} from "@config/ai-config.js";
import {
  KnowledgeIndexerRequestError,
  requestKnowledgeIndexer,
} from "@lib/knowledge-indexer-request.js";
import {
  KNOWLEDGE_INDEXER_DOCUMENT_PATHS,
  buildKnowledgeIndexerRebuildPaths,
} from "../constants/knowledge-indexer.constants.js";
import type { CallKnowledgeIndexerInput } from "../types/knowledge-index-orchestrator.types.js";
import type { KnowledgeIndexerResponse } from "../knowledge.types.js";
import { assertKnowledgeIndexerResponse } from "../validators/knowledge-indexer-response.validator.js";

const buildKnowledgeIndexerUrls = (
  documentId: string,
  mode: "index" | "rebuild",
): string[] => {
  const paths =
    mode === "rebuild"
      ? buildKnowledgeIndexerRebuildPaths(documentId)
      : KNOWLEDGE_INDEXER_DOCUMENT_PATHS;

  return Array.from(new Set(paths));
};

export const callKnowledgeIndexer = async ({
  env,
  settingsRepository,
  payload,
  mode = "index",
  embeddingConfig: providedEmbeddingConfig,
  indexingConfig: providedIndexingConfig,
}: CallKnowledgeIndexerInput): Promise<KnowledgeIndexerResponse> => {
  const indexerUrls = buildKnowledgeIndexerUrls(payload.documentId, mode);
  const [embeddingConfig, indexingConfig] = await Promise.all([
    providedEmbeddingConfig
      ? Promise.resolve(providedEmbeddingConfig)
      : getEffectiveEmbeddingConfig({
          env,
          repository: settingsRepository,
        }),
    providedIndexingConfig
      ? Promise.resolve(providedIndexingConfig)
      : getEffectiveIndexingConfig({
          env,
          repository: settingsRepository,
        }),
  ]);
  const requestPayload = {
    ...payload,
    embeddingConfig: {
      provider: embeddingConfig.provider,
      apiKey: embeddingConfig.apiKey,
      baseUrl: embeddingConfig.baseUrl,
      model: embeddingConfig.model,
    },
    indexingConfig: {
      chunkSize: indexingConfig.chunkSize,
      chunkOverlap: indexingConfig.chunkOverlap,
      supportedTypes: [...indexingConfig.supportedTypes],
      indexerTimeoutMs: indexingConfig.indexerTimeoutMs,
    },
  };

  for (let index = 0; index < indexerUrls.length; index += 1) {
    const indexerUrl = indexerUrls[index];
    if (!indexerUrl) {
      continue;
    }

    try {
      const request = await requestKnowledgeIndexer({
        env,
        path: indexerUrl,
        method: "POST",
        body: requestPayload,
        timeoutMs: indexingConfig.indexerTimeoutMs,
      });
      const responseBody = request.responseBody;

      return assertKnowledgeIndexerResponse(responseBody);
    } catch (error) {
      if (
        error instanceof KnowledgeIndexerRequestError &&
        error.statusCode === 404 &&
        index < indexerUrls.length - 1
      ) {
        continue;
      }

      if (error instanceof KnowledgeIndexerRequestError && error.statusCode === null) {
        throw new Error(
          `Python indexer 不可达，请确认本地索引服务已启动（${error.url}）。原始错误：${error.message}`,
        );
      }

      throw new Error(
        error instanceof Error ? error.message : "Python indexer 请求失败",
      );
    }
  }

  throw new Error("Python indexer 请求失败（HTTP 404）");
};
