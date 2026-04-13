export const AUTHORING_SUMMARY_ITEM_LIMIT = 4;

const PRIMARY_SUMMARY_SPLIT_PATTERN = /\s*\|\s*|\n+/;
const NUMBERED_SUMMARY_SPLIT_PATTERN = /(?=\s*\d+[.)、]\s*)/;
const SENTENCE_SUMMARY_SPLIT_PATTERN = /[。！？；;]+|(?<=\.)\s+/;

const normalizeSummaryItem = (value: string): string =>
  value
    .replace(/^\s*[-*•]\s*/, "")
    .replace(/^\s*\d+[.)、]\s*/, "")
    .replace(/\s+/g, " ")
    .trim();

const buildUniqueSummaryItems = (segments: string[]): string[] =>
  Array.from(
    new Set(
      segments.map((segment) => normalizeSummaryItem(segment)).filter(Boolean),
    ),
  );

export const buildAuthoringSummaryItems = (summary: string): string[] => {
  const trimmedSummary = summary.trim();
  if (!trimmedSummary) {
    return [];
  }

  const primarySegments = buildUniqueSummaryItems(
    trimmedSummary.split(PRIMARY_SUMMARY_SPLIT_PATTERN),
  );
  if (primarySegments.length > 1) {
    return primarySegments.slice(-AUTHORING_SUMMARY_ITEM_LIMIT);
  }

  const numberedSegments = buildUniqueSummaryItems(
    trimmedSummary.split(NUMBERED_SUMMARY_SPLIT_PATTERN),
  );
  if (numberedSegments.length > 1) {
    return numberedSegments.slice(-AUTHORING_SUMMARY_ITEM_LIMIT);
  }

  const sentenceSegments = buildUniqueSummaryItems(
    trimmedSummary.split(SENTENCE_SUMMARY_SPLIT_PATTERN),
  );
  if (sentenceSegments.length > 1) {
    return sentenceSegments.slice(-AUTHORING_SUMMARY_ITEM_LIMIT);
  }

  return [trimmedSummary];
};
