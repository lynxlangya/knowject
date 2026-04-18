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
  buildSkillBindableFlag,
  normalizeStoredSkillForRead,
} from "@modules/skills/skills.shared.js";
import type { SkillsRepository } from "@modules/skills/skills.repository.js";
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
  ProjectConversationSelectedSkill,
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
import {
  createProjectConversationSkillSelectionError,
  validateCreateProjectConversationMessageInput,
} from "./validators/project-conversation-turn.validator.js";

const resolveSelectedProjectConversationSkill = async ({
  project,
  skillId,
  skillsRepository,
}: {
  project: Awaited<ReturnType<typeof requireVisibleProject>>;
  skillId?: string;
  skillsRepository?: Pick<SkillsRepository, "findSkillById">;
}): Promise<ProjectConversationSelectedSkill | undefined> => {
  if (!skillId) {
    return undefined;
  }

  if (!project.skillIds.includes(skillId) || !skillsRepository) {
    throw createProjectConversationSkillSelectionError();
  }

  const storedSkill = await skillsRepository.findSkillById(skillId);

  if (!storedSkill) {
    throw createProjectConversationSkillSelectionError();
  }

  const normalizedSkill = normalizeStoredSkillForRead(storedSkill);

  if (
    normalizedSkill.source !== "team" ||
    !buildSkillBindableFlag(normalizedSkill.status)
  ) {
    throw createProjectConversationSkillSelectionError();
  }

  return {
    id: storedSkill._id.toHexString(),
    name: storedSkill.name,
    description: storedSkill.description,
    owner: normalizedSkill.owner,
    definition: normalizedSkill.definition,
  };
};

export const prepareProjectConversationTurn = async ({
  repository,
  projectConversationsRepository,
  skillsRepository,
  context,
  projectId,
  conversationId,
  input,
  options,
}: {
  repository: ProjectsRepository;
  projectConversationsRepository: ProjectConversationsRepository;
  skillsRepository?: Pick<SkillsRepository, "findSkillById">;
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
  const { content, clientRequestId, targetUserMessageId, skillId } =
    validateCreateProjectConversationMessageInput(input, options);
  const selectedSkill = await resolveSelectedProjectConversationSkill({
    project: currentProject,
    skillId,
    skillsRepository,
  });
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
      ...(selectedSkill ? { selectedSkill } : {}),
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
      ...(selectedSkill ? { selectedSkill } : {}),
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
    ...(selectedSkill ? { selectedSkill } : {}),
    clientRequestId,
    existingAssistantMessage: null,
    replayRestoreState,
  };
};
