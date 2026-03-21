import { createHash } from "node:crypto";
import { extname } from "node:path";
import { type WithId } from "mongodb";
import { getEffectiveEmbeddingConfig } from "@config/ai-config.js";
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
import type { SettingsRepository } from "@modules/settings/settings.repository.js";
import type { EffectiveEmbeddingConfig } from "@modules/settings/settings.types.js";
import type { KnowledgeEmbeddingMetadata } from "./knowledge.index-orchestrator.js";
import {
  type ResolvedNamespaceIndexContext,
} from "./knowledge.namespace.js";
import type { KnowledgeRepository } from "./knowledge.repository.js";
import type { KnowledgeSearchService } from "./knowledge.search.js";
import {
  SUPPORTED_KNOWLEDGE_UPLOAD_TYPES,
  buildVersionedKnowledgeCollectionName,
  toKnowledgeEmbeddingMetadata,
  toKnowledgeDocumentResponse,
  toKnowledgeSummaryResponse,
} from "./knowledge.shared.js";
import type {
  CreateKnowledgeInput,
  KnowledgeBaseDocument,
  KnowledgeDetailEnvelope,
  KnowledgeDocumentRecord,
  KnowledgeNamespaceIndexStateDocument,
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

export interface KnowledgeServiceDependencies {
  env: AppEnv;
  repository: KnowledgeRepository;
  searchService: KnowledgeSearchService;
  authRepository: AuthRepository;
  projectsRepository: ProjectsRepository;
  settingsRepository: SettingsRepository;
}

type KnowledgeActorProfileMap = Map<string, AuthUserProfile>;

export const createKnowledgeNotFoundError = (): AppError => {
  return new AppError({
    statusCode: 404,
    code: "KNOWLEDGE_NOT_FOUND",
    message: "知识库不存在",
  });
};

export const requireAccessibleKnowledge = (
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

export const requireProjectScopedKnowledge = (
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

export const createKnowledgeDocumentNotFoundError = (): AppError => {
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
    message: "当前只支持上传 md、markdown、txt、pdf、docx、xlsx 文件",
  });
};

const createUploadEmptyFileError = (): AppError => {
  return new AppError({
    statusCode: 400,
    code: "KNOWLEDGE_UPLOAD_EMPTY_FILE",
    message: "上传文件内容为空，请检查后重试",
  });
};

const createUploadSourceTypeError = (): AppError => {
  return new AppError({
    statusCode: 400,
    code: "KNOWLEDGE_UPLOAD_SOURCE_TYPE_UNSUPPORTED",
    message: "当前知识库类型暂不支持上传文档",
  });
};

export const createDocumentRetryConflictError = (): AppError => {
  return new AppError({
    statusCode: 409,
    code: "KNOWLEDGE_DOCUMENT_RETRY_CONFLICT",
    message: "文档已在索引中，请稍后刷新状态",
  });
};

export const createKnowledgeRebuildConflictError = (): AppError => {
  return new AppError({
    statusCode: 409,
    code: "KNOWLEDGE_REBUILD_CONFLICT",
    message: "知识库存在正在索引的文档，请稍后再试",
  });
};

export const createKnowledgeRebuildEmptyError = (): AppError => {
  return new AppError({
    statusCode: 409,
    code: "KNOWLEDGE_REBUILD_EMPTY",
    message: "当前知识库暂无可重建文档",
  });
};

export const createNamespaceRebuildingConflictError = (): AppError => {
  return new AppError({
    statusCode: 409,
    code: "KNOWLEDGE_NAMESPACE_REBUILDING",
    message: "当前命名空间正在重建，请稍后再试",
  });
};

export const createNamespaceRebuildRequiredError = (): AppError => {
  return new AppError({
    statusCode: 409,
    code: "KNOWLEDGE_NAMESPACE_REBUILD_REQUIRED",
    message: "当前向量模型已变更，请先执行知识库全量重建",
  });
};

export const createLegacyNamespaceRebuildRequiredError = (): AppError => {
  return new AppError({
    statusCode: 409,
    code: "KNOWLEDGE_NAMESPACE_LEGACY_REBUILD_REQUIRED",
    message: "当前索引缺少模型版本元数据，请先执行一次知识库全量重建",
  });
};

export const createDuplicateKnowledgeDocumentVersionError = (
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

export const isKnowledgeDocumentVersionDuplicateError = (
  error: unknown,
): boolean => {
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

export const NOOP_PROJECTS_REPOSITORY = {
  findById: async () => null,
} as unknown as ProjectsRepository;

export const NOOP_SETTINGS_REPOSITORY = {
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

export const validateCreateKnowledgeInput = (
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

export const validateCreateProjectKnowledgeInput = (
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

export const validateUpdateKnowledgeInput = (input: UpdateKnowledgeInput) => {
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

export const validateSearchDocumentsInput = (
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

export const validateSearchProjectDocumentsInput = (
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

export const validateUploadFile = (
  sourceType: KnowledgeSourceType,
  file: UploadedKnowledgeFile,
  supportedTypes?: string[],
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

  if (supportedTypes) {
    const normalizedSupportedTypes = new Set(
      supportedTypes.map((item) => item.trim().toLowerCase()),
    );
    const requiredSupportedType =
      extension === ".md" || extension === ".markdown"
        ? "md"
        : extension === ".txt"
          ? "txt"
          : extension === ".pdf"
            ? "pdf"
            : extension === ".docx"
              ? "docx"
              : extension === ".xlsx"
                ? "xlsx"
                : null;

    if (
      requiredSupportedType !== null &&
      !normalizedSupportedTypes.has(requiredSupportedType)
    ) {
      throw createUploadNotSupportedError();
    }
  }

  if (
    !supported.mimeTypes.includes(
      file.mimeType as (typeof supported.mimeTypes)[number],
    )
  ) {
    throw createUploadNotSupportedError();
  }
};

export const buildDocumentVersionHash = (
  file: UploadedKnowledgeFile,
): string => {
  return createHash("sha256").update(file.buffer).digest("hex");
};

export const assertNamespaceReadyForMutation = (
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

export const cleanupEmptyNamespaceAfterKnowledgeDelete = async ({
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

export const buildNamespaceRebuildTargetCollectionName = ({
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

export const resolveEmbeddingMetadata = async ({
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

export const buildKnowledgeActorProfileMap = async (
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

export const buildKnowledgeDetailEnvelope = async ({
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
