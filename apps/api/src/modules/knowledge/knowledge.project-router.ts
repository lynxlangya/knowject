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
import type { CreateKnowledgeInput } from './knowledge.types.js';

export const createProjectKnowledgeRouter = (
  knowledgeService: KnowledgeService,
  requireAuth: RequestHandler,
): Router => {
  const projectKnowledgeRouter = Router();

  projectKnowledgeRouter.use(requireAuth);

  projectKnowledgeRouter.get(
    '/:projectId/knowledge',
    asyncHandler(async (req, res) => {
      const result = await knowledgeService.listProjectKnowledge(
        {
          actor: getRequiredAuthUser(req),
        },
        getRequiredRouteParam(req, 'projectId'),
      );

      sendSuccess(res, result);
    }),
  );

  projectKnowledgeRouter.get(
    '/:projectId/knowledge/:knowledgeId',
    asyncHandler(async (req, res) => {
      const result = await knowledgeService.getProjectKnowledgeDetail(
        {
          actor: getRequiredAuthUser(req),
        },
        getRequiredRouteParam(req, 'projectId'),
        getRequiredRouteParam(req, 'knowledgeId'),
      );

      sendSuccess(res, result);
    }),
  );

  projectKnowledgeRouter.post(
    '/:projectId/knowledge',
    asyncHandler(async (req, res) => {
      const result = await knowledgeService.createProjectKnowledge(
        {
          actor: getRequiredAuthUser(req),
        },
        getRequiredRouteParam(req, 'projectId'),
        req.body as CreateKnowledgeInput,
      );

      sendCreated(res, result);
    }),
  );

  projectKnowledgeRouter.post(
    '/:projectId/knowledge/:knowledgeId/documents',
    asyncHandler(async (req, res) => {
      const file = await readUploadedKnowledgeFile(req, res);
      const result = await knowledgeService.uploadProjectKnowledgeDocument(
        {
          actor: getRequiredAuthUser(req),
        },
        getRequiredRouteParam(req, 'projectId'),
        getRequiredRouteParam(req, 'knowledgeId'),
        file,
      );

      sendCreated(res, result);
    }),
  );

  return projectKnowledgeRouter;
};
