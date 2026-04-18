import { prepareProjectConversationTurn } from "./project-conversation-turn.prepare.js";
import { persistProjectConversationAssistantReply } from "./project-conversation-turn.persist.js";
import {
  createStreamingProjectConversationTurn,
  createSynchronousProjectConversationTurn,
} from "./project-conversation-turn.stream.js";
import type { ProjectConversationTurnServiceDependencies } from "./types/project-conversation-turn.types.js";
import type {
  ProjectConversationAssistantReply,
  ProjectConversationTurnService,
  PreparedProjectConversationTurn,
  PersistedProjectConversationAssistantReply,
} from "./types/project-conversation-turn.types.js";

export type {
  ProjectConversationAssistantReply,
  ProjectConversationTurnService,
  PreparedProjectConversationTurn,
  PersistedProjectConversationAssistantReply,
} from "./types/project-conversation-turn.types.js";
export {
  getRequiredPersistedConversation,
  throwConversationPersistenceTargetError,
} from "./project-conversation-turn.persist.js";

export const createProjectConversationTurnService = ({
  repository,
  projectConversationsRepository,
  skillsRepository,
  conversationRuntime,
}: ProjectConversationTurnServiceDependencies): ProjectConversationTurnService => {
  return {
    prepareTurn: async (context, projectId, conversationId, input, options) => {
      return prepareProjectConversationTurn({
        repository,
        projectConversationsRepository,
        skillsRepository,
        context,
        projectId,
        conversationId,
        input,
        options,
      });
    },

    persistAssistantReply: async (
      preparedTurn: PreparedProjectConversationTurn,
      assistantReply: ProjectConversationAssistantReply,
    ): Promise<PersistedProjectConversationAssistantReply> => {
      return persistProjectConversationAssistantReply({
        repository,
        projectConversationsRepository,
        preparedTurn,
        assistantReply,
      });
    },

    createSynchronousTurn: async (
      context,
      projectId,
      conversationId,
      input,
    ) => {
      const preparedTurn = await prepareProjectConversationTurn({
        repository,
        projectConversationsRepository,
        skillsRepository,
        context,
        projectId,
        conversationId,
        input,
      });

      return createSynchronousProjectConversationTurn({
        repository,
        projectConversationsRepository,
        conversationRuntime,
        context,
        preparedTurn,
      });
    },

    createStreamingTurn: async (
      context,
      projectId,
      conversationId,
      input,
      options,
    ) => {
      const preparedTurn = await prepareProjectConversationTurn({
        repository,
        projectConversationsRepository,
        skillsRepository,
        context,
        projectId,
        conversationId,
        input,
        options: {
          requireClientRequestId: true,
        },
      });

      await createStreamingProjectConversationTurn({
        repository,
        projectConversationsRepository,
        conversationRuntime,
        context,
        preparedTurn,
        options,
      });
    },
  };
};
