import { buildApiUrl, parseResponseBody } from "@lib/http.js";
import {
  GLOBAL_CODE_COLLECTION_NAME,
  GLOBAL_DOCS_COLLECTION_NAME,
} from "../constants/knowledge.search.constants.js";
import type {
  ChromaCollectionSummary,
  ChromaJsonRequestInput,
  KnowledgeChromaCollectionService,
} from "../types/knowledge.search.types.js";
import type { KnowledgeSourceType } from "../knowledge.types.js";
import type { AppEnv } from "@config/env.js";
import {
  createGatewayError,
  createServiceUnavailableError,
} from "../utils/knowledge-search.errors.js";

export const createKnowledgeChromaCollectionService = ({
  env,
}: {
  env: AppEnv;
}): KnowledgeChromaCollectionService => {
  const collectionCache = new Map<string, ChromaCollectionSummary>();

  const requireChromaUrl = (): string => {
    if (!env.chroma.url) {
      throw createServiceUnavailableError(
        "KNOWLEDGE_SEARCH_CHROMA_UNAVAILABLE",
        "knowledge.search.chroma.unavailable",
      );
    }

    return env.chroma.url;
  };

  const requestChromaJson = async <T>({
    path,
    method = "GET",
    body,
  }: ChromaJsonRequestInput): Promise<T> => {
    const baseUrl = requireChromaUrl();
    let responseBody: unknown = null;

    try {
      const response = await fetch(
        buildApiUrl(
          baseUrl,
          `/api/v2/tenants/${env.chroma.tenant}/databases/${env.chroma.database}${path}`,
        ),
        {
          method,
          headers: {
            accept: "application/json",
            ...(body
              ? {
                  "content-type": "application/json",
                }
              : {}),
          },
          body: body ? JSON.stringify(body) : undefined,
          signal: AbortSignal.timeout(env.chroma.requestTimeoutMs),
        },
      );

      responseBody = await parseResponseBody(response);

      if (!response.ok) {
        throw createGatewayError(
          "knowledge.search.chroma.requestFailed",
          {
            details: {
              status: response.status,
              responseBody,
            },
          },
        );
      }

      return (responseBody ?? null) as T;
    } catch (error) {
      if (error instanceof Error && error.name === "TimeoutError") {
        throw createGatewayError("knowledge.search.chroma.requestFailed", {
          cause: error,
        });
      }

      if (error instanceof Error && "statusCode" in error) {
        throw error;
      }

      throw createGatewayError("knowledge.search.chroma.requestFailed", {
        cause: error,
      });
    }
  };

  const listCollections = async (): Promise<ChromaCollectionSummary[]> => {
    return requestChromaJson<ChromaCollectionSummary[]>({
      path: "/collections",
    });
  };

  const getExistingCollection = async (
    name: string,
    options?: {
      bypassCache?: boolean;
    },
  ): Promise<ChromaCollectionSummary | null> => {
    if (!options?.bypassCache) {
      const cached = collectionCache.get(name);
      if (cached) {
        return cached;
      }
    }

    const existingCollections = await listCollections();
    const existing = existingCollections.find(
      (collection) => collection.name === name,
    );

    if (existing) {
      collectionCache.set(name, existing);
      return existing;
    }

    if (options?.bypassCache) {
      collectionCache.delete(name);
    }

    return null;
  };

  const getCollectionName = (sourceType: KnowledgeSourceType): string => {
    return sourceType === "global_code"
      ? GLOBAL_CODE_COLLECTION_NAME
      : GLOBAL_DOCS_COLLECTION_NAME;
  };

  return {
    getCollectionName,
    getExistingCollection,
    deleteCachedCollection: (name) => {
      collectionCache.delete(name);
    },
    requestChromaJson,
  };
};
