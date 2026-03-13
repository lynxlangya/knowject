import multer, { MulterError } from 'multer';
import { Router, type Request, type Response } from 'express';
import type { RequestHandler } from 'express';
import { asyncHandler } from '@lib/async-handler.js';
import { AppError } from '@lib/app-error.js';
import type { AuthenticatedRequestUser } from '@modules/auth/auth.types.js';
import {
  KNOWLEDGE_UPLOAD_FIELD_NAME,
  KNOWLEDGE_UPLOAD_MAX_BYTES,
  normalizeUploadedFileName,
} from './knowledge.shared.js';
import type { KnowledgeService } from './knowledge.service.js';
import type {
  CreateKnowledgeInput,
  SearchKnowledgeDocumentsInput,
  UpdateKnowledgeInput,
  UploadedKnowledgeFile,
} from './knowledge.types.js';

const getRequiredAuthUser = (request: Request): AuthenticatedRequestUser => {
  if (!request.authUser) {
    throw new Error('Authenticated user is missing from request context');
  }

  return request.authUser;
};

const getRequiredKnowledgeId = (request: Request): string => {
  const knowledgeId = request.params.knowledgeId;
  return Array.isArray(knowledgeId) ? knowledgeId[0] ?? '' : knowledgeId;
};

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: KNOWLEDGE_UPLOAD_MAX_BYTES,
  },
});

const readUploadedFile = async (
  request: Request,
  response: Response,
): Promise<UploadedKnowledgeFile> => {
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
              message: '上传文件不能超过 10 MB',
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

export const createKnowledgeRouter = (
  knowledgeService: KnowledgeService,
  requireAuth: RequestHandler,
): Router => {
  const knowledgeRouter = Router();

  knowledgeRouter.use(requireAuth);

  knowledgeRouter.get(
    '/',
    asyncHandler(async (req, res) => {
      const result = await knowledgeService.listKnowledge({
        actor: getRequiredAuthUser(req),
      });

      res.json(result);
    }),
  );

  knowledgeRouter.post(
    '/search',
    asyncHandler(async (req, res) => {
      const result = await knowledgeService.searchDocuments(
        {
          actor: getRequiredAuthUser(req),
        },
        req.body as SearchKnowledgeDocumentsInput,
      );

      res.json(result);
    }),
  );

  knowledgeRouter.get(
    '/:knowledgeId',
    asyncHandler(async (req, res) => {
      const result = await knowledgeService.getKnowledgeDetail(
        {
          actor: getRequiredAuthUser(req),
        },
        getRequiredKnowledgeId(req),
      );

      res.json(result);
    }),
  );

  knowledgeRouter.post(
    '/',
    asyncHandler(async (req, res) => {
      const result = await knowledgeService.createKnowledge(
        {
          actor: getRequiredAuthUser(req),
        },
        req.body as CreateKnowledgeInput,
      );

      res.status(201).json(result);
    }),
  );

  knowledgeRouter.patch(
    '/:knowledgeId',
    asyncHandler(async (req, res) => {
      const result = await knowledgeService.updateKnowledge(
        {
          actor: getRequiredAuthUser(req),
        },
        getRequiredKnowledgeId(req),
        req.body as UpdateKnowledgeInput,
      );

      res.json(result);
    }),
  );

  knowledgeRouter.delete(
    '/:knowledgeId',
    asyncHandler(async (req, res) => {
      await knowledgeService.deleteKnowledge(
        {
          actor: getRequiredAuthUser(req),
        },
        getRequiredKnowledgeId(req),
      );

      res.status(204).send();
    }),
  );

  knowledgeRouter.post(
    '/:knowledgeId/documents',
    asyncHandler(async (req, res) => {
      const file = await readUploadedFile(req, res);
      const result = await knowledgeService.uploadDocument(
        {
          actor: getRequiredAuthUser(req),
        },
        getRequiredKnowledgeId(req),
        file,
      );

      res.status(201).json(result);
    }),
  );

  return knowledgeRouter;
};
