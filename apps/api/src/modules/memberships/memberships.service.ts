import { AppError } from "@lib/app-error.js";
import {
  createRequiredFieldError,
  createValidationAppError,
} from "@lib/validation.js";
import type { AuthRepository } from "@modules/auth/auth.repository.js";
import type {
  ProjectCommandContext,
  ProjectDocument,
  ProjectRole,
  ProjectResponse,
} from "@modules/projects/projects.types.js";
import type { ProjectsRepository } from "@modules/projects/projects.repository.js";
import {
  buildProjectMemberProfileMap,
  createProjectNotFoundError,
  getProjectMember,
  requireAdminProject,
  toProjectResponse,
} from "@modules/projects/projects.shared.js";
import type {
  AddProjectMemberInput,
  ProjectMemberRemovalResponse,
  UpdateProjectMemberInput,
} from "./memberships.types.js";

export interface MembershipsService {
  addProjectMember(
    context: ProjectCommandContext,
    projectId: string,
    input: AddProjectMemberInput,
  ): Promise<ProjectResponse>;
  updateProjectMemberRole(
    context: ProjectCommandContext,
    projectId: string,
    userId: string,
    input: UpdateProjectMemberInput,
  ): Promise<ProjectResponse>;
  removeProjectMember(
    context: ProjectCommandContext,
    projectId: string,
    userId: string,
  ): Promise<ProjectMemberRemovalResponse>;
}

const createUserNotFoundError = (): AppError => {
  return new AppError({
    statusCode: 404,
    code: "AUTH_USER_NOT_FOUND",
    message: "目标用户不存在",
  });
};

const createProjectMemberNotFoundError = (): AppError => {
  return new AppError({
    statusCode: 404,
    code: "PROJECT_MEMBER_NOT_FOUND",
    message: "项目成员不存在",
  });
};

const createProjectMemberAlreadyExistsError = (): AppError => {
  return new AppError({
    statusCode: 409,
    code: "PROJECT_MEMBER_ALREADY_EXISTS",
    message: "该用户已在当前项目中",
  });
};

const createLastAdminRequiredError = (): AppError => {
  return new AppError({
    statusCode: 409,
    code: "PROJECT_LAST_ADMIN_REQUIRED",
    message: "项目至少需要保留一位 admin",
  });
};

const readRequiredRole = (value: unknown): ProjectRole => {
  if (value === "admin" || value === "member") {
    return value;
  }

  throw createValidationAppError("role 必须为 admin 或 member", {
    role: "role 必须为 admin 或 member",
  });
};

const readRequiredUsername = (value: unknown): string => {
  if (typeof value !== "string") {
    throw new AppError(createRequiredFieldError("username"));
  }

  const username = value.trim();
  if (!username) {
    throw new AppError(createRequiredFieldError("username"));
  }

  return username;
};

const ensureAdminRetained = (
  currentProject: Pick<ProjectDocument, "members">,
  nextMembers: ProjectDocument["members"],
  targetUserId: string,
): void => {
  const currentMember = getProjectMember(currentProject, targetUserId);
  if (!currentMember || currentMember.role !== "admin") {
    return;
  }

  const adminCount = currentProject.members.filter(
    (member) => member.role === "admin",
  ).length;
  const nextTargetMember =
    nextMembers.find((member) => member.userId === targetUserId) ?? null;

  if (adminCount === 1 && nextTargetMember?.role !== "admin") {
    throw createLastAdminRequiredError();
  }
};

const persistProjectMembers = async (
  projectsRepository: ProjectsRepository,
  project: ProjectDocument & { _id: NonNullable<ProjectDocument["_id"]> },
  nextMembers: ProjectDocument["members"],
): Promise<ProjectDocument & { _id: NonNullable<ProjectDocument["_id"]> }> => {
  const updatedProject = await projectsRepository.replaceProjectMembers(
    project._id.toHexString(),
    nextMembers,
    new Date(),
  );

  if (!updatedProject) {
    throw createProjectNotFoundError();
  }

  return updatedProject;
};

const toProjectMutationResponse = async (
  authRepository: AuthRepository,
  project: ProjectDocument & { _id: NonNullable<ProjectDocument["_id"]> },
  actorId: string,
): Promise<ProjectResponse> => {
  const memberProfileMap = await buildProjectMemberProfileMap(authRepository, [
    project,
  ]);
  return toProjectResponse(project, actorId, memberProfileMap);
};

export const createMembershipsService = ({
  projectsRepository,
  authRepository,
}: {
  projectsRepository: ProjectsRepository;
  authRepository: AuthRepository;
}): MembershipsService => {
  return {
    addProjectMember: async ({ actor }, projectId, input) => {
      const project = await requireAdminProject(
        projectsRepository,
        projectId,
        actor,
      );
      const username = readRequiredUsername(input.username);
      const role = readRequiredRole(input.role);
      const user = await authRepository.findByUsername(username);

      if (!user) {
        throw createUserNotFoundError();
      }

      const userId = user._id.toHexString();
      if (getProjectMember(project, userId)) {
        throw createProjectMemberAlreadyExistsError();
      }

      const updatedProject = await persistProjectMembers(
        projectsRepository,
        project,
        [
          ...project.members,
          {
            userId,
            role,
            joinedAt: new Date(),
          },
        ],
      );

      return toProjectMutationResponse(
        authRepository,
        updatedProject,
        actor.id,
      );
    },

    updateProjectMemberRole: async ({ actor }, projectId, userId, input) => {
      const project = await requireAdminProject(
        projectsRepository,
        projectId,
        actor,
      );
      const role = readRequiredRole(input.role);
      const currentMember = getProjectMember(project, userId);

      if (!currentMember) {
        throw createProjectMemberNotFoundError();
      }

      if (currentMember.role === role) {
        const memberProfileMap = await buildProjectMemberProfileMap(
          authRepository,
          [project],
        );
        return toProjectResponse(project, actor.id, memberProfileMap);
      }

      const nextMembers = project.members.map((member) =>
        member.userId === userId ? { ...member, role } : member,
      );

      ensureAdminRetained(project, nextMembers, userId);

      const updatedProject = await persistProjectMembers(
        projectsRepository,
        project,
        nextMembers,
      );

      return toProjectMutationResponse(
        authRepository,
        updatedProject,
        actor.id,
      );
    },

    removeProjectMember: async ({ actor }, projectId, userId) => {
      const project = await requireAdminProject(
        projectsRepository,
        projectId,
        actor,
      );
      const currentMember = getProjectMember(project, userId);

      if (!currentMember) {
        throw createProjectMemberNotFoundError();
      }

      const nextMembers = project.members.filter(
        (member) => member.userId !== userId,
      );
      ensureAdminRetained(project, nextMembers, userId);

      const updatedProject = await persistProjectMembers(
        projectsRepository,
        project,
        nextMembers,
      );
      const removedCurrentUser = actor.id === userId;

      if (removedCurrentUser) {
        return {
          project: null,
          removedCurrentUser: true,
        };
      }

      return {
        project: await toProjectMutationResponse(
          authRepository,
          updatedProject,
          actor.id,
        ),
        removedCurrentUser: false,
      };
    },
  };
};
