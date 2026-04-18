import type {
  ProjectConversationCitationContent,
  ProjectConversationDetailResponse,
  ProjectConversationMessageResponse,
  ProjectConversationSummaryResponse,
  ProjectConversationStreamCitationPatchEvent,
} from '@api/projects';

export interface PendingProjectConversationTurnSubmission {
  projectId: string;
  conversationId: string;
  content: string;
  clientRequestId: string;
  targetUserMessageId?: string;
  skillId?: string;
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
    left.targetUserMessageId === right.targetUserMessageId &&
    left.skillId === right.skillId
  );
};

export const resolvePendingProjectConversationClientRequestId = ({
  pendingSubmission,
  projectId,
  conversationId,
  content,
  targetUserMessageId,
  skillId,
  createClientRequestId = () => globalThis.crypto.randomUUID(),
}: {
  pendingSubmission: PendingProjectConversationTurnSubmission | null;
  projectId: string;
  conversationId: string;
  content: string;
  targetUserMessageId?: string;
  skillId?: string;
  createClientRequestId?: () => string;
}): string => {
  if (
    pendingSubmission &&
    pendingSubmission.projectId === projectId &&
    pendingSubmission.conversationId === conversationId &&
    pendingSubmission.content === content &&
    pendingSubmission.targetUserMessageId === targetUserMessageId &&
    pendingSubmission.skillId === skillId
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

const createPersistedUserMessageFromStreamDone = ({
  conversationId,
  userMessageId,
  content,
  createdAt,
}: {
  conversationId: string;
  userMessageId: string;
  content: string;
  createdAt: string;
}): ProjectConversationMessageResponse => {
  return {
    id: userMessageId,
    conversationId,
    role: 'user',
    content,
    createdAt,
    starred: false,
    starredAt: null,
    starredBy: null,
  };
};

export const reconcileProjectConversationDetailFromStreamDone = ({
  currentDetail,
  submission,
  activeUserMessageId,
  pendingUserMessageCreatedAt,
  draftAssistantContent,
  assistantMessage,
  conversationSummary,
  citationPatch,
}: {
  currentDetail: ProjectConversationDetailResponse;
  submission: PendingProjectConversationTurnSubmission;
  activeUserMessageId: string | null;
  pendingUserMessageCreatedAt: string;
  draftAssistantContent?: string;
  assistantMessage: ProjectConversationMessageResponse;
  conversationSummary: ProjectConversationSummaryResponse;
  citationPatch?: Pick<
    ProjectConversationStreamCitationPatchEvent,
    'assistantMessageId' | 'citationContent'
  >;
}): ProjectConversationDetailResponse => {
  let nextMessages = currentDetail.messages;
  const shouldPreserveDraftSourceMarkers =
    !citationPatch &&
    assistantMessage.citationContent === undefined &&
    typeof draftAssistantContent === 'string' &&
    /\[\[source\d+\]\]/i.test(draftAssistantContent);
  const reconciledAssistantMessage = shouldPreserveDraftSourceMarkers
    ? {
        ...assistantMessage,
        content: draftAssistantContent,
      }
    : assistantMessage;

  if (submission.targetUserMessageId) {
    const replayTargetIndex = nextMessages.findIndex(
      (message) =>
        message.id === submission.targetUserMessageId && message.role === 'user',
    );

    if (replayTargetIndex >= 0) {
      nextMessages = nextMessages.slice(0, replayTargetIndex + 1).map((message) =>
        message.id === submission.targetUserMessageId
          ? {
              ...message,
              content: submission.content,
            }
          : message,
      );
    }
  } else if (
    activeUserMessageId &&
    !nextMessages.some((message) => message.id === activeUserMessageId)
  ) {
    nextMessages = [
      ...nextMessages,
      createPersistedUserMessageFromStreamDone({
        conversationId: currentDetail.id,
        userMessageId: activeUserMessageId,
        content: submission.content,
        createdAt: pendingUserMessageCreatedAt,
      }),
    ];
  }

  const assistantMessageIndex = nextMessages.findIndex(
    (message) => message.id === reconciledAssistantMessage.id,
  );
  nextMessages =
    assistantMessageIndex >= 0
      ? nextMessages.map((message) =>
          message.id === reconciledAssistantMessage.id
            ? reconciledAssistantMessage
            : message,
        )
      : [...nextMessages, reconciledAssistantMessage];

  if (
    citationPatch &&
    citationPatch.assistantMessageId === reconciledAssistantMessage.id
  ) {
    nextMessages = nextMessages.map((message) =>
      message.id === citationPatch.assistantMessageId
        ? {
            ...message,
            citationContent: citationPatch.citationContent,
          }
        : message,
    );
  }

  return {
    ...currentDetail,
    ...conversationSummary,
    messages: nextMessages,
  };
};

export const patchMessageCitationContent = (
  detail: ProjectConversationDetailResponse,
  messageId: string,
  citationContent: ProjectConversationCitationContent,
): ProjectConversationDetailResponse => {
  return {
    ...detail,
    messages: detail.messages.map((message) =>
      message.id === messageId
        ? {
            ...message,
            citationContent,
          }
        : message,
    ),
  };
};

export const patchProjectConversationSummariesFromStreamDone = ({
  summaries,
  conversationSummary,
}: {
  summaries: ProjectConversationSummaryResponse[];
  conversationSummary: ProjectConversationSummaryResponse;
}): ProjectConversationSummaryResponse[] => {
  return [conversationSummary, ...summaries.filter(
    (summary) => summary.id !== conversationSummary.id,
  )].sort(
    (left, right) =>
      new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime(),
  );
};
