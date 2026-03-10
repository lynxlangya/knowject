import { Router, type Request } from 'express';
import type { RequestHandler } from 'express';
import { asyncHandler } from '@lib/async-handler.js';
import type { AuthenticatedRequestUser } from '@modules/auth/auth.types.js';
import type { MembersService } from './members.service.js';

const getRequiredAuthUser = (request: Request): AuthenticatedRequestUser => {
  if (!request.authUser) {
    throw new Error('Authenticated user is missing from request context');
  }

  return request.authUser;
};

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

      res.json(result);
    }),
  );

  return membersRouter;
};
