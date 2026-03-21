import { AppError } from "@lib/app-error.js";
import type { MessageKey } from "@lib/locale.messages.js";
import { getFallbackMessage } from "@lib/locale.messages.js";
import type { EffectiveEmbeddingConfig } from "@modules/settings/settings.types.js";

export const createServiceUnavailableError = (
  code: string,
  messageKey: MessageKey,
): AppError => {
  return new AppError({
    statusCode: 503,
    code,
    message: getFallbackMessage(messageKey),
    messageKey,
  });
};

export const createGatewayError = (
  messageKey: MessageKey,
  options: {
    cause?: unknown;
    details?: unknown;
    message?: string;
  } = {},
): AppError => {
  return new AppError({
    statusCode: 502,
    code: "KNOWLEDGE_SEARCH_UPSTREAM_ERROR",
    message: options.message ?? getFallbackMessage(messageKey),
    messageKey,
    cause: options.cause,
    details: options.details,
  });
};

export const getEmbeddingErrorMessageKey = (
  provider: EffectiveEmbeddingConfig["provider"],
): MessageKey => {
  switch (provider) {
    case "aliyun":
      return "knowledge.search.embedding.aliyun.failed";
    case "zhipu":
      return "knowledge.search.embedding.zhipu.failed";
    case "voyage":
      return "knowledge.search.embedding.voyage.failed";
    case "custom":
      return "knowledge.search.embedding.custom.failed";
    default:
      return "knowledge.search.embedding.openai.failed";
  }
};

export const getEmbeddingErrorPrefix = (
  provider: EffectiveEmbeddingConfig["provider"],
): string => {
  return getFallbackMessage(getEmbeddingErrorMessageKey(provider));
};

export const resolveDiagnosticsErrorMessage = (error: unknown): string => {
  if (error instanceof AppError) {
    return error.message;
  }

  if (error instanceof Error && error.message.trim()) {
    return error.message.trim();
  }

  return getFallbackMessage("knowledge.search.diagnosticsFailed");
};

export const isIndexerRouteNotFoundError = (
  error: unknown,
): error is AppError => {
  return (
    error instanceof AppError &&
    error.statusCode === 404 &&
    error.code === "KNOWLEDGE_SEARCH_INDEXER_ROUTE_NOT_FOUND"
  );
};
