import type { WithId } from "mongodb";
import { ProjectsRepository } from "./projects.repository.js";
import {
  createDefaultProjectConversation,
  createProjectConversationMessage,
  createProjectConversationNotFoundError,
  createProjectNotFoundError,
  getProjectConversation,
  toProjectConversationDetailResponse,
} from "./projects.shared.js";
import type {
  ProjectConversationDetailEnvelope,
  ProjectConversationDocument,
  ProjectDocument,
} from "./projects.types.js";
import type {
  PreparedProjectConversationTurn,
  ProjectConversationAssistantReply,
  PersistedProjectConversationAssistantReply,
} from "./types/project-conversation-turn.types.js";
import { findProjectConversationRetryState } from "./utils/project-conversation-turn.retry.js";

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

export const ensurePersistedConversationProject = async ({
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

export const readPersistedConversationTarget = async (
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

export const createProjectConversationDetailEnvelope = (
  project: WithId<ProjectDocument>,
  conversation: ProjectConversationDocument,
  locale?: import("@lib/locale.js").SupportedLocale,
): ProjectConversationDetailEnvelope => {
  return {
    conversation: toProjectConversationDetailResponse(
      project._id.toHexString(),
      project.name,
      conversation,
      locale,
    ),
  };
};

export const restorePreparedReplayConversation = async (
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

export const persistProjectConversationAssistantReply = async ({
  repository,
  preparedTurn,
  assistantReply,
}: {
  repository: ProjectsRepository;
  preparedTurn: PreparedProjectConversationTurn;
  assistantReply: ProjectConversationAssistantReply;
}): Promise<PersistedProjectConversationAssistantReply> => {
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
        detail: createProjectConversationDetailEnvelope(
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
    detail: createProjectConversationDetailEnvelope(
      ensuredAssistantProject,
      conversation,
    ),
    assistantMessageId: assistantMessage.id,
  };
};
