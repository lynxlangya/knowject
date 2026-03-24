import type { AppEnv } from "@config/env.js";
import {
  KnowledgeIndexerRequestError,
  requestKnowledgeIndexer,
} from "@lib/knowledge-indexer-request.js";
import {
  buildApiUrl,
  normalizeIndexerErrorMessage,
  normalizeOpenAiCompatibleErrorMessage,
  parseResponseBody,
} from "@lib/http.js";
import type {
  SettingsConnectionTestResponse,
  SettingsEmbeddingProvider,
  SettingsIndexingConnectionTestResponse,
  SettingsLlmProvider,
  WorkspaceAiConfigDocument,
} from "./settings.types.js";

interface IndexerDiagnosticsResponseBody {
  status: "ok" | "degraded";
  service: string;
  chunkSize: number;
  chunkOverlap: number;
  supportedFormats: string[];
  embeddingProvider: string;
  chromaReachable: boolean;
  errorMessage: string | null;
}

const isIndexerDiagnosticsResponseBody = (
  value: unknown,
): value is IndexerDiagnosticsResponseBody => {
  if (value === null || typeof value !== "object") {
    return false;
  }

  return (
    "status" in value &&
    (value.status === "ok" || value.status === "degraded") &&
    "service" in value &&
    typeof value.service === "string" &&
    "chunkSize" in value &&
    typeof value.chunkSize === "number" &&
    "chunkOverlap" in value &&
    typeof value.chunkOverlap === "number" &&
    "supportedFormats" in value &&
    Array.isArray(value.supportedFormats) &&
    value.supportedFormats.every((item) => typeof item === "string") &&
    "embeddingProvider" in value &&
    typeof value.embeddingProvider === "string" &&
    "chromaReachable" in value &&
    typeof value.chromaReachable === "boolean" &&
    "errorMessage" in value &&
    (value.errorMessage === null || typeof value.errorMessage === "string")
  );
};

const createUnreachableIndexingTestResponse = (
  error: string,
): SettingsIndexingConnectionTestResponse => {
  return {
    success: false,
    indexerStatus: "unreachable",
    error,
    service: null,
    supportedFormats: [],
    chunkSize: null,
    chunkOverlap: null,
    embeddingProvider: null,
    chromaReachable: null,
  };
};

export const testOpenAiCompatibleRequest = async ({
  baseUrl,
  apiKey,
  path,
  payload,
  timeoutMs,
}: {
  baseUrl: string;
  apiKey: string;
  path: string;
  payload: Record<string, unknown>;
  timeoutMs: number;
}): Promise<SettingsConnectionTestResponse> => {
  const startedAt = Date.now();

  try {
    const response = await fetch(buildApiUrl(baseUrl, path), {
      method: "POST",
      headers: {
        accept: "application/json",
        authorization: `Bearer ${apiKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(timeoutMs),
    });
    const responseBody = await parseResponseBody(response);

    if (!response.ok) {
      return {
        success: false,
        error: normalizeOpenAiCompatibleErrorMessage(
          responseBody,
          `连接测试失败（HTTP ${response.status}）`,
        ),
      };
    }

    return {
      success: true,
      latencyMs: Date.now() - startedAt,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "连接测试失败",
    };
  }
};

export const testIndexingRequest = async ({
  env,
  timeoutMs,
}: {
  env: AppEnv;
  timeoutMs: number;
}): Promise<SettingsIndexingConnectionTestResponse> => {
  const startedAt = Date.now();

  try {
    const { responseBody } = await requestKnowledgeIndexer({
      env,
      path: "/internal/v1/index/diagnostics",
      method: "GET",
      timeoutMs,
    });

    if (!isIndexerDiagnosticsResponseBody(responseBody)) {
      return createUnreachableIndexingTestResponse(
        "Python indexer diagnostics 响应不合法",
      );
    }

    const success =
      responseBody.status === "ok" && responseBody.chromaReachable === true;

    return {
      success,
      indexerStatus: responseBody.status,
      latencyMs: Date.now() - startedAt,
      ...(success
        ? {}
        : {
            error:
              responseBody.errorMessage ??
              (responseBody.chromaReachable
                ? "Python indexer 当前处于降级状态"
                : "Python indexer 可达，但 Chroma 不可达"),
          }),
      service: responseBody.service,
      supportedFormats: [...responseBody.supportedFormats],
      chunkSize: responseBody.chunkSize,
      chunkOverlap: responseBody.chunkOverlap,
      embeddingProvider: responseBody.embeddingProvider,
      chromaReachable: responseBody.chromaReachable,
    };
  } catch (error) {
    if (error instanceof KnowledgeIndexerRequestError && error.statusCode === 404) {
      return createUnreachableIndexingTestResponse(
        "当前 Python indexer 不支持 diagnostics 接口，请先升级服务",
      );
    }

    if (error instanceof KnowledgeIndexerRequestError && error.statusCode !== null) {
      return createUnreachableIndexingTestResponse(
        normalizeIndexerErrorMessage(
          error.responseBody,
          `索引链路测试失败（HTTP ${error.statusCode})`,
        ),
      );
    }

    return createUnreachableIndexingTestResponse(
      error instanceof Error ? error.message : "索引链路测试失败",
    );
  }
};

export const shouldPersistTestStatus = (
  currentSection:
    | WorkspaceAiConfigDocument<SettingsEmbeddingProvider>
    | WorkspaceAiConfigDocument<SettingsLlmProvider>
    | undefined,
  hasOverrides: boolean,
): boolean => {
  return Boolean(currentSection && !hasOverrides);
};
