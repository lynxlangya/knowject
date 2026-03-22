import type { AppEnv } from "@config/env.js";
import type { SettingsRepository } from "@modules/settings/settings.repository.js";
import {
  resolveActiveEmbeddingConfig,
  resolveNamespaceIndexContext,
  resolveSearchCollectionName,
  resolveSearchEmbeddingSpaceKey,
} from "./knowledge.namespace.js";
import type { KnowledgeRepository } from "./knowledge.repository.js";
import type { KnowledgeSearchService } from "./knowledge.search.js";
import type {
  KnowledgeBaseDocument,
  KnowledgeSearchHitResponse,
} from "./knowledge.types.js";

export interface GroupedKnowledgeSearchHits {
  embeddingSpaceKey: string;
  mergePriority: number;
  items: KnowledgeSearchHitResponse[];
}

const sortKnowledgeSearchHits = (
  left: KnowledgeSearchHitResponse,
  right: KnowledgeSearchHitResponse,
): number => {
  const leftDistance = left.distance ?? Number.POSITIVE_INFINITY;
  const rightDistance = right.distance ?? Number.POSITIVE_INFINITY;

  if (leftDistance !== rightDistance) {
    return leftDistance - rightDistance;
  }

  const leftKey = `${left.knowledgeId}:${left.documentId}:${left.chunkIndex}:${left.chunkId}`;
  const rightKey = `${right.knowledgeId}:${right.documentId}:${right.chunkIndex}:${right.chunkId}`;

  return leftKey.localeCompare(rightKey);
};

const getKnowledgeSearchHitKey = (
  item: Pick<
    KnowledgeSearchHitResponse,
    "knowledgeId" | "documentId" | "chunkId"
  >,
): string => {
  return `${item.knowledgeId}:${item.documentId}:${item.chunkId}`;
};

const deduplicateKnowledgeSearchHits = (
  items: KnowledgeSearchHitResponse[],
): KnowledgeSearchHitResponse[] => {
  const deduplicatedHits = new Map<string, KnowledgeSearchHitResponse>();

  for (const item of items) {
    const itemKey = getKnowledgeSearchHitKey(item);
    const existingItem = deduplicatedHits.get(itemKey);

    if (!existingItem || sortKnowledgeSearchHits(item, existingItem) < 0) {
      deduplicatedHits.set(itemKey, item);
    }
  }

  return [...deduplicatedHits.values()].sort(sortKnowledgeSearchHits);
};

const MAX_PROJECT_NAMESPACE_SEARCH_TOP_K = 50;

const buildProjectNamespaceSearchTopK = (
  knowledgeCount: number,
  topK: number,
): number => {
  return Math.min(
    MAX_PROJECT_NAMESPACE_SEARCH_TOP_K,
    Math.max(topK, knowledgeCount * topK),
  );
};

export const mergeKnowledgeSearchHitGroups = (
  groups: GroupedKnowledgeSearchHits[],
  topK: number,
): KnowledgeSearchHitResponse[] => {
  if (groups.length === 0) {
    return [];
  }

  const groupedByEmbeddingSpace = new Map<
    string,
    {
      mergePriority: number;
      items: KnowledgeSearchHitResponse[];
    }
  >();

  for (const group of groups) {
    const currentGroup = groupedByEmbeddingSpace.get(group.embeddingSpaceKey);

    if (!currentGroup) {
      groupedByEmbeddingSpace.set(group.embeddingSpaceKey, {
        mergePriority: group.mergePriority,
        items: [...group.items],
      });
      continue;
    }

    currentGroup.mergePriority = Math.min(
      currentGroup.mergePriority,
      group.mergePriority,
    );
    currentGroup.items.push(...group.items);
  }

  const normalizedGroups = [...groupedByEmbeddingSpace.entries()]
    .map(([embeddingSpaceKey, group]) => ({
      embeddingSpaceKey,
      mergePriority: group.mergePriority,
      items: deduplicateKnowledgeSearchHits(group.items),
    }))
    .filter((group) => group.items.length > 0);

  if (normalizedGroups.length <= 1) {
    return normalizedGroups[0]?.items.slice(0, topK) ?? [];
  }

  normalizedGroups.sort((left, right) => {
    if (left.mergePriority !== right.mergePriority) {
      return left.mergePriority - right.mergePriority;
    }

    return left.embeddingSpaceKey.localeCompare(right.embeddingSpaceKey);
  });

  const mergedItems: KnowledgeSearchHitResponse[] = [];
  const seenKeys = new Set<string>();
  let itemIndex = 0;

  while (mergedItems.length < topK) {
    let appendedInCurrentRound = false;

    for (const group of normalizedGroups) {
      const item = group.items[itemIndex];

      if (!item) {
        continue;
      }

      const itemKey = getKnowledgeSearchHitKey(item);
      if (seenKeys.has(itemKey)) {
        continue;
      }

      seenKeys.add(itemKey);
      mergedItems.push(item);
      appendedInCurrentRound = true;

      if (mergedItems.length >= topK) {
        break;
      }
    }

    if (!appendedInCurrentRound) {
      break;
    }

    itemIndex += 1;
  }

  return mergedItems;
};

export const searchKnowledgeNamespaceDocuments = async ({
  env,
  repository,
  settingsRepository,
  searchService,
  namespace,
  allowedKnowledgeIds,
  query,
  topK,
  mergePriority,
  locale,
}: {
  env: AppEnv;
  repository: KnowledgeRepository;
  settingsRepository: SettingsRepository;
  searchService: KnowledgeSearchService;
  namespace: Pick<KnowledgeBaseDocument, "scope" | "projectId" | "sourceType">;
  allowedKnowledgeIds: Set<string>;
  query: string;
  topK: number;
  mergePriority: number;
  locale?: import("@lib/locale.js").SupportedLocale;
}): Promise<GroupedKnowledgeSearchHits | null> => {
  if (allowedKnowledgeIds.size === 0) {
    return null;
  }

  const namespaceContext = await resolveNamespaceIndexContext({
    env,
    repository,
    settingsRepository,
    knowledge: namespace,
  });

  const response = await searchService.searchDocuments({
    query,
    sourceType: namespace.sourceType,
    collectionName: resolveSearchCollectionName(namespaceContext),
    embeddingConfig: resolveActiveEmbeddingConfig(namespaceContext),
    topK: buildProjectNamespaceSearchTopK(allowedKnowledgeIds.size, topK),
    ...(locale ? { locale } : {}),
  });
  const filteredItems = deduplicateKnowledgeSearchHits(
    response.items.filter((item) => allowedKnowledgeIds.has(item.knowledgeId)),
  );

  if (filteredItems.length === 0) {
    return null;
  }

  return {
    embeddingSpaceKey: resolveSearchEmbeddingSpaceKey(namespaceContext),
    mergePriority,
    items: filteredItems,
  };
};
