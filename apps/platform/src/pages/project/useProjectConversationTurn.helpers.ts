export interface PendingProjectConversationTurnSubmission {
  projectId: string;
  conversationId: string;
  content: string;
  clientRequestId: string;
}

export const isSamePendingProjectConversationTurnSubmission = (
  left: PendingProjectConversationTurnSubmission | null,
  right: PendingProjectConversationTurnSubmission,
): boolean => {
  return (
    left?.projectId === right.projectId &&
    left.conversationId === right.conversationId &&
    left.clientRequestId === right.clientRequestId
  );
};

export const resolvePendingProjectConversationClientRequestId = ({
  pendingSubmission,
  projectId,
  conversationId,
  content,
  createClientRequestId = () => globalThis.crypto.randomUUID(),
}: {
  pendingSubmission: PendingProjectConversationTurnSubmission | null;
  projectId: string;
  conversationId: string;
  content: string;
  createClientRequestId?: () => string;
}): string => {
  if (
    pendingSubmission &&
    pendingSubmission.projectId === projectId &&
    pendingSubmission.conversationId === conversationId &&
    pendingSubmission.content === content
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
