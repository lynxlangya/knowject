import type {
  ProjectConversationCitationContent,
  ProjectConversationSourceResponse,
} from '../../api/projects';

export interface ProjectChatCitationSentenceViewModel {
  id: string;
  text: string;
  grounded: boolean;
  primaryMarkerNumber: number | null;
  hasMoreSources: boolean;
  documentGroupIds: string[];
}

export interface ProjectChatCitationDocumentEntryViewModel {
  id: string;
  snippet: string;
  distance: number | null;
}

export interface ProjectChatCitationDocumentGroupViewModel {
  id: string;
  markerNumber: number;
  sourceLabel: string;
  entries: ProjectChatCitationDocumentEntryViewModel[];
}

export type ProjectChatCitationViewModel =
  | {
      mode: 'legacy';
      sentences: [];
      documentGroups: [];
    }
  | {
      mode: 'citation';
      sentences: ProjectChatCitationSentenceViewModel[];
      documentGroups: ProjectChatCitationDocumentGroupViewModel[];
    };

const PROJECT_CHAT_RICH_MARKDOWN_PATTERNS = [
  /(^|\n)```/,
  /`[^`\n]+`/,
  /(^|\n)#{1,6}\s+/,
  /(^|\n)\s*(?:[-*+]\s+|\d+\.\s+)/,
  /(^|\n)>\s+/,
  /\*\*[^*\n]+\*\*/,
  /__[^_\n]+__/,
  /(^|[^*])\*[^*\n]+\*(?!\*)/,
  /(^|[^_])_[^_\n]+_(?!_)/,
  /\[[^\]]+\]\([^)]+\)/,
  /!\[[^\]]*\]\([^)]+\)/,
  /(^|\n)\|[^\n]+\|/,
  /(^|\n)\s*\|?(?:\s*:?-+:?\s*\|){2,}\s*$/,
] as const;

const PROJECT_CHAT_PSEUDO_CITATION_HEADER_PATTERN = /^(?:依据|来源|参考来源)\s*[:：]\s*$/u;
const PROJECT_CHAT_PSEUDO_CITATION_ENTRY_PATTERN =
  /^(?:(?:[-*•]|\d+\.)\s*)?来源\s*\d+(?:\s*[:：-]\s*.*)?$/u;
const PROJECT_CHAT_INLINE_SOURCE_TAG_ENTRY_PATTERN =
  /^(?:(?:[-*•]|\d+\.)\s*)?来源\s*(\d+)\s*$/u;

const normalizeProjectChatCitationComparableText = (value: string): string => {
  return value.replace(/\r\n/g, '\n').trim();
};

const buildProjectChatDocumentGroupId = (
  source: Pick<ProjectConversationSourceResponse, 'knowledgeId' | 'documentId'>,
): string => {
  return `${source.knowledgeId}:${source.documentId}`;
};

export const simplifyProjectChatSourceLabel = (sourceLabel: string): string => {
  try {
    const sourceUrl = new URL(sourceLabel);
    const hostname = sourceUrl.hostname.replace(/^www\./, '');
    const hostSegments = hostname.split('.');
    if (hostSegments.length >= 2) {
      return hostSegments.at(-2) ?? hostname;
    }

    return hostname;
  } catch {
    const lastSegment =
      sourceLabel.split(/[\\/]/).filter(Boolean).pop() ?? sourceLabel;

    return lastSegment.replace(/\.[a-z0-9]{1,8}$/i, '') || sourceLabel;
  }
};

export const buildProjectChatCitationSourcePillLabel = (
  citationViewModel: ProjectChatCitationViewModel,
): string | null => {
  if (citationViewModel.mode !== 'citation' || citationViewModel.documentGroups.length === 0) {
    return null;
  }

  const primaryDocumentGroup = citationViewModel.documentGroups[0];
  if (!primaryDocumentGroup) {
    return null;
  }

  const primaryLabel = simplifyProjectChatSourceLabel(
    primaryDocumentGroup.sourceLabel,
  );
  const overflowCount = citationViewModel.documentGroups.length - 1;

  return overflowCount > 0 ? `${primaryLabel} +${overflowCount}` : primaryLabel;
};

export const shouldProjectChatFallbackToLegacyMarkdown = (
  content: string,
): boolean => {
  return PROJECT_CHAT_RICH_MARKDOWN_PATTERNS.some((pattern) =>
    pattern.test(content),
  );
};

export const suppressProjectChatTrailingPseudoCitations = (
  content: string,
): string => {
  const normalizedContent = content.replace(/\r\n/g, '\n');
  const lines = normalizedContent.split('\n');

  while (lines.length > 0 && lines.at(-1)?.trim() === '') {
    lines.pop();
  }

  if (lines.length === 0) {
    return content;
  }

  let index = lines.length - 1;
  let sawPseudoEntry = false;

  while (index >= 0) {
    const trimmedLine = lines[index]?.trim() ?? '';

    if (trimmedLine === '') {
      index -= 1;
      continue;
    }

    if (PROJECT_CHAT_PSEUDO_CITATION_ENTRY_PATTERN.test(trimmedLine)) {
      sawPseudoEntry = true;
      index -= 1;
      continue;
    }

    break;
  }

  if (!sawPseudoEntry) {
    return content;
  }

  let blockStart = index + 1;

  if (
    index >= 0 &&
    PROJECT_CHAT_PSEUDO_CITATION_HEADER_PATTERN.test(lines[index]?.trim() ?? '')
  ) {
    blockStart = index;
    index -= 1;
  }

  let hasBlankSeparator = false;

  while (index >= 0 && (lines[index]?.trim() ?? '') === '') {
    hasBlankSeparator = true;
    blockStart = index;
    index -= 1;
  }

  if (!hasBlankSeparator) {
    return content;
  }

  const sanitizedContent = lines.slice(0, blockStart).join('\n').trimEnd();
  return sanitizedContent.length > 0 ? sanitizedContent : content;
};

export const rewriteProjectChatMarkdownEvidenceBlocks = (
  content: string,
): string => {
  const normalizedContent = content.replace(/\r\n/g, '\n');
  const lines = normalizedContent.split('\n');
  const rewrittenLines = [...lines];
  let index = 0;

  while (index < rewrittenLines.length) {
    const currentLine = rewrittenLines[index]?.trim() ?? '';

    if (!PROJECT_CHAT_PSEUDO_CITATION_HEADER_PATTERN.test(currentLine)) {
      index += 1;
      continue;
    }

    const sourceIndexes: number[] = [];
    let blockEnd = index + 1;

    while (blockEnd < rewrittenLines.length) {
      const nextLine = rewrittenLines[blockEnd]?.trim() ?? '';

      if (nextLine === '') {
        blockEnd += 1;
        continue;
      }

      const sourceMatch = nextLine.match(PROJECT_CHAT_INLINE_SOURCE_TAG_ENTRY_PATTERN);
      if (!sourceMatch) {
        break;
      }

      sourceIndexes.push(Number(sourceMatch[1]));
      blockEnd += 1;
    }

    if (sourceIndexes.length === 0) {
      index += 1;
      continue;
    }

    let attachTargetIndex = index - 1;
    while (
      attachTargetIndex >= 0 &&
      (rewrittenLines[attachTargetIndex]?.trim() ?? '') === ''
    ) {
      attachTargetIndex -= 1;
    }

    if (attachTargetIndex >= 0) {
      rewrittenLines[attachTargetIndex] = `${rewrittenLines[
        attachTargetIndex
      ]?.trimEnd()} [[SOURCE_TAG:${Array.from(new Set(sourceIndexes)).join(',')}]]`;
    }

    let removalStart = index;
    while (
      removalStart > 0 &&
      (rewrittenLines[removalStart - 1]?.trim() ?? '') === ''
    ) {
      removalStart -= 1;
    }

    for (let removalIndex = removalStart; removalIndex < blockEnd; removalIndex += 1) {
      rewrittenLines[removalIndex] = '';
    }

    index = blockEnd;
  }

  return rewrittenLines
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trimEnd();
};

export const canUseProjectChatCitationMode = ({
  content,
  citationViewModel,
}: {
  content: string;
  citationViewModel: ProjectChatCitationViewModel;
}): boolean => {
  if (citationViewModel.mode !== 'citation') {
    return false;
  }

  const sanitizedContent = suppressProjectChatTrailingPseudoCitations(content);
  const sentenceContent = citationViewModel.sentences.map((sentence) => sentence.text).join('');

  if (
    normalizeProjectChatCitationComparableText(sanitizedContent) !==
    normalizeProjectChatCitationComparableText(sentenceContent)
  ) {
    return false;
  }

  return !shouldProjectChatFallbackToLegacyMarkdown(sanitizedContent);
};

export const buildProjectChatCitationViewModel = (
  citationContent: ProjectConversationCitationContent | undefined,
  sources: ProjectConversationSourceResponse[],
): ProjectChatCitationViewModel => {
  if (!citationContent || citationContent.sentences.length === 0) {
    return {
      mode: 'legacy',
      sentences: [],
      documentGroups: [],
    };
  }

  const sourceById = new Map(sources.map((source) => [source.id, source]));
  const documentGroupById = new Map<string, ProjectChatCitationDocumentGroupViewModel>();
  const documentGroups: ProjectChatCitationDocumentGroupViewModel[] = [];

  const sentences = citationContent.sentences.map((sentence) => {
    if (!sentence.grounded || sentence.sourceIds.length === 0) {
      return {
        id: sentence.id,
        text: sentence.text,
        grounded: false,
        primaryMarkerNumber: null,
        hasMoreSources: false,
        documentGroupIds: [],
      } satisfies ProjectChatCitationSentenceViewModel;
    }

    const documentGroupIds: string[] = [];
    const seenSourceIds = new Set<string>();
    const seenDocumentGroupIds = new Set<string>();

    sentence.sourceIds.forEach((sourceId) => {
      if (seenSourceIds.has(sourceId)) {
        return;
      }

      seenSourceIds.add(sourceId);

      const source = sourceById.get(sourceId);
      if (!source) {
        return;
      }

      const documentGroupId = buildProjectChatDocumentGroupId(source);
      let documentGroup = documentGroupById.get(documentGroupId);

      if (!documentGroup) {
        documentGroup = {
          id: documentGroupId,
          markerNumber: documentGroups.length + 1,
          sourceLabel: source.source,
          entries: [],
        };
        documentGroupById.set(documentGroupId, documentGroup);
        documentGroups.push(documentGroup);
      }

      if (!documentGroup.entries.some((entry) => entry.id === source.id)) {
        documentGroup.entries.push({
          id: source.id,
          snippet: source.snippet,
          distance: source.distance,
        });
      }

      if (seenDocumentGroupIds.has(documentGroupId)) {
        return;
      }

      seenDocumentGroupIds.add(documentGroupId);
      documentGroupIds.push(documentGroupId);
    });

    if (documentGroupIds.length === 0) {
      return {
        id: sentence.id,
        text: sentence.text,
        grounded: false,
        primaryMarkerNumber: null,
        hasMoreSources: false,
        documentGroupIds: [],
      } satisfies ProjectChatCitationSentenceViewModel;
    }

    return {
      id: sentence.id,
      text: sentence.text,
      grounded: true,
      primaryMarkerNumber: documentGroupById.get(documentGroupIds[0])?.markerNumber ?? null,
      hasMoreSources: documentGroupIds.length > 1,
      documentGroupIds,
    } satisfies ProjectChatCitationSentenceViewModel;
  });

  if (documentGroups.length === 0) {
    return {
      mode: 'legacy',
      sentences: [],
      documentGroups: [],
    };
  }

  return {
    mode: 'citation',
    sentences,
    documentGroups,
  };
};
