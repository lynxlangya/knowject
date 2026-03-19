import { join } from "node:path";
import { normalizeIndexerErrorMessage } from "@lib/http.js";
import { processUploadedDocument } from "./indexing/knowledge-document-processing.service.js";
import {
  markNamespaceDocumentsPending as markNamespaceDocumentsPendingImpl,
  runNamespaceRebuild,
} from "./indexing/knowledge-namespace-rebuild.service.js";
import {
  markKnowledgeDocumentPendingForRecovery,
  markKnowledgeDocumentPendingIfRetryable,
  markKnowledgeSummaryPending,
} from "./knowledge.repository.js";
import type {
  KnowledgeEmbeddingMetadata,
  QueueExistingKnowledgeDocumentInput,
  QueueKnowledgeDocumentProcessingInput,
  QueueNamespaceRebuildInput,
  QueueRecoverableKnowledgeDocumentInput,
} from "./types/knowledge-index-orchestrator.types.js";
import { persistProcessingFailure as persistProcessingFailureImpl } from "./utils/knowledge-processing-failure.js";

export type { KnowledgeEmbeddingMetadata } from "./types/knowledge-index-orchestrator.types.js";

const queueDetachedTask = (
  task: () => Promise<void>,
  buildCrashMessage: () => string,
): void => {
  setImmediate(() => {
    void task().catch((error) => {
      console.error(
        `${buildCrashMessage()} ${normalizeIndexerErrorMessage(error)}`,
      );
    });
  });
};

interface StoredDocumentProcessingInput {
  env: QueueKnowledgeDocumentProcessingInput["env"];
  repository: QueueKnowledgeDocumentProcessingInput["repository"];
  searchService: QueueKnowledgeDocumentProcessingInput["searchService"];
  settingsRepository: QueueKnowledgeDocumentProcessingInput["settingsRepository"];
  knowledgeId: string;
  document: QueueRecoverableKnowledgeDocumentInput["document"];
  sourceType: QueueKnowledgeDocumentProcessingInput["sourceType"];
  collectionName: string;
  embeddingConfig: QueueKnowledgeDocumentProcessingInput["embeddingConfig"];
  indexingConfig: QueueKnowledgeDocumentProcessingInput["indexingConfig"];
  embeddingMetadata: KnowledgeEmbeddingMetadata;
  mode: NonNullable<QueueKnowledgeDocumentProcessingInput["mode"]>;
}

const buildStoredDocumentProcessingInput = ({
  env,
  repository,
  searchService,
  settingsRepository,
  knowledgeId,
  document,
  sourceType,
  collectionName,
  embeddingConfig,
  indexingConfig,
  embeddingMetadata,
  mode,
}: StoredDocumentProcessingInput): QueueKnowledgeDocumentProcessingInput => {
  return {
    env,
    repository,
    searchService,
    settingsRepository,
    knowledgeId,
    documentId: document._id.toHexString(),
    storagePath: join(env.knowledge.storageRoot, document.storagePath),
    fileName: document.fileName,
    mimeType: document.mimeType,
    sourceType,
    collectionName,
    documentVersionHash: document.documentVersionHash,
    embeddingConfig,
    indexingConfig,
    embeddingMetadata,
    mode,
  };
};

export const queueKnowledgeDocumentProcessing = (
  input: QueueKnowledgeDocumentProcessingInput,
): void => {
  queueDetachedTask(
    () => processUploadedDocument(input),
    () =>
      `[knowledge-indexer] detached processing crashed for document ${input.documentId}:`,
  );
};

export const queueExistingKnowledgeDocument = async ({
  env,
  repository,
  searchService,
  settingsRepository,
  knowledgeId,
  document,
  sourceType,
  collectionName,
  embeddingConfig,
  indexingConfig,
  embeddingMetadata,
  mode,
  createKnowledgeDocumentNotFoundError,
  createKnowledgeDocumentConflictError,
}: QueueExistingKnowledgeDocumentInput): Promise<void> => {
  const queuedAt = new Date();
  const queuedDocument = await markKnowledgeDocumentPendingIfRetryable(
    repository,
    document._id.toHexString(),
    queuedAt,
  );

  if (!queuedDocument) {
    const latestDocument = await repository.findKnowledgeDocumentById(
      document._id.toHexString(),
    );

    if (!latestDocument) {
      throw createKnowledgeDocumentNotFoundError();
    }

    if (createKnowledgeDocumentConflictError) {
      throw createKnowledgeDocumentConflictError();
    }

    return;
  }

  await markKnowledgeSummaryPending(repository, knowledgeId, queuedAt);

  queueKnowledgeDocumentProcessing(
    buildStoredDocumentProcessingInput({
      env,
      repository,
      searchService,
      settingsRepository,
      knowledgeId,
      document,
      sourceType,
      collectionName,
      embeddingConfig,
      indexingConfig,
      embeddingMetadata,
      mode,
    }),
  );
};

export const queueRecoverableKnowledgeDocument = async ({
  env,
  repository,
  searchService,
  settingsRepository,
  knowledgeId,
  document,
  sourceType,
  collectionName,
  embeddingConfig,
  indexingConfig,
  embeddingMetadata,
}: QueueRecoverableKnowledgeDocumentInput): Promise<void> => {
  const queuedAt = new Date();
  const queuedDocument = await markKnowledgeDocumentPendingForRecovery(
    repository,
    document._id.toHexString(),
    queuedAt,
  );

  if (!queuedDocument) {
    const latestDocument = await repository.findKnowledgeDocumentById(
      document._id.toHexString(),
    );

    if (!latestDocument) {
      return;
    }

    return;
  }

  await markKnowledgeSummaryPending(repository, knowledgeId, queuedAt);

  queueKnowledgeDocumentProcessing(
    buildStoredDocumentProcessingInput({
      env,
      repository,
      searchService,
      settingsRepository,
      knowledgeId,
      document,
      sourceType,
      collectionName,
      embeddingConfig,
      indexingConfig,
      embeddingMetadata,
      mode: "index",
    }),
  );
};

export const persistProcessingFailure = persistProcessingFailureImpl;

export const markNamespaceDocumentsPending = (
  input: Parameters<typeof markNamespaceDocumentsPendingImpl>[0],
): Promise<void> => {
  return markNamespaceDocumentsPendingImpl(input);
};

export const queueNamespaceRebuild = ({
  env,
  repository,
  searchService,
  settingsRepository,
  namespaceContext,
  documents,
}: QueueNamespaceRebuildInput): void => {
  queueDetachedTask(
    () =>
      runNamespaceRebuild({
        env,
        repository,
        searchService,
        settingsRepository,
        namespaceContext,
        documents,
      }),
    () =>
      `[knowledge-indexer] detached namespace rebuild crashed for ${namespaceContext.namespace.namespaceKey}:`,
  );
};
