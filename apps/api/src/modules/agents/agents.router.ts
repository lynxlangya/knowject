import { Router } from 'express';
import type { RequestHandler } from 'express';
import { asyncHandler } from '@lib/async-handler.js';
import { sendSuccess } from '@lib/api-response.js';
import { getRequiredAuthUser } from '@lib/request-auth.js';
import type { AgentsService } from './agents.service.js';

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

      sendSuccess(res, result);
    }),
  );

  return agentsRouter;
};
