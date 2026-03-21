import type { ProjectConversationRuntime } from "./project-conversation-runtime.js";
import { ProjectsRepository } from "./projects.repository.js";
import {
  createProjectConversationDetailEnvelope,
  persistProjectConversationAssistantReply,
  restorePreparedReplayConversation,
} from "./project-conversation-turn.persist.js";
import type {
  ProjectCommandContext,
  ProjectConversationDetailEnvelope,
  ProjectConversationStreamOptions,
} from "./projects.types.js";
import {
  createProjectConversationStreamErrorEvent,
  createProjectConversationStreamEventEmitter,
} from "./adapters/project-conversation-stream.events.js";
import type { PreparedProjectConversationTurn } from "./types/project-conversation-turn.types.js";
import {
  createProjectConversationStreamingUnavailableError,
  requireProjectConversationClientRequestId,
} from "./validators/project-conversation-turn.validator.js";

const isAbortError = (error: unknown): boolean => {
  return error instanceof Error && error.name === "AbortError";
};

export const createSynchronousProjectConversationTurn = async ({
  repository,
  conversationRuntime,
  context,
  preparedTurn,
}: {
  repository: ProjectsRepository;
  conversationRuntime?: ProjectConversationRuntime;
  context: ProjectCommandContext;
  preparedTurn: PreparedProjectConversationTurn;
}): Promise<ProjectConversationDetailEnvelope> => {
  if (preparedTurn.existingAssistantMessage || !conversationRuntime) {
    return createProjectConversationDetailEnvelope(
      preparedTurn.project,
      preparedTurn.conversation,
      context.locale,
    );
  }

  try {
    const assistantReply = await conversationRuntime.generateAssistantReply({
      actor: context.actor,
      project: preparedTurn.project,
      conversation: preparedTurn.conversation,
      userMessage: preparedTurn.userMessage,
    });

    const persistedAssistantReply =
      await persistProjectConversationAssistantReply({
        repository,
        preparedTurn,
        assistantReply,
        locale: context.locale,
      });

    return persistedAssistantReply.detail;
  } catch (error) {
    await restorePreparedReplayConversation(repository, preparedTurn);
    throw error;
  }
};

export const createStreamingProjectConversationTurn = async ({
  repository,
  conversationRuntime,
  context,
  preparedTurn,
  options,
}: {
  repository: ProjectsRepository;
  conversationRuntime?: ProjectConversationRuntime;
  context: ProjectCommandContext;
  preparedTurn: PreparedProjectConversationTurn;
  options: ProjectConversationStreamOptions;
}): Promise<void> => {
  if (!conversationRuntime) {
    throw createProjectConversationStreamingUnavailableError();
  }

  const clientRequestId = requireProjectConversationClientRequestId(
    preparedTurn.clientRequestId,
  );
  const eventEmitter = createProjectConversationStreamEventEmitter({
    conversationId: preparedTurn.conversationId,
    clientRequestId,
    onEvent: options.onEvent,
  });
  let assistantPersisted = false;

  try {
    await eventEmitter.emitEvent({
      type: "ack",
      userMessageId: preparedTurn.userMessage.id,
      userMessagePersisted: true,
    });

    if (preparedTurn.existingAssistantMessage) {
      await eventEmitter.emitEvent({
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
      signal: options.signal,
      onDelta: async (delta) => {
        if (!delta) {
          return;
        }

        await eventEmitter.emitEvent({
          type: "delta",
          delta,
        });
      },
    });

    if (options.signal?.aborted || streamReply.finishReason === "cancelled") {
      await restorePreparedReplayConversation(repository, preparedTurn);
      return;
    }

    const persistedAssistantReply =
      await persistProjectConversationAssistantReply({
        repository,
        preparedTurn,
        assistantReply: {
          content: streamReply.content,
          sources: streamReply.sources,
        },
        locale: context.locale,
      });
    assistantPersisted = true;

    await eventEmitter.emitEvent({
      type: "done",
      assistantMessageId: persistedAssistantReply.assistantMessageId,
      assistantMessagePersisted: true,
      finishReason: streamReply.finishReason,
    });
  } catch (error) {
    if (!assistantPersisted) {
      await restorePreparedReplayConversation(repository, preparedTurn);
    }

    if (options.signal?.aborted || isAbortError(error)) {
      return;
    }

    await eventEmitter.emitEvent(
      createProjectConversationStreamErrorEvent({
        conversationId: preparedTurn.conversationId,
        clientRequestId,
        sequence: eventEmitter.getNextSequence(),
        locale: context.locale,
        error,
      }),
    );
  }
};
