import type { AppEnv } from "@config/env.js";
import { buildApiUrl, normalizeIndexerErrorMessage, parseResponseBody } from "./http.js";

const INTERNAL_INDEXER_PATH_PREFIX = /^\/internal(?:\/|$)/;
type KnowledgeIndexerHeadersInput =
  | Headers
  | Record<string, string>
  | Array<[string, string]>;

export class KnowledgeIndexerRequestError extends Error {
  readonly url: string;
  readonly statusCode: number | null;
  readonly responseBody: unknown;

  constructor({
    message,
    url,
    statusCode,
    responseBody,
    cause,
  }: {
    message: string;
    url: string;
    statusCode: number | null;
    responseBody: unknown;
    cause?: unknown;
  }) {
    super(message, cause ? { cause } : undefined);
    this.name = "KnowledgeIndexerRequestError";
    this.url = url;
    this.statusCode = statusCode;
    this.responseBody = responseBody;
  }
}

const isInternalIndexerPath = (path: string): boolean => {
  return INTERNAL_INDEXER_PATH_PREFIX.test(path);
};

const buildKnowledgeIndexerHeaders = ({
  env,
  path,
  headers,
  hasBody,
}: {
  env: AppEnv;
  path: string;
  headers?: KnowledgeIndexerHeadersInput;
  hasBody: boolean;
}): Headers => {
  const resolvedHeaders = new Headers(headers);

  if (!resolvedHeaders.has("accept")) {
    resolvedHeaders.set("accept", "application/json");
  }

  if (hasBody && !resolvedHeaders.has("content-type")) {
    resolvedHeaders.set("content-type", "application/json");
  }

  const internalToken = env.knowledge.indexerInternalToken?.trim();
  if (
    internalToken &&
    isInternalIndexerPath(path) &&
    !resolvedHeaders.has("authorization")
  ) {
    resolvedHeaders.set("authorization", `Bearer ${internalToken}`);
  }

  return resolvedHeaders;
};

export const requestKnowledgeIndexer = async ({
  env,
  path,
  timeoutMs,
  method = "GET",
  body,
  headers,
}: {
  env: AppEnv;
  path: string;
  timeoutMs: number;
  method?: string;
  body?: unknown;
  headers?: KnowledgeIndexerHeadersInput;
}): Promise<{
  url: string;
  response: Response;
  responseBody: unknown;
}> => {
  const url = buildApiUrl(env.knowledge.indexerUrl, path);
  const hasBody = body !== undefined;

  try {
    const response = await fetch(url, {
      method,
      headers: buildKnowledgeIndexerHeaders({
        env,
        path,
        headers,
        hasBody,
      }),
      body: hasBody ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(timeoutMs),
    });
    const responseBody = await parseResponseBody(response);

    if (!response.ok) {
      throw new KnowledgeIndexerRequestError({
        message: normalizeIndexerErrorMessage(
          responseBody,
          `Python indexer 请求失败（HTTP ${response.status}）`,
        ),
        url,
        statusCode: response.status,
        responseBody,
      });
    }

    return {
      url,
      response,
      responseBody,
    };
  } catch (error) {
    if (error instanceof KnowledgeIndexerRequestError) {
      throw error;
    }

    throw new KnowledgeIndexerRequestError({
      message: normalizeIndexerErrorMessage(error, "unknown fetch error"),
      url,
      statusCode: null,
      responseBody: null,
      cause: error,
    });
  }
};
