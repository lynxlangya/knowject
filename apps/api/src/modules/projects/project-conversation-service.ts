import { AppError } from "@lib/app-error.js";
import { readMutationInput } from "@lib/mutation-input.js";
import {
  createValidationAppError,
  readOptionalStringField,
} from "@lib/validation.js";
import { ProjectsRepository } from "./projects.repository.js";
import {
  createProjectConversationTurnService,
  getRequiredPersistedConversation,
  throwConversationPersistenceTargetError,
} from "./project-conversation-turn.service.js";
import {
  createDefaultProjectConversation,
  createProjectConversation,
  createProjectConversationNotFoundError,
  createProjectNotFoundError,
  getProjectConversation,
  getProjectConversations,
  requireVisibleProject,
  toProjectConversationDetailResponse,
  toProjectConversationSummaryResponse,
} from "./projects.shared.js";
import {
  DEFAULT_PROJECT_CONVERSATION_TITLE,
  type ProjectConversationRuntime,
} from "./project-conversation-runtime.js";
import type {
  CreateProjectConversationInput,
  CreateProjectConversationMessageInput,
  ProjectCommandContext,
  ProjectConversationDetailEnvelope,
  ProjectConversationListResponse,
  ProjectConversationStreamOptions,
  UpdateProjectConversationInput,
} from "./projects.types.js";

export interface ProjectConversationService {
  listProjectConversations(
    context: ProjectCommandContext,
    projectId: string,
  ): Promise<ProjectConversationListResponse>;
  createProjectConversation(
    context: ProjectCommandContext,
    projectId: string,
    input: CreateProjectConversationInput,
  ): Promise<ProjectConversationDetailEnvelope>;
  updateProjectConversation(
    context: ProjectCommandContext,
    projectId: string,
    conversationId: string,
    input: UpdateProjectConversationInput,
  ): Promise<ProjectConversationDetailEnvelope>;
  createProjectConversationMessage(
    context: ProjectCommandContext,
    projectId: string,
    conversationId: string,
    input: CreateProjectConversationMessageInput,
  ): Promise<ProjectConversationDetailEnvelope>;
  streamProjectConversationMessage(
    context: ProjectCommandContext,
    projectId: string,
    conversationId: string,
    input: CreateProjectConversationMessageInput,
    options: ProjectConversationStreamOptions,
  ): Promise<void>;
  deleteProjectConversation(
    context: ProjectCommandContext,
    projectId: string,
    conversationId: string,
  ): Promise<void>;
  getProjectConversationDetail(
    context: ProjectCommandContext,
    projectId: string,
    conversationId: string,
  ): Promise<ProjectConversationDetailEnvelope>;
}

const createProjectConversationLastThreadForbiddenError = (): AppError => {
  return new AppError({
    statusCode: 409,
    code: "PROJECT_CONVERSATION_LAST_THREAD_FORBIDDEN",
    message: "项目至少保留一个对话线程",
  });
};

const validateCreateProjectConversationInput = (
  input: CreateProjectConversationInput,
): {
  title: string;
} => {
  const normalizedInput = readMutationInput(input, {
    allowUndefined: true,
  });
  const title = readOptionalStringField(normalizedInput.title, "title");

  return {
    title: title || DEFAULT_PROJECT_CONVERSATION_TITLE,
  };
};

const validateUpdateProjectConversationInput = (
  input: UpdateProjectConversationInput,
): {
  title: string;
} => {
  const normalizedInput = readMutationInput(input, {
    allowUndefined: true,
  });
  const title = readOptionalStringField(normalizedInput.title, "title");

  if (!title) {
    throw createValidationAppError("请输入对话标题", {
      title: "请输入对话标题",
    });
  }

  return {
    title,
  };
};

export const createProjectConversationService = ({
  repository,
  conversationRuntime,
}: {
  repository: ProjectsRepository;
  conversationRuntime?: ProjectConversationRuntime;
}): ProjectConversationService => {
  const turnService = createProjectConversationTurnService({
    repository,
    conversationRuntime,
  });

  return {
    listProjectConversations: async ({ actor }, projectId) => {
      const project = await requireVisibleProject(repository, projectId, actor);
      const conversations = getProjectConversations(project);

      return {
        total: conversations.length,
        items: conversations.map((conversation) =>
          toProjectConversationSummaryResponse(
            project._id.toHexString(),
            conversation,
          ),
        ),
      };
    },

    createProjectConversation: async ({ actor }, projectId, input) => {
      const project = await requireVisibleProject(repository, projectId, actor);
      const { title } = validateCreateProjectConversationInput(input);
      const now = new Date();
      const conversation = createProjectConversation({
        title,
        createdAt: now,
      });
      const updatedProject = await repository.appendProjectConversation(
        project._id.toHexString(),
        conversation,
        now,
      );

      if (!updatedProject) {
        throw createProjectNotFoundError();
      }

      return {
        conversation: toProjectConversationDetailResponse(
          updatedProject._id.toHexString(),
          getRequiredPersistedConversation(updatedProject, conversation.id),
        ),
      };
    },

    updateProjectConversation: async (
      { actor },
      projectId,
      conversationId,
      input,
    ) => {
      const project = await requireVisibleProject(repository, projectId, actor);
      const { title } = validateUpdateProjectConversationInput(input);
      const currentConversation = getProjectConversation(
        project,
        conversationId,
      );

      if (!currentConversation) {
        throw createProjectConversationNotFoundError();
      }

      const now = new Date();
      const persistedProjectId = project._id.toHexString();
      let updatedProject = await repository.updateProjectConversationTitle(
        persistedProjectId,
        conversationId,
        title,
        now,
      );

      if (
        !updatedProject &&
        conversationId === "chat-default" &&
        (project.conversations?.length ?? 0) === 0
      ) {
        const defaultConversation = createDefaultProjectConversation(project);

        await repository.materializeDefaultProjectConversation(
          persistedProjectId,
          defaultConversation,
          defaultConversation.updatedAt,
        );

        updatedProject = await repository.updateProjectConversationTitle(
          persistedProjectId,
          conversationId,
          title,
          now,
        );
      }

      const ensuredUpdatedProject =
        updatedProject ??
        (await throwConversationPersistenceTargetError(
          repository,
          persistedProjectId,
        ));

      return {
        conversation: toProjectConversationDetailResponse(
          ensuredUpdatedProject._id.toHexString(),
          getRequiredPersistedConversation(
            ensuredUpdatedProject,
            conversationId,
          ),
        ),
      };
    },

    createProjectConversationMessage: async (
      context,
      projectId,
      conversationId,
      input,
    ) => {
      return turnService.createSynchronousTurn(
        context,
        projectId,
        conversationId,
        input,
      );
    },

    streamProjectConversationMessage: async (
      context,
      projectId,
      conversationId,
      input,
      options,
    ) => {
      await turnService.createStreamingTurn(
        context,
        projectId,
        conversationId,
        input,
        options,
      );
    },

    deleteProjectConversation: async ({ actor }, projectId, conversationId) => {
      const project = await requireVisibleProject(repository, projectId, actor);
      const currentConversation = getProjectConversation(
        project,
        conversationId,
      );

      if (!currentConversation) {
        throw createProjectConversationNotFoundError();
      }

      if (getProjectConversations(project).length <= 1) {
        throw createProjectConversationLastThreadForbiddenError();
      }

      const deletedProject = await repository.deleteProjectConversation(
        project._id.toHexString(),
        conversationId,
        new Date(),
      );

      if (!deletedProject) {
        const latestProject = await repository.findById(
          project._id.toHexString(),
        );

        if (!latestProject) {
          throw createProjectNotFoundError();
        }

        if (getProjectConversations(latestProject).length <= 1) {
          throw createProjectConversationLastThreadForbiddenError();
        }

        throw createProjectConversationNotFoundError();
      }
    },

    getProjectConversationDetail: async (
      { actor },
      projectId,
      conversationId,
    ) => {
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
  };
};
