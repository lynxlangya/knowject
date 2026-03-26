import type { WithId } from "mongodb";
import { ProjectConversationsRepository, ProjectsRepository } from "./projects.repository.js";
import {
  createDefaultProjectConversation,
  createProjectConversationMessage,
  createProjectConversationNotFoundError,
  createProjectNotFoundError,
  toProjectConversationDetailResponse,
} from "./projects.shared.js";
import {
  buildProjectConversationCitationSources,
  normalizeProjectConversationCitationContent,
  stripProjectConversationSourcePlaceholders,
} from "./project-conversation-citation.js";
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
import type { SupportedLocale } from "@lib/locale.js";

export const getRequiredPersistedConversation = (
  conversation: ProjectConversationDocument | null,
): ProjectConversationDocument => {
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
  projectConversationsRepository,
  project,
  projectId,
  conversationId,
}: {
  repository: ProjectsRepository;
  projectConversationsRepository: ProjectConversationsRepository;
  project: WithId<ProjectDocument>;
  projectId: string;
  conversationId: string;
}): Promise<ProjectConversationDocument> => {
  const persistedConversation =
    await projectConversationsRepository.findByProjectAndConversationId(
      projectId,
      conversationId,
    );

  if (persistedConversation) {
    return persistedConversation;
  }

  // Fallback: check legacy embedded conversations if not migrated yet
  // (MongoDB documents may have conversations field not declared in TypeScript type)
  const legacyConversations = (project as ProjectDocument & {
    conversations?: ProjectConversationDocument[];
  }).conversations;
  const legacyConversation = legacyConversations?.find(
    (c) => c.id === conversationId,
  );
  if (legacyConversation) {
    return legacyConversation;
  }

  if (conversationId === "chat-default") {
    const persistedConversations =
      await projectConversationsRepository.listByProjectId(projectId);

    if (persistedConversations.length === 0) {
      const defaultConversation = createDefaultProjectConversation(project);

      return projectConversationsRepository.createConversation({
        ...defaultConversation,
        projectId,
      });
    }
  }

  return throwConversationPersistenceTargetError(repository, projectId);
};

export const readPersistedConversationTarget = async (
  repository: ProjectsRepository,
  projectConversationsRepository: ProjectConversationsRepository,
  projectId: string,
  conversationId: string,
): Promise<{
  project: WithId<ProjectDocument>;
  conversation: ProjectConversationDocument | null;
}> => {
  const [currentProject, conversation] = await Promise.all([
    repository.findById(projectId),
    projectConversationsRepository.findByProjectAndConversationId(
      projectId,
      conversationId,
    ),
  ]);

  if (!currentProject) {
    throw createProjectNotFoundError();
  }

  // Fallback: check legacy embedded conversations if not migrated yet
  const legacyConversations = (currentProject as ProjectDocument & {
    conversations?: ProjectConversationDocument[];
  }).conversations;
  const effectiveConversation =
    conversation ?? legacyConversations?.find((c) => c.id === conversationId) ?? null;

  return {
    project: currentProject,
    conversation: effectiveConversation,
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
  _repository: ProjectsRepository,
  projectConversationsRepository: ProjectConversationsRepository,
  preparedTurn: PreparedProjectConversationTurn,
): Promise<void> => {
  if (!preparedTurn.replayRestoreState) {
    return;
  }

  const { conversation, replayUpdatedAt } = preparedTurn.replayRestoreState;

  try {
    await projectConversationsRepository.replaceMessages(
      preparedTurn.projectId,
      preparedTurn.conversationId,
      conversation.messages,
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
  projectConversationsRepository,
  preparedTurn,
  assistantReply,
  locale,
}: {
  repository: ProjectsRepository;
  projectConversationsRepository: ProjectConversationsRepository;
  preparedTurn: PreparedProjectConversationTurn;
  assistantReply: ProjectConversationAssistantReply;
  locale?: SupportedLocale;
}): Promise<PersistedProjectConversationAssistantReply> => {
  if (preparedTurn.clientRequestId) {
    const latestConversationTarget = await readPersistedConversationTarget(
      repository,
      projectConversationsRepository,
      preparedTurn.projectId,
      preparedTurn.conversationId,
    );

    const latestConversation = getRequiredPersistedConversation(
      latestConversationTarget.conversation,
    );
    const retryState = findProjectConversationRetryState(
      latestConversation,
      preparedTurn.clientRequestId,
    );

    if (retryState?.assistantMessage) {
      return {
        detail: createProjectConversationDetailEnvelope(
          latestConversationTarget.project,
          latestConversation,
          locale,
        ),
        assistantMessageId: retryState.assistantMessage.id,
      };
    }
  }

  const normalizedSources = buildProjectConversationCitationSources(
    assistantReply.sources,
  );
  const normalizedContent = stripProjectConversationSourcePlaceholders(
    assistantReply.content,
  );
  const normalizedCitationContent =
    assistantReply.citationContent === undefined
      ? undefined
      : normalizeProjectConversationCitationContent(
          assistantReply.citationContent,
          assistantReply.content,
          normalizedSources,
        ) ?? undefined;
  const assistantCreatedAt = new Date();
  const assistantMessage = createProjectConversationMessage({
    role: "assistant",
    content: normalizedContent,
    sources: normalizedSources,
    citationContent: normalizedCitationContent,
    createdAt: assistantCreatedAt,
  });
  const persistedConversation =
    await projectConversationsRepository.appendMessage(
      preparedTurn.projectId,
      preparedTurn.conversationId,
      assistantMessage,
      assistantCreatedAt,
    );
  const ensuredConversation =
    persistedConversation ??
    (await throwConversationPersistenceTargetError(
      repository,
      preparedTurn.projectId,
    ));

  return {
    detail: createProjectConversationDetailEnvelope(
      preparedTurn.project,
      ensuredConversation,
      locale,
    ),
    assistantMessageId: assistantMessage.id,
  };
};
