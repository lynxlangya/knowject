import {
  createProjectConversationAutoTitle,
  shouldAutoGenerateProjectConversationTitle,
  shouldRefreshProjectConversationAutoTitle,
} from "./project-conversation-runtime.js";
import {
  ProjectConversationsRepository,
  ProjectsRepository,
} from "./projects.repository.js";
import {
  createProjectConversationMessage,
  createProjectConversationNotFoundError,
  requireVisibleProject,
} from "./projects.shared.js";
import type {
  CreateProjectConversationMessageInput,
  ProjectCommandContext,
} from "./projects.types.js";
import type {
  PreparedProjectConversationReplayRestoreState,
  PreparedProjectConversationTurn,
  ProjectConversationTurnPreparationOptions,
} from "./types/project-conversation-turn.types.js";
import {
  ensurePersistedConversationProject,
  getRequiredPersistedConversation,
  readPersistedConversationTarget,
  throwConversationPersistenceTargetError,
} from "./project-conversation-turn.persist.js";
import { buildReplayConversationMessages } from "./utils/project-conversation-turn.replay.js";
import { findProjectConversationRetryState } from "./utils/project-conversation-turn.retry.js";
import { validateCreateProjectConversationMessageInput } from "./validators/project-conversation-turn.validator.js";

export const prepareProjectConversationTurn = async ({
  repository,
  projectConversationsRepository,
  context,
  projectId,
  conversationId,
  input,
  options,
}: {
  repository: ProjectsRepository;
  projectConversationsRepository: ProjectConversationsRepository;
  context: ProjectCommandContext;
  projectId: string;
  conversationId: string;
  input: CreateProjectConversationMessageInput;
  options?: ProjectConversationTurnPreparationOptions;
}): Promise<PreparedProjectConversationTurn> => {
  let currentProject = await requireVisibleProject(
    repository,
    projectId,
    context.actor,
  );
  const { content, clientRequestId, targetUserMessageId } =
    validateCreateProjectConversationMessageInput(input, options);
  const persistedProjectId = currentProject._id.toHexString();

  let userConversation = await ensurePersistedConversationProject({
    repository,
    projectConversationsRepository,
    project: currentProject,
    projectId: persistedProjectId,
    conversationId,
  });
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
      project: currentProject,
      conversationId,
      conversation: userConversation,
      userMessage: reusableRetryState.userMessage,
      clientRequestId,
      existingAssistantMessage: reusableRetryState.assistantMessage,
    };
  }

  let userMessage = reusableRetryState?.userMessage ?? null;
  let replayRestoreState:
    | PreparedProjectConversationReplayRestoreState
    | undefined;

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
      currentProject.name,
    );
    const firstUserMessage =
      replayedConversation.messages.find(
        (message) => message.role === "user",
      ) ?? replayedConversation.userMessage;
    const nextTitle = shouldRefreshTitle
      ? createProjectConversationAutoTitle(firstUserMessage.content)
      : undefined;
    const persistedReplayConversation =
      await projectConversationsRepository.replaceMessages(
        persistedProjectId,
        conversationId,
        replayedConversation.messages,
        {
          ...(nextTitle !== undefined ? { title: nextTitle } : {}),
          ...(shouldRefreshTitle ? { titleOrigin: "auto" as const } : {}),
        },
      );

    userConversation =
      persistedReplayConversation ??
      (await throwConversationPersistenceTargetError(
        repository,
        persistedProjectId,
      ));
    userMessage =
      userConversation.messages.find(
        (message) => message.id === replayedConversation.userMessage.id,
      ) ?? null;
    replayRestoreState = {
      conversation: originalConversation,
      replayUpdatedAt: userConversation.updatedAt,
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
    const persistedUserConversation =
      await projectConversationsRepository.appendMessage(
        persistedProjectId,
        conversationId,
        nextUserMessage,
        userMessageCreatedAt,
      );

    userConversation =
      persistedUserConversation ??
      (await throwConversationPersistenceTargetError(
        repository,
        persistedProjectId,
      ));
    userMessage = clientRequestId
      ? (findProjectConversationRetryState(userConversation, clientRequestId)
          ?.userMessage ?? nextUserMessage)
      : nextUserMessage;
  }

  if (!userMessage) {
    throw createProjectConversationNotFoundError();
  }

  if (
    !targetUserMessageId &&
    shouldAutoGenerateProjectConversationTitle(
      userConversation,
      currentProject.name,
    )
  ) {
    const nextTitle = createProjectConversationAutoTitle(content);
    const expectedCurrentTitle = userConversation.title;

    if (nextTitle !== userConversation.title) {
      const conversationWithUpdatedTitle =
        await projectConversationsRepository.updateTitle(
          persistedProjectId,
          conversationId,
          nextTitle,
          {
            expectedCurrentTitle,
            titleOrigin: "auto",
          },
        );

      if (conversationWithUpdatedTitle) {
        userConversation = conversationWithUpdatedTitle;
      } else {
        const latestConversationTarget = await readPersistedConversationTarget(
          repository,
          projectConversationsRepository,
          persistedProjectId,
          conversationId,
        );

        currentProject = latestConversationTarget.project;
        userConversation = getRequiredPersistedConversation(
          latestConversationTarget.conversation,
        );
      }
    }
  }

  if (clientRequestId) {
    const latestConversationTarget = await readPersistedConversationTarget(
      repository,
      projectConversationsRepository,
      persistedProjectId,
      conversationId,
    );

    currentProject = latestConversationTarget.project;
    userConversation = getRequiredPersistedConversation(
      latestConversationTarget.conversation,
    );
    const retryState = findProjectConversationRetryState(
      userConversation,
      clientRequestId,
    );

    if (!retryState?.userMessage) {
      throw createProjectConversationNotFoundError();
    }

    return {
      projectId: persistedProjectId,
      project: currentProject,
      conversationId,
      conversation: userConversation,
      userMessage: retryState.userMessage,
      clientRequestId,
      existingAssistantMessage: retryState.assistantMessage,
      replayRestoreState,
    };
  }

  return {
    projectId: persistedProjectId,
    project: currentProject,
    conversationId,
    conversation: userConversation,
    userMessage,
    clientRequestId,
    existingAssistantMessage: null,
    replayRestoreState,
  };
};
