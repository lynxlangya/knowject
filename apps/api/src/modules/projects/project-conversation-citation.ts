import type {
  ProjectConversationCitationContent,
  ProjectConversationSourceDocument,
} from './projects.types.js';

const PROJECT_CONVERSATION_SOURCE_PLACEHOLDER_PATTERN =
  /\s*\[\[source\d+\]\]/g;
const PROJECT_CONVERSATION_SOURCE_PLACEHOLDER_CAPTURE_PATTERN =
  /\s*\[\[(source\d+)\]\]/g;

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

const createProjectConversationSourcePersistenceShape = (
  source: ProjectConversationRankedSourceRecord,
): ProjectConversationSourceDocument => ({
  id: source.id,
  sourceKey: source.sourceKey,
  retrievalIndex: source.retrievalIndex,
  knowledgeId: source.knowledgeId,
  documentId: source.documentId,
  chunkId: source.chunkId,
  chunkIndex: source.chunkIndex,
  source: source.source,
  snippet: source.snippet,
  distance: source.distance,
});

const createProjectConversationSourceRecord = ({
  source,
  exposeMetadata,
}: {
  source: ProjectConversationRankedSourceRecord;
  exposeMetadata: boolean;
}): ProjectConversationSourceDocument => {
  const normalizedSource: ProjectConversationSourceDocument = exposeMetadata
    ? createProjectConversationSourcePersistenceShape(source)
    : {
        id: source.id,
        knowledgeId: source.knowledgeId,
        documentId: source.documentId,
        chunkId: source.chunkId,
        chunkIndex: source.chunkIndex,
        source: source.source,
        snippet: source.snippet,
        distance: source.distance,
      };

  if (exposeMetadata) {
    return normalizedSource;
  }

  Object.defineProperties(normalizedSource, {
    sourceKey: {
      configurable: true,
      enumerable: false,
      value: source.sourceKey,
      writable: true,
    },
    retrievalIndex: {
      configurable: true,
      enumerable: false,
      value: source.retrievalIndex,
      writable: true,
    },
    toBSON: {
      configurable: true,
      enumerable: false,
      value: () => createProjectConversationSourcePersistenceShape(source),
      writable: true,
    },
  });

  return normalizedSource;
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
    group.sources.map((source) =>
      createProjectConversationSourceRecord({
        source: {
          ...source,
          id: `s${++sourceIndex}`,
          sourceKey: `source${groupIndex + 1}`,
        },
        exposeMetadata: shouldExposeSourceMetadata,
      }),
    ),
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

export const buildProjectConversationCitationContentFromSourcePlaceholders = (
  answer: string,
  sources: ProjectConversationSourceDocument[],
): ProjectConversationCitationContent | null => {
  const normalizedAnswer = answer.replace(/\r\n/g, '\n').trim();

  if (!normalizedAnswer.includes('[[source')) {
    return null;
  }

  const sourceIdByKey = new Map(
    sources.map((source, index) => [
      source.sourceKey ?? `source${index + 1}`,
      getProjectConversationCitationSourceId(source, index),
    ]),
  );
  const sentences: ProjectConversationCitationContent['sentences'] = [];
  let sentenceIndex = 1;
  let cursor = 0;
  let match: RegExpExecArray | null =
    PROJECT_CONVERSATION_SOURCE_PLACEHOLDER_CAPTURE_PATTERN.exec(
      normalizedAnswer,
    );

  while (match) {
    const sentenceText = normalizedAnswer.slice(cursor, match.index);
    const sourceIds: string[] = [];
    const seenSourceIds = new Set<string>();
    let groupEnd = PROJECT_CONVERSATION_SOURCE_PLACEHOLDER_CAPTURE_PATTERN.lastIndex;
    let currentMatch: RegExpExecArray | null = match;

    while (currentMatch) {
      const sourceKey = currentMatch[1];
      const sourceId = sourceKey ? sourceIdByKey.get(sourceKey) : undefined;

      if (sourceId && !seenSourceIds.has(sourceId)) {
        sourceIds.push(sourceId);
        seenSourceIds.add(sourceId);
      }

      const nextMatch =
        PROJECT_CONVERSATION_SOURCE_PLACEHOLDER_CAPTURE_PATTERN.exec(
          normalizedAnswer,
        );

      if (!nextMatch || nextMatch.index !== groupEnd) {
        match = nextMatch;
        break;
      }

      groupEnd = PROJECT_CONVERSATION_SOURCE_PLACEHOLDER_CAPTURE_PATTERN.lastIndex;
      currentMatch = nextMatch;
    }

    if (sentenceText.length > 0) {
      sentences.push({
        id: `placeholder-sent-${sentenceIndex++}`,
        text: sentenceText,
        sourceIds,
        grounded: sourceIds.length > 0,
      });
    }

    cursor = groupEnd;
  }

  PROJECT_CONVERSATION_SOURCE_PLACEHOLDER_CAPTURE_PATTERN.lastIndex = 0;

  const trailingText = normalizedAnswer.slice(cursor);
  if (trailingText.length > 0) {
    sentences.push({
      id: `placeholder-sent-${sentenceIndex++}`,
      text: trailingText,
      sourceIds: [],
      grounded: false,
    });
  }

  if (sentences.length === 0) {
    return null;
  }

  return normalizeProjectConversationCitationContent(
    {
      version: 1,
      sentences,
    },
    normalizedAnswer,
    sources,
  );
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
  let answerCursor = 0;

  for (const sentence of parsedPayload.sentences) {
    if (!isRecord(sentence) || typeof sentence.grounded !== 'boolean') {
      return null;
    }

    const sentenceId =
      typeof sentence.id === 'string' ? sentence.id.trim() : '';
    const sentenceText =
      typeof sentence.text === 'string' ? sentence.text : '';
    const normalizedSourceIds = normalizeSentenceSourceIds(
      sentence.sourceIds,
      allowedSourceIds,
    );

    if (!sentenceId || !sentenceText || normalizedSourceIds === null) {
      return null;
    }

    const grounded = sentence.grounded && normalizedSourceIds.length > 0;
    const sentenceCoreText = normalizeCitationTextForComparison(sentenceText);

    if (!sentenceCoreText) {
      return null;
    }

    const remainingAnswer = normalizedAnswer.slice(answerCursor);
    const sentenceOffset = remainingAnswer.indexOf(sentenceCoreText);

    if (sentenceOffset < 0) {
      return null;
    }

    const leadingBoundary = remainingAnswer.slice(0, sentenceOffset);
    if (leadingBoundary.trim() !== '') {
      return null;
    }

    const normalizedSentenceText = `${leadingBoundary}${sentenceCoreText}`;
    answerCursor += sentenceOffset + sentenceCoreText.length;

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

  if (normalizedAnswer.slice(answerCursor).trim() !== '') {
    return null;
  }

  return {
    version: 1,
    sentences: normalizedSentences,
  };
};
