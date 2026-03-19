import { getEffectiveIndexingConfig } from "@config/ai-config.js";
import type { AppEnv } from "@config/env.js";
import type { SettingsRepository } from "@modules/settings/settings.repository.js";
import type { WithId } from "mongodb";
import {
  KNOWLEDGE_DIAGNOSTICS_STALE_PROCESSING_MS,
  isStaleProcessingDocument,
} from "./knowledge.diagnostics.js";
import {
  persistProcessingFailure,
  queueRecoverableKnowledgeDocument,
  queueNamespaceRebuild,
} from "./knowledge.index-orchestrator.js";
import {
  buildKnowledgeNamespaceDescriptor,
  listDocumentsForKnowledgeIds,
  listNamespaceDocuments,
  resolveNamespaceIndexContext,
} from "./knowledge.namespace.js";
import type { KnowledgeRepository } from "./knowledge.repository.js";
import type { KnowledgeSearchService } from "./knowledge.search.js";
import { toKnowledgeEmbeddingMetadata } from "./knowledge.shared.js";
import type {
  KnowledgeBaseDocument,
  KnowledgeDocumentRecord,
  KnowledgeNamespaceIndexStateDocument,
} from "./knowledge.types.js";

const listRecoverableDocuments = async ({
  repository,
  staleProcessingBefore,
}: {
  repository: KnowledgeRepository;
  staleProcessingBefore: Date;
}): Promise<WithId<KnowledgeDocumentRecord>[]> => {
  const repositoryWithRecoveryQuery = repository as KnowledgeRepository & {
    listKnowledgeDocumentsForRecovery?: KnowledgeRepository["listKnowledgeDocumentsForRecovery"];
  };

  if (
    typeof repositoryWithRecoveryQuery.listKnowledgeDocumentsForRecovery ===
    "function"
  ) {
    return repositoryWithRecoveryQuery.listKnowledgeDocumentsForRecovery(
      staleProcessingBefore,
    );
  }

  const knowledgeItems = await repository.listKnowledgeBases();
  const knowledgeIds = knowledgeItems
    .map((knowledge) => knowledge._id?.toHexString())
    .filter((knowledgeId): knowledgeId is string => Boolean(knowledgeId));

  if (knowledgeIds.length === 0) {
    return [];
  }

  const documents = await listDocumentsForKnowledgeIds({
    repository,
    knowledgeIds,
  });
  const now = new Date();

  return documents.filter(
    (document) =>
      document.status === "pending" || isStaleProcessingDocument(document, now),
  );
};

const listRebuildingNamespaceStates = async (
  repository: KnowledgeRepository,
): Promise<WithId<KnowledgeNamespaceIndexStateDocument>[]> => {
  const repositoryWithStatusQuery = repository as KnowledgeRepository & {
    listKnowledgeNamespaceIndexStatesByRebuildStatus?: KnowledgeRepository["listKnowledgeNamespaceIndexStatesByRebuildStatus"];
  };

  if (
    typeof repositoryWithStatusQuery
      .listKnowledgeNamespaceIndexStatesByRebuildStatus !== "function"
  ) {
    return [];
  }

  return repositoryWithStatusQuery.listKnowledgeNamespaceIndexStatesByRebuildStatus(
    "rebuilding",
  );
};

export const recoverInterruptedKnowledgeTasks = async ({
  env,
  repository,
  searchService,
  settingsRepository,
  createLegacyNamespaceRebuildRequiredError,
  createNamespaceRebuildRequiredError,
}: {
  env: AppEnv;
  repository: KnowledgeRepository;
  searchService: KnowledgeSearchService;
  settingsRepository: SettingsRepository;
  createLegacyNamespaceRebuildRequiredError: () => Error;
  createNamespaceRebuildRequiredError: () => Error;
}): Promise<void> => {
  const now = new Date();
  const staleProcessingBefore = new Date(
    now.getTime() - KNOWLEDGE_DIAGNOSTICS_STALE_PROCESSING_MS,
  );
  const [knowledgeItems, interruptedDocuments, rebuildingNamespaceStates] =
    await Promise.all([
      repository.listKnowledgeBases(),
      listRecoverableDocuments({
        repository,
        staleProcessingBefore,
      }),
      listRebuildingNamespaceStates(repository),
    ]);

  if (
    interruptedDocuments.length === 0 && rebuildingNamespaceStates.length === 0
  ) {
    return;
  }

  const knowledgeById = new Map(
    knowledgeItems.map(
      (knowledge) => [knowledge._id?.toHexString(), knowledge] as const,
    ),
  );
  const rebuildingNamespaceKeys = new Set<string>();

  for (const rebuildingState of rebuildingNamespaceStates) {
    const namespaceKnowledgeItems = knowledgeItems.filter((knowledge) => {
      const namespace = buildKnowledgeNamespaceDescriptor(knowledge);
      return namespace.namespaceKey === rebuildingState.namespaceKey;
    });

    const primaryKnowledge = namespaceKnowledgeItems[0];
    if (!primaryKnowledge) {
      continue;
    }

    const namespaceContext = await resolveNamespaceIndexContext({
      repository,
      env,
      settingsRepository,
      knowledge: primaryKnowledge,
    });

    if (
      namespaceContext.mode !== "versioned" ||
      namespaceContext.state.rebuildStatus !== "rebuilding"
    ) {
      continue;
    }

    const namespaceDocuments = await listNamespaceDocuments(
      repository,
      namespaceContext.namespace,
    );

    if (namespaceDocuments.length === 0) {
      continue;
    }

    rebuildingNamespaceKeys.add(namespaceContext.namespace.namespaceKey);
    queueNamespaceRebuild({
      env,
      repository,
      searchService,
      settingsRepository,
      namespaceContext,
      documents: namespaceDocuments,
    });
  }

  const documentsByNamespace = new Map<
    string,
    {
      knowledge: WithId<KnowledgeBaseDocument>;
      documents: WithId<KnowledgeDocumentRecord>[];
    }
  >();

  for (const document of interruptedDocuments) {
    const knowledge = knowledgeById.get(document.knowledgeId);

    if (!knowledge) {
      await persistProcessingFailure({
        repository,
        knowledgeId: document.knowledgeId,
        documentId: document._id.toHexString(),
        errorMessage: "所属知识库不存在，无法恢复索引任务",
        previousChunkCount: document.chunkCount,
      });
      continue;
    }

    const namespaceKey =
      buildKnowledgeNamespaceDescriptor(knowledge).namespaceKey;
    if (rebuildingNamespaceKeys.has(namespaceKey)) {
      continue;
    }
    const existingGroup = documentsByNamespace.get(namespaceKey);

    if (existingGroup) {
      existingGroup.documents.push(document);
      continue;
    }

    documentsByNamespace.set(namespaceKey, {
      knowledge,
      documents: [document],
    });
  }

  for (const {
    knowledge,
    documents: namespaceRecoveryDocuments,
  } of documentsByNamespace.values()) {
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
      const namespaceDocuments = await listNamespaceDocuments(
        repository,
        namespaceContext.namespace,
      );

      if (namespaceDocuments.length > 0) {
        queueNamespaceRebuild({
          env,
          repository,
          searchService,
          settingsRepository,
          namespaceContext,
          documents: namespaceDocuments,
        });
      }
      continue;
    }

    if (namespaceContext.mode === "legacy_untracked") {
      await Promise.all(
        namespaceRecoveryDocuments.map((document) =>
          persistProcessingFailure({
            repository,
            knowledgeId: document.knowledgeId,
            documentId: document._id.toHexString(),
            errorMessage: createLegacyNamespaceRebuildRequiredError().message,
            previousChunkCount: document.chunkCount,
          }),
        ),
      );
      continue;
    }

    if (
      namespaceContext.state.activeEmbeddingFingerprint !==
      namespaceContext.currentEmbeddingFingerprint
    ) {
      await Promise.all(
        namespaceRecoveryDocuments.map((document) =>
          persistProcessingFailure({
            repository,
            knowledgeId: document.knowledgeId,
            documentId: document._id.toHexString(),
            errorMessage: createNamespaceRebuildRequiredError().message,
            previousChunkCount: document.chunkCount,
          }),
        ),
      );
      continue;
    }

    const indexingConfig = await getEffectiveIndexingConfig({
      env,
      repository: settingsRepository,
    });
    const embeddingMetadata = toKnowledgeEmbeddingMetadata(
      namespaceContext.currentEmbeddingConfig,
    );

    await Promise.all(
      namespaceRecoveryDocuments.map((document) =>
        queueRecoverableKnowledgeDocument({
          env,
          repository,
          searchService,
          settingsRepository,
          knowledgeId: document.knowledgeId,
          document,
          sourceType: knowledge.sourceType,
          collectionName: namespaceContext.state.activeCollectionName,
          embeddingConfig: namespaceContext.currentEmbeddingConfig,
          indexingConfig,
          embeddingMetadata,
        }),
      ),
    );
  }
};
