import type { WithId } from 'mongodb';
import {
  createValidationAppError,
  readOptionalStringField,
} from '@lib/validation.js';
import type { AuthRepository } from '@modules/auth/auth.repository.js';
import { ProjectsRepository } from './projects.repository.js';
import {
  buildProjectMemberProfileMap,
  createDefaultProjectConversation,
  createProjectConversationNotFoundError,
  createProjectNotFoundError,
  getProjectConversation,
  requireAdminProject,
  requireVisibleProject,
  toProjectConversationDetailResponse,
  toProjectConversationSummaryResponse,
  toProjectResponse,
} from './projects.shared.js';
import type {
  CreateProjectInput,
  ProjectCommandContext,
  ProjectConversationDetailEnvelope,
  ProjectConversationListResponse,
  ProjectDocument,
  ProjectMemberDocument,
  ProjectResponse,
  ProjectsListResponse,
  UpdateProjectInput,
} from './projects.types.js';

export interface ProjectsService {
  listProjects(context: ProjectCommandContext): Promise<ProjectsListResponse>;
  listProjectConversations(
    context: ProjectCommandContext,
    projectId: string,
  ): Promise<ProjectConversationListResponse>;
  getProjectConversationDetail(
    context: ProjectCommandContext,
    projectId: string,
    conversationId: string,
  ): Promise<ProjectConversationDetailEnvelope>;
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

const readOptionalStringArrayField = (
  value: unknown,
  field: 'knowledgeBaseIds' | 'agentIds' | 'skillIds',
): string[] | undefined => {
  if (value === undefined) {
    return undefined;
  }

  if (!Array.isArray(value)) {
    throw createValidationAppError(`${field} 必须为字符串数组`, {
      [field]: `${field} 必须为字符串数组`,
    });
  }

  const normalizedValues = value
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim())
    .filter(Boolean);

  if (normalizedValues.length !== value.length) {
    throw createValidationAppError(`${field} 必须为字符串数组`, {
      [field]: `${field} 必须为字符串数组`,
    });
  }

  return Array.from(new Set(normalizedValues));
};

const validateCreateProjectInput = (
  input: CreateProjectInput,
): Pick<
  ProjectDocument,
  'name' | 'description' | 'knowledgeBaseIds' | 'agentIds' | 'skillIds'
> => {
  const name = readOptionalStringField(input.name, 'name');
  const description = readOptionalStringField(input.description, 'description');
  const knowledgeBaseIds =
    readOptionalStringArrayField(input.knowledgeBaseIds, 'knowledgeBaseIds') ?? [];
  const agentIds = readOptionalStringArrayField(input.agentIds, 'agentIds') ?? [];
  const skillIds = readOptionalStringArrayField(input.skillIds, 'skillIds') ?? [];

  if (!name) {
    throw createValidationAppError('请输入项目名称', {
      name: '请输入项目名称',
    });
  }

  return {
    name,
    description: description ?? '',
    knowledgeBaseIds,
    agentIds,
    skillIds,
  };
};

const validateUpdateProjectInput = (
  input: UpdateProjectInput,
): Partial<
  Pick<
    ProjectDocument,
    'name' | 'description' | 'knowledgeBaseIds' | 'agentIds' | 'skillIds'
  >
> => {
  const name = readOptionalStringField(input.name, 'name');
  const description = readOptionalStringField(input.description, 'description');
  const knowledgeBaseIds = readOptionalStringArrayField(
    input.knowledgeBaseIds,
    'knowledgeBaseIds',
  );
  const agentIds = readOptionalStringArrayField(input.agentIds, 'agentIds');
  const skillIds = readOptionalStringArrayField(input.skillIds, 'skillIds');

  if (
    name === undefined &&
    description === undefined &&
    knowledgeBaseIds === undefined &&
    agentIds === undefined &&
    skillIds === undefined
  ) {
    throw createValidationAppError('至少需要提供一个可更新字段', {
      name: '至少需要提供 name 或 description',
      description: '至少需要提供 name 或 description',
      knowledgeBaseIds: '至少需要提供一个可更新字段',
      agentIds: '至少需要提供一个可更新字段',
      skillIds: '至少需要提供一个可更新字段',
    });
  }

  if (input.name !== undefined && !name) {
    throw createValidationAppError('请输入项目名称', {
      name: '请输入项目名称',
    });
  }

  return {
    ...(name !== undefined ? { name } : {}),
    ...(description !== undefined ? { description } : {}),
    ...(knowledgeBaseIds !== undefined ? { knowledgeBaseIds } : {}),
    ...(agentIds !== undefined ? { agentIds } : {}),
    ...(skillIds !== undefined ? { skillIds } : {}),
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
  patch: Partial<
    Pick<
      ProjectDocument,
      'name' | 'description' | 'knowledgeBaseIds' | 'agentIds' | 'skillIds'
    >
  >,
): Pick<
  ProjectDocument,
  'name' | 'description' | 'knowledgeBaseIds' | 'agentIds' | 'skillIds' | 'updatedAt'
> => {
  return {
    name: patch.name ?? project.name,
    description: patch.description ?? project.description,
    knowledgeBaseIds: patch.knowledgeBaseIds ?? project.knowledgeBaseIds ?? [],
    agentIds: patch.agentIds ?? project.agentIds ?? [],
    skillIds: patch.skillIds ?? project.skillIds ?? [],
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

    listProjectConversations: async ({ actor }, projectId) => {
      const project = await requireVisibleProject(repository, projectId, actor);
      const conversations = project.conversations?.length
        ? [...project.conversations].sort(
            (left, right) => right.updatedAt.getTime() - left.updatedAt.getTime(),
          )
        : [createDefaultProjectConversation(project)];

      return {
        total: conversations.length,
        items: conversations.map((conversation) =>
          toProjectConversationSummaryResponse(project._id.toHexString(), conversation),
        ),
      };
    },

    getProjectConversationDetail: async ({ actor }, projectId, conversationId) => {
      const project = await requireVisibleProject(repository, projectId, actor);
      const conversation = getProjectConversation(project, conversationId);

      if (!conversation) {
        throw createProjectConversationNotFoundError();
      }

      return {
        conversation: toProjectConversationDetailResponse(
          project._id.toHexString(),
          conversation,
        ),
      };
    },

    createProject: async ({ actor }, input) => {
      const {
        name,
        description,
        knowledgeBaseIds,
        agentIds,
        skillIds,
      } = validateCreateProjectInput(input);
      const now = new Date();
      const project = await repository.createProject({
        name,
        description,
        ownerId: actor.id,
        members: buildInitialMembers(actor.id),
        knowledgeBaseIds,
        agentIds,
        skillIds,
        conversations: [createDefaultProjectConversation({ name })],
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
