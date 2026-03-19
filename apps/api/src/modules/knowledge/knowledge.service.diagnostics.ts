import { getEffectiveIndexingConfig } from "@config/ai-config.js";
import {
  isStaleProcessingDocument,
  readKnowledgeIndexerDiagnostics,
  resolveDiagnosticsErrorMessage,
} from "./knowledge.diagnostics.js";
import { resolveNamespaceIndexContext } from "./knowledge.namespace.js";
import { readDocumentStoragePresence } from "./knowledge.storage.js";
import type {
  KnowledgeCommandContext,
  KnowledgeDiagnosticsResponse,
} from "./knowledge.types.js";
import {
  requireAccessibleKnowledge,
  type KnowledgeServiceDependencies,
} from "./knowledge.service.helpers.js";

export const createKnowledgeDiagnosticsHandlers = ({
  env,
  repository,
  searchService,
  projectsRepository,
  settingsRepository,
}: KnowledgeServiceDependencies) => {
  return {
    getKnowledgeDiagnostics: async (
      { actor }: KnowledgeCommandContext,
      knowledgeId: string,
    ): Promise<KnowledgeDiagnosticsResponse> => {
      await repository.ensureMetadataModel();
      const knowledge = await requireAccessibleKnowledge({
        repository,
        projectsRepository,
        actorId: actor.id,
        knowledgeId,
      });
      const namespaceContext = await resolveNamespaceIndexContext({
        env,
        repository,
        settingsRepository,
        knowledge,
      });

      const documents =
        await repository.listDocumentsByKnowledgeId(knowledgeId);
      const now = new Date();
      const documentsWithStorageState = await Promise.all(
        documents.map(async (document) => {
          const storageExists = await readDocumentStoragePresence({
            env,
            document,
          });
          const staleProcessing = isStaleProcessingDocument(document, now);

          return {
            document,
            storageExists,
            staleProcessing,
          };
        }),
      );

      const collectionDiagnostics = await searchService.getDiagnostics({
        collectionName:
          namespaceContext.mode === "versioned"
            ? namespaceContext.state.activeCollectionName
            : namespaceContext.namespace.namespaceKey,
      });
      const effectiveEmbeddingConfig = namespaceContext.currentEmbeddingConfig;
      const effectiveIndexingConfig = await getEffectiveIndexingConfig({
        env,
        repository: settingsRepository,
      });
      let indexerDiagnostics: KnowledgeDiagnosticsResponse["indexer"];

      try {
        const diagnostics = await readKnowledgeIndexerDiagnostics(
          env,
          settingsRepository,
        );
        indexerDiagnostics = {
          status: diagnostics.status,
          service: diagnostics.service,
          supportedFormats: [...diagnostics.supportedFormats],
          chunkSize: diagnostics.chunkSize,
          chunkOverlap: diagnostics.chunkOverlap,
          embeddingProvider: diagnostics.embeddingProvider,
          chromaReachable: diagnostics.chromaReachable,
          errorMessage: diagnostics.errorMessage,
          expected: {
            supportedFormats: [...effectiveIndexingConfig.supportedTypes],
            chunkSize: effectiveIndexingConfig.chunkSize,
            chunkOverlap: effectiveIndexingConfig.chunkOverlap,
            embeddingProvider: effectiveEmbeddingConfig.provider,
          },
        };
      } catch (error) {
        indexerDiagnostics = {
          status: "degraded",
          service: null,
          supportedFormats: [],
          chunkSize: null,
          chunkOverlap: null,
          embeddingProvider: null,
          chromaReachable: null,
          errorMessage: resolveDiagnosticsErrorMessage(error),
          expected: {
            supportedFormats: [...effectiveIndexingConfig.supportedTypes],
            chunkSize: effectiveIndexingConfig.chunkSize,
            chunkOverlap: effectiveIndexingConfig.chunkOverlap,
            embeddingProvider: effectiveEmbeddingConfig.provider,
          },
        };
      }

      const activeEmbeddingProvider =
        namespaceContext.mode === "versioned"
          ? namespaceContext.state.activeEmbeddingProvider
          : null;
      const activeEmbeddingModel =
        namespaceContext.mode === "versioned"
          ? namespaceContext.state.activeEmbeddingModel
          : null;
      const activeEmbeddingFingerprint =
        namespaceContext.mode === "versioned"
          ? namespaceContext.state.activeEmbeddingFingerprint
          : null;
      const targetCollectionName =
        namespaceContext.mode === "versioned"
          ? namespaceContext.state.targetCollectionName
          : null;
      const targetEmbeddingProvider =
        namespaceContext.mode === "versioned"
          ? namespaceContext.state.targetEmbeddingProvider
          : null;
      const targetEmbeddingModel =
        namespaceContext.mode === "versioned"
          ? namespaceContext.state.targetEmbeddingModel
          : null;
      const namespaceRebuildStatus =
        namespaceContext.mode === "versioned"
          ? namespaceContext.state.rebuildStatus
          : null;
      const namespaceLastErrorMessage =
        namespaceContext.mode === "versioned"
          ? namespaceContext.state.lastErrorMessage
          : null;

      return {
        knowledgeId,
        sourceType: knowledge.sourceType,
        expectedCollectionName: collectionDiagnostics.collection.name,
        indexStatus: knowledge.indexStatus,
        namespace: {
          key: namespaceContext.namespace.namespaceKey,
          mode: namespaceContext.mode,
          activeCollectionName: collectionDiagnostics.collection.name,
          activeEmbeddingProvider,
          activeEmbeddingModel,
          activeEmbeddingFingerprint,
          rebuildStatus: namespaceRebuildStatus,
          targetCollectionName,
          targetEmbeddingProvider,
          targetEmbeddingModel,
          lastErrorMessage: namespaceLastErrorMessage,
          currentEmbeddingProvider: effectiveEmbeddingConfig.provider,
          currentEmbeddingModel: effectiveEmbeddingConfig.model,
          currentMatchesActive:
            activeEmbeddingFingerprint === null
              ? null
              : activeEmbeddingFingerprint ===
                namespaceContext.currentEmbeddingFingerprint,
        },
        documentSummary: {
          total: documents.length,
          pending: documents.filter((document) => document.status === "pending")
            .length,
          processing: documents.filter(
            (document) => document.status === "processing",
          ).length,
          completed: documents.filter(
            (document) => document.status === "completed",
          ).length,
          failed: documents.filter((document) => document.status === "failed")
            .length,
          missingStorage: documentsWithStorageState.filter(
            (item) => !item.storageExists,
          ).length,
          staleProcessing: documentsWithStorageState.filter(
            (item) => item.staleProcessing,
          ).length,
        },
        collection: collectionDiagnostics.collection,
        indexer: indexerDiagnostics,
        documents: documentsWithStorageState.map(
          ({ document, storageExists, staleProcessing }) => ({
            id: document._id.toHexString(),
            status: document.status,
            fileName: document.fileName,
            retryCount: document.retryCount,
            lastIndexedAt: document.lastIndexedAt?.toISOString() ?? null,
            errorMessage: document.errorMessage,
            updatedAt: document.updatedAt.toISOString(),
            missingStorage: !storageExists,
            staleProcessing,
          }),
        ),
      };
    },
  };
};
