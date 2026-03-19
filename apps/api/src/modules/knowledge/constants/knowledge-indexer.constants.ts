export const KNOWLEDGE_INDEXER_DOCUMENT_PATHS = [
  "/internal/v1/index/documents",
  "/internal/index-documents",
] as const;

export const buildKnowledgeIndexerRebuildPaths = (documentId: string) =>
  [
    `/internal/v1/index/documents/${encodeURIComponent(documentId)}/rebuild`,
    "/internal/v1/index/documents",
    "/internal/index-documents",
  ] as const;
