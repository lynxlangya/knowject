import { join } from "node:path";
import {
  getEffectiveEmbeddingConfig,
  getEffectiveIndexingConfig,
} from "@config/ai-config.js";
import type { AppEnv } from "@config/env.js";
import { encryptApiKey } from "@lib/crypto.js";
import {
  buildApiUrl,
  normalizeIndexerErrorMessage,
  parseResponseBody,
} from "@lib/http.js";
import type { SettingsRepository } from "@modules/settings/settings.repository.js";
import type {
  EffectiveEmbeddingConfig,
  EffectiveIndexingConfig,
} from "@modules/settings/settings.types.js";
import type { WithId } from "mongodb";
import {
  createNamespaceIndexState,
  createNamespaceStateDocument,
  listDocumentsForKnowledgeIds,
  type ResolvedNamespaceIndexContext,
  updateNamespaceIndexState,
} from "./knowledge.namespace.js";
import {
  adjustKnowledgeSummaryAfterDocumentCompletion,
  adjustKnowledgeSummaryAfterDocumentFailure,
  markKnowledgeDocumentFailedIfRecoverable,
  markKnowledgeDocumentPendingForRecovery,
  markKnowledgeDocumentCompletedIfProcessing,
  markKnowledgeDocumentPendingIfRetryable,
  markKnowledgeDocumentProcessingIfPending,
  markKnowledgeSummaryPending,
  markKnowledgeSummaryProcessing,
  type KnowledgeRepository,
} from "./knowledge.repository.js";
import type { KnowledgeSearchService } from "./knowledge.search.js";
import {
  buildVersionedKnowledgeCollectionName,
  toKnowledgeEmbeddingMetadata,
} from "./knowledge.shared.js";
import type {
  KnowledgeDocumentRecord,
  KnowledgeIndexerDocumentRequest,
  KnowledgeIndexerResponse,
  KnowledgeSourceType,
} from "./knowledge.types.js";

export interface KnowledgeEmbeddingMetadata {
  embeddingProvider: KnowledgeDocumentRecord["embeddingProvider"];
  embeddingModel: KnowledgeDocumentRecord["embeddingModel"];
}

interface QueueKnowledgeDocumentProcessingInput {
  env: AppEnv;
  repository: KnowledgeRepository;
  searchService: KnowledgeSearchService;
  settingsRepository: SettingsRepository;
  knowledgeId: string;
  documentId: string;
  storagePath: string;
  fileName: string;
  mimeType: string;
  sourceType: KnowledgeSourceType;
  collectionName: string;
  documentVersionHash: string;
  embeddingConfig: EffectiveEmbeddingConfig;
  indexingConfig: EffectiveIndexingConfig;
  embeddingMetadata: KnowledgeEmbeddingMetadata;
  mode?: "index" | "rebuild";
}

const KNOWLEDGE_INDEXER_DOCUMENT_PATHS = [
  "/internal/v1/index/documents",
  "/internal/index-documents",
] as const;
const KNOWLEDGE_INDEXER_REBUILD_DOCUMENT_PATHS = (documentId: string) =>
  [
    `/internal/v1/index/documents/${encodeURIComponent(documentId)}/rebuild`,
    "/internal/v1/index/documents",
    "/internal/index-documents",
  ] as const;

const buildKnowledgeIndexerUrls = (baseUrl: string): string[] => {
  return Array.from(
    new Set(
      KNOWLEDGE_INDEXER_DOCUMENT_PATHS.map((path) =>
        buildApiUrl(baseUrl, path),
      ),
    ),
  );
};

const buildKnowledgeIndexerRebuildUrls = (
  baseUrl: string,
  documentId: string,
): string[] => {
  return Array.from(
    new Set(
      KNOWLEDGE_INDEXER_REBUILD_DOCUMENT_PATHS(documentId).map((path) =>
        buildApiUrl(baseUrl, path),
      ),
    ),
  );
};

const callKnowledgeIndexer = async (
  env: AppEnv,
  settingsRepository: SettingsRepository,
  payload: KnowledgeIndexerDocumentRequest,
  options?: {
    mode?: "index" | "rebuild";
    embeddingConfig?: EffectiveEmbeddingConfig;
    indexingConfig?: EffectiveIndexingConfig;
  },
): Promise<KnowledgeIndexerResponse> => {
  const mode = options?.mode ?? "index";
  const indexerUrls =
    mode === "rebuild"
      ? buildKnowledgeIndexerRebuildUrls(
          env.knowledge.indexerUrl,
          payload.documentId,
        )
      : buildKnowledgeIndexerUrls(env.knowledge.indexerUrl);
  const [embeddingConfig, indexingConfig] = await Promise.all([
    options?.embeddingConfig
      ? Promise.resolve(options.embeddingConfig)
      : getEffectiveEmbeddingConfig({
          env,
          repository: settingsRepository,
        }),
    options?.indexingConfig
      ? Promise.resolve(options.indexingConfig)
      : getEffectiveIndexingConfig({
          env,
          repository: settingsRepository,
        }),
  ]);
  const requestPayload: KnowledgeIndexerDocumentRequest = {
    ...payload,
    embeddingConfig: {
      provider: embeddingConfig.provider,
      apiKey: embeddingConfig.apiKey,
      baseUrl: embeddingConfig.baseUrl,
      model: embeddingConfig.model,
    },
    indexingConfig: {
      chunkSize: indexingConfig.chunkSize,
      chunkOverlap: indexingConfig.chunkOverlap,
      supportedTypes: [...indexingConfig.supportedTypes],
      indexerTimeoutMs: indexingConfig.indexerTimeoutMs,
    },
  };

  for (let index = 0; index < indexerUrls.length; index += 1) {
    const indexerUrl = indexerUrls[index];
    if (!indexerUrl) {
      continue;
    }

    let response: Response;

    try {
      response = await fetch(indexerUrl, {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify(requestPayload),
        signal: AbortSignal.timeout(indexingConfig.indexerTimeoutMs),
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "unknown fetch error";
      throw new Error(
        `Python indexer 不可达，请确认本地索引服务已启动（${indexerUrl}）。原始错误：${message}`,
      );
    }

    const responseBody = await parseResponseBody(response);

    if (response.status === 404 && index < indexerUrls.length - 1) {
      continue;
    }

    if (!response.ok) {
      throw new Error(
        normalizeIndexerErrorMessage(
          responseBody,
          `Python indexer 请求失败（HTTP ${response.status}）`,
        ),
      );
    }

    if (
      !responseBody ||
      typeof responseBody !== "object" ||
      !("status" in responseBody) ||
      (responseBody.status !== "completed" && responseBody.status !== "failed")
    ) {
      throw new Error("Python indexer 返回了无法识别的响应");
    }

    return responseBody as KnowledgeIndexerResponse;
  }

  throw new Error("Python indexer 请求失败（HTTP 404）");
};

export const persistProcessingFailure = async ({
  repository,
  knowledgeId,
  documentId,
  errorMessage,
  previousChunkCount = 0,
}: {
  repository: KnowledgeRepository;
  knowledgeId: string;
  documentId: string;
  errorMessage: string;
  previousChunkCount?: number;
}): Promise<void> => {
  const failedAt = new Date();

  try {
    const failedDocument = await markKnowledgeDocumentFailedIfRecoverable(
      repository,
      documentId,
      {
        errorMessage,
        updatedAt: failedAt,
        processedAt: failedAt,
      },
    );

    if (failedDocument) {
      await adjustKnowledgeSummaryAfterDocumentFailure(
        repository,
        knowledgeId,
        {
          previousChunkCount,
          updatedAt: failedAt,
        },
      );
    }
  } catch (persistenceError) {
    console.error(
      `[knowledge-indexer] document ${documentId} failure state persistence failed: ${normalizeIndexerErrorMessage(
        persistenceError,
        "MongoDB 状态回写失败",
      )}`,
    );
  }

  console.error(
    `[knowledge-indexer] document ${documentId} processing failed: ${errorMessage}`,
  );
};

const cleanupDetachedDocumentChunks = async ({
  searchService,
  documentId,
  collectionName,
}: {
  searchService: KnowledgeSearchService;
  documentId: string;
  collectionName: string;
}): Promise<void> => {
  try {
    await searchService.deleteDocumentChunks(documentId, {
      collectionName,
    });
  } catch (cleanupError) {
    console.warn(
      `[knowledge-indexer] orphan chunk cleanup failed for document ${documentId}: ${normalizeIndexerErrorMessage(
        cleanupError,
        "Chroma 文档向量清理失败",
      )}`,
    );
  }
};

const processUploadedDocument = async ({
  env,
  repository,
  searchService,
  settingsRepository,
  knowledgeId,
  documentId,
  storagePath,
  fileName,
  mimeType,
  sourceType,
  collectionName,
  documentVersionHash,
  embeddingConfig,
  indexingConfig,
  embeddingMetadata,
  mode = "index",
}: QueueKnowledgeDocumentProcessingInput): Promise<void> => {
  let processingDocument: WithId<KnowledgeDocumentRecord> | null = null;

  try {
    const processingAt = new Date();
    processingDocument = await markKnowledgeDocumentProcessingIfPending(
      repository,
      documentId,
      processingAt,
    );

    if (!processingDocument) {
      return;
    }

    await markKnowledgeSummaryProcessing(repository, knowledgeId, processingAt);

    const result = await callKnowledgeIndexer(
      env,
      settingsRepository,
      {
        knowledgeId,
        documentId,
        sourceType,
        collectionName,
        fileName,
        mimeType,
        storagePath,
        documentVersionHash,
      },
      {
        mode,
        embeddingConfig,
        indexingConfig,
      },
    );

    if (result.status === "failed") {
      throw new Error(result.errorMessage);
    }

    const completedAt = new Date();
    const completedDocument = await markKnowledgeDocumentCompletedIfProcessing(
      repository,
      documentId,
      {
        chunkCount: result.chunkCount,
        embeddingProvider: embeddingMetadata.embeddingProvider,
        embeddingModel: embeddingMetadata.embeddingModel,
        lastIndexedAt: completedAt,
        processedAt: completedAt,
        updatedAt: completedAt,
      },
    );

    if (!completedDocument) {
      const latestDocument = await repository.findKnowledgeDocumentById(
        documentId,
      );
      if (latestDocument) {
        return;
      }

      await cleanupDetachedDocumentChunks({
        searchService,
        documentId,
        collectionName,
      });
      return;
    }

    await adjustKnowledgeSummaryAfterDocumentCompletion(
      repository,
      knowledgeId,
      {
        previousChunkCount: processingDocument.chunkCount,
        nextChunkCount: result.chunkCount,
        updatedAt: completedAt,
      },
    );
  } catch (error) {
    const errorMessage = normalizeIndexerErrorMessage(error);
    await persistProcessingFailure({
      repository,
      knowledgeId,
      documentId,
      errorMessage,
      previousChunkCount: processingDocument?.chunkCount ?? 0,
    });
  }
};

export const queueKnowledgeDocumentProcessing = (
  input: QueueKnowledgeDocumentProcessingInput,
): void => {
  setImmediate(() => {
    void processUploadedDocument(input).catch((error) => {
      console.error(
        `[knowledge-indexer] detached processing crashed for document ${input.documentId}: ${normalizeIndexerErrorMessage(
          error,
        )}`,
      );
    });
  });
};

export const queueExistingKnowledgeDocument = async ({
  env,
  repository,
  searchService,
  settingsRepository,
  knowledgeId,
  document,
  sourceType,
  collectionName,
  embeddingConfig,
  indexingConfig,
  embeddingMetadata,
  mode,
  createKnowledgeDocumentNotFoundError,
  createKnowledgeDocumentConflictError,
}: {
  env: AppEnv;
  repository: KnowledgeRepository;
  searchService: KnowledgeSearchService;
  settingsRepository: SettingsRepository;
  knowledgeId: string;
  document: WithId<KnowledgeDocumentRecord>;
  sourceType: KnowledgeSourceType;
  collectionName: string;
  embeddingConfig: EffectiveEmbeddingConfig;
  indexingConfig: EffectiveIndexingConfig;
  embeddingMetadata: KnowledgeEmbeddingMetadata;
  mode: "index" | "rebuild";
  createKnowledgeDocumentNotFoundError: () => Error;
  createKnowledgeDocumentConflictError?: () => Error;
}): Promise<void> => {
  const queuedAt = new Date();
  const queuedDocument = await markKnowledgeDocumentPendingIfRetryable(
    repository,
    document._id.toHexString(),
    queuedAt,
  );

  if (!queuedDocument) {
    const latestDocument = await repository.findKnowledgeDocumentById(
      document._id.toHexString(),
    );

    if (!latestDocument) {
      throw createKnowledgeDocumentNotFoundError();
    }

    if (createKnowledgeDocumentConflictError) {
      throw createKnowledgeDocumentConflictError();
    }

    return;
  }

  await markKnowledgeSummaryPending(repository, knowledgeId, queuedAt);

  queueKnowledgeDocumentProcessing({
    env,
    repository,
    searchService,
    settingsRepository,
    knowledgeId,
    documentId: document._id.toHexString(),
    storagePath: join(env.knowledge.storageRoot, document.storagePath),
    fileName: document.fileName,
    mimeType: document.mimeType,
    sourceType,
    collectionName,
    documentVersionHash: document.documentVersionHash,
    embeddingConfig,
    indexingConfig,
    embeddingMetadata,
    mode,
  });
};

export const queueRecoverableKnowledgeDocument = async ({
  env,
  repository,
  searchService,
  settingsRepository,
  knowledgeId,
  document,
  sourceType,
  collectionName,
  embeddingConfig,
  indexingConfig,
  embeddingMetadata,
}: {
  env: AppEnv;
  repository: KnowledgeRepository;
  searchService: KnowledgeSearchService;
  settingsRepository: SettingsRepository;
  knowledgeId: string;
  document: WithId<KnowledgeDocumentRecord>;
  sourceType: KnowledgeSourceType;
  collectionName: string;
  embeddingConfig: EffectiveEmbeddingConfig;
  indexingConfig: EffectiveIndexingConfig;
  embeddingMetadata: KnowledgeEmbeddingMetadata;
}): Promise<void> => {
  const queuedAt = new Date();
  const queuedDocument = await markKnowledgeDocumentPendingForRecovery(
    repository,
    document._id.toHexString(),
    queuedAt,
  );

  if (!queuedDocument) {
    const latestDocument = await repository.findKnowledgeDocumentById(
      document._id.toHexString(),
    );

    if (!latestDocument) {
      return;
    }

    return;
  }

  await markKnowledgeSummaryPending(repository, knowledgeId, queuedAt);

  queueKnowledgeDocumentProcessing({
    env,
    repository,
    searchService,
    settingsRepository,
    knowledgeId,
    documentId: document._id.toHexString(),
    storagePath: join(env.knowledge.storageRoot, document.storagePath),
    fileName: document.fileName,
    mimeType: document.mimeType,
    sourceType,
    collectionName,
    documentVersionHash: document.documentVersionHash,
    embeddingConfig,
    indexingConfig,
    embeddingMetadata,
    mode: "index",
  });
};

export const markNamespaceDocumentsPending = async ({
  repository,
  documents,
}: {
  repository: KnowledgeRepository;
  documents: WithId<KnowledgeDocumentRecord>[];
}): Promise<void> => {
  const queuedAt = new Date();
  const knowledgeIds = Array.from(
    new Set(documents.map((document) => document.knowledgeId)),
  );

  const batchMarkPending = (
    repository as KnowledgeRepository & {
      markKnowledgeDocumentsPendingByKnowledgeIds?: (
        knowledgeIds: string[],
        updatedAt: Date,
      ) => Promise<void>;
    }
  ).markKnowledgeDocumentsPendingByKnowledgeIds;

  if (typeof batchMarkPending === "function") {
    await batchMarkPending.call(repository, knowledgeIds, queuedAt);
    return;
  }

  await Promise.all(
    documents.map((document) =>
      repository.updateKnowledgeDocument(document._id.toHexString(), {
        status: "pending",
        errorMessage: null,
        processedAt: null,
        updatedAt: queuedAt,
      }),
    ),
  );

  await Promise.all(
    knowledgeIds.map((knowledgeId) =>
      markKnowledgeSummaryPending(repository, knowledgeId, queuedAt),
    ),
  );
};

const runNamespaceRebuild = async ({
  env,
  repository,
  searchService,
  settingsRepository,
  namespaceContext,
  documents,
}: {
  env: AppEnv;
  repository: KnowledgeRepository;
  searchService: KnowledgeSearchService;
  settingsRepository: SettingsRepository;
  namespaceContext: ResolvedNamespaceIndexContext;
  documents: WithId<KnowledgeDocumentRecord>[];
}): Promise<void> => {
  const targetCollectionName =
    namespaceContext.mode === "versioned" &&
    namespaceContext.state.targetCollectionName
      ? namespaceContext.state.targetCollectionName
      : buildVersionedKnowledgeCollectionName(
          namespaceContext.namespace.namespaceKey,
          namespaceContext.currentEmbeddingFingerprint,
        );
  const previousCollectionName =
    namespaceContext.mode === "versioned"
      ? namespaceContext.state.activeCollectionName
      : namespaceContext.namespace.namespaceKey;
  const embeddingMetadata = toKnowledgeEmbeddingMetadata(
    namespaceContext.currentEmbeddingConfig,
  );
  const indexingConfig = await getEffectiveIndexingConfig({
    env,
    repository: settingsRepository,
  });

  for (const document of documents) {
    await processUploadedDocument({
      env,
      repository,
      searchService,
      settingsRepository,
      knowledgeId: document.knowledgeId,
      documentId: document._id.toHexString(),
      storagePath: join(env.knowledge.storageRoot, document.storagePath),
      fileName: document.fileName,
      mimeType: document.mimeType,
      sourceType: namespaceContext.namespace.sourceType,
      collectionName: targetCollectionName,
      documentVersionHash: document.documentVersionHash,
      embeddingConfig: namespaceContext.currentEmbeddingConfig,
      indexingConfig,
      embeddingMetadata,
      mode: "rebuild",
    });
  }

  const refreshedDocuments = await listDocumentsForKnowledgeIds({
    repository,
    knowledgeIds: documents.map((document) => document.knowledgeId),
  });
  const rebuildDocuments = refreshedDocuments.filter((document) =>
    documents.some((item) => item._id.equals(document._id)),
  );
  const failedDocument = rebuildDocuments.find(
    (document) => document.status !== "completed",
  );

  if (failedDocument) {
    if (namespaceContext.mode === "versioned") {
      await updateNamespaceIndexState(
        repository,
        namespaceContext.namespace.namespaceKey,
        {
          rebuildStatus: "failed",
          lastErrorMessage: failedDocument.errorMessage ?? "命名空间重建失败",
          updatedAt: new Date(),
        },
      );
    }
    return;
  }

  const updatedAt = new Date();

  if (namespaceContext.mode === "versioned") {
    await updateNamespaceIndexState(
      repository,
      namespaceContext.namespace.namespaceKey,
      {
        activeCollectionName: targetCollectionName,
        activeEmbeddingProvider:
          namespaceContext.currentEmbeddingConfig.provider,
        activeApiKeyEncrypted: namespaceContext.currentEmbeddingConfig.apiKey
          ? encryptApiKey(namespaceContext.currentEmbeddingConfig.apiKey)
          : null,
        activeEmbeddingBaseUrl: namespaceContext.currentEmbeddingConfig.baseUrl,
        activeEmbeddingModel: namespaceContext.currentEmbeddingConfig.model,
        activeEmbeddingFingerprint:
          namespaceContext.currentEmbeddingFingerprint,
        rebuildStatus: "idle",
        targetCollectionName: null,
        targetEmbeddingProvider: null,
        targetEmbeddingBaseUrl: null,
        targetEmbeddingModel: null,
        targetEmbeddingFingerprint: null,
        lastErrorMessage: null,
        updatedAt,
      },
    );
  } else {
    await createNamespaceIndexState(
      repository,
      createNamespaceStateDocument({
        namespace: namespaceContext.namespace,
        embeddingConfig: namespaceContext.currentEmbeddingConfig,
        embeddingFingerprint: namespaceContext.currentEmbeddingFingerprint,
        now: updatedAt,
      }),
    );
  }

  if (previousCollectionName !== targetCollectionName) {
    try {
      await searchService.deleteCollection(previousCollectionName);
    } catch (error) {
      console.warn(
        `[knowledge-search] failed to cleanup stale collection ${previousCollectionName}: ${normalizeIndexerErrorMessage(
          error,
          "Chroma collection 清理失败",
        )}`,
      );
    }
  }
};

export const queueNamespaceRebuild = ({
  env,
  repository,
  searchService,
  settingsRepository,
  namespaceContext,
  documents,
}: {
  env: AppEnv;
  repository: KnowledgeRepository;
  searchService: KnowledgeSearchService;
  settingsRepository: SettingsRepository;
  namespaceContext: ResolvedNamespaceIndexContext;
  documents: WithId<KnowledgeDocumentRecord>[];
}): void => {
  setImmediate(() => {
    void runNamespaceRebuild({
      env,
      repository,
      searchService,
      settingsRepository,
      namespaceContext,
      documents,
    }).catch((error) => {
      console.error(
        `[knowledge-indexer] detached namespace rebuild crashed for ${namespaceContext.namespace.namespaceKey}: ${normalizeIndexerErrorMessage(
          error,
        )}`,
      );
    });
  });
};
