import type { ProjectConversationDocument } from "../projects.types.js";
import type { ProjectConversationRetryState } from "../types/project-conversation-turn.types.js";

export const findProjectConversationRetryState = (
  conversation: ProjectConversationDocument,
  clientRequestId: string,
): ProjectConversationRetryState | null => {
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
