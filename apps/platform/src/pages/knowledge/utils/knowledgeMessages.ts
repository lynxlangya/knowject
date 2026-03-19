export const formatKnowledgeBatchUploadProgress = (
  current: number,
  total: number,
): string => {
  return `正在上传文档 ${current}/${total}`;
};

export const formatKnowledgeBatchUploadSuccessMessage = (
  successCount: number,
  totalCount: number,
): string => {
  if (successCount === totalCount) {
    return `已上传 ${successCount} 个文件，正在进入索引队列`;
  }

  return `已上传 ${successCount}/${totalCount} 个文件，正在进入索引队列`;
};

export const buildKnowledgeDocumentPreviewPendingMessage = (
  fileName: string,
): string => {
  return `“${fileName}”预览原文即将开放`;
};

export const buildKnowledgeDocumentDownloadPendingMessage = (
  fileName: string,
): string => {
  return `“${fileName}”下载原文即将开放`;
};
