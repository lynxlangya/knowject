import type {
  ProjectConversationCitationContent,
  ProjectConversationCitationSentence,
  ProjectConversationSourceResponse,
} from '../../api/projects';

type ProjectConversationSourceResponseLike =
  Omit<ProjectConversationSourceResponse, 'sourceKey'> & {
    sourceKey?: string;
  };

export interface ProjectChatDraftSourceToken {
  kind: 'draft' | 'legacy';
  rawText: string;
  sourceKeys: string[];
  start: number;
  end: number;
}

export interface ProjectChatSourceEntry {
  id: string;
  sourceKey: string;
  knowledgeId: string;
  documentId: string;
  chunkId: string;
  chunkIndex: number;
  sourceLabel: string;
  snippet: string;
  distance: number | null;
}

export interface ProjectChatSourceGroupEntry {
  sourceKey: string;
  knowledgeId: string;
  documentId: string;
  sourceLabel: string;
  snippet: string;
  distance: number | null;
  chunkIds: string[];
  entries: ProjectChatSourceEntry[];
}

export interface ProjectConversationSourceDrawerViewModel {
  activeSourceKey: string | null;
  activeSource: ProjectChatSourceGroupEntry | null;
  sourceEntries: Array<
    ProjectChatSourceGroupEntry & {
      activeEntry: ProjectChatSourceEntry;
    }
  >;
}

const PROJECT_CHAT_DRAFT_SOURCE_TOKEN_PATTERN =
  /\[\[(source\d+)\]\]|\[\[SOURCE_TAG:([\d,\s]+)\]\]/g;

const buildSourceDocumentGroupId = ({
  knowledgeId,
  documentId,
}: Pick<ProjectConversationSourceResponseLike, 'knowledgeId' | 'documentId'>) => {
  return `${knowledgeId}:${documentId}`;
};

const normalizeSourceKey = (value: string | undefined): string | null => {
  if (!value) {
    return null;
  }

  const trimmedValue = value.trim();
  return trimmedValue.length > 0 ? trimmedValue : null;
};

const buildSourceKeyFallbackResolver = (
  sources: ProjectConversationSourceResponseLike[],
) => {
  const sourceKeyByDocumentGroupId = new Map<string, string>();
  const occupiedSourceKeys = new Set<string>();
  let nextSourceIndex = 1;

  sources.forEach((source) => {
    const explicitSourceKey = normalizeSourceKey(source.sourceKey);

    if (!explicitSourceKey) {
      return;
    }

    occupiedSourceKeys.add(explicitSourceKey);

    const documentGroupId = buildSourceDocumentGroupId(source);
    if (!sourceKeyByDocumentGroupId.has(documentGroupId)) {
      sourceKeyByDocumentGroupId.set(documentGroupId, explicitSourceKey);
    }
  });

  const resolveNextFallbackSourceKey = (): string => {
    while (occupiedSourceKeys.has(`source${nextSourceIndex}`)) {
      nextSourceIndex += 1;
    }

    const nextSourceKey = `source${nextSourceIndex}`;
    occupiedSourceKeys.add(nextSourceKey);
    nextSourceIndex += 1;
    return nextSourceKey;
  };

  return (source: ProjectConversationSourceResponseLike): string => {
    const explicitSourceKey = normalizeSourceKey(source.sourceKey);
    if (explicitSourceKey) {
      return explicitSourceKey;
    }

    const documentGroupId = buildSourceDocumentGroupId(source);
    const existingSourceKey = sourceKeyByDocumentGroupId.get(documentGroupId);

    if (existingSourceKey) {
      return existingSourceKey;
    }

    const nextSourceKey = resolveNextFallbackSourceKey();
    sourceKeyByDocumentGroupId.set(documentGroupId, nextSourceKey);
    return nextSourceKey;
  };
};

const resolveSentenceSourceKeysForSentence = (
  sentence: ProjectConversationCitationSentence,
  sourceEntries: ProjectChatSourceEntry[],
): string[] => {
  if (!sentence.grounded || sentence.sourceIds.length === 0) {
    return [];
  }

  const sourceKeyById = new Map(sourceEntries.map((entry) => [entry.id, entry.sourceKey]));
  const sourceKeys: string[] = [];
  const seenSourceKeys = new Set<string>();

  sentence.sourceIds.forEach((sourceId) => {
    const sourceKey = sourceKeyById.get(sourceId);
    if (!sourceKey || seenSourceKeys.has(sourceKey)) {
      return;
    }

    seenSourceKeys.add(sourceKey);
    sourceKeys.push(sourceKey);
  });

  return sourceKeys;
};

const groupProjectChatSourceEntries = (
  sourceEntries: ProjectChatSourceEntry[],
): ProjectChatSourceGroupEntry[] => {
  const groupedEntries: ProjectChatSourceGroupEntry[] = [];
  const groupedEntryBySourceKey = new Map<string, ProjectChatSourceGroupEntry>();

  sourceEntries.forEach((entry) => {
    let groupedEntry = groupedEntryBySourceKey.get(entry.sourceKey);

    if (!groupedEntry) {
      groupedEntry = {
        sourceKey: entry.sourceKey,
        knowledgeId: entry.knowledgeId,
        documentId: entry.documentId,
        sourceLabel: entry.sourceLabel,
        snippet: entry.snippet,
        distance: entry.distance,
        chunkIds: [entry.chunkId],
        entries: [entry],
      };
      groupedEntryBySourceKey.set(entry.sourceKey, groupedEntry);
      groupedEntries.push(groupedEntry);
      return;
    }

    groupedEntry.entries.push(entry);
    groupedEntry.chunkIds.push(entry.chunkId);
  });

  return groupedEntries;
};

export const resolveDraftSourceTokens = (
  content: string,
): ProjectChatDraftSourceToken[] => {
  const tokens: ProjectChatDraftSourceToken[] = [];
  let match: RegExpExecArray | null = null;

  PROJECT_CHAT_DRAFT_SOURCE_TOKEN_PATTERN.lastIndex = 0;

  while ((match = PROJECT_CHAT_DRAFT_SOURCE_TOKEN_PATTERN.exec(content))) {
    const [rawText, draftSourceKey, legacySourceIndexes] = match;
    const sourceKeys =
      typeof draftSourceKey === 'string' && draftSourceKey.length > 0
        ? [draftSourceKey]
        : (legacySourceIndexes ?? '')
            .split(',')
            .map((value) => Number(value.trim()))
            .filter((value) => Number.isInteger(value) && value > 0)
            .map((value) => `source${value}`);

    if (sourceKeys.length === 0) {
      continue;
    }

    tokens.push({
      kind: draftSourceKey ? 'draft' : 'legacy',
      rawText,
      sourceKeys,
      start: match.index,
      end: match.index + rawText.length,
    });
  }

  PROJECT_CHAT_DRAFT_SOURCE_TOKEN_PATTERN.lastIndex = 0;

  return tokens;
};

export const buildProjectChatSourceEntries = (
  sources: ProjectConversationSourceResponseLike[],
): ProjectChatSourceEntry[] => {
  const resolveSourceKey = buildSourceKeyFallbackResolver(sources);

  return sources.map((source) => ({
    id: source.id,
    sourceKey: resolveSourceKey(source),
    knowledgeId: source.knowledgeId,
    documentId: source.documentId,
    chunkId: source.chunkId,
    chunkIndex: source.chunkIndex,
    sourceLabel: source.source,
    snippet: source.snippet,
    distance: source.distance,
  }));
};

export const resolveSentenceSourceKeys = (
  citationContent: ProjectConversationCitationContent,
  sources: ProjectConversationSourceResponseLike[],
): string[] => {
  const sourceEntries = buildProjectChatSourceEntries(sources);
  const sourceKeys: string[] = [];
  const seenSourceKeys = new Set<string>();

  citationContent.sentences.forEach((sentence) => {
    resolveSentenceSourceKeysForSentence(sentence, sourceEntries).forEach((sourceKey) => {
      if (seenSourceKeys.has(sourceKey)) {
        return;
      }

      seenSourceKeys.add(sourceKey);
      sourceKeys.push(sourceKey);
    });
  });

  return sourceKeys;
};

export const shouldFallbackToLegacySourceRendering = ({
  seedEntries,
  persistedSources,
}: {
  seedEntries: Array<
    Pick<
      ProjectChatSourceGroupEntry,
      'sourceKey' | 'knowledgeId' | 'documentId'
    >
  >;
  persistedSources: Array<
    Pick<
      ProjectChatSourceGroupEntry,
      'sourceKey' | 'knowledgeId' | 'documentId'
    >
  >;
}): boolean => {
  if (seedEntries.length === 0) {
    return false;
  }

  if (persistedSources.length < seedEntries.length) {
    return true;
  }

  return seedEntries.some((seedEntry, index) => {
    const persistedEntry = persistedSources[index];

    return (
      !persistedEntry ||
      seedEntry.sourceKey !== persistedEntry.sourceKey ||
      seedEntry.knowledgeId !== persistedEntry.knowledgeId ||
      seedEntry.documentId !== persistedEntry.documentId
    );
  });
};

export const resolveDrawerSource = (
  sourceEntries: ProjectChatSourceEntry[],
  sourceKey: string,
): (ProjectChatSourceGroupEntry & { activeEntry: ProjectChatSourceEntry }) | null => {
  const groupedEntries = groupProjectChatSourceEntries(sourceEntries);
  const groupedEntry = groupedEntries.find((entry) => entry.sourceKey === sourceKey);

  if (!groupedEntry) {
    return null;
  }

  const activeEntry = groupedEntry.entries[0];
  if (!activeEntry) {
    return null;
  }

  return {
    ...groupedEntry,
    activeEntry,
  };
};

export const buildProjectConversationSourceDrawerViewModel = ({
  activeSourceKey,
  persistedSources,
  seedEntries,
}: {
  activeSourceKey?: string | null;
  persistedSources: ProjectConversationSourceResponseLike[];
  seedEntries?: ProjectChatSourceGroupEntry[];
}): ProjectConversationSourceDrawerViewModel => {
  const persistedSourceEntries = buildProjectChatSourceEntries(persistedSources);
  const persistedGroupedEntries = groupProjectChatSourceEntries(persistedSourceEntries);
  const effectiveSourceEntries =
    seedEntries &&
    seedEntries.length > 0 &&
    shouldFallbackToLegacySourceRendering({
      seedEntries,
      persistedSources: persistedGroupedEntries,
    })
      ? seedEntries
      : persistedGroupedEntries;

  const nextActiveSourceKey =
    activeSourceKey &&
    effectiveSourceEntries.some((entry) => entry.sourceKey === activeSourceKey)
      ? activeSourceKey
      : effectiveSourceEntries[0]?.sourceKey ?? null;

  const sourceEntries = effectiveSourceEntries
    .map((entry) => {
      const resolvedSource = resolveDrawerSource(persistedSourceEntries, entry.sourceKey);

      if (resolvedSource) {
        return resolvedSource;
      }

      const fallbackEntry: ProjectChatSourceEntry = {
        id: entry.chunkIds[0] ?? `${entry.sourceKey}:seed`,
        sourceKey: entry.sourceKey,
        knowledgeId: entry.knowledgeId,
        documentId: entry.documentId,
        chunkId: entry.chunkIds[0] ?? `${entry.sourceKey}:seed`,
        chunkIndex: 0,
        sourceLabel: entry.sourceLabel,
        snippet: entry.snippet,
        distance: entry.distance,
      };

      return {
        ...entry,
        entries: [fallbackEntry],
        activeEntry: fallbackEntry,
      };
    });

  const activeSource =
    sourceEntries.find((entry) => entry.sourceKey === nextActiveSourceKey) ?? null;

  return {
    activeSourceKey: nextActiveSourceKey,
    activeSource,
    sourceEntries,
  };
};

export const resolveCitationSentenceSourceKeys = (
  sentence: ProjectConversationCitationSentence,
  sources: ProjectConversationSourceResponseLike[],
): string[] => {
  return resolveSentenceSourceKeysForSentence(
    sentence,
    buildProjectChatSourceEntries(sources),
  );
};
