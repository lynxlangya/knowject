import { createHash } from 'node:crypto';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { basename, extname, join } from 'node:path';
import { ObjectId } from 'mongodb';
import type { AppEnv } from '@config/env.js';
import { AppError } from '@lib/app-error.js';
import type { KnowledgeRepository } from './knowledge.repository.js';
import {
  SUPPORTED_KNOWLEDGE_UPLOAD_TYPES,
  sanitizeFileName,
  toKnowledgeDocumentResponse,
  toKnowledgeSummaryResponse,
} from './knowledge.shared.js';
import type {
  CreateKnowledgeInput,
  KnowledgeCommandContext,
  KnowledgeDetailEnvelope,
  KnowledgeDocumentRecord,
  KnowledgeDocumentUploadResponse,
  KnowledgeIndexerDocumentRequest,
  KnowledgeIndexerResponse,
  KnowledgeListResponse,
  KnowledgeMutationResponse,
  KnowledgeSourceType,
  UpdateKnowledgeInput,
  UploadedKnowledgeFile,
} from './knowledge.types.js';

export interface KnowledgeService {
  listKnowledge(context: KnowledgeCommandContext): Promise<KnowledgeListResponse>;
  getKnowledgeDetail(
    context: KnowledgeCommandContext,
    knowledgeId: string,
  ): Promise<KnowledgeDetailEnvelope>;
  createKnowledge(
    context: KnowledgeCommandContext,
    input: CreateKnowledgeInput,
  ): Promise<KnowledgeMutationResponse>;
  updateKnowledge(
    context: KnowledgeCommandContext,
    knowledgeId: string,
    input: UpdateKnowledgeInput,
  ): Promise<KnowledgeMutationResponse>;
  deleteKnowledge(context: KnowledgeCommandContext, knowledgeId: string): Promise<void>;
  uploadDocument(
    context: KnowledgeCommandContext,
    knowledgeId: string,
    file: UploadedKnowledgeFile,
  ): Promise<KnowledgeDocumentUploadResponse>;
}

const createValidationError = (
  message: string,
  fields: Record<string, string>,
): AppError => {
  return new AppError({
    statusCode: 400,
    code: 'VALIDATION_ERROR',
    message,
    details: {
      fields,
    },
  });
};

const createKnowledgeNotFoundError = (): AppError => {
  return new AppError({
    statusCode: 404,
    code: 'KNOWLEDGE_NOT_FOUND',
    message: '知识库不存在',
  });
};

const createUploadNotSupportedError = (): AppError => {
  return new AppError({
    statusCode: 400,
    code: 'KNOWLEDGE_UPLOAD_UNSUPPORTED_TYPE',
    message: '当前只支持上传 md、txt、pdf 文件',
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

const readOptionalStringField = (
  value: unknown,
  field: 'name' | 'description',
): string | undefined => {
  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== 'string') {
    throw createValidationError(`${field} 必须为字符串`, {
      [field]: `${field} 必须为字符串`,
    });
  }

  return value.trim();
};

const readOptionalSourceType = (value: unknown): KnowledgeSourceType | undefined => {
  if (value === undefined) {
    return undefined;
  }

  if (value === 'global_docs' || value === 'global_code') {
    return value;
  }

  throw createValidationError('sourceType 不合法', {
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
    throw createValidationError('请输入知识库名称', {
      name: '请输入知识库名称',
    });
  }

  const now = new Date();

  return {
    name,
    description: description ?? '',
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

const validateUpdateKnowledgeInput = (
  input: UpdateKnowledgeInput,
) => {
  const name = readOptionalStringField(input.name, 'name');
  const description = readOptionalStringField(input.description, 'description');

  if (name === undefined && description === undefined) {
    throw createValidationError('至少需要提供一个可更新字段', {
      name: '至少需要提供 name 或 description',
      description: '至少需要提供 name 或 description',
    });
  }

  if (input.name !== undefined && !name) {
    throw createValidationError('请输入知识库名称', {
      name: '请输入知识库名称',
    });
  }

  return {
    ...(name !== undefined ? { name } : {}),
    ...(description !== undefined ? { description: description ?? '' } : {}),
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

const buildStoragePath = (
  knowledgeId: string,
  documentId: string,
  documentVersionHash: string,
  fileName: string,
): string => {
  return join(
    knowledgeId,
    documentId,
    documentVersionHash,
    sanitizeFileName(basename(fileName)),
  );
};

const buildKnowledgeIndexerUrl = (baseUrl: string): string => {
  return new URL('/internal/index-documents', baseUrl).toString();
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

const callKnowledgeIndexer = async (
  env: AppEnv,
  payload: KnowledgeIndexerDocumentRequest,
): Promise<KnowledgeIndexerResponse> => {
  const response = await fetch(buildKnowledgeIndexerUrl(env.knowledge.indexerUrl), {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(env.knowledge.indexerRequestTimeoutMs),
  });

  let responseBody: unknown = null;

  try {
    responseBody = await response.json();
  } catch {
    responseBody = null;
  }

  if (!response.ok) {
    const errorMessage =
      typeof responseBody === 'object' &&
      responseBody &&
      'errorMessage' in responseBody &&
      typeof responseBody.errorMessage === 'string'
        ? responseBody.errorMessage
        : `Python indexer 请求失败（HTTP ${response.status}）`;

    throw new Error(errorMessage);
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

const processUploadedDocument = async ({
  env,
  repository,
  knowledgeId,
  documentId,
  storagePath,
  fileName,
  mimeType,
  sourceType,
  documentVersionHash,
}: {
  env: AppEnv;
  repository: KnowledgeRepository;
  knowledgeId: string;
  documentId: string;
  storagePath: string;
  fileName: string;
  mimeType: string;
  sourceType: KnowledgeSourceType;
  documentVersionHash: string;
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
      fileName,
      mimeType,
      storagePath,
      documentVersionHash,
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

export const createKnowledgeService = ({
  env,
  repository,
}: {
  env: AppEnv;
  repository: KnowledgeRepository;
}): KnowledgeService => {
  return {
    // Keep future metadata, upload, index trigger, and search orchestration behind the service.
    listKnowledge: async (_context) => {
      await repository.ensureMetadataModel();
      const items = await repository.listKnowledgeBases();

      return {
        total: items.length,
        items: items.map(toKnowledgeSummaryResponse),
      };
    },

    getKnowledgeDetail: async (_context, knowledgeId) => {
      await repository.ensureMetadataModel();
      const knowledge = await repository.findKnowledgeById(knowledgeId);

      if (!knowledge) {
        throw createKnowledgeNotFoundError();
      }

      const documents = await repository.listDocumentsByKnowledgeId(knowledgeId);

      return {
        knowledge: {
          ...toKnowledgeSummaryResponse(knowledge),
          documents: documents.map(toKnowledgeDocumentResponse),
        },
      };
    },

    createKnowledge: async ({ actor }, input) => {
      await repository.ensureMetadataModel();
      const knowledge = await repository.createKnowledgeBase(
        validateCreateKnowledgeInput(input, actor.id),
      );

      return {
        knowledge: toKnowledgeSummaryResponse(knowledge),
      };
    },

    updateKnowledge: async (_context, knowledgeId, input) => {
      await repository.ensureMetadataModel();
      const currentKnowledge = await repository.findKnowledgeById(knowledgeId);

      if (!currentKnowledge) {
        throw createKnowledgeNotFoundError();
      }

      const patch = validateUpdateKnowledgeInput(input);
      const updatedKnowledge = await repository.updateKnowledgeBase(knowledgeId, {
        ...patch,
        updatedAt: new Date(),
      });

      if (!updatedKnowledge) {
        throw createKnowledgeNotFoundError();
      }

      return {
        knowledge: toKnowledgeSummaryResponse(updatedKnowledge),
      };
    },

    deleteKnowledge: async (_context, knowledgeId) => {
      await repository.ensureMetadataModel();
      const knowledge = await repository.findKnowledgeById(knowledgeId);

      if (!knowledge) {
        throw createKnowledgeNotFoundError();
      }

      await repository.deleteKnowledgeDocumentsByKnowledgeId(knowledgeId);
      const deleted = await repository.deleteKnowledgeBase(knowledgeId);

      if (!deleted) {
        throw createKnowledgeNotFoundError();
      }

      await rm(join(env.knowledge.storageRoot, knowledgeId), {
        recursive: true,
        force: true,
      });
    },

    uploadDocument: async ({ actor }, knowledgeId, file) => {
      await repository.ensureMetadataModel();
      const knowledge = await repository.findKnowledgeById(knowledgeId);

      if (!knowledge) {
        throw createKnowledgeNotFoundError();
      }

      validateUploadFile(knowledge.sourceType, file);

      const documentId = new ObjectId();
      const documentVersionHash = buildDocumentVersionHash(file);
      const storagePath = buildStoragePath(
        knowledgeId,
        documentId.toHexString(),
        documentVersionHash,
        file.originalName,
      );
      const absoluteStoragePath = join(env.knowledge.storageRoot, storagePath);
      const now = new Date();
      let documentPersisted = false;
      let knowledgeSummaryUpdated = false;

      await mkdir(join(env.knowledge.storageRoot, knowledgeId, documentId.toHexString(), documentVersionHash), {
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
          embeddingProvider: 'openai',
          embeddingModel: 'text-embedding-3-small',
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

        knowledgeSummaryUpdated = true;
        setImmediate(() => {
          void processUploadedDocument({
            env,
            repository,
            knowledgeId,
            documentId: documentId.toHexString(),
            storagePath: absoluteStoragePath,
            fileName: basename(file.originalName),
            mimeType: file.mimeType,
            sourceType: knowledge.sourceType,
            documentVersionHash,
          }).catch((error) => {
            console.error(
              `[knowledge-indexer] detached processing crashed for document ${documentId.toHexString()}: ${normalizeIndexerErrorMessage(
                error,
              )}`,
            );
          });
        });

        return {
          knowledge: toKnowledgeSummaryResponse(updatedKnowledge),
          document: toKnowledgeDocumentResponse(document),
        };
      } catch (error) {
        if (documentPersisted && !knowledgeSummaryUpdated) {
          await repository.deleteKnowledgeDocumentById(documentId.toHexString());
        }

        await rm(join(env.knowledge.storageRoot, knowledgeId, documentId.toHexString()), {
          recursive: true,
          force: true,
        });
        throw error;
      }
    },
  };
};
