import {
  createProjectConversationAutoTitle,
  shouldAutoGenerateProjectConversationTitle,
  shouldRefreshProjectConversationAutoTitle,
} from "./project-conversation-runtime.js";
import { ProjectsRepository } from "./projects.repository.js";
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
  context,
  projectId,
  conversationId,
  input,
  options,
}: {
  repository: ProjectsRepository;
  context: ProjectCommandContext;
  projectId: string;
  conversationId: string;
  input: CreateProjectConversationMessageInput;
  options?: ProjectConversationTurnPreparationOptions;
}): Promise<PreparedProjectConversationTurn> => {
  const project = await requireVisibleProject(
    repository,
    projectId,
    context.actor,
  );
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
        const latestConversationTarget = await readPersistedConversationTarget(
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
};
