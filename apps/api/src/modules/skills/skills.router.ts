import { Router } from 'express';
import type { RequestHandler } from 'express';
import { asyncHandler } from '@lib/async-handler.js';
import { sendSuccess } from '@lib/api-response.js';
import { getRequiredAuthUser } from '@lib/request-auth.js';
import type { SkillsService } from './skills.service.js';

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

      sendSuccess(res, result);
    }),
  );

  return skillsRouter;
};
