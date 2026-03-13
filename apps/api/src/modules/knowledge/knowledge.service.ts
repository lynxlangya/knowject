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
