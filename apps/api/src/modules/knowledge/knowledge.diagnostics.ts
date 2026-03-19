import { getEffectiveIndexingConfig } from "@config/ai-config.js";
import type { AppEnv } from "@config/env.js";
import {
  buildApiUrl,
  normalizeIndexerErrorMessage,
  parseResponseBody,
} from "@lib/http.js";
import type { SettingsRepository } from "@modules/settings/settings.repository.js";
import type {
  KnowledgeDocumentRecord,
  KnowledgeIndexerDiagnosticsResponse,
} from "./knowledge.types.js";

export const KNOWLEDGE_DIAGNOSTICS_STALE_PROCESSING_MS = 15 * 60 * 1000;
const KNOWLEDGE_INDEXER_DIAGNOSTICS_PATHS = [
  "/internal/v1/index/diagnostics",
  "/health",
] as const;

const buildKnowledgeIndexerDiagnosticsUrls = (baseUrl: string): string[] => {
  return Array.from(
    new Set(
      KNOWLEDGE_INDEXER_DIAGNOSTICS_PATHS.map((path) =>
        buildApiUrl(baseUrl, path),
      ),
    ),
  );
};

export const isStaleProcessingDocument = (
  document: Pick<KnowledgeDocumentRecord, "status" | "updatedAt">,
  now: Date,
): boolean => {
  return (
    document.status === "processing" &&
    now.getTime() - document.updatedAt.getTime() >=
      KNOWLEDGE_DIAGNOSTICS_STALE_PROCESSING_MS
  );
};

export const resolveDiagnosticsErrorMessage = (error: unknown): string => {
  if (error instanceof Error && error.message.trim()) {
    return error.message.trim();
  }

  return "诊断请求失败";
};

const parseKnowledgeIndexerDiagnosticsResponse = (
  responseBody: unknown,
): KnowledgeIndexerDiagnosticsResponse => {
  if (
    !responseBody ||
    typeof responseBody !== "object" ||
    !("status" in responseBody) ||
    (responseBody.status !== "ok" && responseBody.status !== "degraded") ||
    !("service" in responseBody) ||
    typeof responseBody.service !== "string" ||
    !("chunkSize" in responseBody) ||
    typeof responseBody.chunkSize !== "number" ||
    !("chunkOverlap" in responseBody) ||
    typeof responseBody.chunkOverlap !== "number" ||
    !("supportedFormats" in responseBody) ||
    !Array.isArray(responseBody.supportedFormats)
  ) {
    throw new Error("Python indexer 诊断响应格式不合法");
  }

  return {
    status: responseBody.status,
    service: responseBody.service,
    chunkSize: responseBody.chunkSize,
    chunkOverlap: responseBody.chunkOverlap,
    supportedFormats: responseBody.supportedFormats.filter(
      (value): value is string => typeof value === "string",
    ),
    embeddingProvider:
      "embeddingProvider" in responseBody &&
      typeof responseBody.embeddingProvider === "string"
        ? responseBody.embeddingProvider
        : null,
    chromaReachable:
      "chromaReachable" in responseBody &&
      typeof responseBody.chromaReachable === "boolean"
        ? responseBody.chromaReachable
        : null,
    errorMessage:
      "errorMessage" in responseBody &&
      typeof responseBody.errorMessage === "string"
        ? responseBody.errorMessage
        : null,
  };
};

export const readKnowledgeIndexerDiagnostics = async (
  env: AppEnv,
  settingsRepository: SettingsRepository,
): Promise<KnowledgeIndexerDiagnosticsResponse> => {
  const diagnosticsUrls = buildKnowledgeIndexerDiagnosticsUrls(
    env.knowledge.indexerUrl,
  );
  const indexingConfig = await getEffectiveIndexingConfig({
    env,
    repository: settingsRepository,
  });

  for (let index = 0; index < diagnosticsUrls.length; index += 1) {
    const diagnosticsUrl = diagnosticsUrls[index];
    if (!diagnosticsUrl) {
      continue;
    }

    let response: Response;

    try {
      response = await fetch(diagnosticsUrl, {
        method: "GET",
        headers: {
          accept: "application/json",
        },
        signal: AbortSignal.timeout(indexingConfig.indexerTimeoutMs),
      });
    } catch (error) {
      if (index < diagnosticsUrls.length - 1) {
        continue;
      }

      throw new Error(
        `Python indexer 诊断不可达，请确认本地索引服务已启动（${diagnosticsUrl}）。原始错误：${normalizeIndexerErrorMessage(
          error,
          "unknown fetch error",
        )}`,
      );
    }

    const responseBody = await parseResponseBody(response);

    if (response.status === 404 && index < diagnosticsUrls.length - 1) {
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

    return parseKnowledgeIndexerDiagnosticsResponse(responseBody);
  }

  throw new Error("Python indexer 诊断请求失败（HTTP 404）");
};
