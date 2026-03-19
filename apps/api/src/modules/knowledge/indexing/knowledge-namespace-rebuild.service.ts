import { join } from "node:path";
import { getEffectiveIndexingConfig } from "@config/ai-config.js";
import { encryptApiKey } from "@lib/crypto.js";
import { normalizeIndexerErrorMessage } from "@lib/http.js";
import {
  createNamespaceIndexState,
  createNamespaceStateDocument,
  listDocumentsForKnowledgeIds,
  updateNamespaceIndexState,
} from "../knowledge.namespace.js";
import { markKnowledgeSummaryPending } from "../knowledge.repository.js";
import { buildVersionedKnowledgeCollectionName, toKnowledgeEmbeddingMetadata } from "../knowledge.shared.js";
import type {
  MarkNamespaceDocumentsPendingInput,
  RunNamespaceRebuildInput,
} from "../types/knowledge-index-orchestrator.types.js";
import { processUploadedDocument } from "./knowledge-document-processing.service.js";

export const markNamespaceDocumentsPending = async ({
  repository,
  documents,
}: MarkNamespaceDocumentsPendingInput): Promise<void> => {
  const queuedAt = new Date();
  const knowledgeIds = Array.from(
    new Set(documents.map((document) => document.knowledgeId)),
  );

  const batchMarkPending = (
    repository as typeof repository & {
      markKnowledgeDocumentsPendingByKnowledgeIds?: (
        knowledgeIds: string[],
        updatedAt: Date,
      ) => Promise<void>;
    }
  ).markKnowledgeDocumentsPendingByKnowledgeIds;

  if (typeof batchMarkPending === "function") {
    await batchMarkPending.call(repository, knowledgeIds, queuedAt);
    return;
  }

  await Promise.all(
    documents.map((document) =>
      repository.updateKnowledgeDocument(document._id.toHexString(), {
        status: "pending",
        errorMessage: null,
        processedAt: null,
        updatedAt: queuedAt,
      }),
    ),
  );

  await Promise.all(
    knowledgeIds.map((knowledgeId) =>
      markKnowledgeSummaryPending(repository, knowledgeId, queuedAt),
    ),
  );
};

export const runNamespaceRebuild = async ({
  env,
  repository,
  searchService,
  settingsRepository,
  namespaceContext,
  documents,
}: RunNamespaceRebuildInput): Promise<void> => {
  const targetCollectionName =
    namespaceContext.mode === "versioned" &&
    namespaceContext.state.targetCollectionName
      ? namespaceContext.state.targetCollectionName
      : buildVersionedKnowledgeCollectionName(
          namespaceContext.namespace.namespaceKey,
          namespaceContext.currentEmbeddingFingerprint,
        );
  const previousCollectionName =
    namespaceContext.mode === "versioned"
      ? namespaceContext.state.activeCollectionName
      : namespaceContext.namespace.namespaceKey;
  const embeddingMetadata = toKnowledgeEmbeddingMetadata(
    namespaceContext.currentEmbeddingConfig,
  );
  const indexingConfig = await getEffectiveIndexingConfig({
    env,
    repository: settingsRepository,
  });

  for (const document of documents) {
    await processUploadedDocument({
      env,
      repository,
      searchService,
      settingsRepository,
      knowledgeId: document.knowledgeId,
      documentId: document._id.toHexString(),
      storagePath: join(env.knowledge.storageRoot, document.storagePath),
      fileName: document.fileName,
      mimeType: document.mimeType,
      sourceType: namespaceContext.namespace.sourceType,
      collectionName: targetCollectionName,
      documentVersionHash: document.documentVersionHash,
      embeddingConfig: namespaceContext.currentEmbeddingConfig,
      indexingConfig,
      embeddingMetadata,
      mode: "rebuild",
    });
  }

  const refreshedDocuments = await listDocumentsForKnowledgeIds({
    repository,
    knowledgeIds: documents.map((document) => document.knowledgeId),
  });
  const rebuildDocuments = refreshedDocuments.filter((document) =>
    documents.some((item) => item._id.equals(document._id)),
  );
  const failedDocument = rebuildDocuments.find(
    (document) => document.status !== "completed",
  );

  if (failedDocument) {
    if (namespaceContext.mode === "versioned") {
      await updateNamespaceIndexState(
        repository,
        namespaceContext.namespace.namespaceKey,
        {
          rebuildStatus: "failed",
          lastErrorMessage: failedDocument.errorMessage ?? "命名空间重建失败",
          updatedAt: new Date(),
        },
      );
    }
    return;
  }

  const updatedAt = new Date();

  if (namespaceContext.mode === "versioned") {
    await updateNamespaceIndexState(
      repository,
      namespaceContext.namespace.namespaceKey,
      {
        activeCollectionName: targetCollectionName,
        activeEmbeddingProvider:
          namespaceContext.currentEmbeddingConfig.provider,
        activeApiKeyEncrypted: namespaceContext.currentEmbeddingConfig.apiKey
          ? encryptApiKey(namespaceContext.currentEmbeddingConfig.apiKey)
          : null,
        activeEmbeddingBaseUrl: namespaceContext.currentEmbeddingConfig.baseUrl,
        activeEmbeddingModel: namespaceContext.currentEmbeddingConfig.model,
        activeEmbeddingFingerprint:
          namespaceContext.currentEmbeddingFingerprint,
        rebuildStatus: "idle",
        targetCollectionName: null,
        targetEmbeddingProvider: null,
        targetEmbeddingBaseUrl: null,
        targetEmbeddingModel: null,
        targetEmbeddingFingerprint: null,
        lastErrorMessage: null,
        updatedAt,
      },
    );
  } else {
    await createNamespaceIndexState(
      repository,
      createNamespaceStateDocument({
        namespace: namespaceContext.namespace,
        embeddingConfig: namespaceContext.currentEmbeddingConfig,
        embeddingFingerprint: namespaceContext.currentEmbeddingFingerprint,
        now: updatedAt,
      }),
    );
  }

  if (previousCollectionName !== targetCollectionName) {
    try {
      await searchService.deleteCollection(previousCollectionName);
    } catch (error) {
      console.warn(
        `[knowledge-search] failed to cleanup stale collection ${previousCollectionName}: ${normalizeIndexerErrorMessage(
          error,
          "Chroma collection 清理失败",
        )}`,
      );
    }
  }
};
