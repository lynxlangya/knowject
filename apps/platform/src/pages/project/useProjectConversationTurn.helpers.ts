import type { ProjectConversationMessageResponse } from '@api/projects';

export interface PendingProjectConversationTurnSubmission {
  projectId: string;
  conversationId: string;
  content: string;
  clientRequestId: string;
  targetUserMessageId?: string;
}

export interface OptimisticProjectConversationReplay {
  targetUserMessageId: string;
  content: string;
}

export const isSamePendingProjectConversationTurnSubmission = (
  left: PendingProjectConversationTurnSubmission | null,
  right: PendingProjectConversationTurnSubmission,
): boolean => {
  return (
    left?.projectId === right.projectId &&
    left.conversationId === right.conversationId &&
    left.clientRequestId === right.clientRequestId &&
    left.targetUserMessageId === right.targetUserMessageId
  );
};

export const resolvePendingProjectConversationClientRequestId = ({
  pendingSubmission,
  projectId,
  conversationId,
  content,
  targetUserMessageId,
  createClientRequestId = () => globalThis.crypto.randomUUID(),
}: {
  pendingSubmission: PendingProjectConversationTurnSubmission | null;
  projectId: string;
  conversationId: string;
  content: string;
  targetUserMessageId?: string;
  createClientRequestId?: () => string;
}): string => {
  if (
    pendingSubmission &&
    pendingSubmission.projectId === projectId &&
    pendingSubmission.conversationId === conversationId &&
    pendingSubmission.content === content &&
    pendingSubmission.targetUserMessageId === targetUserMessageId
  ) {
    return pendingSubmission.clientRequestId;
  }

  return createClientRequestId();
};

export const reconcilePendingProjectConversationTurnSubmission = ({
  pendingSubmission,
  submission,
  clearPendingSubmission,
}: {
  pendingSubmission: PendingProjectConversationTurnSubmission | null;
  submission: PendingProjectConversationTurnSubmission;
  clearPendingSubmission: boolean;
}): PendingProjectConversationTurnSubmission | null => {
  if (
    !pendingSubmission ||
    !isSamePendingProjectConversationTurnSubmission(
      pendingSubmission,
      submission,
    )
  ) {
    return pendingSubmission;
  }

  return clearPendingSubmission ? null : pendingSubmission;
};

export const buildOptimisticProjectConversationMessages = ({
  messages,
  replay,
}: {
  messages: ProjectConversationMessageResponse[];
  replay: OptimisticProjectConversationReplay | null;
}): ProjectConversationMessageResponse[] => {
  if (!replay) {
    return messages;
  }

  const targetUserMessageIndex = messages.findIndex(
    (message) => message.id === replay.targetUserMessageId,
  );

  if (targetUserMessageIndex < 0) {
    return messages;
  }

  const targetUserMessage = messages[targetUserMessageIndex];

  if (!targetUserMessage || targetUserMessage.role !== 'user') {
    return messages;
  }

  return messages.slice(0, targetUserMessageIndex + 1).map((message, index) =>
    index === targetUserMessageIndex
      ? {
          ...message,
          content: replay.content,
        }
      : message,
  );
};
