import multer, { MulterError } from 'multer';
import type { Request, Response } from 'express';
import { AppError } from '@lib/app-error.js';
import { getFallbackMessage } from '@lib/locale.messages.js';
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
              message: getFallbackMessage('knowledge.upload.tooLarge'),
              messageKey: 'knowledge.upload.tooLarge',
              details: {
                maxUploadSize: formatUploadLimitLabel(),
              },
            }),
          );
          return;
        }

        reject(
          new AppError({
            statusCode: 400,
            code: 'KNOWLEDGE_UPLOAD_INVALID_REQUEST',
            message: getFallbackMessage('knowledge.upload.invalidRequest'),
            messageKey: 'knowledge.upload.invalidRequest',
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
      message: getFallbackMessage('knowledge.upload.fileRequired'),
      messageKey: 'knowledge.upload.fileRequired',
    });
  }

  return {
    originalName: normalizeUploadedFileName(request.file.originalname),
    mimeType: request.file.mimetype,
    size: request.file.size,
    buffer: request.file.buffer,
  };
};
