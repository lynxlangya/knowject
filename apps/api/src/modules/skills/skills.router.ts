import { Router, type Request } from 'express';
import type { RequestHandler } from 'express';
import { asyncHandler } from '@lib/async-handler.js';
import type { AuthenticatedRequestUser } from '@modules/auth/auth.types.js';
import type { SkillsService } from './skills.service.js';

const getRequiredAuthUser = (request: Request): AuthenticatedRequestUser => {
  if (!request.authUser) {
    throw new Error('Authenticated user is missing from request context');
  }

  return request.authUser;
};

export const createSkillsRouter = (
  skillsService: SkillsService,
  requireAuth: RequestHandler,
): Router => {
  const skillsRouter = Router();

  skillsRouter.use(requireAuth);

  skillsRouter.get(
    '/',
    asyncHandler(async (req, res) => {
      const result = await skillsService.listSkills({
        actor: getRequiredAuthUser(req),
      });

      res.json(result);
    }),
  );

  return skillsRouter;
};
