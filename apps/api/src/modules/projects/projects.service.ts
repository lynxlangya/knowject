import type { WithId } from "mongodb";
import {
  createValidationAppError,
  readOptionalStringField,
} from "@lib/validation.js";
import type { AuthRepository } from "@modules/auth/auth.repository.js";
import type { SkillBindingValidator } from "@modules/skills/skills.binding.js";
import {
  createProjectConversationService,
  type ProjectConversationService,
} from "./project-conversation-service.js";
import type {
  ProjectConversationRuntime,
} from "./project-conversation-runtime.js";
import { ProjectsRepository } from "./projects.repository.js";
import {
  buildProjectMemberProfileMap,
  createDefaultProjectConversation,
  createProjectNotFoundError,
  requireAdminProject,
  toProjectResponse,
} from "./projects.shared.js";
import type {
  CreateProjectInput,
  ProjectCommandContext,
  ProjectDocument,
  ProjectMemberDocument,
  ProjectResponse,
  ProjectsListResponse,
  UpdateProjectInput,
} from "./projects.types.js";

export interface ProjectsService extends ProjectConversationService {
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
  deleteProject(
    context: ProjectCommandContext,
    projectId: string,
  ): Promise<void>;
}

interface ProjectKnowledgeUsage {
  deleteProjectKnowledge(
    projectId: string,
    actor: ProjectCommandContext["actor"],
  ): Promise<void>;
}

const NOOP_PROJECT_KNOWLEDGE_USAGE: ProjectKnowledgeUsage = {
  deleteProjectKnowledge: async () => undefined,
};

const readOptionalStringArrayField = (
  value: unknown,
  field: "knowledgeBaseIds" | "agentIds" | "skillIds",
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
    .filter((item): item is string => typeof item === "string")
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
  "name" | "description" | "knowledgeBaseIds" | "agentIds" | "skillIds"
> => {
  const name = readOptionalStringField(input.name, "name");
  const description = readOptionalStringField(input.description, "description");
  const knowledgeBaseIds =
    readOptionalStringArrayField(input.knowledgeBaseIds, "knowledgeBaseIds") ??
    [];
  const agentIds =
    readOptionalStringArrayField(input.agentIds, "agentIds") ?? [];
  const skillIds =
    readOptionalStringArrayField(input.skillIds, "skillIds") ?? [];

  if (!name) {
    throw createValidationAppError("请输入项目名称", {
      name: "请输入项目名称",
    });
  }

  return {
    name,
    description: description ?? "",
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
    "name" | "description" | "knowledgeBaseIds" | "agentIds" | "skillIds"
  >
> => {
  const name = readOptionalStringField(input.name, "name");
  const description = readOptionalStringField(input.description, "description");
  const knowledgeBaseIds = readOptionalStringArrayField(
    input.knowledgeBaseIds,
    "knowledgeBaseIds",
  );
  const agentIds = readOptionalStringArrayField(input.agentIds, "agentIds");
  const skillIds = readOptionalStringArrayField(input.skillIds, "skillIds");

  if (
    name === undefined &&
    description === undefined &&
    knowledgeBaseIds === undefined &&
    agentIds === undefined &&
    skillIds === undefined
  ) {
    throw createValidationAppError("至少需要提供一个可更新字段", {
      name: "至少需要提供 name 或 description",
      description: "至少需要提供 name 或 description",
      knowledgeBaseIds: "至少需要提供一个可更新字段",
      agentIds: "至少需要提供一个可更新字段",
      skillIds: "至少需要提供一个可更新字段",
    });
  }

  if (input.name !== undefined && !name) {
    throw createValidationAppError("请输入项目名称", {
      name: "请输入项目名称",
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
      role: "admin",
      joinedAt,
    },
  ];
};

const applyProjectPatch = (
  project: WithId<ProjectDocument>,
  patch: Partial<
    Pick<
      ProjectDocument,
      "name" | "description" | "knowledgeBaseIds" | "agentIds" | "skillIds"
    >
  >,
): Pick<
  ProjectDocument,
  | "name"
  | "description"
  | "knowledgeBaseIds"
  | "agentIds"
  | "skillIds"
  | "updatedAt"
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
  skillBindingValidator,
  knowledgeUsage = NOOP_PROJECT_KNOWLEDGE_USAGE,
  conversationRuntime,
}: {
  repository: ProjectsRepository;
  authRepository: AuthRepository;
  skillBindingValidator: SkillBindingValidator;
  knowledgeUsage?: ProjectKnowledgeUsage;
  conversationRuntime?: ProjectConversationRuntime;
}): ProjectsService => {
  const conversationService = createProjectConversationService({
    repository,
    conversationRuntime,
  });

  return {
    ...conversationService,

    listProjects: async ({ actor }) => {
      const projects = await repository.listByMemberUserId(actor.id);
      const memberProfileMap = await buildProjectMemberProfileMap(
        authRepository,
        projects,
      );

      return {
        total: projects.length,
        items: projects.map((project) =>
          toProjectResponse(project, actor.id, memberProfileMap),
        ),
      };
    },

    createProject: async ({ actor }, input) => {
      const { name, description, knowledgeBaseIds, agentIds, skillIds } =
        validateCreateProjectInput(input);
      await skillBindingValidator.assertBindableSkillIds(skillIds, {
        fieldName: "skillIds",
      });
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

      const memberProfileMap = await buildProjectMemberProfileMap(
        authRepository,
        [project],
      );
      return toProjectResponse(project, actor.id, memberProfileMap);
    },

    updateProject: async ({ actor }, projectId, input) => {
      const currentProject = await requireAdminProject(
        repository,
        projectId,
        actor,
      );
      const patch = validateUpdateProjectInput(input);

      if (patch.skillIds !== undefined) {
        await skillBindingValidator.assertBindableSkillIds(patch.skillIds, {
          fieldName: "skillIds",
        });
      }

      const updatedProject = await repository.updateProject(
        currentProject._id.toHexString(),
        applyProjectPatch(currentProject, patch),
      );

      if (!updatedProject) {
        throw createProjectNotFoundError();
      }

      const memberProfileMap = await buildProjectMemberProfileMap(
        authRepository,
        [updatedProject],
      );
      return toProjectResponse(updatedProject, actor.id, memberProfileMap);
    },

    deleteProject: async ({ actor }, projectId) => {
      const project = await requireAdminProject(repository, projectId, actor);
      await knowledgeUsage.deleteProjectKnowledge(
        project._id.toHexString(),
        actor,
      );
      const deleted = await repository.deleteProject(project._id.toHexString());

      if (!deleted) {
        throw createProjectNotFoundError();
      }
    },
  };
};
