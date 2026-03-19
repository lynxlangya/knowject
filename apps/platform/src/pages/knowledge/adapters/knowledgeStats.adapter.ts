import type { KnowledgeSummaryResponse } from '@api/knowledge';
import type { GlobalAssetSummaryItem } from '@pages/assets/components/GlobalAssetLayout';

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
      label: '知识库总数',
      value: `${items.length} 个`,
      hint: '当前纳入治理的全局知识集合。',
    },
    {
      label: '文档总数',
      value: `${totalDocuments} 份`,
      hint: '已上传到各知识库的原始文档规模。',
    },
    {
      label: '分块总量',
      value: `${totalChunks} 段`,
      hint: '直接反映当前检索与向量索引体量。',
    },
    {
      label: '需关注索引',
      value: `${attentionCount} 个`,
      hint:
        attentionCount === 0
          ? '当前没有排队、处理中或失败的知识库。'
          : failedCount === 0
            ? `${processingCount} 个仍在排队或处理中。`
            : `${failedCount} 个失败，${processingCount} 个排队或处理中。`,
    },
  ];
};
