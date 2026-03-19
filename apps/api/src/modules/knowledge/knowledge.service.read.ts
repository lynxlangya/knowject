import { requireVisibleProject } from "@modules/projects/projects.shared.js";
import {
  type GroupedKnowledgeSearchHits,
  mergeKnowledgeSearchHitGroups,
  searchKnowledgeNamespaceDocuments,
} from "./knowledge.project-search.js";
import { resolveActiveEmbeddingConfig, resolveNamespaceIndexContext, resolveSearchCollectionName } from "./knowledge.namespace.js";
import { resolveKnowledgeScope, toKnowledgeSummaryResponse } from "./knowledge.shared.js";
import type {
  KnowledgeCommandContext,
  KnowledgeListResponse,
  KnowledgeSearchResponse,
  SearchKnowledgeDocumentsInput,
  SearchProjectKnowledgeDocumentsInput,
} from "./knowledge.types.js";
import {
  buildKnowledgeActorProfileMap,
  buildKnowledgeDetailEnvelope,
  requireAccessibleKnowledge,
  requireProjectScopedKnowledge,
  type KnowledgeServiceDependencies,
  validateSearchDocumentsInput,
  validateSearchProjectDocumentsInput,
} from "./knowledge.service.helpers.js";

export const createKnowledgeReadHandlers = ({
  env,
  repository,
  searchService,
  authRepository,
  projectsRepository,
  settingsRepository,
}: KnowledgeServiceDependencies) => {
  return {
    listKnowledge: async (
      context: KnowledgeCommandContext,
    ): Promise<KnowledgeListResponse> => {
      void context;
      await repository.ensureMetadataModel();
      const items = await repository.listKnowledgeBases({ scope: "global" });
      const actorProfileMap = await buildKnowledgeActorProfileMap(
        authRepository,
        items,
      );

      return {
        total: items.length,
        items: items.map((knowledge) =>
          toKnowledgeSummaryResponse(knowledge, actorProfileMap),
        ),
      };
    },

    listProjectKnowledge: async (
      { actor }: KnowledgeCommandContext,
      projectId: string,
    ): Promise<KnowledgeListResponse> => {
      await repository.ensureMetadataModel();
      await requireVisibleProject(projectsRepository, projectId, actor);
      const items = await repository.listKnowledgeBases({
        scope: "project",
        projectId,
      });
      const actorProfileMap = await buildKnowledgeActorProfileMap(
        authRepository,
        items,
      );

      return {
        total: items.length,
        items: items.map((knowledge) =>
          toKnowledgeSummaryResponse(knowledge, actorProfileMap),
        ),
      };
    },

    getKnowledgeDetail: async (
      { actor }: KnowledgeCommandContext,
      knowledgeId: string,
    ) => {
      await repository.ensureMetadataModel();
      const knowledge = await requireAccessibleKnowledge({
        repository,
        projectsRepository,
        actorId: actor.id,
        knowledgeId,
      });

      return buildKnowledgeDetailEnvelope({
        repository,
        authRepository,
        knowledgeId,
        knowledge,
      });
    },

    getProjectKnowledgeDetail: async (
      { actor }: KnowledgeCommandContext,
      projectId: string,
      knowledgeId: string,
    ) => {
      await repository.ensureMetadataModel();
      const knowledge = await requireProjectScopedKnowledge({
        repository,
        projectsRepository,
        actor,
        projectId,
        knowledgeId,
      });

      return buildKnowledgeDetailEnvelope({
        repository,
        authRepository,
        knowledgeId,
        knowledge,
      });
    },

    searchDocuments: async (
      { actor }: KnowledgeCommandContext,
      input: SearchKnowledgeDocumentsInput,
    ): Promise<KnowledgeSearchResponse> => {
      const validatedInput = validateSearchDocumentsInput(input);

      if (!validatedInput.knowledgeId) {
        await repository.ensureMetadataModel();
        const namespaceContext = await resolveNamespaceIndexContext({
          env,
          repository,
          settingsRepository,
          knowledge: {
            scope: "global",
            projectId: null,
            sourceType: validatedInput.sourceType,
          },
        });
        return searchService.searchDocuments({
          ...validatedInput,
          collectionName: resolveSearchCollectionName(namespaceContext),
          embeddingConfig: resolveActiveEmbeddingConfig(namespaceContext),
        });
      }

      await repository.ensureMetadataModel();
      const knowledge = await requireAccessibleKnowledge({
        repository,
        projectsRepository,
        actorId: actor.id,
        knowledgeId: validatedInput.knowledgeId,
      });
      const namespaceContext = await resolveNamespaceIndexContext({
        env,
        repository,
        settingsRepository,
        knowledge,
      });

      return searchService.searchDocuments({
        ...validatedInput,
        sourceType: knowledge.sourceType,
        collectionName: resolveSearchCollectionName(namespaceContext),
        embeddingConfig: resolveActiveEmbeddingConfig(namespaceContext),
      });
    },

    searchProjectDocuments: async (
      { actor }: KnowledgeCommandContext,
      projectId: string,
      input: SearchProjectKnowledgeDocumentsInput,
    ): Promise<KnowledgeSearchResponse> => {
      const validatedInput = validateSearchProjectDocumentsInput(input);
      await repository.ensureMetadataModel();
      const project = await requireVisibleProject(
        projectsRepository,
        projectId,
        actor,
      );

      const [boundGlobalKnowledgeBases, projectKnowledgeBases] =
        await Promise.all([
          Promise.all(
            Array.from(new Set(project.knowledgeBaseIds ?? [])).map(
              (knowledgeId) => repository.findKnowledgeById(knowledgeId),
            ),
          ),
          repository.listKnowledgeBases({
            scope: "project",
            projectId,
            sourceType: "global_docs",
          }),
        ]);

      const boundGlobalKnowledgeIds = new Set<string>();

      for (const knowledge of boundGlobalKnowledgeBases) {
        if (!knowledge) {
          continue;
        }

        const knowledgeScope = resolveKnowledgeScope(knowledge);
        if (
          knowledgeScope.scope !== "global" ||
          knowledge.sourceType !== "global_docs"
        ) {
          continue;
        }

        boundGlobalKnowledgeIds.add(knowledge._id.toHexString());
      }

      const projectKnowledgeIds = new Set<string>();
      for (const knowledge of projectKnowledgeBases) {
        if (knowledge.sourceType !== "global_docs") {
          continue;
        }

        projectKnowledgeIds.add(knowledge._id.toHexString());
      }

      if (
        boundGlobalKnowledgeIds.size === 0 &&
        projectKnowledgeIds.size === 0
      ) {
        return {
          query: validatedInput.query,
          sourceType: "global_docs",
          total: 0,
          items: [],
        };
      }

      const searchGroups = await Promise.all([
        searchKnowledgeNamespaceDocuments({
          env,
          repository,
          settingsRepository,
          searchService,
          namespace: {
            scope: "project",
            projectId,
            sourceType: "global_docs",
          },
          allowedKnowledgeIds: projectKnowledgeIds,
          query: validatedInput.query,
          topK: validatedInput.topK,
          mergePriority: 0,
        }),
        searchKnowledgeNamespaceDocuments({
          env,
          repository,
          settingsRepository,
          searchService,
          namespace: {
            scope: "global",
            projectId: null,
            sourceType: "global_docs",
          },
          allowedKnowledgeIds: boundGlobalKnowledgeIds,
          query: validatedInput.query,
          topK: validatedInput.topK,
          mergePriority: 1,
        }),
      ]);
      const items = mergeKnowledgeSearchHitGroups(
        searchGroups.filter(
          (group): group is GroupedKnowledgeSearchHits => group !== null,
        ),
        validatedInput.topK,
      );

      return {
        query: validatedInput.query,
        sourceType: "global_docs",
        total: items.length,
        items,
      };
    },
  };
};
