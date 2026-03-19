import { createHash } from "node:crypto";
import { extname } from "node:path";
import { ObjectId, type WithId } from "mongodb";
import {
  getEffectiveEmbeddingConfig,
  getEffectiveIndexingConfig,
} from "@config/ai-config.js";
import type { AppEnv } from "@config/env.js";
import { AppError } from "@lib/app-error.js";
import { normalizeIndexerErrorMessage } from "@lib/http.js";
import {
  createRequiredFieldError,
  createValidationAppError,
  readOptionalStringField,
} from "@lib/validation.js";
import type { AuthRepository } from "@modules/auth/auth.repository.js";
import type { AuthUserProfile } from "@modules/auth/auth.types.js";
import type { ProjectsRepository } from "@modules/projects/projects.repository.js";
import { requireVisibleProject } from "@modules/projects/projects.shared.js";
import type { SettingsRepository } from "@modules/settings/settings.repository.js";
import type { EffectiveEmbeddingConfig } from "@modules/settings/settings.types.js";
import {
  isStaleProcessingDocument,
  readKnowledgeIndexerDiagnostics,
  resolveDiagnosticsErrorMessage,
} from "./knowledge.diagnostics.js";
import {
  type KnowledgeEmbeddingMetadata,
  markNamespaceDocumentsPending,
  queueExistingKnowledgeDocument,
  queueKnowledgeDocumentProcessing,
  queueNamespaceRebuild,
} from "./knowledge.index-orchestrator.js";
import {
  type ResolvedNamespaceIndexContext,
  createNamespaceIndexState,
  createNamespaceRebuildStateDocument,
  listNamespaceDocuments,
  resolveActiveEmbeddingConfig,
  resolveNamespaceIndexContext,
  resolveSearchCollectionName,
} from "./knowledge.namespace.js";
import {
  mergeKnowledgeSearchHitGroups,
  searchKnowledgeNamespaceDocuments,
  type GroupedKnowledgeSearchHits,
} from "./knowledge.project-search.js";
import {
  adjustKnowledgeSummaryAfterDocumentRemoval,
  markKnowledgeNamespaceRebuildingIfIdle,
  type KnowledgeRepository,
} from "./knowledge.repository.js";
import { recoverInterruptedKnowledgeTasks } from "./knowledge.recovery.js";
import type { KnowledgeSearchService } from "./knowledge.search.js";
import {
  createKnowledgeDocumentStorageLayout,
  readDocumentStoragePresence,
  removeKnowledgeDocumentStorage,
  removeKnowledgeStorageRoot,
  writeKnowledgeDocumentFile,
} from "./knowledge.storage.js";
import {
  SUPPORTED_KNOWLEDGE_UPLOAD_TYPES,
  buildVersionedKnowledgeCollectionName,
  resolveKnowledgeScope,
  toKnowledgeEmbeddingMetadata,
  toKnowledgeDocumentResponse,
  toKnowledgeSummaryResponse,
} from "./knowledge.shared.js";
import type {
  CreateKnowledgeInput,
  KnowledgeCommandContext,
  KnowledgeBaseDocument,
  KnowledgeDiagnosticsResponse,
  KnowledgeDetailEnvelope,
  KnowledgeDocumentRecord,
  KnowledgeDocumentUploadResponse,
  KnowledgeNamespaceIndexStateDocument,
  KnowledgeListResponse,
  KnowledgeMutationResponse,
  KnowledgeSearchResponse,
  KnowledgeSourceType,
  SearchKnowledgeDocumentsInput,
  SearchProjectKnowledgeDocumentsInput,
  UpdateKnowledgeInput,
  UploadedKnowledgeFile,
} from "./knowledge.types.js";
import {
  requireKnowledgeInProject as requireKnowledgeInProjectByScope,
  requireVisibleKnowledge as requireVisibleKnowledgeByScope,
} from "./knowledge.visibility.js";

export interface KnowledgeService {
  initializeSearchInfrastructure(): Promise<void>;
  listKnowledge(
    context: KnowledgeCommandContext,
  ): Promise<KnowledgeListResponse>;
  listProjectKnowledge(
    context: KnowledgeCommandContext,
    projectId: string,
  ): Promise<KnowledgeListResponse>;
  getKnowledgeDetail(
    context: KnowledgeCommandContext,
    knowledgeId: string,
  ): Promise<KnowledgeDetailEnvelope>;
  getProjectKnowledgeDetail(
    context: KnowledgeCommandContext,
    projectId: string,
    knowledgeId: string,
  ): Promise<KnowledgeDetailEnvelope>;
  createKnowledge(
    context: KnowledgeCommandContext,
    input: CreateKnowledgeInput,
  ): Promise<KnowledgeMutationResponse>;
  createProjectKnowledge(
    context: KnowledgeCommandContext,
    projectId: string,
    input: CreateKnowledgeInput,
  ): Promise<KnowledgeMutationResponse>;
  updateKnowledge(
    context: KnowledgeCommandContext,
    knowledgeId: string,
    input: UpdateKnowledgeInput,
  ): Promise<KnowledgeMutationResponse>;
  deleteKnowledge(
    context: KnowledgeCommandContext,
    knowledgeId: string,
  ): Promise<void>;
  deleteDocument(
    context: KnowledgeCommandContext,
    knowledgeId: string,
    documentId: string,
  ): Promise<void>;
  uploadDocument(
    context: KnowledgeCommandContext,
    knowledgeId: string,
    file: UploadedKnowledgeFile,
  ): Promise<KnowledgeDocumentUploadResponse>;
  uploadProjectKnowledgeDocument(
    context: KnowledgeCommandContext,
    projectId: string,
    knowledgeId: string,
    file: UploadedKnowledgeFile,
  ): Promise<KnowledgeDocumentUploadResponse>;
  retryDocument(
    context: KnowledgeCommandContext,
    knowledgeId: string,
    documentId: string,
  ): Promise<void>;
  rebuildDocument(
    context: KnowledgeCommandContext,
    knowledgeId: string,
    documentId: string,
  ): Promise<void>;
  rebuildKnowledge(
    context: KnowledgeCommandContext,
    knowledgeId: string,
  ): Promise<void>;
  getKnowledgeDiagnostics(
    context: KnowledgeCommandContext,
    knowledgeId: string,
  ): Promise<KnowledgeDiagnosticsResponse>;
  searchDocuments(
    context: KnowledgeCommandContext,
    input: SearchKnowledgeDocumentsInput,
  ): Promise<KnowledgeSearchResponse>;
  searchProjectDocuments(
    context: KnowledgeCommandContext,
    projectId: string,
    input: SearchProjectKnowledgeDocumentsInput,
  ): Promise<KnowledgeSearchResponse>;
}

type KnowledgeActorProfileMap = Map<string, AuthUserProfile>;

const createKnowledgeNotFoundError = (): AppError => {
  return new AppError({
    statusCode: 404,
    code: "KNOWLEDGE_NOT_FOUND",
    message: "知识库不存在",
  });
};

const requireAccessibleKnowledge = (
  input: Omit<
    Parameters<typeof requireVisibleKnowledgeByScope>[0],
    "createKnowledgeNotFoundError"
  >,
) => {
  return requireVisibleKnowledgeByScope({
    ...input,
    createKnowledgeNotFoundError,
  });
};

const requireProjectScopedKnowledge = (
  input: Omit<
    Parameters<typeof requireKnowledgeInProjectByScope>[0],
    "createKnowledgeNotFoundError"
  >,
) => {
  return requireKnowledgeInProjectByScope({
    ...input,
    createKnowledgeNotFoundError,
  });
};

const createKnowledgeDocumentNotFoundError = (): AppError => {
  return new AppError({
    statusCode: 404,
    code: "KNOWLEDGE_DOCUMENT_NOT_FOUND",
    message: "文档不存在",
  });
};

const createUploadNotSupportedError = (): AppError => {
  return new AppError({
    statusCode: 400,
    code: "KNOWLEDGE_UPLOAD_UNSUPPORTED_TYPE",
    message: "当前只支持上传 md、markdown、txt 文件",
  });
};

const createUploadEmptyFileError = (): AppError => {
  return new AppError({
    statusCode: 400,
    code: "KNOWLEDGE_UPLOAD_EMPTY_FILE",
    message: "上传文件不能为空",
  });
};

const createUploadSourceTypeError = (): AppError => {
  return new AppError({
    statusCode: 409,
    code: "KNOWLEDGE_UPLOAD_SOURCE_TYPE_UNSUPPORTED",
    message: "当前只有 global_docs 类型支持文件上传",
  });
};

const createDocumentRetryConflictError = (): AppError => {
  return new AppError({
    statusCode: 409,
    code: "KNOWLEDGE_DOCUMENT_RETRY_CONFLICT",
    message: "文档已在索引中，请稍后刷新状态",
  });
};

const createKnowledgeRebuildConflictError = (): AppError => {
  return new AppError({
    statusCode: 409,
    code: "KNOWLEDGE_REBUILD_CONFLICT",
    message: "知识库存在正在索引的文档，请稍后再试",
  });
};

const createKnowledgeRebuildEmptyError = (): AppError => {
  return new AppError({
    statusCode: 409,
    code: "KNOWLEDGE_REBUILD_EMPTY",
    message: "知识库当前没有可重建的文档",
  });
};

const createNamespaceRebuildingConflictError = (): AppError => {
  return new AppError({
    statusCode: 409,
    code: "KNOWLEDGE_NAMESPACE_REBUILDING",
    message: "当前命名空间正在重建，请稍后再试",
  });
};

const createNamespaceRebuildRequiredError = (): AppError => {
  return new AppError({
    statusCode: 409,
    code: "KNOWLEDGE_NAMESPACE_REBUILD_REQUIRED",
    message: "当前向量模型已变更，请先执行知识库全量重建",
  });
};

const createLegacyNamespaceRebuildRequiredError = (): AppError => {
  return new AppError({
    statusCode: 409,
    code: "KNOWLEDGE_NAMESPACE_LEGACY_REBUILD_REQUIRED",
    message: "当前索引缺少模型版本元数据，请先执行一次知识库全量重建",
  });
};

const createDuplicateKnowledgeDocumentVersionError = (
  document: WithId<KnowledgeDocumentRecord>,
): AppError => {
  return new AppError({
    statusCode: 409,
    code: "KNOWLEDGE_DOCUMENT_DUPLICATE_VERSION",
    message: "相同内容的文档已存在，请直接重试或重建现有文档",
    details: {
      knowledgeId: document.knowledgeId,
      documentId: document._id.toHexString(),
      fileName: document.fileName,
      status: document.status,
    },
  });
};

const isKnowledgeDocumentVersionDuplicateError = (error: unknown): boolean => {
  if (!error || typeof error !== "object") {
    return false;
  }

  const duplicateError = error as {
    code?: unknown;
    keyPattern?: unknown;
    keyValue?: unknown;
    message?: unknown;
  };

  if (duplicateError.code !== 11000) {
    return false;
  }

  const hasKnowledgeIdAndVersionHash = (value: unknown): boolean => {
    return (
      value !== null &&
      typeof value === "object" &&
      "knowledgeId" in value &&
      "documentVersionHash" in value
    );
  };

  if (
    hasKnowledgeIdAndVersionHash(duplicateError.keyPattern) ||
    hasKnowledgeIdAndVersionHash(duplicateError.keyValue)
  ) {
    return true;
  }

  if (
    typeof duplicateError.message === "string" &&
    duplicateError.message.includes(
      "knowledge_documents_knowledge_id_version_hash",
    )
  ) {
    return true;
  }

  return false;
};

const NOOP_PROJECTS_REPOSITORY = {
  findById: async () => null,
} as unknown as ProjectsRepository;
const NOOP_SETTINGS_REPOSITORY = {
  getSettings: async () => null,
} as unknown as SettingsRepository;

const readOptionalSourceType = (
  value: unknown,
): KnowledgeSourceType | undefined => {
  if (value === undefined) {
    return undefined;
  }

  if (value === "global_docs" || value === "global_code") {
    return value;
  }

  throw createValidationAppError("sourceType 不合法", {
    sourceType: "sourceType 只能为 global_docs 或 global_code",
  });
};

const validateCreateKnowledgeInput = (
  input: CreateKnowledgeInput,
  actorId: string,
) => {
  const name = readOptionalStringField(input.name, "name");
  const description = readOptionalStringField(input.description, "description");
  const sourceType = readOptionalSourceType(input.sourceType) ?? "global_docs";

  if (!name) {
    throw createValidationAppError("请输入知识库名称", {
      name: "请输入知识库名称",
    });
  }

  const now = new Date();

  return {
    name,
    description: description ?? "",
    scope: "global" as const,
    projectId: null,
    sourceType,
    indexStatus: "idle" as const,
    documentCount: 0,
    chunkCount: 0,
    maintainerId: actorId,
    createdBy: actorId,
    createdAt: now,
    updatedAt: now,
  };
};

const validateCreateProjectKnowledgeInput = (
  input: CreateKnowledgeInput,
  actorId: string,
  projectId: string,
) => {
  const knowledge = validateCreateKnowledgeInput(input, actorId);

  if (knowledge.sourceType !== "global_docs") {
    throw createValidationAppError("当前项目知识只支持 global_docs", {
      sourceType: "当前项目知识只支持 global_docs",
    });
  }

  return {
    ...knowledge,
    scope: "project" as const,
    projectId,
  };
};

const validateUpdateKnowledgeInput = (input: UpdateKnowledgeInput) => {
  const name = readOptionalStringField(input.name, "name");
  const description = readOptionalStringField(input.description, "description");

  if (name === undefined && description === undefined) {
    throw createValidationAppError("至少需要提供一个可更新字段", {
      name: "至少需要提供 name 或 description",
      description: "至少需要提供 name 或 description",
    });
  }

  if (input.name !== undefined && !name) {
    throw createValidationAppError("请输入知识库名称", {
      name: "请输入知识库名称",
    });
  }

  return {
    ...(name !== undefined ? { name } : {}),
    ...(description !== undefined ? { description: description ?? "" } : {}),
  };
};

const validateSearchDocumentsInput = (
  input: SearchKnowledgeDocumentsInput,
): {
  query: string;
  knowledgeId?: string;
  sourceType: KnowledgeSourceType;
  collectionName: string;
  topK: number;
} => {
  const query = typeof input.query === "string" ? input.query.trim() : "";
  const knowledgeId = readOptionalStringField(input.knowledgeId, "knowledgeId");
  const sourceType = readOptionalSourceType(input.sourceType) ?? "global_docs";
  const rawTopK = input.topK ?? input.limit;

  if (!query) {
    throw new AppError(createRequiredFieldError("query"));
  }

  let topK = 5;

  if (typeof rawTopK === "number" && Number.isFinite(rawTopK)) {
    topK = Math.trunc(rawTopK);
  } else if (typeof rawTopK === "string" && rawTopK.trim()) {
    topK = Number.parseInt(rawTopK.trim(), 10);
  }

  if (!Number.isInteger(topK) || topK <= 0 || topK > 10) {
    throw createValidationAppError("topK 必须是 1 到 10 之间的整数", {
      topK: "topK 必须是 1 到 10 之间的整数",
    });
  }

  return {
    query,
    knowledgeId: knowledgeId || undefined,
    sourceType,
    collectionName:
      sourceType === "global_code" ? "global_code" : "global_docs",
    topK,
  };
};

const validateSearchProjectDocumentsInput = (
  input: SearchProjectKnowledgeDocumentsInput,
): {
  query: string;
  topK: number;
} => {
  const { query, topK } = validateSearchDocumentsInput({
    query: input.query,
    topK: input.topK,
    limit: input.limit,
    sourceType: "global_docs",
  });

  return {
    query,
    topK,
  };
};

const validateUploadFile = (
  sourceType: KnowledgeSourceType,
  file: UploadedKnowledgeFile,
): void => {
  if (sourceType !== "global_docs") {
    throw createUploadSourceTypeError();
  }

  if (file.size <= 0 || file.buffer.length <= 0) {
    throw createUploadEmptyFileError();
  }

  const extension = extname(file.originalName).toLowerCase();
  const supported = SUPPORTED_KNOWLEDGE_UPLOAD_TYPES.find(
    (item) =>
      item.sourceType === sourceType &&
      item.extensions.includes(extension as (typeof item.extensions)[number]),
  );

  if (!supported) {
    throw createUploadNotSupportedError();
  }

  if (
    !supported.mimeTypes.includes(
      file.mimeType as (typeof supported.mimeTypes)[number],
    )
  ) {
    throw createUploadNotSupportedError();
  }
};

const buildDocumentVersionHash = (file: UploadedKnowledgeFile): string => {
  return createHash("sha256").update(file.buffer).digest("hex");
};

const assertNamespaceReadyForMutation = (
  context: ResolvedNamespaceIndexContext,
): WithId<KnowledgeNamespaceIndexStateDocument> => {
  if (context.mode === "legacy_untracked") {
    throw createLegacyNamespaceRebuildRequiredError();
  }

  if (context.state.rebuildStatus === "rebuilding") {
    throw createNamespaceRebuildingConflictError();
  }

  if (
    context.state.activeEmbeddingFingerprint !==
    context.currentEmbeddingFingerprint
  ) {
    throw createNamespaceRebuildRequiredError();
  }

  return context.state;
};

const listKnowledgeBasesForNamespace = async ({
  repository,
  namespace,
}: {
  repository: KnowledgeRepository;
  namespace: ResolvedNamespaceIndexContext["namespace"];
}): Promise<WithId<KnowledgeBaseDocument>[] | null> => {
  const repositoryWithNamespace = repository as KnowledgeRepository & {
    listKnowledgeBasesByNamespace?: KnowledgeRepository["listKnowledgeBasesByNamespace"];
  };

  if (typeof repositoryWithNamespace.listKnowledgeBasesByNamespace === "function") {
    return repositoryWithNamespace.listKnowledgeBasesByNamespace({
      scope: namespace.scope,
      projectId: namespace.projectId,
      sourceType: namespace.sourceType,
    });
  }

  if (typeof repository.listKnowledgeBases !== "function") {
    return null;
  }

  return repository.listKnowledgeBases({
    scope: namespace.scope,
    projectId: namespace.projectId ?? undefined,
    sourceType: namespace.sourceType,
  });
};

const cleanupEmptyNamespaceAfterKnowledgeDelete = async ({
  repository,
  searchService,
  namespaceContext,
}: {
  repository: KnowledgeRepository;
  searchService: KnowledgeSearchService;
  namespaceContext: ResolvedNamespaceIndexContext;
}): Promise<void> => {
  if (namespaceContext.mode !== "versioned") {
    return;
  }

  const remainingKnowledgeItems = await listKnowledgeBasesForNamespace({
    repository,
    namespace: namespaceContext.namespace,
  });

  if (!remainingKnowledgeItems || remainingKnowledgeItems.length > 0) {
    return;
  }

  const collectionNames = Array.from(
    new Set(
      [
        namespaceContext.state.activeCollectionName,
        namespaceContext.state.targetCollectionName,
      ].filter((value): value is string => Boolean(value)),
    ),
  );

  for (const collectionName of collectionNames) {
    try {
      await searchService.deleteCollection(collectionName);
    } catch (error) {
      console.warn(
        `[knowledge-search] failed to cleanup empty namespace collection ${collectionName}: ${normalizeIndexerErrorMessage(
          error,
          "Chroma collection 清理失败",
        )}`,
      );
    }
  }

  const repositoryWithNamespaceDelete = repository as KnowledgeRepository & {
    deleteKnowledgeNamespaceIndexState?: KnowledgeRepository["deleteKnowledgeNamespaceIndexState"];
  };

  if (
    typeof repositoryWithNamespaceDelete.deleteKnowledgeNamespaceIndexState !==
    "function"
  ) {
    return;
  }

  try {
    await repositoryWithNamespaceDelete.deleteKnowledgeNamespaceIndexState(
      namespaceContext.namespace.namespaceKey,
    );
  } catch (error) {
    console.warn(
      `[knowledge-search] failed to cleanup empty namespace state ${namespaceContext.namespace.namespaceKey}: ${normalizeIndexerErrorMessage(
        error,
        "MongoDB namespace 状态清理失败",
      )}`,
    );
  }
};

const buildNamespaceRebuildTargetCollectionName = ({
  namespaceKey,
  fingerprint,
  activeCollectionName,
}: {
  namespaceKey: string;
  fingerprint: string;
  activeCollectionName: string;
}): string => {
  const defaultCollectionName = buildVersionedKnowledgeCollectionName(
    namespaceKey,
    fingerprint,
  );

  if (defaultCollectionName !== activeCollectionName) {
    return defaultCollectionName;
  }

  return buildVersionedKnowledgeCollectionName(namespaceKey, fingerprint, {
    suffix: `stage_${Date.now().toString(36)}`,
  });
};

const resolveEmbeddingMetadata = async ({
  env,
  settingsRepository,
  embeddingConfig,
}: {
  env: AppEnv;
  settingsRepository: SettingsRepository;
  embeddingConfig?: EffectiveEmbeddingConfig;
}): Promise<KnowledgeEmbeddingMetadata> => {
  const resolvedEmbeddingConfig =
    embeddingConfig ??
    (await getEffectiveEmbeddingConfig({
      env,
      repository: settingsRepository,
    }));

  return toKnowledgeEmbeddingMetadata(resolvedEmbeddingConfig);
};

const buildKnowledgeActorProfileMap = async (
  authRepository: AuthRepository,
  knowledgeItems: Array<
    Pick<KnowledgeBaseDocument, "maintainerId" | "createdBy">
  >,
): Promise<KnowledgeActorProfileMap> => {
  const userIds = Array.from(
    new Set(
      knowledgeItems.flatMap((knowledge) => [
        knowledge.maintainerId,
        knowledge.createdBy,
      ]),
    ),
  );
  const profiles = await authRepository.findProfilesByIds(userIds);

  return new Map(profiles.map((profile) => [profile.id, profile] as const));
};

const buildKnowledgeDetailEnvelope = async ({
  repository,
  authRepository,
  knowledgeId,
  knowledge,
}: {
  repository: KnowledgeRepository;
  authRepository: AuthRepository;
  knowledgeId: string;
  knowledge: WithId<KnowledgeBaseDocument>;
}): Promise<KnowledgeDetailEnvelope> => {
  const documents = await repository.listDocumentsByKnowledgeId(knowledgeId);
  const actorProfileMap = await buildKnowledgeActorProfileMap(authRepository, [
    knowledge,
  ]);

  return {
    knowledge: {
      ...toKnowledgeSummaryResponse(knowledge, actorProfileMap),
      documents: documents.map(toKnowledgeDocumentResponse),
    },
  };
};

const uploadKnowledgeDocument = async ({
  env,
  repository,
  searchService,
  authRepository,
  settingsRepository,
  actor,
  knowledgeId,
  knowledge,
  file,
}: {
  env: AppEnv;
  repository: KnowledgeRepository;
  searchService: KnowledgeSearchService;
  authRepository: AuthRepository;
  settingsRepository: SettingsRepository;
  actor: KnowledgeCommandContext["actor"];
  knowledgeId: string;
  knowledge: WithId<KnowledgeBaseDocument>;
  file: UploadedKnowledgeFile;
}): Promise<KnowledgeDocumentUploadResponse> => {
  validateUploadFile(knowledge.sourceType, file);

  const documentId = new ObjectId();
  const documentVersionHash = buildDocumentVersionHash(file);
  const duplicatedDocument =
    (await repository.findKnowledgeDocumentByVersionHash?.(
      knowledgeId,
      documentVersionHash,
    )) ?? null;

  if (duplicatedDocument) {
    throw createDuplicateKnowledgeDocumentVersionError(duplicatedDocument);
  }

  const [namespaceContext, indexingConfig] = await Promise.all([
    resolveNamespaceIndexContext({
      env,
      repository,
      settingsRepository,
      knowledge,
    }),
    getEffectiveIndexingConfig({
      env,
      repository: settingsRepository,
    }),
  ]);
  const activeState = assertNamespaceReadyForMutation(namespaceContext);
  const collectionName = activeState.activeCollectionName;
  const embeddingMetadata = await resolveEmbeddingMetadata({
    env,
    settingsRepository,
    embeddingConfig: namespaceContext.currentEmbeddingConfig,
  });
  const storageLayout = createKnowledgeDocumentStorageLayout({
    env,
    knowledge,
    knowledgeId,
    documentId: documentId.toHexString(),
    documentVersionHash,
    fileName: file.originalName,
  });
  const now = new Date();
  let documentPersisted = false;
  let knowledgeSummaryUpdated = false;

  try {
    await writeKnowledgeDocumentFile({
      layout: storageLayout,
      file,
    });

    const documentRecord: KnowledgeDocumentRecord & {
      _id: NonNullable<KnowledgeDocumentRecord["_id"]>;
    } = {
      _id: documentId,
      knowledgeId,
      fileName: storageLayout.fileName,
      mimeType: file.mimeType,
      storagePath: storageLayout.storagePath,
      status: "pending",
      chunkCount: 0,
      documentVersionHash,
      embeddingProvider: embeddingMetadata.embeddingProvider,
      embeddingModel: embeddingMetadata.embeddingModel,
      lastIndexedAt: null,
      retryCount: 0,
      errorMessage: null,
      uploadedBy: actor.id,
      uploadedAt: now,
      processedAt: null,
      createdAt: now,
      updatedAt: now,
    };

    let document: WithId<KnowledgeDocumentRecord>;
    try {
      document = await repository.createKnowledgeDocument(documentRecord);
    } catch (error) {
      if (isKnowledgeDocumentVersionDuplicateError(error)) {
        const duplicatedDocument =
          (await repository.findKnowledgeDocumentByVersionHash?.(
            knowledgeId,
            documentVersionHash,
          )) ?? null;

        if (duplicatedDocument) {
          throw createDuplicateKnowledgeDocumentVersionError(
            duplicatedDocument,
          );
        }
      }

      throw error;
    }

    documentPersisted = true;
    const updatedKnowledge =
      await repository.updateKnowledgeSummaryAfterDocumentUpload(
        knowledgeId,
        now,
      );

    if (!updatedKnowledge) {
      throw createKnowledgeNotFoundError();
    }

    knowledgeSummaryUpdated = true;
    const actorProfileMap = await buildKnowledgeActorProfileMap(
      authRepository,
      [updatedKnowledge],
    );

    queueKnowledgeDocumentProcessing({
      env,
      repository,
      searchService,
      settingsRepository,
      knowledgeId,
      documentId: documentId.toHexString(),
      storagePath: storageLayout.absoluteStoragePath,
      fileName: storageLayout.fileName,
      mimeType: file.mimeType,
      sourceType: knowledge.sourceType,
      collectionName,
      documentVersionHash,
      embeddingConfig: namespaceContext.currentEmbeddingConfig,
      indexingConfig,
      embeddingMetadata,
    });

    return {
      knowledge: toKnowledgeSummaryResponse(updatedKnowledge, actorProfileMap),
      document: toKnowledgeDocumentResponse(document),
    };
  } catch (error) {
    if (documentPersisted) {
      const deletedDocument = await repository.deleteKnowledgeDocumentById(
        documentId.toHexString(),
      );

      if (deletedDocument && knowledgeSummaryUpdated) {
        await adjustKnowledgeSummaryAfterDocumentRemoval(
          repository,
          knowledgeId,
          {
            removedChunkCount: 0,
            updatedAt: new Date(),
          },
        );
      }
    }

    await removeKnowledgeDocumentStorage({
      env,
      knowledge,
      knowledgeId,
      documentId: documentId.toHexString(),
    });
    throw error;
  }
};

export const createKnowledgeService = ({
  env,
  repository,
  searchService,
  authRepository,
  projectsRepository = NOOP_PROJECTS_REPOSITORY,
  settingsRepository = NOOP_SETTINGS_REPOSITORY,
}: {
  env: AppEnv;
  repository: KnowledgeRepository;
  searchService: KnowledgeSearchService;
  authRepository: AuthRepository;
  projectsRepository?: ProjectsRepository;
  settingsRepository?: SettingsRepository;
}): KnowledgeService => {
  return {
    initializeSearchInfrastructure: async () => {
      // Startup 只探活 indexer；collection init 由 indexer-py 在写侧链路内保证。
      await repository.ensureMetadataModel();
      await searchService.ensureCollections();
      await recoverInterruptedKnowledgeTasks({
        env,
        repository,
        searchService,
        settingsRepository,
        createLegacyNamespaceRebuildRequiredError,
        createNamespaceRebuildRequiredError,
      });
    },

    // Keep future metadata, upload, index trigger, and search orchestration behind the service.
    listKnowledge: async (context) => {
      void context;
      await repository.ensureMetadataModel();
      const items = await repository.listKnowledgeBases({ scope: "global" });
      const actorProfileMap = await buildKnowledgeActorProfileMap(
        authRepository,
        items,
      );

      return {
        total: items.length,
        items: items.map((knowledge) =>
          toKnowledgeSummaryResponse(knowledge, actorProfileMap),
        ),
      };
    },

    listProjectKnowledge: async ({ actor }, projectId) => {
      await repository.ensureMetadataModel();
      await requireVisibleProject(projectsRepository, projectId, actor);
      const items = await repository.listKnowledgeBases({
        scope: "project",
        projectId,
      });
      const actorProfileMap = await buildKnowledgeActorProfileMap(
        authRepository,
        items,
      );

      return {
        total: items.length,
        items: items.map((knowledge) =>
          toKnowledgeSummaryResponse(knowledge, actorProfileMap),
        ),
      };
    },

    getKnowledgeDetail: async ({ actor }, knowledgeId) => {
      await repository.ensureMetadataModel();
      const knowledge = await requireAccessibleKnowledge({
        repository,
        projectsRepository,
        actorId: actor.id,
        knowledgeId,
      });

      return buildKnowledgeDetailEnvelope({
        repository,
        authRepository,
        knowledgeId,
        knowledge,
      });
    },

    getProjectKnowledgeDetail: async ({ actor }, projectId, knowledgeId) => {
      await repository.ensureMetadataModel();
      const knowledge = await requireProjectScopedKnowledge({
        repository,
        projectsRepository,
        actor,
        projectId,
        knowledgeId,
      });

      return buildKnowledgeDetailEnvelope({
        repository,
        authRepository,
        knowledgeId,
        knowledge,
      });
    },

    createKnowledge: async ({ actor }, input) => {
      await repository.ensureMetadataModel();
      const knowledge = await repository.createKnowledgeBase(
        validateCreateKnowledgeInput(input, actor.id),
      );
      const actorProfileMap = await buildKnowledgeActorProfileMap(
        authRepository,
        [knowledge],
      );

      return {
        knowledge: toKnowledgeSummaryResponse(knowledge, actorProfileMap),
      };
    },

    createProjectKnowledge: async ({ actor }, projectId, input) => {
      await repository.ensureMetadataModel();
      await requireVisibleProject(projectsRepository, projectId, actor);
      const knowledge = await repository.createKnowledgeBase(
        validateCreateProjectKnowledgeInput(input, actor.id, projectId),
      );
      const actorProfileMap = await buildKnowledgeActorProfileMap(
        authRepository,
        [knowledge],
      );

      return {
        knowledge: toKnowledgeSummaryResponse(knowledge, actorProfileMap),
      };
    },

    updateKnowledge: async ({ actor }, knowledgeId, input) => {
      await repository.ensureMetadataModel();
      await requireAccessibleKnowledge({
        repository,
        projectsRepository,
        actorId: actor.id,
        knowledgeId,
      });

      const patch = validateUpdateKnowledgeInput(input);
      const updatedKnowledge = await repository.updateKnowledgeBase(
        knowledgeId,
        {
          ...patch,
          updatedAt: new Date(),
        },
      );

      if (!updatedKnowledge) {
        throw createKnowledgeNotFoundError();
      }

      const actorProfileMap = await buildKnowledgeActorProfileMap(
        authRepository,
        [updatedKnowledge],
      );

      return {
        knowledge: toKnowledgeSummaryResponse(
          updatedKnowledge,
          actorProfileMap,
        ),
      };
    },

    deleteKnowledge: async ({ actor }, knowledgeId) => {
      await repository.ensureMetadataModel();
      const knowledge = await requireAccessibleKnowledge({
        repository,
        projectsRepository,
        actorId: actor.id,
        knowledgeId,
      });
      const namespaceContext = await resolveNamespaceIndexContext({
        env,
        repository,
        settingsRepository,
        knowledge,
      });

      if (
        namespaceContext.mode === "versioned" &&
        namespaceContext.state.rebuildStatus === "rebuilding"
      ) {
        throw createNamespaceRebuildingConflictError();
      }

      const collectionName =
        namespaceContext.mode === "versioned"
          ? namespaceContext.state.activeCollectionName
          : namespaceContext.namespace.namespaceKey;

      try {
        await searchService.deleteKnowledgeChunks(knowledgeId, {
          collectionName,
        });
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Unknown error";
        console.warn(
          `[knowledge-search] failed to cleanup knowledge ${knowledgeId} chunks before delete: ${message}`,
        );
      }

      await repository.deleteKnowledgeDocumentsByKnowledgeId(knowledgeId);
      const deleted = await repository.deleteKnowledgeBase(knowledgeId);

      if (!deleted) {
        throw createKnowledgeNotFoundError();
      }

      await removeKnowledgeStorageRoot({
        env,
        knowledge,
        knowledgeId,
      });

      await cleanupEmptyNamespaceAfterKnowledgeDelete({
        repository,
        searchService,
        namespaceContext,
      });
    },

    deleteDocument: async ({ actor }, knowledgeId, documentId) => {
      await repository.ensureMetadataModel();
      const knowledge = await requireAccessibleKnowledge({
        repository,
        projectsRepository,
        actorId: actor.id,
        knowledgeId,
      });
      const namespaceContext = await resolveNamespaceIndexContext({
        env,
        repository,
        settingsRepository,
        knowledge,
      });

      if (
        namespaceContext.mode === "versioned" &&
        namespaceContext.state.rebuildStatus === "rebuilding"
      ) {
        throw createNamespaceRebuildingConflictError();
      }

      const collectionName =
        namespaceContext.mode === "versioned"
          ? namespaceContext.state.activeCollectionName
          : namespaceContext.namespace.namespaceKey;

      const document = await repository.findKnowledgeDocumentById(documentId);

      if (!document || document.knowledgeId !== knowledgeId) {
        throw createKnowledgeDocumentNotFoundError();
      }

      try {
        await searchService.deleteDocumentChunks(documentId, {
          collectionName,
        });
      } catch (error) {
        console.warn(
          `[knowledge-search] failed to cleanup document ${documentId} chunks before delete: ${normalizeIndexerErrorMessage(
            error,
            "Chroma 文档向量清理失败",
          )}`,
        );
      }

      const deleted = await repository.deleteKnowledgeDocumentById(documentId);

      if (!deleted) {
        throw createKnowledgeDocumentNotFoundError();
      }

      await removeKnowledgeDocumentStorage({
        env,
        knowledge,
        knowledgeId,
        documentId,
      });

      await adjustKnowledgeSummaryAfterDocumentRemoval(
        repository,
        knowledgeId,
        {
          removedChunkCount: document.chunkCount,
          updatedAt: new Date(),
        },
      );
    },

    uploadDocument: async ({ actor }, knowledgeId, file) => {
      await repository.ensureMetadataModel();
      const knowledge = await requireAccessibleKnowledge({
        repository,
        projectsRepository,
        actorId: actor.id,
        knowledgeId,
      });
      return uploadKnowledgeDocument({
        env,
        repository,
        searchService,
        authRepository,
        settingsRepository,
        actor,
        knowledgeId,
        knowledge,
        file,
      });
    },

    uploadProjectKnowledgeDocument: async (
      { actor },
      projectId,
      knowledgeId,
      file,
    ) => {
      await repository.ensureMetadataModel();
      const knowledge = await requireProjectScopedKnowledge({
        repository,
        projectsRepository,
        actor,
        projectId,
        knowledgeId,
      });

      return uploadKnowledgeDocument({
        env,
        repository,
        searchService,
        authRepository,
        settingsRepository,
        actor,
        knowledgeId,
        knowledge,
        file,
      });
    },

    retryDocument: async ({ actor }, knowledgeId, documentId) => {
      await repository.ensureMetadataModel();
      const knowledge = await requireAccessibleKnowledge({
        repository,
        projectsRepository,
        actorId: actor.id,
        knowledgeId,
      });
      const namespaceContext = await resolveNamespaceIndexContext({
        env,
        repository,
        settingsRepository,
        knowledge,
      });
      const activeState = assertNamespaceReadyForMutation(namespaceContext);
      const [indexingConfig, embeddingMetadata] = await Promise.all([
        getEffectiveIndexingConfig({
          env,
          repository: settingsRepository,
        }),
        resolveEmbeddingMetadata({
          env,
          settingsRepository,
          embeddingConfig: namespaceContext.currentEmbeddingConfig,
        }),
      ]);

      const document = await repository.findKnowledgeDocumentById(documentId);

      if (!document || document.knowledgeId !== knowledgeId) {
        throw createKnowledgeDocumentNotFoundError();
      }

      if (document.status === "pending" || document.status === "processing") {
        throw createDocumentRetryConflictError();
      }

      await queueExistingKnowledgeDocument({
        env,
        repository,
        searchService,
        settingsRepository,
        knowledgeId,
        document,
        sourceType: knowledge.sourceType,
        collectionName: activeState.activeCollectionName,
        embeddingConfig: namespaceContext.currentEmbeddingConfig,
        indexingConfig,
        embeddingMetadata,
        mode: "index",
        createKnowledgeDocumentNotFoundError,
        createKnowledgeDocumentConflictError: createDocumentRetryConflictError,
      });
    },

    rebuildDocument: async ({ actor }, knowledgeId, documentId) => {
      await repository.ensureMetadataModel();
      const knowledge = await requireAccessibleKnowledge({
        repository,
        projectsRepository,
        actorId: actor.id,
        knowledgeId,
      });
      const namespaceContext = await resolveNamespaceIndexContext({
        env,
        repository,
        settingsRepository,
        knowledge,
      });
      const activeState = assertNamespaceReadyForMutation(namespaceContext);
      const [indexingConfig, embeddingMetadata] = await Promise.all([
        getEffectiveIndexingConfig({
          env,
          repository: settingsRepository,
        }),
        resolveEmbeddingMetadata({
          env,
          settingsRepository,
          embeddingConfig: namespaceContext.currentEmbeddingConfig,
        }),
      ]);

      const document = await repository.findKnowledgeDocumentById(documentId);

      if (!document || document.knowledgeId !== knowledgeId) {
        throw createKnowledgeDocumentNotFoundError();
      }

      if (document.status === "pending" || document.status === "processing") {
        throw createDocumentRetryConflictError();
      }

      await queueExistingKnowledgeDocument({
        env,
        repository,
        searchService,
        settingsRepository,
        knowledgeId,
        document,
        sourceType: knowledge.sourceType,
        collectionName: activeState.activeCollectionName,
        embeddingConfig: namespaceContext.currentEmbeddingConfig,
        indexingConfig,
        embeddingMetadata,
        mode: "rebuild",
        createKnowledgeDocumentNotFoundError,
        createKnowledgeDocumentConflictError: createDocumentRetryConflictError,
      });
    },

    rebuildKnowledge: async ({ actor }, knowledgeId) => {
      await repository.ensureMetadataModel();
      const knowledge = await requireAccessibleKnowledge({
        repository,
        projectsRepository,
        actorId: actor.id,
        knowledgeId,
      });
      const namespaceContext = await resolveNamespaceIndexContext({
        env,
        repository,
        settingsRepository,
        knowledge,
      });

      const documents =
        await repository.listDocumentsByKnowledgeId(knowledgeId);

      if (documents.length === 0) {
        throw createKnowledgeRebuildEmptyError();
      }

      if (
        documents.some(
          (document) =>
            document.status === "pending" || document.status === "processing",
        )
      ) {
        throw createKnowledgeRebuildConflictError();
      }

      if (
        namespaceContext.mode === "versioned" &&
        namespaceContext.state.rebuildStatus === "rebuilding"
      ) {
        throw createNamespaceRebuildingConflictError();
      }

      const namespaceDocuments = await listNamespaceDocuments(
        repository,
        namespaceContext.namespace,
      );

      if (
        namespaceDocuments.some(
          (document) =>
            document.status === "pending" || document.status === "processing",
        )
      ) {
        throw createKnowledgeRebuildConflictError();
      }

      let rebuildContext: Extract<
        ResolvedNamespaceIndexContext,
        { mode: "versioned" }
      >;

      if (namespaceContext.mode === "versioned") {
        const patch = {
          rebuildStatus: "rebuilding" as const,
          targetCollectionName: buildNamespaceRebuildTargetCollectionName({
            namespaceKey: namespaceContext.namespace.namespaceKey,
            fingerprint: namespaceContext.currentEmbeddingFingerprint,
            activeCollectionName: namespaceContext.state.activeCollectionName,
          }),
          targetEmbeddingProvider:
            namespaceContext.currentEmbeddingConfig.provider,
          targetEmbeddingBaseUrl:
            namespaceContext.currentEmbeddingConfig.baseUrl,
          targetEmbeddingModel: namespaceContext.currentEmbeddingConfig.model,
          targetEmbeddingFingerprint:
            namespaceContext.currentEmbeddingFingerprint,
          lastErrorMessage: null,
          updatedAt: new Date(),
        };
        const updatedState = await markKnowledgeNamespaceRebuildingIfIdle(
          repository,
          namespaceContext.namespace.namespaceKey,
          patch,
        );

        if (!updatedState) {
          throw createNamespaceRebuildingConflictError();
        }

        rebuildContext = {
          ...namespaceContext,
          mode: "versioned",
          state: updatedState,
        };
      } else {
        const now = new Date();
        const stateDocument = createNamespaceRebuildStateDocument({
          namespace: namespaceContext.namespace,
          activeCollectionName: namespaceContext.namespace.namespaceKey,
          embeddingConfig: namespaceContext.currentEmbeddingConfig,
          embeddingFingerprint: namespaceContext.currentEmbeddingFingerprint,
          now,
        });

        const createdState = await createNamespaceIndexState(
          repository,
          stateDocument,
        );
        rebuildContext = {
          ...namespaceContext,
          mode: "versioned",
          state: createdState,
        };
      }

      await markNamespaceDocumentsPending({
        repository,
        documents: namespaceDocuments,
      });

      queueNamespaceRebuild({
        env,
        repository,
        searchService,
        settingsRepository,
        namespaceContext: rebuildContext,
        documents: namespaceDocuments,
      });
    },

    getKnowledgeDiagnostics: async ({ actor }, knowledgeId) => {
      await repository.ensureMetadataModel();
      const knowledge = await requireAccessibleKnowledge({
        repository,
        projectsRepository,
        actorId: actor.id,
        knowledgeId,
      });
      const namespaceContext = await resolveNamespaceIndexContext({
        env,
        repository,
        settingsRepository,
        knowledge,
      });

      const documents =
        await repository.listDocumentsByKnowledgeId(knowledgeId);
      const now = new Date();
      const documentsWithStorageState = await Promise.all(
        documents.map(async (document) => {
          const storageExists = await readDocumentStoragePresence({
            env,
            document,
          });
          const staleProcessing = isStaleProcessingDocument(document, now);

          return {
            document,
            storageExists,
            staleProcessing,
          };
        }),
      );

      const collectionDiagnostics = await searchService.getDiagnostics({
        collectionName:
          namespaceContext.mode === "versioned"
            ? namespaceContext.state.activeCollectionName
            : namespaceContext.namespace.namespaceKey,
      });
      const effectiveEmbeddingConfig = namespaceContext.currentEmbeddingConfig;
      const effectiveIndexingConfig = await getEffectiveIndexingConfig({
        env,
        repository: settingsRepository,
      });
      let indexerDiagnostics: KnowledgeDiagnosticsResponse["indexer"];

      try {
        const diagnostics = await readKnowledgeIndexerDiagnostics(
          env,
          settingsRepository,
        );
        indexerDiagnostics = {
          status: diagnostics.status,
          service: diagnostics.service,
          supportedFormats: [...diagnostics.supportedFormats],
          chunkSize: diagnostics.chunkSize,
          chunkOverlap: diagnostics.chunkOverlap,
          embeddingProvider: diagnostics.embeddingProvider,
          chromaReachable: diagnostics.chromaReachable,
          errorMessage: diagnostics.errorMessage,
          expected: {
            supportedFormats: [...effectiveIndexingConfig.supportedTypes],
            chunkSize: effectiveIndexingConfig.chunkSize,
            chunkOverlap: effectiveIndexingConfig.chunkOverlap,
            embeddingProvider: effectiveEmbeddingConfig.provider,
          },
        };
      } catch (error) {
        indexerDiagnostics = {
          status: "degraded",
          service: null,
          supportedFormats: [],
          chunkSize: null,
          chunkOverlap: null,
          embeddingProvider: null,
          chromaReachable: null,
          errorMessage: resolveDiagnosticsErrorMessage(error),
          expected: {
            supportedFormats: [...effectiveIndexingConfig.supportedTypes],
            chunkSize: effectiveIndexingConfig.chunkSize,
            chunkOverlap: effectiveIndexingConfig.chunkOverlap,
            embeddingProvider: effectiveEmbeddingConfig.provider,
          },
        };
      }

      const activeEmbeddingProvider =
        namespaceContext.mode === "versioned"
          ? namespaceContext.state.activeEmbeddingProvider
          : null;
      const activeEmbeddingModel =
        namespaceContext.mode === "versioned"
          ? namespaceContext.state.activeEmbeddingModel
          : null;
      const activeEmbeddingFingerprint =
        namespaceContext.mode === "versioned"
          ? namespaceContext.state.activeEmbeddingFingerprint
          : null;
      const targetCollectionName =
        namespaceContext.mode === "versioned"
          ? namespaceContext.state.targetCollectionName
          : null;
      const targetEmbeddingProvider =
        namespaceContext.mode === "versioned"
          ? namespaceContext.state.targetEmbeddingProvider
          : null;
      const targetEmbeddingModel =
        namespaceContext.mode === "versioned"
          ? namespaceContext.state.targetEmbeddingModel
          : null;
      const namespaceRebuildStatus =
        namespaceContext.mode === "versioned"
          ? namespaceContext.state.rebuildStatus
          : null;
      const namespaceLastErrorMessage =
        namespaceContext.mode === "versioned"
          ? namespaceContext.state.lastErrorMessage
          : null;

      return {
        knowledgeId,
        sourceType: knowledge.sourceType,
        expectedCollectionName: collectionDiagnostics.collection.name,
        indexStatus: knowledge.indexStatus,
        namespace: {
          key: namespaceContext.namespace.namespaceKey,
          mode: namespaceContext.mode,
          activeCollectionName: collectionDiagnostics.collection.name,
          activeEmbeddingProvider,
          activeEmbeddingModel,
          activeEmbeddingFingerprint,
          rebuildStatus: namespaceRebuildStatus,
          targetCollectionName,
          targetEmbeddingProvider,
          targetEmbeddingModel,
          lastErrorMessage: namespaceLastErrorMessage,
          currentEmbeddingProvider: effectiveEmbeddingConfig.provider,
          currentEmbeddingModel: effectiveEmbeddingConfig.model,
          currentMatchesActive:
            activeEmbeddingFingerprint === null
              ? null
              : activeEmbeddingFingerprint ===
                namespaceContext.currentEmbeddingFingerprint,
        },
        documentSummary: {
          total: documents.length,
          pending: documents.filter((document) => document.status === "pending")
            .length,
          processing: documents.filter(
            (document) => document.status === "processing",
          ).length,
          completed: documents.filter(
            (document) => document.status === "completed",
          ).length,
          failed: documents.filter((document) => document.status === "failed")
            .length,
          missingStorage: documentsWithStorageState.filter(
            (item) => !item.storageExists,
          ).length,
          staleProcessing: documentsWithStorageState.filter(
            (item) => item.staleProcessing,
          ).length,
        },
        collection: collectionDiagnostics.collection,
        indexer: indexerDiagnostics,
        documents: documentsWithStorageState.map(
          ({ document, storageExists, staleProcessing }) => ({
            id: document._id.toHexString(),
            status: document.status,
            fileName: document.fileName,
            retryCount: document.retryCount,
            lastIndexedAt: document.lastIndexedAt?.toISOString() ?? null,
            errorMessage: document.errorMessage,
            updatedAt: document.updatedAt.toISOString(),
            missingStorage: !storageExists,
            staleProcessing,
          }),
        ),
      };
    },

    searchDocuments: async ({ actor }, input) => {
      const validatedInput = validateSearchDocumentsInput(input);

      if (!validatedInput.knowledgeId) {
        await repository.ensureMetadataModel();
        const namespaceContext = await resolveNamespaceIndexContext({
          env,
          repository,
          settingsRepository,
          knowledge: {
            scope: "global",
            projectId: null,
            sourceType: validatedInput.sourceType,
          },
        });
        return searchService.searchDocuments({
          ...validatedInput,
          collectionName: resolveSearchCollectionName(namespaceContext),
          embeddingConfig: resolveActiveEmbeddingConfig(namespaceContext),
        });
      }

      await repository.ensureMetadataModel();
      const knowledge = await requireAccessibleKnowledge({
        repository,
        projectsRepository,
        actorId: actor.id,
        knowledgeId: validatedInput.knowledgeId,
      });
      const namespaceContext = await resolveNamespaceIndexContext({
        env,
        repository,
        settingsRepository,
        knowledge,
      });

      return searchService.searchDocuments({
        ...validatedInput,
        sourceType: knowledge.sourceType,
        collectionName: resolveSearchCollectionName(namespaceContext),
        embeddingConfig: resolveActiveEmbeddingConfig(namespaceContext),
      });
    },

    searchProjectDocuments: async ({ actor }, projectId, input) => {
      const validatedInput = validateSearchProjectDocumentsInput(input);
      await repository.ensureMetadataModel();
      const project = await requireVisibleProject(
        projectsRepository,
        projectId,
        actor,
      );

      const [boundGlobalKnowledgeBases, projectKnowledgeBases] =
        await Promise.all([
          Promise.all(
            Array.from(new Set(project.knowledgeBaseIds ?? [])).map(
              (knowledgeId) => repository.findKnowledgeById(knowledgeId),
            ),
          ),
          repository.listKnowledgeBases({
            scope: "project",
            projectId,
            sourceType: "global_docs",
          }),
        ]);

      const boundGlobalKnowledgeIds = new Set<string>();

      for (const knowledge of boundGlobalKnowledgeBases) {
        if (!knowledge) {
          continue;
        }

        const knowledgeScope = resolveKnowledgeScope(knowledge);
        if (
          knowledgeScope.scope !== "global" ||
          knowledge.sourceType !== "global_docs"
        ) {
          continue;
        }

        boundGlobalKnowledgeIds.add(knowledge._id.toHexString());
      }

      const projectKnowledgeIds = new Set<string>();
      for (const knowledge of projectKnowledgeBases) {
        if (knowledge.sourceType !== "global_docs") {
          continue;
        }

        projectKnowledgeIds.add(knowledge._id.toHexString());
      }

      if (
        boundGlobalKnowledgeIds.size === 0 &&
        projectKnowledgeIds.size === 0
      ) {
        return {
          query: validatedInput.query,
          sourceType: "global_docs",
          total: 0,
          items: [],
        };
      }

      const searchGroups = await Promise.all([
        searchKnowledgeNamespaceDocuments({
          env,
          repository,
          settingsRepository,
          searchService,
          namespace: {
            scope: "project",
            projectId,
            sourceType: "global_docs",
          },
          allowedKnowledgeIds: projectKnowledgeIds,
          query: validatedInput.query,
          topK: validatedInput.topK,
          mergePriority: 0,
        }),
        searchKnowledgeNamespaceDocuments({
          env,
          repository,
          settingsRepository,
          searchService,
          namespace: {
            scope: "global",
            projectId: null,
            sourceType: "global_docs",
          },
          allowedKnowledgeIds: boundGlobalKnowledgeIds,
          query: validatedInput.query,
          topK: validatedInput.topK,
          mergePriority: 1,
        }),
      ]);
      const items = mergeKnowledgeSearchHitGroups(
        searchGroups.filter(
          (group): group is GroupedKnowledgeSearchHits => group !== null,
        ),
        validatedInput.topK,
      );

      return {
        query: validatedInput.query,
        sourceType: "global_docs",
        total: items.length,
        items,
      };
    },
  };
};
