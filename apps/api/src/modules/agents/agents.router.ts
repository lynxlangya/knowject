import { Router } from 'express';
import type { Request, RequestHandler } from 'express';
import { asyncHandler } from '@lib/async-handler.js';
import { sendCreated, sendSuccess } from '@lib/api-response.js';
import { getRequiredAuthUser } from '@lib/request-auth.js';
import type { AgentsService } from './agents.service.js';
import type { CreateAgentInput, UpdateAgentInput } from './agents.types.js';

const getRequiredAgentId = (request: Request): string => {
  const agentId = request.params.agentId;
  return Array.isArray(agentId) ? agentId[0] ?? '' : agentId;
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

      sendSuccess(res, result);
    }),
  );

  agentsRouter.get(
    '/:agentId',
    asyncHandler(async (req, res) => {
      const result = await agentsService.getAgentDetail(
        {
          actor: getRequiredAuthUser(req),
        },
        getRequiredAgentId(req),
      );

      sendSuccess(res, result);
    }),
  );

  agentsRouter.post(
    '/',
    asyncHandler(async (req, res) => {
      const result = await agentsService.createAgent(
        {
          actor: getRequiredAuthUser(req),
        },
        req.body as CreateAgentInput,
      );

      sendCreated(res, result);
    }),
  );

  agentsRouter.patch(
    '/:agentId',
    asyncHandler(async (req, res) => {
      const result = await agentsService.updateAgent(
        {
          actor: getRequiredAuthUser(req),
        },
        getRequiredAgentId(req),
        req.body as UpdateAgentInput,
      );

      sendSuccess(res, result);
    }),
  );

  agentsRouter.delete(
    '/:agentId',
    asyncHandler(async (req, res) => {
      await agentsService.deleteAgent(
        {
          actor: getRequiredAuthUser(req),
        },
        getRequiredAgentId(req),
      );

      sendSuccess(res, null);
    }),
  );

  return agentsRouter;
};
