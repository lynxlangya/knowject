import type { WithId } from 'mongodb';
import { AppError } from '@lib/app-error.js';
import type { AuthRepository } from '@modules/auth/auth.repository.js';
import { ProjectsRepository } from './projects.repository.js';
import {
  buildProjectMemberProfileMap,
  createProjectNotFoundError,
  requireAdminProject,
  toProjectResponse,
} from './projects.shared.js';
import type {
  CreateProjectInput,
  ProjectCommandContext,
  ProjectDocument,
  ProjectMemberDocument,
  ProjectResponse,
  ProjectsListResponse,
  UpdateProjectInput,
} from './projects.types.js';

export interface ProjectsService {
  listProjects(context: ProjectCommandContext): Promise<ProjectsListResponse>;
  createProject(
    context: ProjectCommandContext,
    input: CreateProjectInput,
  ): Promise<ProjectResponse>;
  updateProject(
    context: ProjectCommandContext,
    projectId: string,
    input: UpdateProjectInput,
  ): Promise<ProjectResponse>;
  deleteProject(context: ProjectCommandContext, projectId: string): Promise<void>;
}

const createValidationError = (
  message: string,
  fields: Record<string, string>,
): AppError => {
  return new AppError({
    statusCode: 400,
    code: 'VALIDATION_ERROR',
    message,
    details: {
      fields,
    },
  });
};

const readOptionalStringField = (
  value: unknown,
  field: 'name' | 'description',
): string | undefined => {
  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== 'string') {
    throw createValidationError(`${field} 必须为字符串`, {
      [field]: `${field} 必须为字符串`,
    });
  }

  return value.trim();
};

const validateCreateProjectInput = (
  input: CreateProjectInput,
): Pick<ProjectDocument, 'name' | 'description'> => {
  const name = readOptionalStringField(input.name, 'name');
  const description = readOptionalStringField(input.description, 'description');

  if (!name) {
    throw createValidationError('请输入项目名称', {
      name: '请输入项目名称',
    });
  }

  return {
    name,
    description: description ?? '',
  };
};

const validateUpdateProjectInput = (
  input: UpdateProjectInput,
): Partial<Pick<ProjectDocument, 'name' | 'description'>> => {
  const name = readOptionalStringField(input.name, 'name');
  const description = readOptionalStringField(input.description, 'description');

  if (name === undefined && description === undefined) {
    throw createValidationError('至少需要提供一个可更新字段', {
      name: '至少需要提供 name 或 description',
      description: '至少需要提供 name 或 description',
    });
  }

  if (input.name !== undefined && !name) {
    throw createValidationError('请输入项目名称', {
      name: '请输入项目名称',
    });
  }

  return {
    ...(name !== undefined ? { name } : {}),
    ...(description !== undefined ? { description } : {}),
  };
};

const buildInitialMembers = (actorId: string): ProjectMemberDocument[] => {
  const joinedAt = new Date();

  return [
    {
      userId: actorId,
      role: 'admin',
      joinedAt,
    },
  ];
};

const applyProjectPatch = (
  project: WithId<ProjectDocument>,
  patch: Partial<Pick<ProjectDocument, 'name' | 'description'>>,
): Pick<ProjectDocument, 'name' | 'description' | 'updatedAt'> => {
  return {
    name: patch.name ?? project.name,
    description: patch.description ?? project.description,
    updatedAt: new Date(),
  };
};

export const createProjectsService = ({
  repository,
  authRepository,
}: {
  repository: ProjectsRepository;
  authRepository: AuthRepository;
}): ProjectsService => {
  return {
    listProjects: async ({ actor }) => {
      const projects = await repository.listByMemberUserId(actor.id);
      const memberProfileMap = await buildProjectMemberProfileMap(authRepository, projects);

      return {
        total: projects.length,
        items: projects.map((project) => toProjectResponse(project, actor.id, memberProfileMap)),
      };
    },

    createProject: async ({ actor }, input) => {
      const { name, description } = validateCreateProjectInput(input);
      const now = new Date();
      const project = await repository.createProject({
        name,
        description,
        ownerId: actor.id,
        members: buildInitialMembers(actor.id),
        createdAt: now,
        updatedAt: now,
      });

      const memberProfileMap = await buildProjectMemberProfileMap(authRepository, [project]);
      return toProjectResponse(project, actor.id, memberProfileMap);
    },

    updateProject: async ({ actor }, projectId, input) => {
      const currentProject = await requireAdminProject(repository, projectId, actor);
      const patch = validateUpdateProjectInput(input);
      const updatedProject = await repository.updateProject(
        currentProject._id.toHexString(),
        applyProjectPatch(currentProject, patch),
      );

      if (!updatedProject) {
        throw createProjectNotFoundError();
      }

      const memberProfileMap = await buildProjectMemberProfileMap(authRepository, [updatedProject]);
      return toProjectResponse(updatedProject, actor.id, memberProfileMap);
    },

    deleteProject: async ({ actor }, projectId) => {
      const project = await requireAdminProject(repository, projectId, actor);
      const deleted = await repository.deleteProject(project._id.toHexString());

      if (!deleted) {
        throw createProjectNotFoundError();
      }
    },
  };
};
