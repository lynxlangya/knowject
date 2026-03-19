import { AppError } from "@lib/app-error.js";
import type { EffectiveEmbeddingConfig } from "@modules/settings/settings.types.js";

export const createServiceUnavailableError = (
  code: string,
  message: string,
): AppError => {
  return new AppError({
    statusCode: 503,
    code,
    message,
  });
};

export const createGatewayError = (
  message: string,
  cause?: unknown,
): AppError => {
  return new AppError({
    statusCode: 502,
    code: "KNOWLEDGE_SEARCH_UPSTREAM_ERROR",
    message,
    cause,
  });
};

export const getEmbeddingErrorPrefix = (
  provider: EffectiveEmbeddingConfig["provider"],
): string => {
  switch (provider) {
    case "aliyun":
      return "阿里云 embedding 请求失败";
    case "zhipu":
      return "智谱 embedding 请求失败";
    case "voyage":
      return "Voyage embedding 请求失败";
    case "custom":
      return "兼容 embedding 请求失败";
    default:
      return "OpenAI embedding 请求失败";
  }
};

export const resolveDiagnosticsErrorMessage = (error: unknown): string => {
  if (error instanceof AppError) {
    return error.message;
  }

  if (error instanceof Error && error.message.trim()) {
    return error.message.trim();
  }

  return "Chroma 诊断失败";
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
