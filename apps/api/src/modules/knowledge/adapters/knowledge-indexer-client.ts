import {
  getEffectiveEmbeddingConfig,
  getEffectiveIndexingConfig,
} from "@config/ai-config.js";
import { buildApiUrl, normalizeIndexerErrorMessage, parseResponseBody } from "@lib/http.js";
import {
  KNOWLEDGE_INDEXER_DOCUMENT_PATHS,
  buildKnowledgeIndexerRebuildPaths,
} from "../constants/knowledge-indexer.constants.js";
import type { CallKnowledgeIndexerInput } from "../types/knowledge-index-orchestrator.types.js";
import type { KnowledgeIndexerResponse } from "../knowledge.types.js";
import { assertKnowledgeIndexerResponse } from "../validators/knowledge-indexer-response.validator.js";

const buildKnowledgeIndexerUrls = (
  baseUrl: string,
  documentId: string,
  mode: "index" | "rebuild",
): string[] => {
  const paths =
    mode === "rebuild"
      ? buildKnowledgeIndexerRebuildPaths(documentId)
      : KNOWLEDGE_INDEXER_DOCUMENT_PATHS;

  return Array.from(
    new Set(paths.map((path) => buildApiUrl(baseUrl, path))),
  );
};

export const callKnowledgeIndexer = async ({
  env,
  settingsRepository,
  payload,
  mode = "index",
  embeddingConfig: providedEmbeddingConfig,
  indexingConfig: providedIndexingConfig,
}: CallKnowledgeIndexerInput): Promise<KnowledgeIndexerResponse> => {
  const indexerUrls = buildKnowledgeIndexerUrls(
    env.knowledge.indexerUrl,
    payload.documentId,
    mode,
  );
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

    let response: Response;

    try {
      response = await fetch(indexerUrl, {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify(requestPayload),
        signal: AbortSignal.timeout(indexingConfig.indexerTimeoutMs),
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "unknown fetch error";
      throw new Error(
        `Python indexer 不可达，请确认本地索引服务已启动（${indexerUrl}）。原始错误：${message}`,
      );
    }

    const responseBody = await parseResponseBody(response);

    if (response.status === 404 && index < indexerUrls.length - 1) {
      continue;
    }

    if (!response.ok) {
      throw new Error(
        normalizeIndexerErrorMessage(
          responseBody,
          `Python indexer 请求失败（HTTP ${response.status}）`,
        ),
      );
    }

    return assertKnowledgeIndexerResponse(responseBody);
  }

  throw new Error("Python indexer 请求失败（HTTP 404）");
};
