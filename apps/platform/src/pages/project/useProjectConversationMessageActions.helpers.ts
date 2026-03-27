import type {
  ProjectConversationDetailResponse,
  ProjectConversationMessageResponse,
} from '../../api/projects';

export interface ProjectConversationMessageBulkActionState {
  exportDisabled: boolean;
  knowledgeDraftDisabled: boolean;
}

export interface ProjectConversationAssistantActionState {
  retryDisabled: boolean;
  starDisabled: boolean;
}

export const buildProjectConversationMessageBulkActionState = ({
  isStreaming,
  selectedMessageCount,
}: {
  isStreaming: boolean;
  selectedMessageCount: number;
}): ProjectConversationMessageBulkActionState => {
  const disabled = isStreaming || selectedMessageCount <= 0;

  return {
    exportDisabled: disabled,
    knowledgeDraftDisabled: disabled,
  };
};

export const buildProjectConversationAssistantActionState = ({
  messageActionLocked,
  turnBusy,
  starringMessageId,
  messageId,
}: {
  messageActionLocked: boolean;
  turnBusy: boolean;
  starringMessageId: string | null;
  messageId: string;
}): ProjectConversationAssistantActionState => {
  return {
    retryDisabled: messageActionLocked,
    starDisabled:
      turnBusy ||
      (starringMessageId !== null && starringMessageId !== messageId),
  };
};

export const applyOptimisticProjectConversationMessageStar = ({
  conversation,
  messageId,
  starred,
}: {
  conversation: ProjectConversationDetailResponse;
  messageId: string;
  starred: boolean;
}): {
  conversation: ProjectConversationDetailResponse;
  previousMessage: ProjectConversationMessageResponse | null;
} => {
  let previousMessage: ProjectConversationMessageResponse | null = null;
  const nextStarredAt = starred ? new Date().toISOString() : null;

  return {
    conversation: {
      ...conversation,
      messages: conversation.messages.map((message) => {
        if (message.id !== messageId) {
          return message;
        }

        previousMessage = message;

        return {
          ...message,
          starred,
          starredAt: nextStarredAt,
          starredBy: starred ? message.starredBy : null,
        };
      }),
    },
    previousMessage,
  };
};

export const restoreProjectConversationMessage = ({
  conversation,
  message,
}: {
  conversation: ProjectConversationDetailResponse;
  message: ProjectConversationMessageResponse;
}): ProjectConversationDetailResponse => {
  return {
    ...conversation,
    messages: conversation.messages.map((currentMessage) =>
      currentMessage.id === message.id ? message : currentMessage,
    ),
  };
};

export const findProjectConversationAssistantRetryTarget = ({
  conversation,
  messageId,
}: {
  conversation: ProjectConversationDetailResponse;
  messageId: string;
}): ProjectConversationMessageResponse | null => {
  const targetAssistantMessageIndex = conversation.messages.findIndex(
    (message) => message.id === messageId && message.role === 'assistant',
  );

  if (targetAssistantMessageIndex <= 0) {
    return null;
  }

  for (
    let currentIndex = targetAssistantMessageIndex - 1;
    currentIndex >= 0;
    currentIndex -= 1
  ) {
    const currentMessage = conversation.messages[currentIndex];

    if (currentMessage?.role === 'user') {
      return currentMessage;
    }
  }

  return null;
};

export const replaceProjectConversationMessage = ({
  conversation,
  message,
}: {
  conversation: ProjectConversationDetailResponse;
  message: ProjectConversationMessageResponse;
}): ProjectConversationDetailResponse => {
  return {
    ...conversation,
    messages: conversation.messages.map((currentMessage) =>
      currentMessage.id === message.id ? message : currentMessage,
    ),
  };
};
