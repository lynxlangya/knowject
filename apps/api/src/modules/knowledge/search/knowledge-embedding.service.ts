import { createHash } from "node:crypto";
import { getEffectiveEmbeddingConfig } from "@config/ai-config.js";
import { normalizeOpenAiCompatibleErrorMessage, parseResponseBody, buildApiUrl } from "@lib/http.js";
import type { SettingsRepository } from "@modules/settings/settings.repository.js";
import type { EffectiveEmbeddingConfig } from "@modules/settings/settings.types.js";
import type { AppEnv } from "@config/env.js";
import { LOCAL_DEVELOPMENT_EMBEDDING_DIMENSION } from "../constants/knowledge.search.constants.js";
import type { KnowledgeEmbeddingService } from "../types/knowledge.search.types.js";
import {
  createGatewayError,
  createServiceUnavailableError,
  getEmbeddingErrorPrefix,
} from "../utils/knowledge-search.errors.js";

const NOOP_SETTINGS_REPOSITORY = {
  getSettings: async () => null,
} as unknown as SettingsRepository;

export const createKnowledgeEmbeddingService = ({
  env,
  settingsRepository = NOOP_SETTINGS_REPOSITORY,
}: {
  env: AppEnv;
  settingsRepository?: SettingsRepository;
}): KnowledgeEmbeddingService => {
  const createLocalDevelopmentEmbedding = (text: string): number[] => {
    const normalized = text.normalize("NFKC").toLowerCase();
    const units = Array.from(normalized).filter((char) => !/\s/u.test(char));
    const vector = new Array<number>(
      LOCAL_DEVELOPMENT_EMBEDDING_DIMENSION,
    ).fill(0);

    if (units.length === 0) {
      vector[0] = 1;
      return vector;
    }

    for (const [size, weight] of [
      [1, 1.0],
      [2, 1.5],
      [3, 2.0],
    ] as const) {
      if (units.length < size) {
        continue;
      }

      for (let start = 0; start <= units.length - size; start += 1) {
        const feature = units.slice(start, start + size).join("");
        const digest = createHash("sha256").update(feature, "utf8").digest();

        for (let projection = 0; projection < 4; projection += 1) {
          const offset = projection * 2;
          const index =
            digest.readUInt16BE(offset) % LOCAL_DEVELOPMENT_EMBEDDING_DIMENSION;
          const sign = digest[8 + projection] % 2 === 0 ? 1 : -1;
          vector[index] += weight * sign;
        }
      }
    }

    const norm = Math.sqrt(
      vector.reduce((sum, value) => sum + value * value, 0),
    );

    if (norm <= 0) {
      vector[0] = 1;
      return vector;
    }

    return vector.map((value) => value / norm);
  };

  return {
    createEmbeddings: async (
      texts: string[],
      configOverride?: EffectiveEmbeddingConfig,
    ): Promise<number[][]> => {
      const embeddingConfig =
        configOverride ??
        (await getEffectiveEmbeddingConfig({
          env,
          repository: settingsRepository,
        }));

      if (embeddingConfig.provider === "local_dev") {
        return texts.map((text) => createLocalDevelopmentEmbedding(text));
      }

      if (!embeddingConfig.apiKey) {
        throw createServiceUnavailableError(
          "KNOWLEDGE_SEARCH_EMBEDDING_UNAVAILABLE",
          "Embedding API Key 未配置，当前无法执行知识索引和检索",
        );
      }

      const errorPrefix = getEmbeddingErrorPrefix(embeddingConfig.provider);
      let responseBody: unknown = null;

      try {
        const response = await fetch(
          buildApiUrl(embeddingConfig.baseUrl, "/embeddings"),
          {
            method: "POST",
            headers: {
              accept: "application/json",
              authorization: `Bearer ${embeddingConfig.apiKey}`,
              "content-type": "application/json",
            },
            body: JSON.stringify({
              model: embeddingConfig.model,
              input: texts,
            }),
            signal: AbortSignal.timeout(embeddingConfig.requestTimeoutMs),
          },
        );

        responseBody = await parseResponseBody(response);

        if (!response.ok) {
          throw createGatewayError(
            normalizeOpenAiCompatibleErrorMessage(
              responseBody,
              `${errorPrefix}（HTTP ${response.status}）`,
            ),
          );
        }

        if (
          !responseBody ||
          typeof responseBody !== "object" ||
          !("data" in responseBody) ||
          !Array.isArray(responseBody.data)
        ) {
          throw createGatewayError(`${errorPrefix}：响应格式不合法`);
        }

        return responseBody.data.map((item) => {
          if (
            !item ||
            typeof item !== "object" ||
            !("embedding" in item) ||
            !Array.isArray(item.embedding)
          ) {
            throw createGatewayError(`${errorPrefix}：响应缺少 embedding`);
          }

          return item.embedding.map((value: unknown) => Number(value));
        });
      } catch (error) {
        if (error instanceof Error && "statusCode" in error) {
          throw error;
        }

        throw createGatewayError(errorPrefix, error);
      }
    },
  };
};
