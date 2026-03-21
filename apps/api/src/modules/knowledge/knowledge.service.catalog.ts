import { AppError } from "@lib/app-error.js";
import { normalizeIndexerErrorMessage } from "@lib/http.js";
import { requireVisibleProject } from "@modules/projects/projects.shared.js";
import {
  registerKnowledgeSearchResultGuard,
} from "./knowledge.search.js";
import { resolveNamespaceIndexContext } from "./knowledge.namespace.js";
import {
  cleanupEmptyNamespaceAfterKnowledgeDelete,
  createKnowledgeNotFoundError,
  createNamespaceRebuildingConflictError,
  requireAccessibleKnowledge,
  type KnowledgeServiceDependencies,
  validateCreateKnowledgeInput,
  validateCreateProjectKnowledgeInput,
  validateUpdateKnowledgeInput,
  buildKnowledgeActorProfileMap,
} from "./knowledge.service.helpers.js";
import { getFallbackMessage } from "@lib/locale.messages.js";
import { removeKnowledgeStorageRoot } from "./knowledge.storage.js";
import { toKnowledgeSummaryResponse } from "./knowledge.shared.js";
import type {
  CreateKnowledgeInput,
  KnowledgeCommandContext,
  KnowledgeMutationResponse,
  UpdateKnowledgeInput,
} from "./knowledge.types.js";

export const createKnowledgeCatalogHandlers = ({
  env,
  repository,
  searchService,
  authRepository,
  projectsRepository,
  settingsRepository,
}: KnowledgeServiceDependencies) => {
  registerKnowledgeSearchResultGuard(searchService, async (items) => {
    if (items.length === 0) {
      return items;
    }

    const knowledgeIds = Array.from(
      new Set(items.map((item) => item.knowledgeId).filter(Boolean)),
    );
    const documentIds = Array.from(
      new Set(items.map((item) => item.documentId).filter(Boolean)),
    );

    const [knowledgeEntries, documentEntries] = await Promise.all([
      Promise.all(
        knowledgeIds.map(async (knowledgeId) => [
          knowledgeId,
          await repository.findKnowledgeById(knowledgeId),
        ] as const),
      ),
      Promise.all(
        documentIds.map(async (documentId) => [
          documentId,
          await repository.findKnowledgeDocumentById(documentId),
        ] as const),
      ),
    ]);

    const existingKnowledgeIds = new Set<string>();
    for (const [knowledgeId, knowledge] of knowledgeEntries) {
      if (knowledge) {
        existingKnowledgeIds.add(knowledgeId);
      }
    }

    const documentsById = new Map<string, NonNullable<(typeof documentEntries)[number][1]>>();
    for (const [documentId, document] of documentEntries) {
      if (document) {
        documentsById.set(documentId, document);
      }
    }

    return items.filter((item) => {
      if (!existingKnowledgeIds.has(item.knowledgeId)) {
        return false;
      }

      return documentsById.get(item.documentId)?.knowledgeId === item.knowledgeId;
    });
  });

  return {
    createKnowledge: async (
      { actor }: KnowledgeCommandContext,
      input: CreateKnowledgeInput,
    ): Promise<KnowledgeMutationResponse> => {
      await repository.ensureMetadataModel();
      const knowledge = await repository.createKnowledgeBase(
        validateCreateKnowledgeInput(input, actor.id),
      );
      const actorProfileMap = await buildKnowledgeActorProfileMap(
        authRepository,
        [knowledge],
      );

      return {
        knowledge: toKnowledgeSummaryResponse(knowledge, actorProfileMap),
      };
    },

    createProjectKnowledge: async (
      { actor }: KnowledgeCommandContext,
      projectId: string,
      input: CreateKnowledgeInput,
    ): Promise<KnowledgeMutationResponse> => {
      await repository.ensureMetadataModel();
      await requireVisibleProject(projectsRepository, projectId, actor);
      const knowledge = await repository.createKnowledgeBase(
        validateCreateProjectKnowledgeInput(input, actor.id, projectId),
      );
      const actorProfileMap = await buildKnowledgeActorProfileMap(
        authRepository,
        [knowledge],
      );

      return {
        knowledge: toKnowledgeSummaryResponse(knowledge, actorProfileMap),
      };
    },

    updateKnowledge: async (
      { actor }: KnowledgeCommandContext,
      knowledgeId: string,
      input: UpdateKnowledgeInput,
    ): Promise<KnowledgeMutationResponse> => {
      await repository.ensureMetadataModel();
      await requireAccessibleKnowledge({
        repository,
        projectsRepository,
        actorId: actor.id,
        knowledgeId,
      });

      const patch = validateUpdateKnowledgeInput(input);
      const updatedKnowledge = await repository.updateKnowledgeBase(
        knowledgeId,
        {
          ...patch,
          updatedAt: new Date(),
        },
      );

      if (!updatedKnowledge) {
        throw createKnowledgeNotFoundError();
      }

      const actorProfileMap = await buildKnowledgeActorProfileMap(
        authRepository,
        [updatedKnowledge],
      );

      return {
        knowledge: toKnowledgeSummaryResponse(
          updatedKnowledge,
          actorProfileMap,
        ),
      };
    },

    deleteKnowledge: async (
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

      try {
        await searchService.deleteKnowledgeChunks(knowledgeId, {
          collectionName,
        });
      } catch (error) {
        throw new AppError({
          statusCode: 502,
          code: "KNOWLEDGE_VECTOR_DELETE_FAILED",
          message: getFallbackMessage("knowledge.vectorDeleteFailed"),
          messageKey: "knowledge.vectorDeleteFailed",
          cause: error,
          details: {
            knowledgeId,
            collectionName,
            reason: normalizeIndexerErrorMessage(
              error,
              "Chroma 知识库向量清理失败",
            ),
          },
        });
      }

      await repository.deleteKnowledgeDocumentsByKnowledgeId(knowledgeId);
      const deleted = await repository.deleteKnowledgeBase(knowledgeId);

      if (!deleted) {
        throw createKnowledgeNotFoundError();
      }

      await removeKnowledgeStorageRoot({
        env,
        knowledge,
        knowledgeId,
      });

      await cleanupEmptyNamespaceAfterKnowledgeDelete({
        repository,
        searchService,
        namespaceContext,
      });
    },
  };
};
