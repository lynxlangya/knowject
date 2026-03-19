import { createNamespaceIndexState, createNamespaceRebuildStateDocument, listNamespaceDocuments, resolveNamespaceIndexContext, type ResolvedNamespaceIndexContext } from "./knowledge.namespace.js";
import { markKnowledgeNamespaceRebuildingIfIdle } from "./knowledge.repository.js";
import {
  markNamespaceDocumentsPending,
  queueNamespaceRebuild,
} from "./knowledge.index-orchestrator.js";
import type { KnowledgeCommandContext } from "./knowledge.types.js";
import {
  buildNamespaceRebuildTargetCollectionName,
  createKnowledgeRebuildConflictError,
  createKnowledgeRebuildEmptyError,
  createNamespaceRebuildingConflictError,
  requireAccessibleKnowledge,
  type KnowledgeServiceDependencies,
} from "./knowledge.service.helpers.js";

export const createKnowledgeRebuildHandlers = ({
  env,
  repository,
  searchService,
  projectsRepository,
  settingsRepository,
}: KnowledgeServiceDependencies) => {
  return {
    rebuildKnowledge: async (
      { actor }: KnowledgeCommandContext,
      knowledgeId: string,
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

      const documents =
        await repository.listDocumentsByKnowledgeId(knowledgeId);

      if (documents.length === 0) {
        throw createKnowledgeRebuildEmptyError();
      }

      if (
        documents.some(
          (document) =>
            document.status === "pending" || document.status === "processing",
        )
      ) {
        throw createKnowledgeRebuildConflictError();
      }

      if (
        namespaceContext.mode === "versioned" &&
        namespaceContext.state.rebuildStatus === "rebuilding"
      ) {
        throw createNamespaceRebuildingConflictError();
      }

      const namespaceDocuments = await listNamespaceDocuments(
        repository,
        namespaceContext.namespace,
      );

      if (
        namespaceDocuments.some(
          (document) =>
            document.status === "pending" || document.status === "processing",
        )
      ) {
        throw createKnowledgeRebuildConflictError();
      }

      let rebuildContext: Extract<
        ResolvedNamespaceIndexContext,
        { mode: "versioned" }
      >;

      if (namespaceContext.mode === "versioned") {
        const patch = {
          rebuildStatus: "rebuilding" as const,
          targetCollectionName: buildNamespaceRebuildTargetCollectionName({
            namespaceKey: namespaceContext.namespace.namespaceKey,
            fingerprint: namespaceContext.currentEmbeddingFingerprint,
            activeCollectionName: namespaceContext.state.activeCollectionName,
          }),
          targetEmbeddingProvider:
            namespaceContext.currentEmbeddingConfig.provider,
          targetEmbeddingBaseUrl:
            namespaceContext.currentEmbeddingConfig.baseUrl,
          targetEmbeddingModel: namespaceContext.currentEmbeddingConfig.model,
          targetEmbeddingFingerprint:
            namespaceContext.currentEmbeddingFingerprint,
          lastErrorMessage: null,
          updatedAt: new Date(),
        };
        const updatedState = await markKnowledgeNamespaceRebuildingIfIdle(
          repository,
          namespaceContext.namespace.namespaceKey,
          patch,
        );

        if (!updatedState) {
          throw createNamespaceRebuildingConflictError();
        }

        rebuildContext = {
          ...namespaceContext,
          mode: "versioned",
          state: updatedState,
        };
      } else {
        const now = new Date();
        const stateDocument = createNamespaceRebuildStateDocument({
          namespace: namespaceContext.namespace,
          activeCollectionName: namespaceContext.namespace.namespaceKey,
          embeddingConfig: namespaceContext.currentEmbeddingConfig,
          embeddingFingerprint: namespaceContext.currentEmbeddingFingerprint,
          now,
        });

        const createdState = await createNamespaceIndexState(
          repository,
          stateDocument,
        );
        rebuildContext = {
          ...namespaceContext,
          mode: "versioned",
          state: createdState,
        };
      }

      await markNamespaceDocumentsPending({
        repository,
        documents: namespaceDocuments,
      });

      queueNamespaceRebuild({
        env,
        repository,
        searchService,
        settingsRepository,
        namespaceContext: rebuildContext,
        documents: namespaceDocuments,
      });
    },
  };
};
