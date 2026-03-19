import type {
  ProjectConversationDocument,
  ProjectConversationMessageDocument,
} from "../projects.types.js";
import { createProjectConversationReplayTargetError } from "../validators/project-conversation-turn.validator.js";

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

export const buildReplayConversationMessages = ({
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
