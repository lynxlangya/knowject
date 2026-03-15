import multer, { MulterError } from 'multer';
import type { Request, Response } from 'express';
import { AppError } from '@lib/app-error.js';
import {
  KNOWLEDGE_UPLOAD_FIELD_NAME,
  KNOWLEDGE_UPLOAD_MAX_BYTES,
  normalizeUploadedFileName,
} from './knowledge.shared.js';
import type { UploadedKnowledgeFile } from './knowledge.types.js';

export const getRequiredRouteParam = (request: Request, paramName: string): string => {
  const value = request.params[paramName];
  return Array.isArray(value) ? value[0] ?? '' : value ?? '';
};

const formatUploadLimitLabel = (): string => {
  return `${Math.round(KNOWLEDGE_UPLOAD_MAX_BYTES / 1024 / 1024)} MB`;
};

export const readUploadedKnowledgeFile = async (
  request: Request,
  response: Response,
): Promise<UploadedKnowledgeFile> => {
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
      fileSize: KNOWLEDGE_UPLOAD_MAX_BYTES,
    },
  });

  await new Promise<void>((resolve, reject) => {
    upload.single(KNOWLEDGE_UPLOAD_FIELD_NAME)(request, response, (error) => {
      if (!error) {
        resolve();
        return;
      }

      if (error instanceof MulterError) {
        if (error.code === 'LIMIT_FILE_SIZE') {
          reject(
            new AppError({
              statusCode: 400,
              code: 'KNOWLEDGE_UPLOAD_TOO_LARGE',
              message: `上传文件不能超过 ${formatUploadLimitLabel()}`,
            }),
          );
          return;
        }

        reject(
          new AppError({
            statusCode: 400,
            code: 'KNOWLEDGE_UPLOAD_INVALID_REQUEST',
            message: '上传请求不合法，请确认字段名为 file 且只上传一个文件',
            details: {
              multerCode: error.code,
            },
            cause: error,
          }),
        );
        return;
      }

      reject(error);
    });
  });

  if (!request.file) {
    throw new AppError({
      statusCode: 400,
      code: 'KNOWLEDGE_UPLOAD_FILE_REQUIRED',
      message: '请上传文件',
    });
  }

  return {
    originalName: normalizeUploadedFileName(request.file.originalname),
    mimeType: request.file.mimetype,
    size: request.file.size,
    buffer: request.file.buffer,
  };
};
