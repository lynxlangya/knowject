import type {
  ProjectConversationCitationContent,
  ProjectConversationSourceDocument,
} from './projects.types.js';

const getProjectConversationCitationSourceId = (
  source: ProjectConversationSourceDocument,
  index: number,
): string => {
  return source.id ?? `s${index + 1}`;
};

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
  return sources.map((source, index) => ({
    ...source,
    id: `s${index + 1}`,
  }));
};

const normalizeCitationTextForComparison = (value: string): string => {
  return value.replace(/\r\n/g, '\n').trim();
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
