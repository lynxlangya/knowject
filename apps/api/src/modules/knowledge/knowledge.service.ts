import { createHash } from 'node:crypto';
import { access, mkdir, rm, writeFile } from 'node:fs/promises';
import { basename, extname, join } from 'node:path';
import { ObjectId, type WithId } from 'mongodb';
import type { AppEnv } from '@config/env.js';
import { AppError } from '@lib/app-error.js';
import {
  createRequiredFieldError,
  createValidationAppError,
  readOptionalStringField,
} from '@lib/validation.js';
import type { AuthRepository } from '@modules/auth/auth.repository.js';
import type { AuthUserProfile } from '@modules/auth/auth.types.js';
import type { ProjectsRepository } from '@modules/projects/projects.repository.js';
import { getProjectMember, requireVisibleProject } from '@modules/projects/projects.shared.js';
import type { KnowledgeRepository } from './knowledge.repository.js';
import type { KnowledgeSearchService } from './knowledge.search.js';
import {
  SUPPORTED_KNOWLEDGE_UPLOAD_TYPES,
  resolveKnowledgeScope,
  sanitizeFileName,
  toKnowledgeDocumentResponse,
  toKnowledgeSummaryResponse,
} from './knowledge.shared.js';
import type {
  CreateKnowledgeInput,
  KnowledgeCommandContext,
  KnowledgeBaseDocument,
  KnowledgeDiagnosticsResponse,
  KnowledgeDetailEnvelope,
  KnowledgeDocumentRecord,
  KnowledgeDocumentUploadResponse,
  KnowledgeIndexerDiagnosticsResponse,
  KnowledgeIndexerDocumentRequest,
  KnowledgeIndexerResponse,
  KnowledgeListResponse,
  KnowledgeMutationResponse,
  KnowledgeSearchResponse,
  KnowledgeSourceType,
  SearchKnowledgeDocumentsInput,
  UpdateKnowledgeInput,
  UploadedKnowledgeFile,
} from './knowledge.types.js';

export interface KnowledgeService {
  initializeSearchInfrastructure(): Promise<void>;
  listKnowledge(context: KnowledgeCommandContext): Promise<KnowledgeListResponse>;
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
  deleteKnowledge(context: KnowledgeCommandContext, knowledgeId: string): Promise<void>;
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
  rebuildKnowledge(context: KnowledgeCommandContext, knowledgeId: string): Promise<void>;
  getKnowledgeDiagnostics(
    context: KnowledgeCommandContext,
    knowledgeId: string,
  ): Promise<KnowledgeDiagnosticsResponse>;
  searchDocuments(
    context: KnowledgeCommandContext,
    input: SearchKnowledgeDocumentsInput,
  ): Promise<KnowledgeSearchResponse>;
}

type KnowledgeActorProfileMap = Map<string, AuthUserProfile>;

const createKnowledgeNotFoundError = (): AppError => {
  return new AppError({
    statusCode: 404,
    code: 'KNOWLEDGE_NOT_FOUND',
    message: '知识库不存在',
  });
};

const createKnowledgeDocumentNotFoundError = (): AppError => {
  return new AppError({
    statusCode: 404,
    code: 'KNOWLEDGE_DOCUMENT_NOT_FOUND',
    message: '文档不存在',
  });
};

const createUploadNotSupportedError = (): AppError => {
  return new AppError({
    statusCode: 400,
    code: 'KNOWLEDGE_UPLOAD_UNSUPPORTED_TYPE',
    message: '当前只支持上传 md、markdown、txt 文件',
  });
};

const createUploadEmptyFileError = (): AppError => {
  return new AppError({
    statusCode: 400,
    code: 'KNOWLEDGE_UPLOAD_EMPTY_FILE',
    message: '上传文件不能为空',
  });
};

const createUploadSourceTypeError = (): AppError => {
  return new AppError({
    statusCode: 409,
    code: 'KNOWLEDGE_UPLOAD_SOURCE_TYPE_UNSUPPORTED',
    message: '当前只有 global_docs 类型支持文件上传',
  });
};

const createDocumentRetryConflictError = (): AppError => {
  return new AppError({
    statusCode: 409,
    code: 'KNOWLEDGE_DOCUMENT_RETRY_CONFLICT',
    message: '文档已在索引中，请稍后刷新状态',
  });
};

const createKnowledgeRebuildConflictError = (): AppError => {
  return new AppError({
    statusCode: 409,
    code: 'KNOWLEDGE_REBUILD_CONFLICT',
    message: '知识库存在正在索引的文档，请稍后再试',
  });
};

const createKnowledgeRebuildEmptyError = (): AppError => {
  return new AppError({
    statusCode: 409,
    code: 'KNOWLEDGE_REBUILD_EMPTY',
    message: '知识库当前没有可重建的文档',
  });
};

const NOOP_PROJECTS_REPOSITORY = {
  findById: async () => null,
} as unknown as ProjectsRepository;

const readOptionalSourceType = (value: unknown): KnowledgeSourceType | undefined => {
  if (value === undefined) {
    return undefined;
  }

  if (value === 'global_docs' || value === 'global_code') {
    return value;
  }

  throw createValidationAppError('sourceType 不合法', {
    sourceType: 'sourceType 只能为 global_docs 或 global_code',
  });
};

const validateCreateKnowledgeInput = (
  input: CreateKnowledgeInput,
  actorId: string,
) => {
  const name = readOptionalStringField(input.name, 'name');
  const description = readOptionalStringField(input.description, 'description');
  const sourceType = readOptionalSourceType(input.sourceType) ?? 'global_docs';

  if (!name) {
    throw createValidationAppError('请输入知识库名称', {
      name: '请输入知识库名称',
    });
  }

  const now = new Date();

  return {
    name,
    description: description ?? '',
    scope: 'global' as const,
    projectId: null,
    sourceType,
    indexStatus: 'idle' as const,
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

  if (knowledge.sourceType !== 'global_docs') {
    throw createValidationAppError('当前项目知识只支持 global_docs', {
      sourceType: '当前项目知识只支持 global_docs',
    });
  }

  return {
    ...knowledge,
    scope: 'project' as const,
    projectId,
  };
};

const validateUpdateKnowledgeInput = (
  input: UpdateKnowledgeInput,
) => {
  const name = readOptionalStringField(input.name, 'name');
  const description = readOptionalStringField(input.description, 'description');

  if (name === undefined && description === undefined) {
    throw createValidationAppError('至少需要提供一个可更新字段', {
      name: '至少需要提供 name 或 description',
      description: '至少需要提供 name 或 description',
    });
  }

  if (input.name !== undefined && !name) {
    throw createValidationAppError('请输入知识库名称', {
      name: '请输入知识库名称',
    });
  }

  return {
    ...(name !== undefined ? { name } : {}),
    ...(description !== undefined ? { description: description ?? '' } : {}),
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
  const query = typeof input.query === 'string' ? input.query.trim() : '';
  const knowledgeId = readOptionalStringField(input.knowledgeId, 'knowledgeId');
  const sourceType = readOptionalSourceType(input.sourceType) ?? 'global_docs';
  const rawTopK = input.topK;

  if (!query) {
    throw new AppError(createRequiredFieldError('query'));
  }

  let topK = 5;

  if (typeof rawTopK === 'number' && Number.isFinite(rawTopK)) {
    topK = Math.trunc(rawTopK);
  } else if (typeof rawTopK === 'string' && rawTopK.trim()) {
    topK = Number.parseInt(rawTopK.trim(), 10);
  }

  if (!Number.isInteger(topK) || topK <= 0 || topK > 10) {
    throw createValidationAppError('topK 必须是 1 到 10 之间的整数', {
      topK: 'topK 必须是 1 到 10 之间的整数',
    });
  }

  return {
    query,
    knowledgeId: knowledgeId || undefined,
    sourceType,
    collectionName: sourceType === 'global_code' ? 'global_code' : 'global_docs',
    topK,
  };
};

const validateUploadFile = (
  sourceType: KnowledgeSourceType,
  file: UploadedKnowledgeFile,
): void => {
  if (sourceType !== 'global_docs') {
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

  if (!supported.mimeTypes.includes(file.mimeType as (typeof supported.mimeTypes)[number])) {
    throw createUploadNotSupportedError();
  }
};

const buildDocumentVersionHash = (file: UploadedKnowledgeFile): string => {
  return createHash('sha256').update(file.buffer).digest('hex');
};

const buildStorageKnowledgeRootPath = (
  knowledge: Pick<KnowledgeBaseDocument, 'scope' | 'projectId'>,
  knowledgeId: string,
): string => {
  const scope = resolveKnowledgeScope(knowledge);

  if (scope.scope === 'project' && scope.projectId) {
    return join('projects', scope.projectId, 'knowledge', knowledgeId);
  }

  return knowledgeId;
};

const buildStorageDocumentRootPath = (
  knowledge: Pick<KnowledgeBaseDocument, 'scope' | 'projectId'>,
  knowledgeId: string,
  documentId: string,
): string => {
  return join(buildStorageKnowledgeRootPath(knowledge, knowledgeId), documentId);
};

const buildStorageDocumentVersionPath = (
  knowledge: Pick<KnowledgeBaseDocument, 'scope' | 'projectId'>,
  knowledgeId: string,
  documentId: string,
  documentVersionHash: string,
): string => {
  return join(
    buildStorageDocumentRootPath(knowledge, knowledgeId, documentId),
    documentVersionHash,
  );
};

const buildStoragePath = (
  knowledge: Pick<KnowledgeBaseDocument, 'scope' | 'projectId'>,
  knowledgeId: string,
  documentId: string,
  documentVersionHash: string,
  fileName: string,
): string => {
  return join(
    buildStorageDocumentVersionPath(knowledge, knowledgeId, documentId, documentVersionHash),
    sanitizeFileName(basename(fileName)),
  );
};

const KNOWLEDGE_DIAGNOSTICS_STALE_PROCESSING_MS = 15 * 60 * 1000;
const KNOWLEDGE_INDEXER_DOCUMENT_PATHS = [
  '/internal/v1/index/documents',
  '/internal/index-documents',
] as const;
const KNOWLEDGE_INDEXER_REBUILD_DOCUMENT_PATHS = (
  documentId: string,
) =>
  [
    `/internal/v1/index/documents/${encodeURIComponent(documentId)}/rebuild`,
    '/internal/v1/index/documents',
    '/internal/index-documents',
  ] as const;
const KNOWLEDGE_INDEXER_DIAGNOSTICS_PATHS = [
  '/internal/v1/index/diagnostics',
  '/health',
] as const;

const buildKnowledgeIndexerUrls = (baseUrl: string): string[] => {
  return Array.from(
    new Set(
      KNOWLEDGE_INDEXER_DOCUMENT_PATHS.map((path) => new URL(path, baseUrl).toString()),
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
        new URL(path, baseUrl).toString(),
      ),
    ),
  );
};

const buildKnowledgeIndexerDiagnosticsUrls = (baseUrl: string): string[] => {
  return Array.from(
    new Set(
      KNOWLEDGE_INDEXER_DIAGNOSTICS_PATHS.map((path) => new URL(path, baseUrl).toString()),
    ),
  );
};

const buildKnowledgeCollectionName = (
  knowledge: Pick<KnowledgeBaseDocument, 'scope' | 'projectId' | 'sourceType'>,
): string => {
  const scope = resolveKnowledgeScope(knowledge);

  if (scope.scope === 'project' && scope.projectId) {
    return knowledge.sourceType === 'global_code'
      ? `proj_${scope.projectId}_code`
      : `proj_${scope.projectId}_docs`;
  }

  return knowledge.sourceType === 'global_code' ? 'global_code' : 'global_docs';
};

const requireVisibleKnowledge = async ({
  repository,
  projectsRepository,
  actorId,
  knowledgeId,
}: {
  repository: KnowledgeRepository;
  projectsRepository: ProjectsRepository;
  actorId: string;
  knowledgeId: string;
}): Promise<WithId<KnowledgeBaseDocument>> => {
  const knowledge = await repository.findKnowledgeById(knowledgeId);

  if (!knowledge) {
    throw createKnowledgeNotFoundError();
  }

  const scope = resolveKnowledgeScope(knowledge);

  if (scope.scope !== 'project') {
    return knowledge;
  }

  if (!scope.projectId) {
    throw createKnowledgeNotFoundError();
  }

  const project = await projectsRepository.findById(scope.projectId);
  if (!project || !getProjectMember(project, actorId)) {
    throw createKnowledgeNotFoundError();
  }

  return knowledge;
};

const requireKnowledgeInProject = async ({
  repository,
  projectsRepository,
  actor,
  projectId,
  knowledgeId,
}: {
  repository: KnowledgeRepository;
  projectsRepository: ProjectsRepository;
  actor: KnowledgeCommandContext['actor'];
  projectId: string;
  knowledgeId: string;
}): Promise<WithId<KnowledgeBaseDocument>> => {
  await requireVisibleProject(projectsRepository, projectId, actor);

  const knowledge = await repository.findKnowledgeById(knowledgeId);
  if (!knowledge) {
    throw createKnowledgeNotFoundError();
  }

  const scope = resolveKnowledgeScope(knowledge);
  if (scope.scope !== 'project' || scope.projectId !== projectId) {
    throw createKnowledgeNotFoundError();
  }

  return knowledge;
};

const isStaleProcessingDocument = (
  document: Pick<KnowledgeDocumentRecord, 'status' | 'updatedAt'>,
  now: Date,
): boolean => {
  return (
    document.status === 'processing' &&
    now.getTime() - document.updatedAt.getTime() >= KNOWLEDGE_DIAGNOSTICS_STALE_PROCESSING_MS
  );
};

const normalizeIndexerErrorMessage = (
  error: unknown,
  fallback = 'Python indexer 处理失败',
): string => {
  if (error instanceof Error && error.message.trim()) {
    return error.message.trim();
  }

  return fallback;
};

const resolveEmbeddingMetadata = (
  env: AppEnv,
): {
  embeddingProvider: 'openai' | 'local_dev';
  embeddingModel: 'text-embedding-3-small' | 'hash-1536-dev';
} => {
  if (env.nodeEnv === 'development' && !env.openai.apiKey) {
    return {
      embeddingProvider: 'local_dev',
      embeddingModel: 'hash-1536-dev',
    };
  }

  return {
    embeddingProvider: 'openai',
    embeddingModel: 'text-embedding-3-small',
  };
};

const buildKnowledgeActorProfileMap = async (
  authRepository: AuthRepository,
  knowledgeItems: Array<Pick<KnowledgeBaseDocument, 'maintainerId' | 'createdBy'>>,
): Promise<KnowledgeActorProfileMap> => {
  const userIds = Array.from(
    new Set(
      knowledgeItems.flatMap((knowledge) => [knowledge.maintainerId, knowledge.createdBy]),
    ),
  );
  const profiles = await authRepository.findProfilesByIds(userIds);

  return new Map(profiles.map((profile) => [profile.id, profile] as const));
};

const parseKnowledgeIndexerResponseBody = async (response: Response): Promise<unknown> => {
  try {
    return await response.json();
  } catch {
    return null;
  }
};

const resolveKnowledgeIndexerErrorMessage = (
  response: Response,
  responseBody: unknown,
): string => {
  if (
    typeof responseBody === 'object' &&
    responseBody &&
    'errorMessage' in responseBody &&
    typeof responseBody.errorMessage === 'string'
  ) {
    return responseBody.errorMessage;
  }

  return `Python indexer 请求失败（HTTP ${response.status}）`;
};

const resolveDiagnosticsErrorMessage = (error: unknown): string => {
  if (error instanceof AppError) {
    return error.message;
  }

  if (error instanceof Error && error.message.trim()) {
    return error.message.trim();
  }

  return '诊断请求失败';
};

const callKnowledgeIndexer = async (
  env: AppEnv,
  payload: KnowledgeIndexerDocumentRequest,
  options?: {
    mode?: 'index' | 'rebuild';
  },
): Promise<KnowledgeIndexerResponse> => {
  const mode = options?.mode ?? 'index';
  const indexerUrls =
    mode === 'rebuild'
      ? buildKnowledgeIndexerRebuildUrls(env.knowledge.indexerUrl, payload.documentId)
      : buildKnowledgeIndexerUrls(env.knowledge.indexerUrl);

  for (let index = 0; index < indexerUrls.length; index += 1) {
    const indexerUrl = indexerUrls[index];
    if (!indexerUrl) {
      continue;
    }

    let response: Response;

    try {
      response = await fetch(indexerUrl, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(env.knowledge.indexerRequestTimeoutMs),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'unknown fetch error';
      throw new Error(
        `Python indexer 不可达，请确认本地索引服务已启动（${indexerUrl}）。原始错误：${message}`,
      );
    }

    const responseBody = await parseKnowledgeIndexerResponseBody(response);

    if (response.status === 404 && index < indexerUrls.length - 1) {
      continue;
    }

    if (!response.ok) {
      throw new Error(resolveKnowledgeIndexerErrorMessage(response, responseBody));
    }

    if (
      !responseBody ||
      typeof responseBody !== 'object' ||
      !('status' in responseBody) ||
      (responseBody.status !== 'completed' && responseBody.status !== 'failed')
    ) {
      throw new Error('Python indexer 返回了无法识别的响应');
    }

    return responseBody as KnowledgeIndexerResponse;
  }

  throw new Error('Python indexer 请求失败（HTTP 404）');
};

const parseKnowledgeIndexerDiagnosticsResponse = (
  responseBody: unknown,
): KnowledgeIndexerDiagnosticsResponse => {
  if (
    !responseBody ||
    typeof responseBody !== 'object' ||
    !('status' in responseBody) ||
    (responseBody.status !== 'ok' && responseBody.status !== 'degraded') ||
    !('service' in responseBody) ||
    typeof responseBody.service !== 'string' ||
    !('chunkSize' in responseBody) ||
    typeof responseBody.chunkSize !== 'number' ||
    !('chunkOverlap' in responseBody) ||
    typeof responseBody.chunkOverlap !== 'number' ||
    !('supportedFormats' in responseBody) ||
    !Array.isArray(responseBody.supportedFormats)
  ) {
    throw new Error('Python indexer 诊断响应格式不合法');
  }

  return {
    status: responseBody.status,
    service: responseBody.service,
    chunkSize: responseBody.chunkSize,
    chunkOverlap: responseBody.chunkOverlap,
    supportedFormats: responseBody.supportedFormats.filter(
      (value): value is string => typeof value === 'string',
    ),
    embeddingProvider:
      'embeddingProvider' in responseBody && typeof responseBody.embeddingProvider === 'string'
        ? responseBody.embeddingProvider
        : null,
    chromaReachable:
      'chromaReachable' in responseBody && typeof responseBody.chromaReachable === 'boolean'
        ? responseBody.chromaReachable
        : null,
    errorMessage:
      'errorMessage' in responseBody && typeof responseBody.errorMessage === 'string'
        ? responseBody.errorMessage
        : null,
  };
};

const persistProcessingFailure = async ({
  repository,
  knowledgeId,
  documentId,
  errorMessage,
}: {
  repository: KnowledgeRepository;
  knowledgeId: string;
  documentId: string;
  errorMessage: string;
}): Promise<void> => {
  const failedAt = new Date();

  try {
    const failedDocument = await repository.updateKnowledgeDocument(
      documentId,
      {
        status: 'failed',
        chunkCount: 0,
        errorMessage,
        processedAt: failedAt,
        updatedAt: failedAt,
      },
      {
        incrementRetryCount: true,
      },
    );

    if (failedDocument) {
      await repository.syncKnowledgeSummaryFromDocuments(knowledgeId, failedAt);
    }
  } catch (persistenceError) {
    console.error(
      `[knowledge-indexer] document ${documentId} failure state persistence failed: ${normalizeIndexerErrorMessage(
        persistenceError,
        'MongoDB 状态回写失败',
      )}`,
    );
  }

  console.error(`[knowledge-indexer] document ${documentId} processing failed: ${errorMessage}`);
};

const readDocumentStoragePresence = async (
  env: AppEnv,
  document: Pick<KnowledgeDocumentRecord, 'storagePath'>,
): Promise<boolean> => {
  try {
    await access(join(env.knowledge.storageRoot, document.storagePath));
    return true;
  } catch {
    return false;
  }
};

const readKnowledgeIndexerDiagnostics = async (
  env: AppEnv,
): Promise<KnowledgeIndexerDiagnosticsResponse> => {
  const diagnosticsUrls = buildKnowledgeIndexerDiagnosticsUrls(env.knowledge.indexerUrl);

  for (let index = 0; index < diagnosticsUrls.length; index += 1) {
    const diagnosticsUrl = diagnosticsUrls[index];
    if (!diagnosticsUrl) {
      continue;
    }

    let response: Response;

    try {
      response = await fetch(diagnosticsUrl, {
        method: 'GET',
        headers: {
          accept: 'application/json',
        },
        signal: AbortSignal.timeout(env.knowledge.indexerRequestTimeoutMs),
      });
    } catch (error) {
      if (index < diagnosticsUrls.length - 1) {
        continue;
      }

      throw new Error(
        `Python indexer 诊断不可达，请确认本地索引服务已启动（${diagnosticsUrl}）。原始错误：${normalizeIndexerErrorMessage(
          error,
          'unknown fetch error',
        )}`,
      );
    }

    const responseBody = await parseKnowledgeIndexerResponseBody(response);

    if (response.status === 404 && index < diagnosticsUrls.length - 1) {
      continue;
    }

    if (!response.ok) {
      throw new Error(resolveKnowledgeIndexerErrorMessage(response, responseBody));
    }

    return parseKnowledgeIndexerDiagnosticsResponse(responseBody);
  }

  throw new Error('Python indexer 诊断请求失败（HTTP 404）');
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
        'Chroma 文档向量清理失败',
      )}`,
    );
  }
};

const processUploadedDocument = async ({
  env,
  repository,
  searchService,
  knowledgeId,
  documentId,
  storagePath,
  fileName,
  mimeType,
  sourceType,
  collectionName,
  documentVersionHash,
  mode = 'index',
}: {
  env: AppEnv;
  repository: KnowledgeRepository;
  searchService: KnowledgeSearchService;
  knowledgeId: string;
  documentId: string;
  storagePath: string;
  fileName: string;
  mimeType: string;
  sourceType: KnowledgeSourceType;
  collectionName: string;
  documentVersionHash: string;
  mode?: 'index' | 'rebuild';
}): Promise<void> => {
  try {
    const processingAt = new Date();
    const processingDocument = await repository.updateKnowledgeDocument(documentId, {
      status: 'processing',
      errorMessage: null,
      processedAt: null,
      updatedAt: processingAt,
    });

    if (!processingDocument) {
      return;
    }

    await repository.syncKnowledgeSummaryFromDocuments(knowledgeId, processingAt);

    const result = await callKnowledgeIndexer(env, {
      knowledgeId,
      documentId,
      sourceType,
      collectionName,
      fileName,
      mimeType,
      storagePath,
      documentVersionHash,
    }, {
      mode,
    });

    if (result.status === 'failed') {
      throw new Error(result.errorMessage);
    }

    const completedAt = new Date();
    const completedDocument = await repository.updateKnowledgeDocument(documentId, {
      status: 'completed',
      chunkCount: result.chunkCount,
      lastIndexedAt: completedAt,
      errorMessage: null,
      processedAt: completedAt,
      updatedAt: completedAt,
    });

    if (!completedDocument) {
      await cleanupDetachedDocumentChunks({
        searchService,
        documentId,
        collectionName,
      });
      return;
    }

    await repository.syncKnowledgeSummaryFromDocuments(knowledgeId, completedAt);
  } catch (error) {
    const errorMessage = normalizeIndexerErrorMessage(error);
    await persistProcessingFailure({
      repository,
      knowledgeId,
      documentId,
      errorMessage,
    });
  }
};

const queueDocumentProcessing = ({
  env,
  repository,
  searchService,
  knowledgeId,
  documentId,
  storagePath,
  fileName,
  mimeType,
  sourceType,
  collectionName,
  documentVersionHash,
  mode = 'index',
}: {
  env: AppEnv;
  repository: KnowledgeRepository;
  searchService: KnowledgeSearchService;
  knowledgeId: string;
  documentId: string;
  storagePath: string;
  fileName: string;
  mimeType: string;
  sourceType: KnowledgeSourceType;
  collectionName: string;
  documentVersionHash: string;
  mode?: 'index' | 'rebuild';
}): void => {
  setImmediate(() => {
    void processUploadedDocument({
      env,
      repository,
      searchService,
      knowledgeId,
      documentId,
      storagePath,
      fileName,
      mimeType,
      sourceType,
      collectionName,
      documentVersionHash,
      mode,
    }).catch((error) => {
      console.error(
        `[knowledge-indexer] detached processing crashed for document ${documentId}: ${normalizeIndexerErrorMessage(
          error,
        )}`,
      );
    });
  });
};

const queueExistingKnowledgeDocument = async ({
  env,
  repository,
  searchService,
  knowledgeId,
  document,
  sourceType,
  collectionName,
  mode,
}: {
  env: AppEnv;
  repository: KnowledgeRepository;
  searchService: KnowledgeSearchService;
  knowledgeId: string;
  document: WithId<KnowledgeDocumentRecord>;
  sourceType: KnowledgeSourceType;
  collectionName: string;
  mode: 'index' | 'rebuild';
}): Promise<void> => {
  const queuedAt = new Date();
  const queuedDocument = await repository.updateKnowledgeDocument(document._id.toHexString(), {
    status: 'pending',
    errorMessage: null,
    processedAt: null,
    updatedAt: queuedAt,
  });

  if (!queuedDocument) {
    throw createKnowledgeDocumentNotFoundError();
  }

  await repository.syncKnowledgeSummaryFromDocuments(knowledgeId, queuedAt);

  queueDocumentProcessing({
    env,
    repository,
    searchService,
    knowledgeId,
    documentId: document._id.toHexString(),
    storagePath: join(env.knowledge.storageRoot, document.storagePath),
    fileName: document.fileName,
    mimeType: document.mimeType,
    sourceType,
    collectionName,
    documentVersionHash: document.documentVersionHash,
    mode,
  });
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
  const actorProfileMap = await buildKnowledgeActorProfileMap(authRepository, [knowledge]);

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
  actor,
  knowledgeId,
  knowledge,
  file,
}: {
  env: AppEnv;
  repository: KnowledgeRepository;
  searchService: KnowledgeSearchService;
  authRepository: AuthRepository;
  actor: KnowledgeCommandContext['actor'];
  knowledgeId: string;
  knowledge: WithId<KnowledgeBaseDocument>;
  file: UploadedKnowledgeFile;
}): Promise<KnowledgeDocumentUploadResponse> => {
  const collectionName = buildKnowledgeCollectionName(knowledge);

  validateUploadFile(knowledge.sourceType, file);

  const documentId = new ObjectId();
  const documentVersionHash = buildDocumentVersionHash(file);
  const embeddingMetadata = resolveEmbeddingMetadata(env);
  const documentRootPath = buildStorageDocumentRootPath(
    knowledge,
    knowledgeId,
    documentId.toHexString(),
  );
  const documentVersionPath = buildStorageDocumentVersionPath(
    knowledge,
    knowledgeId,
    documentId.toHexString(),
    documentVersionHash,
  );
  const storagePath = buildStoragePath(
    knowledge,
    knowledgeId,
    documentId.toHexString(),
    documentVersionHash,
    file.originalName,
  );
  const absoluteStoragePath = join(env.knowledge.storageRoot, storagePath);
  const now = new Date();
  let documentPersisted = false;
  let knowledgeSummaryUpdated = false;

  await mkdir(join(env.knowledge.storageRoot, documentVersionPath), {
    recursive: true,
  });

  try {
    await writeFile(absoluteStoragePath, file.buffer);

    const documentRecord: KnowledgeDocumentRecord & {
      _id: NonNullable<KnowledgeDocumentRecord['_id']>;
    } = {
      _id: documentId,
      knowledgeId,
      fileName: basename(file.originalName),
      mimeType: file.mimeType,
      storagePath,
      status: 'pending',
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

    const document = await repository.createKnowledgeDocument(documentRecord);
    documentPersisted = true;
    const updatedKnowledge = await repository.updateKnowledgeSummaryAfterDocumentUpload(
      knowledgeId,
      now,
    );

    if (!updatedKnowledge) {
      throw createKnowledgeNotFoundError();
    }

    const actorProfileMap = await buildKnowledgeActorProfileMap(authRepository, [updatedKnowledge]);

    knowledgeSummaryUpdated = true;
    queueDocumentProcessing({
      env,
      repository,
      searchService,
      knowledgeId,
      documentId: documentId.toHexString(),
      storagePath: absoluteStoragePath,
      fileName: basename(file.originalName),
      mimeType: file.mimeType,
      sourceType: knowledge.sourceType,
      collectionName,
      documentVersionHash,
    });

    return {
      knowledge: toKnowledgeSummaryResponse(updatedKnowledge, actorProfileMap),
      document: toKnowledgeDocumentResponse(document),
    };
  } catch (error) {
    if (documentPersisted && !knowledgeSummaryUpdated) {
      await repository.deleteKnowledgeDocumentById(documentId.toHexString());
    }

    await rm(join(env.knowledge.storageRoot, documentRootPath), {
      recursive: true,
      force: true,
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
}: {
  env: AppEnv;
  repository: KnowledgeRepository;
  searchService: KnowledgeSearchService;
  authRepository: AuthRepository;
  projectsRepository?: ProjectsRepository;
}): KnowledgeService => {
  return {
    initializeSearchInfrastructure: async () => {
      // Startup 只探活 indexer；collection init 由 indexer-py 在写侧链路内保证。
      await searchService.ensureCollections();
    },

    // Keep future metadata, upload, index trigger, and search orchestration behind the service.
    listKnowledge: async (context) => {
      void context;
      await repository.ensureMetadataModel();
      const items = await repository.listKnowledgeBases({ scope: 'global' });
      const actorProfileMap = await buildKnowledgeActorProfileMap(authRepository, items);

      return {
        total: items.length,
        items: items.map((knowledge) => toKnowledgeSummaryResponse(knowledge, actorProfileMap)),
      };
    },

    listProjectKnowledge: async ({ actor }, projectId) => {
      await repository.ensureMetadataModel();
      await requireVisibleProject(projectsRepository, projectId, actor);
      const items = await repository.listKnowledgeBases({
        scope: 'project',
        projectId,
      });
      const actorProfileMap = await buildKnowledgeActorProfileMap(authRepository, items);

      return {
        total: items.length,
        items: items.map((knowledge) => toKnowledgeSummaryResponse(knowledge, actorProfileMap)),
      };
    },

    getKnowledgeDetail: async ({ actor }, knowledgeId) => {
      await repository.ensureMetadataModel();
      const knowledge = await requireVisibleKnowledge({
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
      const knowledge = await requireKnowledgeInProject({
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
      const actorProfileMap = await buildKnowledgeActorProfileMap(authRepository, [knowledge]);

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
      const actorProfileMap = await buildKnowledgeActorProfileMap(authRepository, [knowledge]);

      return {
        knowledge: toKnowledgeSummaryResponse(knowledge, actorProfileMap),
      };
    },

    updateKnowledge: async ({ actor }, knowledgeId, input) => {
      await repository.ensureMetadataModel();
      await requireVisibleKnowledge({
        repository,
        projectsRepository,
        actorId: actor.id,
        knowledgeId,
      });

      const patch = validateUpdateKnowledgeInput(input);
      const updatedKnowledge = await repository.updateKnowledgeBase(knowledgeId, {
        ...patch,
        updatedAt: new Date(),
      });

      if (!updatedKnowledge) {
        throw createKnowledgeNotFoundError();
      }

      const actorProfileMap = await buildKnowledgeActorProfileMap(authRepository, [updatedKnowledge]);

      return {
        knowledge: toKnowledgeSummaryResponse(updatedKnowledge, actorProfileMap),
      };
    },

    deleteKnowledge: async ({ actor }, knowledgeId) => {
      await repository.ensureMetadataModel();
      const knowledge = await requireVisibleKnowledge({
        repository,
        projectsRepository,
        actorId: actor.id,
        knowledgeId,
      });
      const collectionName = buildKnowledgeCollectionName(knowledge);

      try {
        await searchService.deleteKnowledgeChunks(knowledgeId, {
          collectionName,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.warn(
          `[knowledge-search] failed to cleanup knowledge ${knowledgeId} chunks before delete: ${message}`,
        );
      }

      await repository.deleteKnowledgeDocumentsByKnowledgeId(knowledgeId);
      const deleted = await repository.deleteKnowledgeBase(knowledgeId);

      if (!deleted) {
        throw createKnowledgeNotFoundError();
      }

      await rm(join(env.knowledge.storageRoot, buildStorageKnowledgeRootPath(knowledge, knowledgeId)), {
        recursive: true,
        force: true,
      });
    },

    deleteDocument: async ({ actor }, knowledgeId, documentId) => {
      await repository.ensureMetadataModel();
      const knowledge = await requireVisibleKnowledge({
        repository,
        projectsRepository,
        actorId: actor.id,
        knowledgeId,
      });
      const collectionName = buildKnowledgeCollectionName(knowledge);

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
            'Chroma 文档向量清理失败',
          )}`,
        );
      }

      const deleted = await repository.deleteKnowledgeDocumentById(documentId);

      if (!deleted) {
        throw createKnowledgeDocumentNotFoundError();
      }

      await rm(join(env.knowledge.storageRoot, buildStorageDocumentRootPath(knowledge, knowledgeId, documentId)), {
        recursive: true,
        force: true,
      });

      await repository.syncKnowledgeSummaryFromDocuments(knowledgeId, new Date());
    },

    uploadDocument: async ({ actor }, knowledgeId, file) => {
      await repository.ensureMetadataModel();
      const knowledge = await requireVisibleKnowledge({
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
        actor,
        knowledgeId,
        knowledge,
        file,
      });
    },

    uploadProjectKnowledgeDocument: async ({ actor }, projectId, knowledgeId, file) => {
      await repository.ensureMetadataModel();
      const knowledge = await requireKnowledgeInProject({
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
        actor,
        knowledgeId,
        knowledge,
        file,
      });
    },

    retryDocument: async ({ actor }, knowledgeId, documentId) => {
      await repository.ensureMetadataModel();
      const knowledge = await requireVisibleKnowledge({
        repository,
        projectsRepository,
        actorId: actor.id,
        knowledgeId,
      });
      const collectionName = buildKnowledgeCollectionName(knowledge);

      const document = await repository.findKnowledgeDocumentById(documentId);

      if (!document || document.knowledgeId !== knowledgeId) {
        throw createKnowledgeDocumentNotFoundError();
      }

      if (document.status === 'pending' || document.status === 'processing') {
        throw createDocumentRetryConflictError();
      }

      await queueExistingKnowledgeDocument({
        env,
        repository,
        searchService,
        knowledgeId,
        document,
        sourceType: knowledge.sourceType,
        collectionName,
        mode: 'index',
      });
    },

    rebuildDocument: async ({ actor }, knowledgeId, documentId) => {
      await repository.ensureMetadataModel();
      const knowledge = await requireVisibleKnowledge({
        repository,
        projectsRepository,
        actorId: actor.id,
        knowledgeId,
      });
      const collectionName = buildKnowledgeCollectionName(knowledge);

      const document = await repository.findKnowledgeDocumentById(documentId);

      if (!document || document.knowledgeId !== knowledgeId) {
        throw createKnowledgeDocumentNotFoundError();
      }

      if (document.status === 'pending' || document.status === 'processing') {
        throw createDocumentRetryConflictError();
      }

      await queueExistingKnowledgeDocument({
        env,
        repository,
        searchService,
        knowledgeId,
        document,
        sourceType: knowledge.sourceType,
        collectionName,
        mode: 'rebuild',
      });
    },

    rebuildKnowledge: async ({ actor }, knowledgeId) => {
      await repository.ensureMetadataModel();
      const knowledge = await requireVisibleKnowledge({
        repository,
        projectsRepository,
        actorId: actor.id,
        knowledgeId,
      });
      const collectionName = buildKnowledgeCollectionName(knowledge);

      const documents = await repository.listDocumentsByKnowledgeId(knowledgeId);

      if (documents.length === 0) {
        throw createKnowledgeRebuildEmptyError();
      }

      if (documents.some((document) => document.status === 'pending' || document.status === 'processing')) {
        throw createKnowledgeRebuildConflictError();
      }

      await Promise.all(
        documents.map((document) =>
          queueExistingKnowledgeDocument({
            env,
            repository,
            searchService,
            knowledgeId,
            document,
            sourceType: knowledge.sourceType,
            collectionName,
            mode: 'rebuild',
          }),
        ),
      );
    },

    getKnowledgeDiagnostics: async ({ actor }, knowledgeId) => {
      await repository.ensureMetadataModel();
      const knowledge = await requireVisibleKnowledge({
        repository,
        projectsRepository,
        actorId: actor.id,
        knowledgeId,
      });

      const documents = await repository.listDocumentsByKnowledgeId(knowledgeId);
      const now = new Date();
      const documentsWithStorageState = await Promise.all(
        documents.map(async (document) => {
          const storageExists = await readDocumentStoragePresence(env, document);
          const staleProcessing = isStaleProcessingDocument(document, now);

          return {
            document,
            storageExists,
            staleProcessing,
          };
        }),
      );

      const collectionDiagnostics = await searchService.getDiagnostics({
        collectionName: buildKnowledgeCollectionName(knowledge),
      });
      let indexerDiagnostics: KnowledgeDiagnosticsResponse['indexer'];

      try {
        const diagnostics = await readKnowledgeIndexerDiagnostics(env);
        indexerDiagnostics = {
          status: diagnostics.status,
          service: diagnostics.service,
          supportedFormats: diagnostics.supportedFormats,
          chunkSize: diagnostics.chunkSize,
          chunkOverlap: diagnostics.chunkOverlap,
          embeddingProvider: diagnostics.embeddingProvider,
          chromaReachable: diagnostics.chromaReachable,
          errorMessage: diagnostics.errorMessage,
        };
      } catch (error) {
        indexerDiagnostics = {
          status: 'degraded',
          service: null,
          supportedFormats: [],
          chunkSize: null,
          chunkOverlap: null,
          embeddingProvider: null,
          chromaReachable: null,
          errorMessage: resolveDiagnosticsErrorMessage(error),
        };
      }

      return {
        knowledgeId,
        sourceType: knowledge.sourceType,
        expectedCollectionName: collectionDiagnostics.collection.name,
        indexStatus: knowledge.indexStatus,
        documentSummary: {
          total: documents.length,
          pending: documents.filter((document) => document.status === 'pending').length,
          processing: documents.filter((document) => document.status === 'processing').length,
          completed: documents.filter((document) => document.status === 'completed').length,
          failed: documents.filter((document) => document.status === 'failed').length,
          missingStorage: documentsWithStorageState.filter((item) => !item.storageExists).length,
          staleProcessing: documentsWithStorageState.filter((item) => item.staleProcessing).length,
        },
        collection: collectionDiagnostics.collection,
        indexer: indexerDiagnostics,
        documents: documentsWithStorageState.map(({ document, storageExists, staleProcessing }) => ({
          id: document._id.toHexString(),
          status: document.status,
          fileName: document.fileName,
          retryCount: document.retryCount,
          lastIndexedAt: document.lastIndexedAt?.toISOString() ?? null,
          errorMessage: document.errorMessage,
          updatedAt: document.updatedAt.toISOString(),
          missingStorage: !storageExists,
          staleProcessing,
        })),
      };
    },

    searchDocuments: async ({ actor }, input) => {
      const validatedInput = validateSearchDocumentsInput(input);

      if (!validatedInput.knowledgeId) {
        return searchService.searchDocuments(validatedInput);
      }

      await repository.ensureMetadataModel();
      const knowledge = await requireVisibleKnowledge({
        repository,
        projectsRepository,
        actorId: actor.id,
        knowledgeId: validatedInput.knowledgeId,
      });

      return searchService.searchDocuments({
        ...validatedInput,
        sourceType: knowledge.sourceType,
        collectionName: buildKnowledgeCollectionName(knowledge),
      });
    },
  };
};
