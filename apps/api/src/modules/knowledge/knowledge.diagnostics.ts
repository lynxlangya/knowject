import { getEffectiveIndexingConfig } from "@config/ai-config.js";
import type { AppEnv } from "@config/env.js";
import { AppError } from "@lib/app-error.js";
import { resolveLocalizedAppErrorMessage } from "@lib/app-error-message.js";
import {
  KnowledgeIndexerRequestError,
  requestKnowledgeIndexer,
} from "@lib/knowledge-indexer-request.js";
import { DEFAULT_LOCALE, type SupportedLocale } from "@lib/locale.js";
import { normalizeIndexerErrorMessage } from "@lib/http.js";
import { getFallbackMessage, getMessage } from "@lib/locale.messages.js";
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

const buildKnowledgeIndexerDiagnosticsUrls = (): string[] => {
  return Array.from(new Set(KNOWLEDGE_INDEXER_DIAGNOSTICS_PATHS));
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
  return resolveLocalizedDiagnosticsErrorMessage(error, DEFAULT_LOCALE);
};

export const resolveLocalizedDiagnosticsErrorMessage = (
  error: unknown,
  locale: SupportedLocale = DEFAULT_LOCALE,
): string => {
  if (error instanceof AppError) {
    return resolveLocalizedAppErrorMessage(error, locale);
  }

  if (error instanceof Error && error.message.trim()) {
    return error.message.trim();
  }

  return (
    getMessage("knowledge.search.diagnosticsFailed", locale) ??
    getFallbackMessage("knowledge.search.diagnosticsFailed")
  );
};

const parseKnowledgeIndexerDiagnosticsResponse = (
  responseBody: unknown,
  locale: SupportedLocale = DEFAULT_LOCALE,
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
    throw new Error(
      getMessage("knowledge.search.indexer.diagnosticsInvalid", locale) ??
      getFallbackMessage("knowledge.search.indexer.diagnosticsInvalid"),
    );
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
  locale: SupportedLocale = DEFAULT_LOCALE,
): Promise<KnowledgeIndexerDiagnosticsResponse> => {
  const diagnosticsUrls = buildKnowledgeIndexerDiagnosticsUrls();
  const indexingConfig = await getEffectiveIndexingConfig({
    env,
    repository: settingsRepository,
  });

  for (let index = 0; index < diagnosticsUrls.length; index += 1) {
    const diagnosticsUrl = diagnosticsUrls[index];
    if (!diagnosticsUrl) {
      continue;
    }

    try {
      const request = await requestKnowledgeIndexer({
        env,
        path: diagnosticsUrl,
        method: "GET",
        timeoutMs: indexingConfig.indexerTimeoutMs,
      });
      return parseKnowledgeIndexerDiagnosticsResponse(request.responseBody, locale);
    } catch (error) {
      if (
        error instanceof KnowledgeIndexerRequestError &&
        error.statusCode === 404 &&
        index < diagnosticsUrls.length - 1
      ) {
        continue;
      }

      if (
        error instanceof KnowledgeIndexerRequestError &&
        error.statusCode === null &&
        index < diagnosticsUrls.length - 1
      ) {
        continue;
      }

      throw new Error(
        `${
          getMessage("knowledge.search.indexer.healthFailed", locale) ??
          getFallbackMessage("knowledge.search.indexer.healthFailed")
        } (${
          error instanceof KnowledgeIndexerRequestError ? error.url : diagnosticsUrl
        }): ${normalizeIndexerErrorMessage(error, "unknown fetch error")}`,
      );
    }
  }

  throw new Error(
    `${
      getMessage("knowledge.search.diagnosticsFailed", locale) ??
      getFallbackMessage("knowledge.search.diagnosticsFailed")
    } (HTTP 404)`,
  );
};
