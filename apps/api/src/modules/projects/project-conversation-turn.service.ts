import type { WithId } from "mongodb";
import { AppError } from "@lib/app-error.js";
import { readMutationInput } from "@lib/mutation-input.js";
import {
  createValidationAppError,
  readOptionalStringField,
} from "@lib/validation.js";
import { ProjectsRepository } from "./projects.repository.js";
import {
  createDefaultProjectConversation,
  createProjectConversationMessage,
  createProjectConversationNotFoundError,
  createProjectNotFoundError,
  getProjectConversation,
  requireVisibleProject,
  toProjectConversationDetailResponse,
} from "./projects.shared.js";
import {
  createProjectConversationAutoTitle,
  type ProjectConversationRuntime,
  shouldAutoGenerateProjectConversationTitle,
  shouldRefreshProjectConversationAutoTitle,
} from "./project-conversation-runtime.js";
import type {
  CreateProjectConversationMessageInput,
  ProjectCommandContext,
  ProjectConversationDetailEnvelope,
  ProjectConversationDocument,
  ProjectConversationMessageDocument,
  ProjectConversationSourceDocument,
  ProjectConversationStreamEvent,
  ProjectConversationStreamOptions,
  ProjectDocument,
} from "./projects.types.js";

export interface ProjectConversationAssistantReply {
  content: string;
  sources: ProjectConversationSourceDocument[];
}

export interface PersistedProjectConversationAssistantReply {
  detail: ProjectConversationDetailEnvelope;
  assistantMessageId: string;
}

interface PreparedProjectConversationReplayRestoreState {
  conversation: ProjectConversationDocument;
  replayUpdatedAt: Date;
}

export interface PreparedProjectConversationTurn {
  projectId: string;
  project: WithId<ProjectDocument>;
  conversationId: string;
  conversation: ProjectConversationDocument;
  userMessage: ProjectConversationMessageDocument;
  clientRequestId?: string;
  existingAssistantMessage: ProjectConversationMessageDocument | null;
  replayRestoreState?: PreparedProjectConversationReplayRestoreState;
}

export interface ProjectConversationTurnService {
  prepareTurn(
    context: ProjectCommandContext,
    projectId: string,
    conversationId: string,
    input: CreateProjectConversationMessageInput,
    options?: {
      requireClientRequestId?: boolean;
    },
  ): Promise<PreparedProjectConversationTurn>;
  persistAssistantReply(
    preparedTurn: PreparedProjectConversationTurn,
    assistantReply: ProjectConversationAssistantReply,
  ): Promise<PersistedProjectConversationAssistantReply>;
  createSynchronousTurn(
    context: ProjectCommandContext,
    projectId: string,
    conversationId: string,
    input: CreateProjectConversationMessageInput,
  ): Promise<ProjectConversationDetailEnvelope>;
  createStreamingTurn(
    context: ProjectCommandContext,
    projectId: string,
    conversationId: string,
    input: CreateProjectConversationMessageInput,
    options: ProjectConversationStreamOptions,
  ): Promise<void>;
}

const validateCreateProjectConversationMessageInput = (
  input: CreateProjectConversationMessageInput,
  options?: {
    requireClientRequestId?: boolean;
  },
): {
  content: string;
  clientRequestId?: string;
  targetUserMessageId?: string;
} => {
  const normalizedInput = readMutationInput(input, {
    allowUndefined: true,
  });
  const content = readOptionalStringField(normalizedInput.content, "content");
  const clientRequestId = readOptionalStringField(
    normalizedInput.clientRequestId,
    "clientRequestId",
  );
  const targetUserMessageId = readOptionalStringField(
    normalizedInput.targetUserMessageId,
    "targetUserMessageId",
  );

  if (!content) {
    throw createValidationAppError("请输入消息内容", {
      content: "请输入消息内容",
    });
  }

  if (options?.requireClientRequestId && !clientRequestId) {
    throw createValidationAppError("流式消息必须携带 clientRequestId", {
      clientRequestId: "流式消息必须携带 clientRequestId",
    });
  }

  return {
    content,
    clientRequestId,
    targetUserMessageId,
  };
};

const createProjectConversationStreamingUnavailableError = (): AppError => {
  return new AppError({
    statusCode: 503,
    code: "PROJECT_CONVERSATION_STREAMING_UNAVAILABLE",
    message: "当前项目对话流式能力暂不可用",
  });
};

const isAbortError = (error: unknown): boolean => {
  return error instanceof Error && error.name === "AbortError";
};

const RETRYABLE_PROJECT_CONVERSATION_STREAM_ERROR_CODES = new Set([
  "PROJECT_CONVERSATION_LLM_UPSTREAM_ERROR",
  "INTERNAL_SERVER_ERROR",
]);

const isProjectConversationStreamRetryableError = (error: unknown): boolean => {
  if (error instanceof AppError) {
    return RETRYABLE_PROJECT_CONVERSATION_STREAM_ERROR_CODES.has(error.code);
  }

  return true;
};

const createProjectConversationStreamErrorEvent = ({
  conversationId,
  clientRequestId,
  sequence,
  error,
}: {
  conversationId: string;
  clientRequestId: string;
  sequence: number;
  error: unknown;
}): ProjectConversationStreamEvent => {
  const normalizedError =
    error instanceof AppError
      ? error
      : new AppError({
          statusCode: 500,
          code: "INTERNAL_SERVER_ERROR",
          message: "服务暂时不可用",
          cause: error,
        });

  return {
    version: "v1",
    type: "error",
    sequence,
    conversationId,
    clientRequestId,
    code: normalizedError.code,
    message: normalizedError.message,
    retryable: isProjectConversationStreamRetryableError(normalizedError),
  };
};

const findProjectConversationRetryState = (
  conversation: ProjectConversationDocument,
  clientRequestId: string,
): {
  userMessage: ProjectConversationMessageDocument;
  assistantMessage: ProjectConversationMessageDocument | null;
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

const createProjectConversationReplayTargetError = (): AppError => {
  return createValidationAppError(
    "targetUserMessageId 必须指向当前会话中的用户消息",
    {
      targetUserMessageId: "targetUserMessageId 必须指向当前会话中的用户消息",
    },
  );
};

const createReplayUserMessage = ({
  message,
  content,
  clientRequestId,
}: {
  message: ProjectConversationMessageDocument;
  content: string;
  clientRequestId?: string;
}): ProjectConversationMessageDocument => {
  const nextMessage: ProjectConversationMessageDocument = {
    ...message,
    content,
  };

  if (clientRequestId !== undefined) {
    nextMessage.clientRequestId = clientRequestId;
  } else {
    delete nextMessage.clientRequestId;
  }

  return nextMessage;
};

const buildReplayConversationMessages = ({
  conversation,
  targetUserMessageId,
  content,
  clientRequestId,
}: {
  conversation: ProjectConversationDocument;
  targetUserMessageId: string;
  content: string;
  clientRequestId?: string;
}): {
  messages: ProjectConversationMessageDocument[];
  userMessage: ProjectConversationMessageDocument;
} => {
  const targetUserMessageIndex = conversation.messages.findIndex(
    (message) => message.id === targetUserMessageId,
  );

  if (targetUserMessageIndex < 0) {
    throw createProjectConversationReplayTargetError();
  }

  const targetUserMessage = conversation.messages[targetUserMessageIndex];

  if (!targetUserMessage || targetUserMessage.role !== "user") {
    throw createProjectConversationReplayTargetError();
  }

  const userMessage = createReplayUserMessage({
    message: targetUserMessage,
    content,
    clientRequestId,
  });
  const messages = conversation.messages
    .slice(0, targetUserMessageIndex + 1)
    .map((message, index) =>
      index === targetUserMessageIndex ? userMessage : message,
    );

  return {
    messages,
    userMessage,
  };
};

export const getRequiredPersistedConversation = (
  project: Pick<ProjectDocument, "name" | "conversations">,
  conversationId: string,
): ProjectConversationDocument => {
  const conversation = getProjectConversation(project, conversationId);

  if (!conversation) {
    throw createProjectConversationNotFoundError();
  }

  return conversation;
};

export const throwConversationPersistenceTargetError = async (
  repository: ProjectsRepository,
  projectId: string,
): Promise<never> => {
  const currentProject = await repository.findById(projectId);

  if (!currentProject) {
    throw createProjectNotFoundError();
  }

  throw createProjectConversationNotFoundError();
};

const restorePreparedReplayConversation = async (
  repository: ProjectsRepository,
  preparedTurn: PreparedProjectConversationTurn,
): Promise<void> => {
  if (!preparedTurn.replayRestoreState) {
    return;
  }

  const { conversation, replayUpdatedAt } = preparedTurn.replayRestoreState;

  try {
    await repository.replaceProjectConversationMessages(
      preparedTurn.projectId,
      preparedTurn.conversationId,
      conversation.messages,
      new Date(),
      {
        title: conversation.title,
        titleOrigin: conversation.titleOrigin ?? null,
        expectedCurrentUpdatedAt: replayUpdatedAt,
      },
    );
  } catch (error) {
    console.error("failed to restore replay conversation", error);
  }
};

const ensurePersistedConversationProject = async ({
  repository,
  project,
  projectId,
  conversationId,
}: {
  repository: ProjectsRepository;
  project: WithId<ProjectDocument>;
  projectId: string;
  conversationId: string;
}): Promise<WithId<ProjectDocument>> => {
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

const readPersistedConversationTarget = async (
  repository: ProjectsRepository,
  projectId: string,
  conversationId: string,
): Promise<{
  project: WithId<ProjectDocument>;
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

const toProjectConversationDetailEnvelope = (
  project: WithId<ProjectDocument>,
  conversation: ProjectConversationDocument,
): ProjectConversationDetailEnvelope => {
  return {
    conversation: toProjectConversationDetailResponse(
      project._id.toHexString(),
      conversation,
    ),
  };
};

export const createProjectConversationTurnService = ({
  repository,
  conversationRuntime,
}: {
  repository: ProjectsRepository;
  conversationRuntime?: ProjectConversationRuntime;
}): ProjectConversationTurnService => {
  const turnService: ProjectConversationTurnService = {
    prepareTurn: async (
      { actor },
      projectId,
      conversationId,
      input,
      options,
    ) => {
      const project = await requireVisibleProject(repository, projectId, actor);
      const { content, clientRequestId, targetUserMessageId } =
        validateCreateProjectConversationMessageInput(input, options);
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
      const reusableRetryState =
        existingRetryState &&
        existingRetryState.userMessage.content === content &&
        (!targetUserMessageId ||
          existingRetryState.userMessage.id === targetUserMessageId)
          ? existingRetryState
          : null;

      if (reusableRetryState?.assistantMessage) {
        return {
          projectId: persistedProjectId,
          project: ensuredConversationProject,
          conversationId,
          conversation: userConversation,
          userMessage: reusableRetryState.userMessage,
          clientRequestId,
          existingAssistantMessage: reusableRetryState.assistantMessage,
        };
      }

      let userMessage = reusableRetryState?.userMessage ?? null;
      let replayRestoreState: PreparedProjectConversationReplayRestoreState | undefined;

      if (targetUserMessageId && !userMessage) {
        const originalConversation = userConversation;
        const replayedConversation = buildReplayConversationMessages({
          conversation: userConversation,
          targetUserMessageId,
          content,
          clientRequestId,
        });
        const shouldRefreshTitle = shouldRefreshProjectConversationAutoTitle(
          userConversation,
          ensuredConversationProject.name,
        );
        const firstUserMessage =
          replayedConversation.messages.find(
            (message) => message.role === "user",
          ) ?? replayedConversation.userMessage;
        const nextTitle = shouldRefreshTitle
          ? createProjectConversationAutoTitle(firstUserMessage.content)
          : undefined;
        const replayUpdatedAt = new Date();
        const projectWithReplay =
          await repository.replaceProjectConversationMessages(
            persistedProjectId,
            conversationId,
            replayedConversation.messages,
            replayUpdatedAt,
            {
              ...(nextTitle !== undefined ? { title: nextTitle } : {}),
              ...(shouldRefreshTitle ? { titleOrigin: "auto" as const } : {}),
            },
          );

        ensuredConversationProject =
          projectWithReplay ??
          (await throwConversationPersistenceTargetError(
            repository,
            persistedProjectId,
          ));
        userConversation = getRequiredPersistedConversation(
          ensuredConversationProject,
          conversationId,
        );
        userMessage =
          userConversation.messages.find(
            (message) => message.id === replayedConversation.userMessage.id,
          ) ?? null;
        replayRestoreState = {
          conversation: originalConversation,
          replayUpdatedAt,
        };
      }

      if (!userMessage) {
        const userMessageCreatedAt = new Date();
        const nextUserMessage = createProjectConversationMessage({
          role: "user",
          content,
          clientRequestId,
          createdAt: userMessageCreatedAt,
        });
        const persistedUserProject =
          await repository.appendProjectConversationMessage(
            persistedProjectId,
            conversationId,
            nextUserMessage,
            userMessageCreatedAt,
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
        !targetUserMessageId &&
        shouldAutoGenerateProjectConversationTitle(
          userConversation,
          ensuredConversationProject.name,
        )
      ) {
        const nextTitle = createProjectConversationAutoTitle(content);
        const expectedCurrentTitle = userConversation.title;

        if (nextTitle !== userConversation.title) {
          const titleUpdatedAt = new Date();
          const projectWithUpdatedTitle =
            await repository.updateProjectConversationTitle(
              persistedProjectId,
              conversationId,
              nextTitle,
              titleUpdatedAt,
              {
                expectedCurrentTitle,
                titleOrigin: "auto",
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

        if (!retryState?.userMessage) {
          throw createProjectConversationNotFoundError();
        }

        return {
          projectId: persistedProjectId,
          project: latestConversationTarget.project,
          conversationId,
          conversation: latestConversationTarget.conversation,
          userMessage: retryState.userMessage,
          clientRequestId,
          existingAssistantMessage: retryState.assistantMessage,
          replayRestoreState,
        };
      }

      return {
        projectId: persistedProjectId,
        project: ensuredConversationProject,
        conversationId,
        conversation: userConversation,
        userMessage,
        clientRequestId,
        existingAssistantMessage: null,
        replayRestoreState,
      };
    },

    persistAssistantReply: async (preparedTurn, assistantReply) => {
      if (preparedTurn.clientRequestId) {
        const latestConversationTarget = await readPersistedConversationTarget(
          repository,
          preparedTurn.projectId,
          preparedTurn.conversationId,
        );

        if (!latestConversationTarget.conversation) {
          throw createProjectConversationNotFoundError();
        }

        const retryState = findProjectConversationRetryState(
          latestConversationTarget.conversation,
          preparedTurn.clientRequestId,
        );

        if (retryState?.assistantMessage) {
          return {
            detail: toProjectConversationDetailEnvelope(
              latestConversationTarget.project,
              latestConversationTarget.conversation,
            ),
            assistantMessageId: retryState.assistantMessage.id,
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
          preparedTurn.projectId,
          preparedTurn.conversationId,
          assistantMessage,
          assistantCreatedAt,
        );
      const ensuredAssistantProject =
        persistedAssistantProject ??
        (await throwConversationPersistenceTargetError(
          repository,
          preparedTurn.projectId,
        ));
      const conversation = getRequiredPersistedConversation(
        ensuredAssistantProject,
        preparedTurn.conversationId,
      );

      return {
        detail: toProjectConversationDetailEnvelope(
          ensuredAssistantProject,
          conversation,
        ),
        assistantMessageId: assistantMessage.id,
      };
    },

    createSynchronousTurn: async (context, projectId, conversationId, input) => {
      const preparedTurn = await turnService.prepareTurn(
        context,
        projectId,
        conversationId,
        input,
      );

      if (preparedTurn.existingAssistantMessage || !conversationRuntime) {
        return toProjectConversationDetailEnvelope(
          preparedTurn.project,
          preparedTurn.conversation,
        );
      }

      try {
        const assistantReply = await conversationRuntime.generateAssistantReply({
          actor: context.actor,
          project: preparedTurn.project,
          conversation: preparedTurn.conversation,
          userMessage: preparedTurn.userMessage,
        });

        const persistedAssistantReply = await turnService.persistAssistantReply(
          preparedTurn,
          assistantReply,
        );

        return persistedAssistantReply.detail;
      } catch (error) {
        await restorePreparedReplayConversation(repository, preparedTurn);
        throw error;
      }
    },

    createStreamingTurn: async (
      context,
      projectId,
      conversationId,
      input,
      { signal, onEvent },
    ) => {
      if (!conversationRuntime) {
        throw createProjectConversationStreamingUnavailableError();
      }

      const preparedTurn = await turnService.prepareTurn(
        context,
        projectId,
        conversationId,
        input,
        {
          requireClientRequestId: true,
        },
      );
      const clientRequestId = preparedTurn.clientRequestId;

      if (!clientRequestId) {
        throw createValidationAppError("流式消息必须携带 clientRequestId", {
          clientRequestId: "流式消息必须携带 clientRequestId",
        });
      }

      let sequence = 0;
      let assistantPersisted = false;
      const emitEvent = async (
        event:
          | Omit<ProjectConversationStreamEvent, "version" | "sequence" | "conversationId" | "clientRequestId">
          | ProjectConversationStreamEvent,
      ): Promise<void> => {
        const nextEvent =
          "version" in event
            ? event
            : ({
                version: "v1",
                sequence: sequence + 1,
                conversationId: preparedTurn.conversationId,
                clientRequestId,
                ...event,
              } as ProjectConversationStreamEvent);

        sequence = nextEvent.sequence;
        await onEvent(nextEvent);
      };

      try {
        await emitEvent({
          type: "ack",
          userMessageId: preparedTurn.userMessage.id,
          userMessagePersisted: true,
        });

        if (preparedTurn.existingAssistantMessage) {
          await emitEvent({
            type: "done",
            assistantMessageId: preparedTurn.existingAssistantMessage.id,
            assistantMessagePersisted: true,
            finishReason: "stop",
          });

          return;
        }

        const streamReply = await conversationRuntime.streamAssistantReply({
          actor: context.actor,
          project: preparedTurn.project,
          conversation: preparedTurn.conversation,
          userMessage: preparedTurn.userMessage,
          signal,
          onDelta: async (delta) => {
            if (!delta) {
              return;
            }

            await emitEvent({
              type: "delta",
              delta,
            });
          },
        });

        if (signal?.aborted || streamReply.finishReason === "cancelled") {
          await restorePreparedReplayConversation(repository, preparedTurn);
          return;
        }

        const persistedAssistantReply = await turnService.persistAssistantReply(
          preparedTurn,
          {
            content: streamReply.content,
            sources: streamReply.sources,
          },
        );
        assistantPersisted = true;

        await emitEvent({
          type: "done",
          assistantMessageId: persistedAssistantReply.assistantMessageId,
          assistantMessagePersisted: true,
          finishReason: streamReply.finishReason,
        });
      } catch (error) {
        if (!assistantPersisted) {
          await restorePreparedReplayConversation(repository, preparedTurn);
        }

        if (signal?.aborted || isAbortError(error)) {
          return;
        }

        await emitEvent(
          createProjectConversationStreamErrorEvent({
            conversationId: preparedTurn.conversationId,
            clientRequestId,
            sequence: sequence + 1,
            error,
          }),
        );
      }
    },
  };

  return turnService;
};
