import type { AppEnv } from '@config/env.js';
import { AppError } from '@lib/app-error.js';
import type {
  KnowledgeSearchHitResponse,
  KnowledgeSearchResponse,
  KnowledgeSourceType,
} from './knowledge.types.js';

const GLOBAL_DOCS_COLLECTION_NAME = 'global_docs';
const GLOBAL_CODE_COLLECTION_NAME = 'global_code';

interface ChromaCollectionSummary {
  id: string;
  name: string;
}

interface SearchDocumentsInput {
  query: string;
  knowledgeId?: string;
  sourceType: KnowledgeSourceType;
  topK: number;
}

interface ChromaQueryResponse {
  ids?: string[][];
  documents?: Array<Array<string | null>> | null;
  metadatas?: Array<Array<Record<string, unknown> | null>> | null;
  distances?: Array<Array<number | null>> | null;
}

export interface KnowledgeSearchService {
  ensureCollections(): Promise<void>;
  searchDocuments(input: SearchDocumentsInput): Promise<KnowledgeSearchResponse>;
  deleteKnowledgeChunks(knowledgeId: string, sourceType: KnowledgeSourceType): Promise<void>;
  deleteDocumentChunks(documentId: string, sourceType: KnowledgeSourceType): Promise<void>;
}

const createServiceUnavailableError = (code: string, message: string): AppError => {
  return new AppError({
    statusCode: 503,
    code,
    message,
  });
};

const createGatewayError = (message: string, cause?: unknown): AppError => {
  return new AppError({
    statusCode: 502,
    code: 'KNOWLEDGE_SEARCH_UPSTREAM_ERROR',
    message,
    cause,
  });
};

const normalizeOpenAiErrorMessage = (body: unknown, fallback: string): string => {
  if (
    body &&
    typeof body === 'object' &&
    'error' in body &&
    body.error &&
    typeof body.error === 'object' &&
    'message' in body.error &&
    typeof body.error.message === 'string'
  ) {
    return body.error.message;
  }

  return fallback;
};

const buildApiUrl = (baseUrl: string, path: string): string => {
  const normalizedBase = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
  return new URL(path.replace(/^\//, ''), normalizedBase).toString();
};

const getCollectionName = (sourceType: KnowledgeSourceType): string => {
  return sourceType === 'global_code'
    ? GLOBAL_CODE_COLLECTION_NAME
    : GLOBAL_DOCS_COLLECTION_NAME;
};

export const createKnowledgeSearchService = ({
  env,
}: {
  env: AppEnv;
}): KnowledgeSearchService => {
  const collectionCache = new Map<string, ChromaCollectionSummary>();

  const requireChromaUrl = (): string => {
    if (!env.chroma.url) {
      throw createServiceUnavailableError(
        'KNOWLEDGE_SEARCH_CHROMA_UNAVAILABLE',
        'Chroma 未配置，当前无法执行知识索引和检索',
      );
    }

    return env.chroma.url;
  };

  const requireOpenAiApiKey = (): string => {
    if (!env.openai.apiKey) {
      throw createServiceUnavailableError(
        'KNOWLEDGE_SEARCH_EMBEDDING_UNAVAILABLE',
        'OpenAI embedding 未配置，当前无法执行知识索引和检索',
      );
    }

    return env.openai.apiKey;
  };

  const requestChromaJson = async <T>({
    path,
    method = 'GET',
    body,
  }: {
    path: string;
    method?: 'GET' | 'POST';
    body?: Record<string, unknown>;
  }): Promise<T> => {
    const baseUrl = requireChromaUrl();
    let responseBody: unknown = null;

    try {
      const response = await fetch(
        buildApiUrl(
          baseUrl,
          `/api/v2/tenants/${env.chroma.tenant}/databases/${env.chroma.database}${path}`,
        ),
        {
          method,
          headers: {
            accept: 'application/json',
            ...(body
              ? {
                  'content-type': 'application/json',
                }
              : {}),
          },
          body: body ? JSON.stringify(body) : undefined,
          signal: AbortSignal.timeout(env.chroma.requestTimeoutMs),
        },
      );

      const text = await response.text();

      if (text) {
        try {
          responseBody = JSON.parse(text);
        } catch {
          responseBody = text;
        }
      }

      if (!response.ok) {
        throw createGatewayError(
          `Chroma 请求失败（HTTP ${response.status}）`,
          responseBody,
        );
      }

      return (responseBody ?? null) as T;
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }

      throw createGatewayError('Chroma 请求失败', error);
    }
  };

  const listCollections = async (): Promise<ChromaCollectionSummary[]> => {
    return requestChromaJson<ChromaCollectionSummary[]>({
      path: '/collections',
    });
  };

  const createCollection = async (name: string): Promise<ChromaCollectionSummary> => {
    return requestChromaJson<ChromaCollectionSummary>({
      path: '/collections',
      method: 'POST',
      body: {
        name,
      },
    });
  };

  const ensureCollection = async (name: string): Promise<ChromaCollectionSummary> => {
    const cached = collectionCache.get(name);
    if (cached) {
      return cached;
    }

    const existingCollections = await listCollections();
    const existing = existingCollections.find((collection) => collection.name === name);

    if (existing) {
      collectionCache.set(name, existing);
      return existing;
    }

    try {
      const created = await createCollection(name);
      collectionCache.set(name, created);
      return created;
    } catch (error) {
      const refreshedCollections = await listCollections();
      const refreshed = refreshedCollections.find((collection) => collection.name === name);

      if (refreshed) {
        collectionCache.set(name, refreshed);
        return refreshed;
      }

      throw error;
    }
  };

  const createEmbeddings = async (texts: string[]): Promise<number[][]> => {
    const apiKey = requireOpenAiApiKey();
    let responseBody: unknown = null;

    try {
      const response = await fetch(buildApiUrl(env.openai.baseUrl, '/embeddings'), {
        method: 'POST',
        headers: {
          accept: 'application/json',
          authorization: `Bearer ${apiKey}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          model: env.openai.embeddingModel,
          input: texts,
        }),
        signal: AbortSignal.timeout(env.openai.requestTimeoutMs),
      });

      const text = await response.text();
      if (text) {
        try {
          responseBody = JSON.parse(text);
        } catch {
          responseBody = text;
        }
      }

      if (!response.ok) {
        throw createGatewayError(
          normalizeOpenAiErrorMessage(
            responseBody,
            `OpenAI embedding 请求失败（HTTP ${response.status}）`,
          ),
        );
      }

      if (
        !responseBody ||
        typeof responseBody !== 'object' ||
        !('data' in responseBody) ||
        !Array.isArray(responseBody.data)
      ) {
        throw createGatewayError('OpenAI embedding 响应格式不合法');
      }

      const embeddings = responseBody.data.map((item) => {
        if (
          !item ||
          typeof item !== 'object' ||
          !('embedding' in item) ||
          !Array.isArray(item.embedding)
        ) {
          throw createGatewayError('OpenAI embedding 响应缺少 embedding');
        }

        return item.embedding.map((value: unknown) => Number(value));
      });

      return embeddings;
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }

      throw createGatewayError('OpenAI embedding 请求失败', error);
    }
  };

  const mapQueryResults = ({
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
      const document = documents[index] ?? '';
      const distance = distances[index] ?? null;

      return {
        knowledgeId:
          typeof metadata.knowledgeId === 'string' ? metadata.knowledgeId : '',
        documentId:
          typeof metadata.documentId === 'string' ? metadata.documentId : '',
        chunkId:
          typeof metadata.chunkId === 'string' ? metadata.chunkId : id,
        chunkIndex:
          typeof metadata.chunkIndex === 'number'
            ? metadata.chunkIndex
            : Number(metadata.chunkIndex ?? 0),
        type:
          metadata.type === 'global_code' ? 'global_code' : sourceType,
        source: typeof metadata.source === 'string' ? metadata.source : '',
        content: typeof document === 'string' ? document : '',
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

  const deleteByWhere = async ({
    sourceType,
    where,
  }: {
    sourceType: KnowledgeSourceType;
    where: Record<string, unknown>;
  }): Promise<void> => {
    const collection = await ensureCollection(getCollectionName(sourceType));

    await requestChromaJson({
      path: `/collections/${collection.id}/delete`,
      method: 'POST',
      body: {
        where,
      },
    });
  };

  return {
    ensureCollections: async () => {
      if (!env.chroma.url) {
        return;
      }

      await Promise.all([
        ensureCollection(GLOBAL_DOCS_COLLECTION_NAME),
        ensureCollection(GLOBAL_CODE_COLLECTION_NAME),
      ]);
    },

    searchDocuments: async ({ query, knowledgeId, sourceType, topK }) => {
      const collection = await ensureCollection(getCollectionName(sourceType));
      const [queryEmbedding] = await createEmbeddings([query]);

      const response = await requestChromaJson<ChromaQueryResponse>({
        path: `/collections/${collection.id}/query`,
        method: 'POST',
        body: {
          query_embeddings: [queryEmbedding],
          n_results: topK,
          include: ['documents', 'metadatas', 'distances'],
          ...(knowledgeId
            ? {
                where: {
                  knowledgeId,
                },
              }
            : {}),
        },
      });

      return mapQueryResults({
        query,
        sourceType,
        response,
      });
    },

    deleteKnowledgeChunks: async (knowledgeId, sourceType) => {
      if (!env.chroma.url) {
        return;
      }

      await deleteByWhere({
        sourceType,
        where: {
          knowledgeId,
        },
      });
    },

    deleteDocumentChunks: async (documentId, sourceType) => {
      if (!env.chroma.url) {
        return;
      }

      await deleteByWhere({
        sourceType,
        where: {
          documentId,
        },
      });
    },
  };
};
