import { Router, type Request } from 'express';
import type { RequestHandler } from 'express';
import { asyncHandler } from '@lib/async-handler.js';
import { sendCreated, sendSuccess } from '@lib/api-response.js';
import { getRequiredAuthUser } from '@lib/request-auth.js';
import type { SkillsService } from './skills.service.js';
import type {
  CreateSkillInput,
  ImportSkillInput,
  ListSkillsInput,
  UpdateSkillInput,
} from './skills.types.js';

const getRequiredSkillId = (request: Request): string => {
  const skillId = request.params.skillId;
  return Array.isArray(skillId) ? skillId[0] ?? '' : skillId;
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
      const result = await skillsService.listSkills(
        {
          actor: getRequiredAuthUser(req),
        },
        req.query as ListSkillsInput,
      );

      sendSuccess(res, result);
    }),
  );

  skillsRouter.get(
    '/:skillId',
    asyncHandler(async (req, res) => {
      const result = await skillsService.getSkillDetail(
        {
          actor: getRequiredAuthUser(req),
        },
        getRequiredSkillId(req),
      );

      sendSuccess(res, result);
    }),
  );

  skillsRouter.post(
    '/',
    asyncHandler(async (req, res) => {
      const result = await skillsService.createSkill(
        {
          actor: getRequiredAuthUser(req),
        },
        req.body as CreateSkillInput,
      );

      sendCreated(res, result);
    }),
  );

  skillsRouter.post(
    '/import',
    asyncHandler(async (req, res) => {
      const result = await skillsService.importSkill(
        {
          actor: getRequiredAuthUser(req),
        },
        req.body as ImportSkillInput,
      );

      sendSuccess(res, result, {
        statusCode: 'skill' in result ? 201 : 200,
      });
    }),
  );

  skillsRouter.patch(
    '/:skillId',
    asyncHandler(async (req, res) => {
      const result = await skillsService.updateSkill(
        {
          actor: getRequiredAuthUser(req),
        },
        getRequiredSkillId(req),
        req.body as UpdateSkillInput,
      );

      sendSuccess(res, result);
    }),
  );

  skillsRouter.delete(
    '/:skillId',
    asyncHandler(async (req, res) => {
      await skillsService.deleteSkill(
        {
          actor: getRequiredAuthUser(req),
        },
        getRequiredSkillId(req),
      );

      sendSuccess(res, null);
    }),
  );

  return skillsRouter;
};
