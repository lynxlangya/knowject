import { Router, type Request } from 'express';
import type { RequestHandler } from 'express';
import { asyncHandler } from '@lib/async-handler.js';
import type { AuthenticatedRequestUser } from '@modules/auth/auth.types.js';
import type { KnowledgeService } from './knowledge.service.js';

const getRequiredAuthUser = (request: Request): AuthenticatedRequestUser => {
  if (!request.authUser) {
    throw new Error('Authenticated user is missing from request context');
  }

  return request.authUser;
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

  return knowledgeRouter;
};
