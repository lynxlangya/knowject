import type {
  ProjectConversationCitationContent,
  ProjectConversationSourceDocument,
} from './projects.types.js';

const PROJECT_CONVERSATION_SOURCE_PLACEHOLDER_PATTERN =
  /\s*\[\[source\d+\]\]/g;

const getProjectConversationCitationSourceId = (
  source: ProjectConversationSourceDocument,
  index: number,
): string => {
  return source.id ?? `s${index + 1}`;
};

const getProjectConversationSourceGroupId = (
  source: Pick<ProjectConversationSourceDocument, 'knowledgeId' | 'documentId'>,
): string => {
  return `${source.knowledgeId}::${source.documentId}`;
};

const getProjectConversationSourceRetrievalIndex = (
  source: ProjectConversationSourceDocument,
  fallbackIndex: number,
): number => {
  return Number.isFinite(source.retrievalIndex)
    ? Number(source.retrievalIndex)
    : fallbackIndex;
};

const getProjectConversationSourceDistanceRank = (
  source: ProjectConversationSourceDocument,
): number => {
  return typeof source.distance === 'number' ? source.distance : Number.POSITIVE_INFINITY;
};

type ProjectConversationRankedSourceRecord = Omit<
  ProjectConversationSourceDocument,
  'sourceKey' | 'retrievalIndex'
> & {
  sourceKey: string;
  retrievalIndex: number;
};

const compareProjectConversationSourceRecords = (
  left: Pick<
    ProjectConversationRankedSourceRecord,
    | 'retrievalIndex'
    | 'distance'
    | 'knowledgeId'
    | 'documentId'
    | 'chunkIndex'
    | 'chunkId'
    | 'source'
    | 'snippet'
  >,
  right: Pick<
    ProjectConversationRankedSourceRecord,
    | 'retrievalIndex'
    | 'distance'
    | 'knowledgeId'
    | 'documentId'
    | 'chunkIndex'
    | 'chunkId'
    | 'source'
    | 'snippet'
  >,
): number => {
  return (
    left.retrievalIndex - right.retrievalIndex ||
    getProjectConversationSourceDistanceRank(left) -
      getProjectConversationSourceDistanceRank(right) ||
    left.knowledgeId.localeCompare(right.knowledgeId) ||
    left.documentId.localeCompare(right.documentId) ||
    left.chunkIndex - right.chunkIndex ||
    left.chunkId.localeCompare(right.chunkId) ||
    left.source.localeCompare(right.source) ||
    left.snippet.localeCompare(right.snippet)
  );
};

const toProjectConversationRankedSourceRecord = (
  source: ProjectConversationSourceDocument,
  fallbackIndex: number,
): ProjectConversationRankedSourceRecord => ({
  id: source.id,
  sourceKey: source.sourceKey ?? '',
  retrievalIndex: getProjectConversationSourceRetrievalIndex(source, fallbackIndex),
  knowledgeId: source.knowledgeId,
  documentId: source.documentId,
  chunkId: source.chunkId,
  chunkIndex: source.chunkIndex,
  source: source.source,
  snippet: source.snippet,
  distance: source.distance,
});

const unwrapFencedJson = (value: string): string => {
  const trimmed = value.trim();
  const match = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);

  return match?.[1]?.trim() ?? trimmed;
};

const parseCitationPayload = (payload: unknown): unknown | null => {
  if (typeof payload !== 'string') {
    return payload;
  }

  const normalizedPayload = unwrapFencedJson(payload);

  if (!normalizedPayload) {
    return null;
  }

  try {
    return JSON.parse(normalizedPayload);
  } catch {
    return null;
  }
};

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return !!value && typeof value === 'object' && !Array.isArray(value);
};

const normalizeSentenceSourceIds = (
  value: unknown,
  allowedSourceIds: Set<string>,
): string[] | null => {
  if (!Array.isArray(value)) {
    return null;
  }

  const normalizedSourceIds: string[] = [];
  const seenSourceIds = new Set<string>();

  for (const item of value) {
    if (typeof item !== 'string') {
      return null;
    }

    const sourceId = item.trim();

    if (
      !sourceId ||
      !allowedSourceIds.has(sourceId) ||
      seenSourceIds.has(sourceId)
    ) {
      continue;
    }

    normalizedSourceIds.push(sourceId);
    seenSourceIds.add(sourceId);
  }

  return normalizedSourceIds;
};

export const buildProjectConversationCitationSources = (
  sources: ProjectConversationSourceDocument[],
): ProjectConversationSourceDocument[] => {
  const shouldExposeSourceMetadata =
    sources.length > 1 ||
    sources.some(
      (source) => source.sourceKey !== undefined,
    );
  const groupedSources = new Map<string, ProjectConversationRankedSourceRecord[]>();

  sources.forEach((source, index) => {
    const normalizedSource = toProjectConversationRankedSourceRecord(source, index);
    const groupId = getProjectConversationSourceGroupId(normalizedSource);
    const existingGroup = groupedSources.get(groupId);

    if (existingGroup) {
      existingGroup.push(normalizedSource);
      return;
    }

    groupedSources.set(groupId, [normalizedSource]);
  });

  const orderedGroups = Array.from(groupedSources.values())
    .map((group) => {
      const orderedSources = [...group].sort(compareProjectConversationSourceRecords);

      return {
        defaultSource: orderedSources[0]!,
        sources: orderedSources,
      };
    })
    .sort((left, right) =>
      compareProjectConversationSourceRecords(left.defaultSource, right.defaultSource),
    );

  let sourceIndex = 0;

  return orderedGroups.flatMap((group, groupIndex) =>
    group.sources.map((source) => ({
      id: `s${++sourceIndex}`,
      ...(shouldExposeSourceMetadata
        ? {
            sourceKey: `source${groupIndex + 1}`,
            retrievalIndex: source.retrievalIndex,
          }
        : {}),
      knowledgeId: source.knowledgeId,
      documentId: source.documentId,
      chunkId: source.chunkId,
      chunkIndex: source.chunkIndex,
      source: source.source,
      snippet: source.snippet,
      distance: source.distance,
    })),
  );
};

export const stripProjectConversationSourcePlaceholders = (
  content: string,
): string => content.replace(PROJECT_CONVERSATION_SOURCE_PLACEHOLDER_PATTERN, '').trim();

const normalizeCitationTextForComparison = (value: string): string => {
  return stripProjectConversationSourcePlaceholders(value)
    .replace(/\r\n/g, '\n')
    .trim();
};

export const normalizeProjectConversationCitationContent = (
  payload: unknown,
  answer: string,
  sources: ProjectConversationSourceDocument[],
): ProjectConversationCitationContent | null => {
  const parsedPayload = parseCitationPayload(payload);

  if (!isRecord(parsedPayload) || parsedPayload.version !== 1) {
    return null;
  }

  if (!Array.isArray(parsedPayload.sentences)) {
    return null;
  }

  const normalizedAnswer = normalizeCitationTextForComparison(answer);
  const allowedSourceIds = new Set(
    sources.map((source, index) =>
      getProjectConversationCitationSourceId(source, index),
    ),
  );
  const normalizedSentences: ProjectConversationCitationContent['sentences'] = [];

  for (const sentence of parsedPayload.sentences) {
    if (!isRecord(sentence) || typeof sentence.grounded !== 'boolean') {
      return null;
    }

    const sentenceId =
      typeof sentence.id === 'string' ? sentence.id.trim() : '';
    const sentenceText =
      typeof sentence.text === 'string' ? sentence.text.trim() : '';
    const normalizedSourceIds = normalizeSentenceSourceIds(
      sentence.sourceIds,
      allowedSourceIds,
    );

    if (!sentenceId || !sentenceText || normalizedSourceIds === null) {
      return null;
    }

    const grounded = sentence.grounded && normalizedSourceIds.length > 0;
    const normalizedSentenceText = normalizeCitationTextForComparison(sentenceText);

    normalizedSentences.push({
      id: sentenceId,
      text: normalizedSentenceText,
      sourceIds: grounded ? normalizedSourceIds : [],
      grounded,
    });
  }

  if (normalizedAnswer && normalizedSentences.length === 0) {
    return null;
  }

  if (
    normalizedSentences
      .map((sentence) => sentence.text)
      .join('') !== normalizedAnswer
  ) {
    return null;
  }

  return {
    version: 1,
    sentences: normalizedSentences,
  };
};
