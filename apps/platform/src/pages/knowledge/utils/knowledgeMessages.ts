import { tp } from '../knowledge.i18n';

export const formatKnowledgeBatchUploadProgress = (
  current: number,
  total: number,
): string => {
  return tp('batch.progress', { current, total });
};

export const formatKnowledgeBatchUploadSuccessMessage = (
  successCount: number,
  totalCount: number,
): string => {
  if (successCount === totalCount) {
    return tp('batch.successAll', { count: successCount });
  }

  return tp('batch.successPartial', { successCount, totalCount });
};

export const buildKnowledgeDocumentPreviewPendingMessage = (
  fileName: string,
): string => {
  return tp('batch.previewPending', { fileName });
};

export const buildKnowledgeDocumentDownloadPendingMessage = (
  fileName: string,
): string => {
  return tp('batch.downloadPending', { fileName });
};
