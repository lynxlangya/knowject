import { Router } from 'express';
import type { RequestHandler } from 'express';
import { asyncHandler } from '@lib/async-handler.js';
import { sendSuccess } from '@lib/api-response.js';
import { getRequiredAuthUser } from '@lib/request-auth.js';
import type { MembersService } from './members.service.js';

export const createMembersRouter = (
  membersService: MembersService,
  requireAuth: RequestHandler,
): Router => {
  const membersRouter = Router();

  membersRouter.get(
    '/',
    requireAuth,
    asyncHandler(async (req, res) => {
      const actor = getRequiredAuthUser(req);
      const result = await membersService.listVisibleMembers({ actor });

      sendSuccess(res, result);
    }),
  );

  return membersRouter;
};
