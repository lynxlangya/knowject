import type { KnowledgeSummaryResponse } from '@api/knowledge';
import type { GlobalAssetSummaryItem } from '@pages/assets/components/GlobalAssetLayout';
import { tp } from '../knowledge.i18n';

export const buildKnowledgeStats = (
  items: KnowledgeSummaryResponse[],
): GlobalAssetSummaryItem[] => {
  const totalDocuments = items.reduce(
    (sum, knowledge) => sum + knowledge.documentCount,
    0,
  );
  const totalChunks = items.reduce(
    (sum, knowledge) => sum + knowledge.chunkCount,
    0,
  );
  const processingCount = items.filter(
    (knowledge) =>
      knowledge.indexStatus === 'pending' || knowledge.indexStatus === 'processing',
  ).length;
  const failedCount = items.filter(
    (knowledge) => knowledge.indexStatus === 'failed',
  ).length;
  const attentionCount = processingCount + failedCount;

  return [
    {
      label: tp('stats.knowledgeCount'),
      value: tp('stats.knowledgeCountValue', { count: items.length }),
      hint: tp('stats.knowledgeCountHint'),
    },
    {
      label: tp('stats.totalDocuments'),
      value: tp('stats.totalDocumentsValue', { count: totalDocuments }),
      hint: tp('stats.totalDocumentsHint'),
    },
    {
      label: tp('stats.totalChunks'),
      value: tp('stats.totalChunksValue', { count: totalChunks }),
      hint: tp('stats.totalChunksHint'),
    },
    {
      label: tp('stats.attention'),
      value: tp('stats.attentionValue', { count: attentionCount }),
      hint:
        attentionCount === 0
          ? tp('stats.attentionHintNone')
          : failedCount === 0
            ? tp('stats.attentionHintProcessing', { processingCount })
            : tp('stats.attentionHintMixed', { failedCount, processingCount }),
    },
  ];
};
