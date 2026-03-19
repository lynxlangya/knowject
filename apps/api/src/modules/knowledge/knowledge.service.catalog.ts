import { requireVisibleProject } from "@modules/projects/projects.shared.js";
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
        const message =
          error instanceof Error ? error.message : "Unknown error";
        console.warn(
          `[knowledge-search] failed to cleanup knowledge ${knowledgeId} chunks before delete: ${message}`,
        );
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
