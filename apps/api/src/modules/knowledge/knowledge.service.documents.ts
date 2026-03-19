import {
  getEffectiveIndexingConfig,
} from "@config/ai-config.js";
import { normalizeIndexerErrorMessage } from "@lib/http.js";
import { queueExistingKnowledgeDocument } from "./knowledge.index-orchestrator.js";
import { resolveNamespaceIndexContext } from "./knowledge.namespace.js";
import { adjustKnowledgeSummaryAfterDocumentRemoval } from "./knowledge.repository.js";
import { removeKnowledgeDocumentStorage } from "./knowledge.storage.js";
import type {
  KnowledgeCommandContext,
  UploadedKnowledgeFile,
} from "./knowledge.types.js";
import {
  assertNamespaceReadyForMutation,
  createDocumentRetryConflictError,
  createKnowledgeDocumentNotFoundError,
  createNamespaceRebuildingConflictError,
  requireAccessibleKnowledge,
  requireProjectScopedKnowledge,
  resolveEmbeddingMetadata,
  type KnowledgeServiceDependencies,
} from "./knowledge.service.helpers.js";
import { uploadKnowledgeDocument } from "./knowledge.service.upload.js";

export const createKnowledgeDocumentHandlers = ({
  env,
  repository,
  searchService,
  authRepository,
  projectsRepository,
  settingsRepository,
}: KnowledgeServiceDependencies) => {
  return {
    deleteDocument: async (
      { actor }: KnowledgeCommandContext,
      knowledgeId: string,
      documentId: string,
    ): Promise<void> => {
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

      if (
        namespaceContext.mode === "versioned" &&
        namespaceContext.state.rebuildStatus === "rebuilding"
      ) {
        throw createNamespaceRebuildingConflictError();
      }

      const collectionName =
        namespaceContext.mode === "versioned"
          ? namespaceContext.state.activeCollectionName
          : namespaceContext.namespace.namespaceKey;

      const document = await repository.findKnowledgeDocumentById(documentId);

      if (!document || document.knowledgeId !== knowledgeId) {
        throw createKnowledgeDocumentNotFoundError();
      }

      try {
        await searchService.deleteDocumentChunks(documentId, {
          collectionName,
        });
      } catch (error) {
        console.warn(
          `[knowledge-search] failed to cleanup document ${documentId} chunks before delete: ${normalizeIndexerErrorMessage(
            error,
            "Chroma 文档向量清理失败",
          )}`,
        );
      }

      const deleted = await repository.deleteKnowledgeDocumentById(documentId);

      if (!deleted) {
        throw createKnowledgeDocumentNotFoundError();
      }

      await removeKnowledgeDocumentStorage({
        env,
        knowledge,
        knowledgeId,
        documentId,
      });

      await adjustKnowledgeSummaryAfterDocumentRemoval(
        repository,
        knowledgeId,
        {
          removedChunkCount: document.chunkCount,
          updatedAt: new Date(),
        },
      );
    },

    uploadDocument: async (
      { actor }: KnowledgeCommandContext,
      knowledgeId: string,
      file: UploadedKnowledgeFile,
    ) => {
      await repository.ensureMetadataModel();
      const knowledge = await requireAccessibleKnowledge({
        repository,
        projectsRepository,
        actorId: actor.id,
        knowledgeId,
      });
      return uploadKnowledgeDocument({
        env,
        repository,
        searchService,
        authRepository,
        settingsRepository,
        actor,
        knowledgeId,
        knowledge,
        file,
        projectsRepository,
      });
    },

    uploadProjectKnowledgeDocument: async (
      { actor }: KnowledgeCommandContext,
      projectId: string,
      knowledgeId: string,
      file: UploadedKnowledgeFile,
    ) => {
      await repository.ensureMetadataModel();
      const knowledge = await requireProjectScopedKnowledge({
        repository,
        projectsRepository,
        actor,
        projectId,
        knowledgeId,
      });

      return uploadKnowledgeDocument({
        env,
        repository,
        searchService,
        authRepository,
        settingsRepository,
        actor,
        knowledgeId,
        knowledge,
        file,
        projectsRepository,
      });
    },

    retryDocument: async (
      { actor }: KnowledgeCommandContext,
      knowledgeId: string,
      documentId: string,
    ): Promise<void> => {
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
      const activeState = assertNamespaceReadyForMutation(namespaceContext);
      const [indexingConfig, embeddingMetadata] = await Promise.all([
        getEffectiveIndexingConfig({
          env,
          repository: settingsRepository,
        }),
        resolveEmbeddingMetadata({
          env,
          settingsRepository,
          embeddingConfig: namespaceContext.currentEmbeddingConfig,
        }),
      ]);

      const document = await repository.findKnowledgeDocumentById(documentId);

      if (!document || document.knowledgeId !== knowledgeId) {
        throw createKnowledgeDocumentNotFoundError();
      }

      if (document.status === "pending" || document.status === "processing") {
        throw createDocumentRetryConflictError();
      }

      await queueExistingKnowledgeDocument({
        env,
        repository,
        searchService,
        settingsRepository,
        knowledgeId,
        document,
        sourceType: knowledge.sourceType,
        collectionName: activeState.activeCollectionName,
        embeddingConfig: namespaceContext.currentEmbeddingConfig,
        indexingConfig,
        embeddingMetadata,
        mode: "index",
        createKnowledgeDocumentNotFoundError,
        createKnowledgeDocumentConflictError: createDocumentRetryConflictError,
      });
    },

    rebuildDocument: async (
      { actor }: KnowledgeCommandContext,
      knowledgeId: string,
      documentId: string,
    ): Promise<void> => {
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
      const activeState = assertNamespaceReadyForMutation(namespaceContext);
      const [indexingConfig, embeddingMetadata] = await Promise.all([
        getEffectiveIndexingConfig({
          env,
          repository: settingsRepository,
        }),
        resolveEmbeddingMetadata({
          env,
          settingsRepository,
          embeddingConfig: namespaceContext.currentEmbeddingConfig,
        }),
      ]);

      const document = await repository.findKnowledgeDocumentById(documentId);

      if (!document || document.knowledgeId !== knowledgeId) {
        throw createKnowledgeDocumentNotFoundError();
      }

      if (document.status === "pending" || document.status === "processing") {
        throw createDocumentRetryConflictError();
      }

      await queueExistingKnowledgeDocument({
        env,
        repository,
        searchService,
        settingsRepository,
        knowledgeId,
        document,
        sourceType: knowledge.sourceType,
        collectionName: activeState.activeCollectionName,
        embeddingConfig: namespaceContext.currentEmbeddingConfig,
        indexingConfig,
        embeddingMetadata,
        mode: "rebuild",
        createKnowledgeDocumentNotFoundError,
        createKnowledgeDocumentConflictError: createDocumentRetryConflictError,
      });
    },
  };
};
