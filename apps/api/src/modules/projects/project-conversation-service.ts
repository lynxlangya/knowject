import { AppError } from "@lib/app-error.js";
import { readMutationInput } from "@lib/mutation-input.js";
import {
  createValidationAppError,
  readOptionalStringField,
} from "@lib/validation.js";
import { ProjectsRepository } from "./projects.repository.js";
import {
  createDefaultProjectConversation,
  createProjectConversation,
  createProjectConversationMessage,
  createProjectConversationNotFoundError,
  createProjectNotFoundError,
  getProjectConversation,
  getProjectConversations,
  requireVisibleProject,
  toProjectConversationDetailResponse,
  toProjectConversationSummaryResponse,
} from "./projects.shared.js";
import {
  createProjectConversationAutoTitle,
  DEFAULT_PROJECT_CONVERSATION_TITLE,
  type ProjectConversationRuntime,
  shouldAutoGenerateProjectConversationTitle,
} from "./project-conversation-runtime.js";
import type {
  CreateProjectConversationInput,
  CreateProjectConversationMessageInput,
  ProjectCommandContext,
  ProjectConversationDetailEnvelope,
  ProjectConversationDocument,
  ProjectConversationListResponse,
  ProjectDocument,
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

const validateCreateProjectConversationMessageInput = (
  input: CreateProjectConversationMessageInput,
): {
  content: string;
  clientRequestId?: string;
} => {
  const normalizedInput = readMutationInput(input, {
    allowUndefined: true,
  });
  const content = readOptionalStringField(normalizedInput.content, "content");
  const clientRequestId = readOptionalStringField(
    normalizedInput.clientRequestId,
    "clientRequestId",
  );

  if (!content) {
    throw createValidationAppError("请输入消息内容", {
      content: "请输入消息内容",
    });
  }

  return {
    content,
    clientRequestId,
  };
};

const ensurePersistedConversationProject = async ({
  repository,
  project,
  projectId,
  conversationId,
}: {
  repository: ProjectsRepository;
  project: ProjectDocument & {
    _id: NonNullable<ProjectDocument["_id"]>;
  };
  projectId: string;
  conversationId: string;
}): Promise<
  ProjectDocument & {
    _id: NonNullable<ProjectDocument["_id"]>;
  }
> => {
  const persistedConversation =
    project.conversations?.find(
      (conversation) => conversation.id === conversationId,
    ) ?? null;

  if (persistedConversation) {
    return project;
  }

  if (
    conversationId === "chat-default" &&
    (project.conversations?.length ?? 0) === 0
  ) {
    const defaultConversation = createDefaultProjectConversation(project);

    const materializedProject =
      await repository.materializeDefaultProjectConversation(
        projectId,
        defaultConversation,
        defaultConversation.updatedAt,
      );

    if (materializedProject) {
      return materializedProject;
    }
  }

  return throwConversationPersistenceTargetError(repository, projectId);
};

const findProjectConversationRetryState = (
  conversation: ProjectConversationDocument,
  clientRequestId: string,
): {
  userMessage: ProjectConversationDocument["messages"][number];
  assistantMessage:
    | ProjectConversationDocument["messages"][number]
    | null;
} | null => {
  const userMessageIndex = conversation.messages.findIndex(
    (message) =>
      message.role === "user" && message.clientRequestId === clientRequestId,
  );

  if (userMessageIndex < 0) {
    return null;
  }

  const userMessage = conversation.messages[userMessageIndex];
  const nextUserMessageIndex = conversation.messages.findIndex(
    (message, index) => index > userMessageIndex && message.role === "user",
  );
  const assistantMessage =
    conversation.messages
      .slice(
        userMessageIndex + 1,
        nextUserMessageIndex >= 0 ? nextUserMessageIndex : undefined,
      )
      .find((message) => message.role === "assistant") ?? null;

  if (!userMessage) {
    return null;
  }

  return {
    userMessage,
    assistantMessage,
  };
};

const getRequiredPersistedConversation = (
  project: Pick<ProjectDocument, "name" | "conversations">,
  conversationId: string,
): ProjectConversationDocument => {
  const conversation = getProjectConversation(project, conversationId);

  if (!conversation) {
    throw createProjectConversationNotFoundError();
  }

  return conversation;
};

const readPersistedConversationTarget = async (
  repository: ProjectsRepository,
  projectId: string,
  conversationId: string,
): Promise<{
  project: ProjectDocument & {
    _id: NonNullable<ProjectDocument["_id"]>;
  };
  conversation: ProjectConversationDocument | null;
}> => {
  const currentProject = await repository.findById(projectId);

  if (!currentProject) {
    throw createProjectNotFoundError();
  }

  return {
    project: currentProject,
    conversation: getProjectConversation(currentProject, conversationId),
  };
};

const throwConversationPersistenceTargetError = async (
  repository: ProjectsRepository,
  projectId: string,
): Promise<never> => {
  const currentProject = await repository.findById(projectId);

  if (!currentProject) {
    throw createProjectNotFoundError();
  }

  throw createProjectConversationNotFoundError();
};

export const createProjectConversationService = ({
  repository,
  conversationRuntime,
}: {
  repository: ProjectsRepository;
  conversationRuntime?: ProjectConversationRuntime;
}): ProjectConversationService => {
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
      { actor },
      projectId,
      conversationId,
      input,
    ) => {
      const project = await requireVisibleProject(repository, projectId, actor);
      const { content, clientRequestId } =
        validateCreateProjectConversationMessageInput(input);
      const now = new Date();
      const persistedProjectId = project._id.toHexString();
      let ensuredConversationProject = await ensurePersistedConversationProject({
        repository,
        project,
        projectId: persistedProjectId,
        conversationId,
      });
      let userConversation = getRequiredPersistedConversation(
        ensuredConversationProject,
        conversationId,
      );
      const existingRetryState = clientRequestId
        ? findProjectConversationRetryState(userConversation, clientRequestId)
        : null;
      let userMessage = existingRetryState?.userMessage ?? null;

      if (!userMessage) {
        const nextUserMessage = createProjectConversationMessage({
          role: "user",
          content,
          clientRequestId,
          createdAt: now,
        });
        const persistedUserProject =
          await repository.appendProjectConversationMessage(
            persistedProjectId,
            conversationId,
            nextUserMessage,
            now,
          );

        ensuredConversationProject =
          persistedUserProject ??
          (await throwConversationPersistenceTargetError(
            repository,
            persistedProjectId,
          ));
        userConversation = getRequiredPersistedConversation(
          ensuredConversationProject,
          conversationId,
        );
        userMessage =
          clientRequestId
            ? findProjectConversationRetryState(
                userConversation,
                clientRequestId,
              )?.userMessage ?? nextUserMessage
            : nextUserMessage;
      }

      if (!userMessage) {
        throw createProjectConversationNotFoundError();
      }

      if (
        shouldAutoGenerateProjectConversationTitle(
          userConversation,
          ensuredConversationProject.name,
        )
      ) {
        const nextTitle = createProjectConversationAutoTitle(content);
        const expectedCurrentTitle = userConversation.title;

        if (nextTitle !== userConversation.title) {
          const projectWithUpdatedTitle =
            await repository.updateProjectConversationTitle(
              persistedProjectId,
              conversationId,
              nextTitle,
              now,
              {
                expectedCurrentTitle,
              },
            );

          if (projectWithUpdatedTitle) {
            ensuredConversationProject = projectWithUpdatedTitle;
            userConversation = getRequiredPersistedConversation(
              projectWithUpdatedTitle,
              conversationId,
            );
          } else {
            const latestConversationTarget =
              await readPersistedConversationTarget(
                repository,
                persistedProjectId,
                conversationId,
              );

            if (!latestConversationTarget.conversation) {
              throw createProjectConversationNotFoundError();
            }

            ensuredConversationProject = latestConversationTarget.project;
            userConversation = latestConversationTarget.conversation;
          }
        }
      }

      if (!conversationRuntime) {
        return {
          conversation: toProjectConversationDetailResponse(
            ensuredConversationProject._id.toHexString(),
            userConversation,
          ),
        };
      }

      const assistantReply = await conversationRuntime.generateAssistantReply({
        actor,
        project: ensuredConversationProject,
        conversation: userConversation,
        userMessage,
      });

      if (clientRequestId) {
        const latestConversationTarget = await readPersistedConversationTarget(
          repository,
          persistedProjectId,
          conversationId,
        );

        if (!latestConversationTarget.conversation) {
          throw createProjectConversationNotFoundError();
        }

        const retryState = findProjectConversationRetryState(
          latestConversationTarget.conversation,
          clientRequestId,
        );

        if (retryState?.assistantMessage) {
          return {
            conversation: toProjectConversationDetailResponse(
              latestConversationTarget.project._id.toHexString(),
              latestConversationTarget.conversation,
            ),
          };
        }
      }

      const assistantCreatedAt = new Date();
      const assistantMessage = createProjectConversationMessage({
        role: "assistant",
        content: assistantReply.content,
        sources: assistantReply.sources,
        createdAt: assistantCreatedAt,
      });
      const persistedAssistantProject =
        await repository.appendProjectConversationMessage(
          persistedProjectId,
          conversationId,
          assistantMessage,
          assistantCreatedAt,
        );

      const ensuredAssistantProject =
        persistedAssistantProject ??
        (await throwConversationPersistenceTargetError(
          repository,
          persistedProjectId,
        ));

      return {
        conversation: toProjectConversationDetailResponse(
          ensuredAssistantProject._id.toHexString(),
          getRequiredPersistedConversation(
            ensuredAssistantProject,
            conversationId,
          ),
        ),
      };
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
