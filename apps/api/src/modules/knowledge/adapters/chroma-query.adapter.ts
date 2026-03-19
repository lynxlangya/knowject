import type {
  ChromaQueryResponse,
} from "../types/knowledge.search.types.js";
import type {
  KnowledgeSearchHitResponse,
  KnowledgeSearchResponse,
  KnowledgeSourceType,
} from "../knowledge.types.js";

export const mapChromaQueryResponseToSearchResponse = ({
  query,
  sourceType,
  response,
}: {
  query: string;
  sourceType: KnowledgeSourceType;
  response: ChromaQueryResponse;
}): KnowledgeSearchResponse => {
  const ids = response.ids?.[0] ?? [];
  const documents = response.documents?.[0] ?? [];
  const metadatas = response.metadatas?.[0] ?? [];
  const distances = response.distances?.[0] ?? [];
  const items: KnowledgeSearchHitResponse[] = ids.map((id, index) => {
    const metadata = metadatas[index] ?? {};
    const document = documents[index] ?? "";
    const distance = distances[index] ?? null;

    return {
      knowledgeId:
        typeof metadata.knowledgeId === "string" ? metadata.knowledgeId : "",
      documentId:
        typeof metadata.documentId === "string" ? metadata.documentId : "",
      chunkId: typeof metadata.chunkId === "string" ? metadata.chunkId : id,
      chunkIndex:
        typeof metadata.chunkIndex === "number"
          ? metadata.chunkIndex
          : Number(metadata.chunkIndex ?? 0),
      type: metadata.type === "global_code" ? "global_code" : sourceType,
      source: typeof metadata.source === "string" ? metadata.source : "",
      content: typeof document === "string" ? document : "",
      distance,
    };
  });

  return {
    query,
    sourceType,
    total: items.length,
    items,
  };
};
