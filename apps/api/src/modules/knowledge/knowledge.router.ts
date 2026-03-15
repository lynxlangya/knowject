import { Router } from 'express';
import type { RequestHandler } from 'express';
import { asyncHandler } from '@lib/async-handler.js';
import { sendCreated, sendSuccess } from '@lib/api-response.js';
import { getRequiredAuthUser } from '@lib/request-auth.js';
import {
  getRequiredRouteParam,
  readUploadedKnowledgeFile,
} from './knowledge.router.shared.js';
import type { KnowledgeService } from './knowledge.service.js';
import type {
  CreateKnowledgeInput,
  SearchKnowledgeDocumentsInput,
  UpdateKnowledgeInput,
} from './knowledge.types.js';

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

      sendSuccess(res, result);
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

      sendSuccess(res, result);
    }),
  );

  knowledgeRouter.get(
    '/:knowledgeId',
    asyncHandler(async (req, res) => {
      const result = await knowledgeService.getKnowledgeDetail(
        {
          actor: getRequiredAuthUser(req),
        },
        getRequiredRouteParam(req, 'knowledgeId'),
      );

      sendSuccess(res, result);
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

      sendCreated(res, result);
    }),
  );

  knowledgeRouter.patch(
    '/:knowledgeId',
    asyncHandler(async (req, res) => {
      const result = await knowledgeService.updateKnowledge(
        {
          actor: getRequiredAuthUser(req),
        },
        getRequiredRouteParam(req, 'knowledgeId'),
        req.body as UpdateKnowledgeInput,
      );

      sendSuccess(res, result);
    }),
  );

  knowledgeRouter.delete(
    '/:knowledgeId',
    asyncHandler(async (req, res) => {
      await knowledgeService.deleteKnowledge(
        {
          actor: getRequiredAuthUser(req),
        },
        getRequiredRouteParam(req, 'knowledgeId'),
      );

      sendSuccess(res, null);
    }),
  );

  knowledgeRouter.post(
    '/:knowledgeId/documents',
    asyncHandler(async (req, res) => {
      const file = await readUploadedKnowledgeFile(req, res);
      const result = await knowledgeService.uploadDocument(
        {
          actor: getRequiredAuthUser(req),
        },
        getRequiredRouteParam(req, 'knowledgeId'),
        file,
      );

      sendCreated(res, result);
    }),
  );

  knowledgeRouter.post(
    '/:knowledgeId/documents/:documentId/retry',
    asyncHandler(async (req, res) => {
      await knowledgeService.retryDocument(
        {
          actor: getRequiredAuthUser(req),
        },
        getRequiredRouteParam(req, 'knowledgeId'),
        getRequiredRouteParam(req, 'documentId'),
      );

      sendSuccess(res, null);
    }),
  );

  knowledgeRouter.post(
    '/:knowledgeId/documents/:documentId/rebuild',
    asyncHandler(async (req, res) => {
      await knowledgeService.rebuildDocument(
        {
          actor: getRequiredAuthUser(req),
        },
        getRequiredRouteParam(req, 'knowledgeId'),
        getRequiredRouteParam(req, 'documentId'),
      );

      sendSuccess(res, null);
    }),
  );

  knowledgeRouter.post(
    '/:knowledgeId/rebuild',
    asyncHandler(async (req, res) => {
      await knowledgeService.rebuildKnowledge(
        {
          actor: getRequiredAuthUser(req),
        },
        getRequiredRouteParam(req, 'knowledgeId'),
      );

      sendSuccess(res, null);
    }),
  );

  knowledgeRouter.get(
    '/:knowledgeId/diagnostics',
    asyncHandler(async (req, res) => {
      const result = await knowledgeService.getKnowledgeDiagnostics(
        {
          actor: getRequiredAuthUser(req),
        },
        getRequiredRouteParam(req, 'knowledgeId'),
      );

      sendSuccess(res, result);
    }),
  );

  knowledgeRouter.delete(
    '/:knowledgeId/documents/:documentId',
    asyncHandler(async (req, res) => {
      await knowledgeService.deleteDocument(
        {
          actor: getRequiredAuthUser(req),
        },
        getRequiredRouteParam(req, 'knowledgeId'),
        getRequiredRouteParam(req, 'documentId'),
      );

      sendSuccess(res, null);
    }),
  );

  return knowledgeRouter;
};
