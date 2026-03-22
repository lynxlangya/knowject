import { getEffectiveIndexingConfig } from "@config/ai-config.js";
import type { AppEnv } from "@config/env.js";
import { AppError } from "@lib/app-error.js";
import { buildApiUrl } from "@lib/http.js";
import type { SettingsRepository } from "@modules/settings/settings.repository.js";
import { createKnowledgeChromaCollectionService } from "./knowledge-chroma-collection.service.js";
import type {
  ChromaCollectionSummary,
  IndexerJsonRequestInput,
  KnowledgeChromaCollectionService,
  KnowledgeChromaMutationService,
} from "../types/knowledge.search.types.js";
import {
  createGatewayError,
  isIndexerRouteNotFoundError,
} from "../utils/knowledge-search.errors.js";
import type { MessageKey } from "@lib/locale.messages.js";
import { getFallbackMessage } from "@lib/locale.messages.js";

const NOOP_SETTINGS_REPOSITORY = {
  getSettings: async () => null,
} as unknown as SettingsRepository;

export const createKnowledgeChromaMutationService = ({
  env,
  settingsRepository = NOOP_SETTINGS_REPOSITORY,
  collectionService,
  getExistingCollection,
  deleteCachedCollection,
}: {
  env: AppEnv;
  settingsRepository?: SettingsRepository;
  collectionService?: KnowledgeChromaCollectionService;
  getExistingCollection?: (
    name: string,
    options?: { bypassCache?: boolean },
  ) => Promise<ChromaCollectionSummary | null>;
  deleteCachedCollection?: (name: string) => void;
}): KnowledgeChromaMutationService => {
  const resolvedCollectionService =
    collectionService ?? createKnowledgeChromaCollectionService({ env });
  const resolveExistingCollection =
    getExistingCollection ?? resolvedCollectionService.getExistingCollection;
  const clearCachedCollection =
    deleteCachedCollection ?? resolvedCollectionService.deleteCachedCollection;

  const requestIndexerHealth = async (): Promise<void> => {
    let responseBody: unknown = null;
    const indexingConfig = await getEffectiveIndexingConfig({
      env,
      repository: settingsRepository,
    });

    try {
      const response = await fetch(
        buildApiUrl(env.knowledge.indexerUrl, "/health"),
        {
          method: "GET",
          headers: {
            accept: "application/json",
          },
          signal: AbortSignal.timeout(indexingConfig.indexerTimeoutMs),
        },
      );

      responseBody = await response.text();

      if (!response.ok) {
        throw createGatewayError(
          "knowledge.search.indexer.healthFailed",
          {
            details: {
              status: response.status,
              responseBody,
            },
          },
        );
      }
    } catch (error) {
      if (error instanceof Error && "statusCode" in error) {
        throw error;
      }

      throw createGatewayError("knowledge.search.indexer.healthFailed", {
        cause: error,
      });
    }
  };

  const requestIndexerJson = async <T>({
    path,
    method = "GET",
    body,
    failureMessage,
  }: IndexerJsonRequestInput): Promise<T> => {
    let responseBody: unknown = null;
    const indexingConfig = await getEffectiveIndexingConfig({
      env,
      repository: settingsRepository,
    });

    try {
      const response = await fetch(buildApiUrl(env.knowledge.indexerUrl, path), {
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
        signal: AbortSignal.timeout(indexingConfig.indexerTimeoutMs),
      });

      const text = await response.text();

      if (text) {
        try {
          responseBody = JSON.parse(text);
        } catch {
          responseBody = text;
        }
      }

      if (!response.ok) {
        if (response.status === 404) {
          throw new AppError({
            statusCode: 404,
            code: "KNOWLEDGE_SEARCH_INDEXER_ROUTE_NOT_FOUND",
            message: failureMessage,
            messageKey: "knowledge.search.indexer.requestFailed",
            details: responseBody,
          });
        }

        throw createGatewayError(
          "knowledge.search.indexer.requestFailed",
          {
            details: {
              status: response.status,
              responseBody,
              failureMessage,
            },
          },
        );
      }

      return (responseBody ?? null) as T;
    } catch (error) {
      if (error instanceof Error && "statusCode" in error) {
        throw error;
      }

      throw createGatewayError("knowledge.search.indexer.requestFailed", {
        cause: error,
        details: {
          failureMessage,
        },
      });
    }
  };

  const deleteByWhere = async ({
    collectionName,
    where,
  }: {
    collectionName: string;
    where: Record<string, unknown>;
  }): Promise<void> => {
    const collection = await resolveExistingCollection(collectionName);
    if (!collection) {
      return;
    }

    await resolvedCollectionService.requestChromaJson({
      path: `/collections/${collection.id}/delete`,
      method: "POST",
      body: {
        where,
      },
    });
  };

  const deleteCollectionByName = async (
    collectionName: string,
  ): Promise<void> => {
    const collection = await resolveExistingCollection(collectionName, {
      bypassCache: true,
    });
    if (!collection) {
      return;
    }

    await resolvedCollectionService.requestChromaJson({
      path: `/collections/${collection.id}`,
      method: "DELETE",
    });
    clearCachedCollection(collectionName);
  };

  const deleteChunksViaIndexer = async ({
    path,
    collectionName,
    where,
    failureMessageKey,
  }: {
    path: string;
    collectionName: string;
    where: Record<string, unknown>;
    failureMessageKey: MessageKey;
  }): Promise<void> => {
    if (env.knowledge.indexerUrl) {
      try {
        await requestIndexerJson({
          path,
          method: "POST",
          body: {
            collectionName,
          },
          failureMessage: getFallbackMessage(failureMessageKey),
        });
        return;
      } catch (error) {
        if (!isIndexerRouteNotFoundError(error) || !env.chroma.url) {
          throw error;
        }
      }
    }

    if (!env.chroma.url) {
      return;
    }

    await deleteByWhere({
      collectionName,
      where,
    });
  };

  return {
    ensureCollections: async () => {
      await requestIndexerHealth();
    },
    deleteKnowledgeChunks: async (knowledgeId, { collectionName }) => {
      await deleteChunksViaIndexer({
        path: `/internal/v1/index/knowledge/${knowledgeId}/delete`,
        collectionName,
        where: {
          knowledgeId,
        },
        failureMessageKey: "knowledge.search.indexer.requestFailed",
      });
    },
    deleteDocumentChunks: async (documentId, { collectionName }) => {
      await deleteChunksViaIndexer({
        path: `/internal/v1/index/documents/${documentId}/delete`,
        collectionName,
        where: {
          documentId,
        },
        failureMessageKey: "knowledge.search.indexer.requestFailed",
      });
    },
    deleteCollection: async (collectionName) => {
      if (!env.chroma.url) {
        return;
      }

      await deleteCollectionByName(collectionName);
    },
  };
};
