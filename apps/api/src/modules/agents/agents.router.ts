import { Router, type Request } from 'express';
import type { RequestHandler } from 'express';
import { asyncHandler } from '@lib/async-handler.js';
import type { AuthenticatedRequestUser } from '@modules/auth/auth.types.js';
import type { AgentsService } from './agents.service.js';

const getRequiredAuthUser = (request: Request): AuthenticatedRequestUser => {
  if (!request.authUser) {
    throw new Error('Authenticated user is missing from request context');
  }

  return request.authUser;
};

export const createAgentsRouter = (
  agentsService: AgentsService,
  requireAuth: RequestHandler,
): Router => {
  const agentsRouter = Router();

  agentsRouter.use(requireAuth);

  agentsRouter.get(
    '/',
    asyncHandler(async (req, res) => {
      const result = await agentsService.listAgents({
        actor: getRequiredAuthUser(req),
      });

      res.json(result);
    }),
  );

  return agentsRouter;
};
