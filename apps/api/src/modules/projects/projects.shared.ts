import type { WithId } from 'mongodb';
import { AppError } from '@lib/app-error.js';
import type { AuthRepository } from '@modules/auth/auth.repository.js';
import type { AuthenticatedRequestUser, AuthUserProfile } from '@modules/auth/auth.types.js';
import type { ProjectsRepository } from './projects.repository.js';
import type { ProjectDocument, ProjectMemberDocument, ProjectResponse } from './projects.types.js';

type ProjectMemberProfileMap = Map<string, AuthUserProfile>;

const createUnknownMemberProfile = (userId: string): AuthUserProfile => {
  return {
    id: userId,
    username: 'unknown',
    name: '未知成员',
  };
};

export const createProjectNotFoundError = (): AppError => {
  return new AppError({
    statusCode: 404,
    code: 'PROJECT_NOT_FOUND',
    message: '项目不存在或当前用户不可见',
  });
};

export const createProjectForbiddenError = (): AppError => {
  return new AppError({
    statusCode: 403,
    code: 'PROJECT_FORBIDDEN',
    message: '当前用户没有该项目的管理权限',
  });
};

export const getProjectMember = (
  project: Pick<ProjectDocument, 'members'>,
  userId: string,
): ProjectMemberDocument | null => {
  return project.members.find((member) => member.userId === userId) ?? null;
};

export const requireVisibleProject = async (
  repository: ProjectsRepository,
  projectId: string,
  actor: AuthenticatedRequestUser,
): Promise<WithId<ProjectDocument>> => {
  const project = await repository.findById(projectId);
  if (!project) {
    throw createProjectNotFoundError();
  }

  if (!getProjectMember(project, actor.id)) {
    throw createProjectNotFoundError();
  }

  return project;
};

export const requireAdminProject = async (
  repository: ProjectsRepository,
  projectId: string,
  actor: AuthenticatedRequestUser,
): Promise<WithId<ProjectDocument>> => {
  const project = await requireVisibleProject(repository, projectId, actor);
  const member = getProjectMember(project, actor.id);

  if (!member || member.role !== 'admin') {
    throw createProjectForbiddenError();
  }

  return project;
};

export const buildProjectMemberProfileMap = async (
  authRepository: AuthRepository,
  projects: Array<Pick<ProjectDocument, 'members'>>,
): Promise<ProjectMemberProfileMap> => {
  const userIds = Array.from(
    new Set(projects.flatMap((project) => project.members.map((member) => member.userId))),
  );
  const profiles = await authRepository.findProfilesByIds(userIds);

  return new Map(profiles.map((profile) => [profile.id, profile] as const));
};

export const toProjectResponse = (
  project: WithId<ProjectDocument>,
  actorId: string,
  memberProfileMap: ProjectMemberProfileMap,
): ProjectResponse => {
  const actorMember = getProjectMember(project, actorId);
  if (!actorMember) {
    throw new Error('Current actor is not a member of the project');
  }

  return {
    id: project._id.toHexString(),
    name: project.name,
    description: project.description,
    ownerId: project.ownerId,
    members: project.members.map((projectMember) => {
      const profile =
        memberProfileMap.get(projectMember.userId) ??
        createUnknownMemberProfile(projectMember.userId);

      return {
        userId: projectMember.userId,
        username: profile.username,
        name: profile.name,
        role: projectMember.role,
        joinedAt: projectMember.joinedAt.toISOString(),
      };
    }),
    createdAt: project.createdAt.toISOString(),
    updatedAt: project.updatedAt.toISOString(),
    currentUserRole: actorMember.role,
  };
};
