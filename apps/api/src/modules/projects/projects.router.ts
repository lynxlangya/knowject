import { Router, type Request } from 'express';
import { asyncHandler } from '@lib/async-handler.js';
import type { RequestHandler } from 'express';
import { sendCreated, sendSuccess } from '@lib/api-response.js';
import type { AuthenticatedRequestUser } from '@modules/auth/auth.types.js';
import type { ProjectsService } from './projects.service.js';
import type { CreateProjectInput, UpdateProjectInput } from './projects.types.js';

const getRequiredAuthUser = (request: Request): AuthenticatedRequestUser => {
  if (!request.authUser) {
    throw new Error('Authenticated user is missing from request context');
  }

  return request.authUser;
};

const getRequiredProjectId = (request: Request): string => {
  const projectId = request.params.projectId;

  return Array.isArray(projectId) ? projectId[0] ?? '' : projectId;
};

export const createProjectsRouter = (
  projectsService: ProjectsService,
  requireAuth: RequestHandler,
): Router => {
  const projectsRouter = Router();

  projectsRouter.use(requireAuth);

  projectsRouter.get(
    '/',
    asyncHandler(async (req, res) => {
      const result = await projectsService.listProjects({
        actor: getRequiredAuthUser(req),
      });

      sendSuccess(res, result);
    }),
  );

  projectsRouter.post(
    '/',
    asyncHandler(async (req, res) => {
      const project = await projectsService.createProject(
        {
          actor: getRequiredAuthUser(req),
        },
        req.body as CreateProjectInput,
      );

      sendCreated(res, {
        project,
      });
    }),
  );

  projectsRouter.patch(
    '/:projectId',
    asyncHandler(async (req, res) => {
      const project = await projectsService.updateProject(
        {
          actor: getRequiredAuthUser(req),
        },
        getRequiredProjectId(req),
        req.body as UpdateProjectInput,
      );

      sendSuccess(res, {
        project,
      });
    }),
  );

  projectsRouter.delete(
    '/:projectId',
    asyncHandler(async (req, res) => {
      await projectsService.deleteProject(
        {
          actor: getRequiredAuthUser(req),
        },
        getRequiredProjectId(req),
      );

      sendSuccess(res, null);
    }),
  );

  return projectsRouter;
};
