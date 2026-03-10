import { Router, type Request } from "express";
import type { RequestHandler } from "express";
import { asyncHandler } from "@lib/async-handler.js";
import type { AuthenticatedRequestUser } from "@modules/auth/auth.types.js";
import type { MembershipsService } from "./memberships.service.js";
import type {
  AddProjectMemberInput,
  UpdateProjectMemberInput,
} from "./memberships.types.js";

const getRequiredAuthUser = (request: Request): AuthenticatedRequestUser => {
  if (!request.authUser) {
    throw new Error("Authenticated user is missing from request context");
  }

  return request.authUser;
};

const getRouteParam = (
  request: Request,
  key: "projectId" | "userId",
): string => {
  const value = request.params[key];
  return Array.isArray(value) ? (value[0] ?? "") : value;
};

export const createMembershipsRouter = (
  membershipsService: MembershipsService,
  requireAuth: RequestHandler,
): Router => {
  const membershipsRouter = Router();

  membershipsRouter.use(requireAuth);

  membershipsRouter.post(
    "/:projectId/members",
    asyncHandler(async (req, res) => {
      const project = await membershipsService.addProjectMember(
        {
          actor: getRequiredAuthUser(req),
        },
        getRouteParam(req, "projectId"),
        req.body as AddProjectMemberInput,
      );

      res.status(201).json({
        project,
      });
    }),
  );

  membershipsRouter.patch(
    "/:projectId/members/:userId",
    asyncHandler(async (req, res) => {
      const project = await membershipsService.updateProjectMemberRole(
        {
          actor: getRequiredAuthUser(req),
        },
        getRouteParam(req, "projectId"),
        getRouteParam(req, "userId"),
        req.body as UpdateProjectMemberInput,
      );

      res.json({
        project,
      });
    }),
  );

  membershipsRouter.delete(
    "/:projectId/members/:userId",
    asyncHandler(async (req, res) => {
      const result = await membershipsService.removeProjectMember(
        {
          actor: getRequiredAuthUser(req),
        },
        getRouteParam(req, "projectId"),
        getRouteParam(req, "userId"),
      );

      res.json(result);
    }),
  );

  return membershipsRouter;
};
