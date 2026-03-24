import { App } from 'antd';
import {
  type Dispatch,
  type SetStateAction,
  useEffect,
  useRef,
  useState,
  type MutableRefObject,
} from 'react';
import { ApiError } from '@knowject/request';
import { extractApiErrorMessage } from '@api/error';
import type {
  ProjectConversationDetailResponse,
  ProjectConversationStreamDoneEvent,
  ProjectConversationSourceResponse,
  ProjectConversationCitationContent,
  ProjectConversationStreamSourcesSeedItem,
} from '@api/projects';
import { streamProjectConversationMessage } from '@api/projects.stream';
import {
  type ProjectPageConversationListState,
} from './projectPageContext';
import type { ConversationSummary } from '@app/project/project.types';
import {
  reconcileProjectConversationDetailFromStreamDone,
  reconcilePendingProjectConversationTurnSubmission,
  resolvePendingProjectConversationClientRequestId,
  type OptimisticProjectConversationReplay,
  type PendingProjectConversationTurnSubmission,
} from './useProjectConversationTurn.helpers';
import type { ProjectChatIssue } from './useProjectChatSettings';
import type { ProjectConversationTargetRefValue } from './useProjectConversationDetail';
import { tp } from './project.i18n';

export type ProjectConversationStreamStatus =
  | 'idle'
  | 'streaming'
  | 'reconciling'
  | 'error';

interface ProjectConversationDraftUserMessage {
  id: string;
  conversationId: string;
  content: string;
  createdAt: string;
}

interface ProjectConversationDraftAssistantMessage {
  id: string;
  clientRequestId: string;
  conversationId: string;
  content: string;
  createdAt: string;
  status: Extract<ProjectConversationStreamStatus, 'streaming' | 'reconciling'>;
  sources?: ProjectConversationSourceResponse[];
  citationContent?: ProjectConversationCitationContent;
  sourceSeedEntries?: ProjectConversationStreamSourcesSeedItem[];
}

interface ProjectConversationAssistantMessageHandoff {
  clientRequestId: string;
  draftMessageId: string;
  assistantMessageId: string;
}

interface ProjectConversationSourceDrawerDraftSnapshot {
  id: string;
  conversationId: string;
  status: 'streaming' | 'reconciling' | 'error';
  sourceSeedEntries: ProjectConversationStreamSourcesSeedItem[];
  retrySubmission: Pick<
    PendingProjectConversationTurnSubmission,
    'content' | 'targetUserMessageId'
  >;
}

interface ProjectConversationOptimisticReplayState
  extends OptimisticProjectConversationReplay {
  conversationId: string;
}

interface UseProjectConversationTurnOptions {
  activeProjectId: string;
  chatId?: string;
  latestConversationTargetRef: MutableRefObject<ProjectConversationTargetRefValue>;
  conversations: ProjectPageConversationListState<ConversationSummary>;
  currentConversationDetail: ProjectConversationDetailResponse | null;
  setConversationDetail: Dispatch<
    SetStateAction<ProjectConversationDetailResponse | null>
  >;
  setDetailError: Dispatch<SetStateAction<string | null>>;
  setComposerValue: (value: string) => void;
  setChatRuntimeIssue: (issue: ProjectChatIssue | null) => void;
  buildChatIssueFromError: (
    error: unknown,
    fallback: string,
  ) => ProjectChatIssue | null;
  reconcileConversationDetail: (options: {
    projectId: string;
    conversationId: string;
    previousMessageIds: Set<string>;
    submittedContent: string;
    onRecoveredPersistedUserMessage?: () => void;
  }) => Promise<void>;
}

const isAbortError = (error: unknown): boolean => {
  return error instanceof Error && error.name === 'AbortError';
};

export const useProjectConversationTurn = ({
  activeProjectId,
  chatId,
  latestConversationTargetRef,
  conversations,
  currentConversationDetail,
  setConversationDetail,
  setDetailError,
  setComposerValue,
  setChatRuntimeIssue,
  buildChatIssueFromError,
  reconcileConversationDetail,
}: UseProjectConversationTurnOptions) => {
  const { message } = App.useApp();
  const [streamStatus, setStreamStatus] =
    useState<ProjectConversationStreamStatus>('idle');
  const [activeClientRequestId, setActiveClientRequestId] = useState<string | null>(
    null,
  );
  const [activeUserMessageId, setActiveUserMessageId] = useState<string | null>(
    null,
  );
  const [streamError, setStreamError] = useState<string | null>(null);
  const [pendingUserMessage, setPendingUserMessage] =
    useState<ProjectConversationDraftUserMessage | null>(null);
  const [draftAssistantMessage, setDraftAssistantMessage] =
    useState<ProjectConversationDraftAssistantMessage | null>(null);
  const [assistantMessageHandoff, setAssistantMessageHandoff] =
    useState<ProjectConversationAssistantMessageHandoff | null>(null);
  const [sourceDrawerDraftSnapshot, setSourceDrawerDraftSnapshot] =
    useState<ProjectConversationSourceDrawerDraftSnapshot | null>(null);
  const [activeReplay, setActiveReplay] =
    useState<ProjectConversationOptimisticReplayState | null>(null);
  const activeAbortControllerRef = useRef<AbortController | null>(null);
  const activeTurnRef = useRef<PendingProjectConversationTurnSubmission | null>(null);
  const pendingSubmissionRef =
    useRef<PendingProjectConversationTurnSubmission | null>(null);

  useEffect(() => {
    return () => {
      activeAbortControllerRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    if (!activeTurnRef.current) {
      return;
    }

    const activeTurn = activeTurnRef.current;
    const targetChanged =
      activeTurn.projectId !== activeProjectId || activeTurn.conversationId !== chatId;

    if (!targetChanged) {
      return;
    }

    const activeAbortController = activeAbortControllerRef.current;
    activeTurnRef.current = null;
    activeAbortControllerRef.current = null;
    clearDraftMessages();
    setActiveReplay(null);
    setActiveClientRequestId(null);
    setActiveUserMessageId(null);
    setStreamError(null);
    setStreamStatus('idle');
    setAssistantMessageHandoff(null);
    setSourceDrawerDraftSnapshot(null);
    activeAbortController?.abort();
  }, [activeProjectId, chatId]);

  const clearDraftMessages = () => {
    setPendingUserMessage(null);
    setDraftAssistantMessage(null);
  };

  const applyOptimisticReplay = (
    replay: ProjectConversationOptimisticReplayState | null,
  ) => {
    setActiveReplay(replay);
  };

  const resetTurnState = ({
    keepStreamError = false,
  }: {
    keepStreamError?: boolean;
  } = {}) => {
    activeAbortControllerRef.current = null;
    activeTurnRef.current = null;
    setActiveClientRequestId(null);
    setActiveUserMessageId(null);
    if (!keepStreamError) {
      setStreamError(null);
    }
  };

  const isCurrentProject = (projectId: string): boolean => {
    return latestConversationTargetRef.current.projectId === projectId;
  };

  const isCurrentConversationTarget = (
    projectId: string,
    conversationId: string,
  ): boolean => {
    const latestTarget = latestConversationTargetRef.current;

    return (
      latestTarget.projectId === projectId &&
      latestTarget.chatId === conversationId
    );
  };

  const isCurrentTurn = (turn: PendingProjectConversationTurnSubmission): boolean => {
    const activeTurn = activeTurnRef.current;

    return (
      activeTurn?.projectId === turn.projectId &&
      activeTurn.conversationId === turn.conversationId &&
      activeTurn.clientRequestId === turn.clientRequestId
    );
  };

  const reconcileAfterStream = async ({
    submission,
    previousMessageIds,
    clearPendingSubmission,
  }: {
    submission: PendingProjectConversationTurnSubmission;
    previousMessageIds: Set<string>;
    clearPendingSubmission: boolean;
  }) => {
    if (isCurrentProject(submission.projectId)) {
      await Promise.allSettled([
        Promise.resolve(conversations.refresh()),
        reconcileConversationDetail({
          projectId: submission.projectId,
          conversationId: submission.conversationId,
          previousMessageIds,
          submittedContent: submission.content,
          onRecoveredPersistedUserMessage: () => {
            if (
              isCurrentConversationTarget(
                submission.projectId,
                submission.conversationId,
              )
            ) {
              setComposerValue('');
            }
          },
        }),
      ]);
    }

    pendingSubmissionRef.current =
      reconcilePendingProjectConversationTurnSubmission({
        pendingSubmission: pendingSubmissionRef.current,
        submission,
        clearPendingSubmission,
      });

    if (isCurrentTurn(submission)) {
      clearDraftMessages();
      if (clearPendingSubmission) {
        setSourceDrawerDraftSnapshot(null);
      }
      resetTurnState();
      setStreamStatus('idle');
      setActiveReplay(null);
    }
  };

  const applyStreamDoneLocally = ({
    submission,
    doneEvent,
    persistedUserMessageId,
    pendingUserMessageCreatedAt,
  }: {
    submission: PendingProjectConversationTurnSubmission;
    doneEvent: ProjectConversationStreamDoneEvent;
    persistedUserMessageId: string | null;
    pendingUserMessageCreatedAt: string;
  }) => {
    if (isCurrentProject(submission.projectId)) {
      conversations.patchSummary(doneEvent.conversationSummary);

      if (
        currentConversationDetail &&
        isCurrentConversationTarget(
          submission.projectId,
          submission.conversationId,
        )
      ) {
        setConversationDetail(
          reconcileProjectConversationDetailFromStreamDone({
            currentDetail: currentConversationDetail,
            submission,
            activeUserMessageId: persistedUserMessageId,
            pendingUserMessageCreatedAt,
            assistantMessage: doneEvent.assistantMessage,
            conversationSummary: doneEvent.conversationSummary,
          }),
        );
        setDetailError(null);
        setComposerValue('');
      }
    }

    pendingSubmissionRef.current =
      reconcilePendingProjectConversationTurnSubmission({
        pendingSubmission: pendingSubmissionRef.current,
        submission,
        clearPendingSubmission: true,
      });

    if (isCurrentTurn(submission)) {
      clearDraftMessages();
      resetTurnState();
      setStreamStatus('idle');
      setActiveReplay(null);
    }
  };

  const handleSendMessage = async (
    rawContent: string,
    options?: {
      targetUserMessageId?: string;
    },
  ) => {
    if (!chatId) {
      message.warning(tp('conversation.turn.selectThread'));
      return;
    }

    const nextContent = rawContent.trim();

    if (!nextContent) {
      message.warning(tp('conversation.turn.messageRequired'));
      return;
    }

    if (streamStatus === 'streaming' || streamStatus === 'reconciling') {
      return;
    }

    const targetUserMessageId = options?.targetUserMessageId;

    if (targetUserMessageId) {
      const targetUserMessage = currentConversationDetail?.messages.find(
        (chatMessage) =>
          chatMessage.id === targetUserMessageId && chatMessage.role === 'user',
      );

      if (!targetUserMessage) {
        message.warning(tp('conversation.turn.targetMissing'));
        return;
      }
    }

    const requestProjectId = activeProjectId;
    const requestConversationId = chatId;
    const clientRequestId = resolvePendingProjectConversationClientRequestId({
      pendingSubmission: pendingSubmissionRef.current,
      projectId: requestProjectId,
      conversationId: requestConversationId,
      content: nextContent,
      targetUserMessageId,
    });
    const previousMessageIds = new Set(
      currentConversationDetail?.messages.map((chatMessage) => chatMessage.id) ?? [],
    );
    const currentSubmission = {
      projectId: requestProjectId,
      conversationId: requestConversationId,
      content: nextContent,
      clientRequestId,
      ...(targetUserMessageId ? { targetUserMessageId } : {}),
    } satisfies PendingProjectConversationTurnSubmission;
    const abortController = new AbortController();
    const pendingUserMessageCreatedAt = new Date().toISOString();
    let receivedDone = false;
    let streamEventError: ApiError | null = null;
    let persistedUserMessageId: string | null = null;
    let streamDoneEvent: ProjectConversationStreamDoneEvent | null = null;

    pendingSubmissionRef.current = currentSubmission;
    activeTurnRef.current = currentSubmission;
    activeAbortControllerRef.current = abortController;
    setChatRuntimeIssue(null);
    setStreamError(null);
    setStreamStatus('streaming');
    setAssistantMessageHandoff(null);
    setActiveClientRequestId(clientRequestId);
    setActiveUserMessageId(null);
    setSourceDrawerDraftSnapshot({
      id: `draft-assistant:${clientRequestId}`,
      conversationId: requestConversationId,
      status: 'streaming',
      sourceSeedEntries: [],
      retrySubmission: {
        content: nextContent,
        ...(targetUserMessageId ? { targetUserMessageId } : {}),
      },
    });

    if (targetUserMessageId) {
      applyOptimisticReplay({
        conversationId: requestConversationId,
        targetUserMessageId,
        content: nextContent,
      });
      setPendingUserMessage(null);
    } else {
      setActiveReplay(null);
      setPendingUserMessage({
        id: `pending-user:${clientRequestId}`,
        conversationId: requestConversationId,
        content: nextContent,
        createdAt: pendingUserMessageCreatedAt,
      });
    }

    setDraftAssistantMessage({
      id: `draft-assistant:${clientRequestId}`,
      clientRequestId,
      conversationId: requestConversationId,
      content: '',
      createdAt: new Date().toISOString(),
      status: 'streaming',
      sources: [],
      citationContent: undefined,
      sourceSeedEntries: [],
    });

    try {
      await streamProjectConversationMessage(
        requestProjectId,
        requestConversationId,
        {
          content: nextContent,
          clientRequestId,
          ...(targetUserMessageId ? { targetUserMessageId } : {}),
        },
        {
          signal: abortController.signal,
          onEvent: async (event) => {
            if (!isCurrentTurn(currentSubmission)) {
              return;
            }

            switch (event.type) {
              case 'ack':
                persistedUserMessageId = event.userMessageId;
                setActiveUserMessageId(event.userMessageId);
                if (!targetUserMessageId) {
                  setPendingUserMessage((currentValue) => {
                    if (!currentValue) {
                      return currentValue;
                    }

                    return {
                      ...currentValue,
                      id: event.userMessageId,
                    };
                  });
                  setComposerValue('');
                }
                return;
              case 'delta':
                setDraftAssistantMessage((currentValue) => {
                  if (!currentValue) {
                    return currentValue;
                  }

                  return {
                    ...currentValue,
                    content: `${currentValue.content}${event.delta}`,
                    status: 'streaming',
                  };
                });
                setSourceDrawerDraftSnapshot((currentValue) => {
                  if (!currentValue) {
                    return currentValue;
                  }

                  return {
                    ...currentValue,
                    status: 'streaming',
                  };
                });
                return;
              case 'sources_seed':
                setDraftAssistantMessage((currentValue) => {
                  if (!currentValue) {
                    return currentValue;
                  }

                  return {
                    ...currentValue,
                    sourceSeedEntries: event.sources,
                  };
                });
                setSourceDrawerDraftSnapshot((currentValue) => {
                  if (!currentValue) {
                    return currentValue;
                  }

                  return {
                    ...currentValue,
                    sourceSeedEntries: event.sources,
                  };
                });
                return;
              case 'done':
                receivedDone = true;
                streamDoneEvent = event;
                setAssistantMessageHandoff({
                  clientRequestId: currentSubmission.clientRequestId,
                  draftMessageId: `draft-assistant:${currentSubmission.clientRequestId}`,
                  assistantMessageId: event.assistantMessageId,
                });
                setDraftAssistantMessage((currentValue) => {
                  if (!currentValue) {
                    return currentValue;
                  }

                  return {
                    ...currentValue,
                    status: 'reconciling',
                  };
                });
                setSourceDrawerDraftSnapshot((currentValue) => {
                  if (!currentValue) {
                    return currentValue;
                  }

                  return {
                    ...currentValue,
                    status: 'reconciling',
                  };
                });
                setStreamStatus('reconciling');
                return;
              case 'error':
                streamEventError = new ApiError(
                  event.message,
                  502,
                  event.code,
                  event,
                );
                setDraftAssistantMessage(null);
                setSourceDrawerDraftSnapshot((currentValue) => {
                  if (!currentValue) {
                    return currentValue;
                  }

                  return {
                    ...currentValue,
                    status: 'error',
                  };
                });
                setStreamStatus('error');
                return;
            }
          },
        },
      );

      if (abortController.signal.aborted) {
        await reconcileAfterStream({
          submission: currentSubmission,
          previousMessageIds,
          clearPendingSubmission: false,
        });
        return;
      }

      if (streamEventError) {
        throw streamEventError;
      }

      if (!receivedDone) {
        throw new ApiError(
          tp('conversation.turn.streamEndedEarly'),
          502,
          'PROJECT_CONVERSATION_STREAM_UNEXPECTED_EOF',
        );
      }

      if (!streamDoneEvent) {
        throw new ApiError(
          tp('conversation.turn.streamEndedEarly'),
          502,
          'PROJECT_CONVERSATION_STREAM_MISSING_DONE_PAYLOAD',
        );
      }

      applyStreamDoneLocally({
        submission: currentSubmission,
        doneEvent: streamDoneEvent,
        persistedUserMessageId,
        pendingUserMessageCreatedAt,
      });
    } catch (currentError) {
      if (abortController.signal.aborted || isAbortError(currentError)) {
        await reconcileAfterStream({
          submission: currentSubmission,
          previousMessageIds,
          clearPendingSubmission: false,
        });
        return;
      }

      console.error(currentError);
      if (isCurrentTurn(currentSubmission)) {
        clearDraftMessages();
        setSourceDrawerDraftSnapshot((currentValue) => {
          if (!currentValue) {
            return currentValue;
          }

          return {
            ...currentValue,
            status: 'error',
          };
        });
        setStreamStatus('error');
        setStreamError(
          extractApiErrorMessage(currentError, tp('conversation.turn.sendFailed')),
        );
      }

      if (isCurrentConversationTarget(requestProjectId, requestConversationId)) {
        const nextIssue = buildChatIssueFromError(
          currentError,
          tp('conversation.turn.sendFailed'),
        );

        if (nextIssue) {
          setChatRuntimeIssue(nextIssue);
        } else {
          message.error(
            extractApiErrorMessage(currentError, tp('conversation.turn.sendFailed')),
          );
        }
      }

      await reconcileAfterStream({
        submission: currentSubmission,
        previousMessageIds,
        clearPendingSubmission: false,
      });
    }
  };

  const handleCancelStreaming = () => {
    if (!activeAbortControllerRef.current || !activeTurnRef.current) {
      return;
    }

    setDraftAssistantMessage(null);
    setSourceDrawerDraftSnapshot((currentValue) => {
      if (!currentValue) {
        return currentValue;
      }

      return {
        ...currentValue,
        status: 'error',
      };
    });
    setStreamStatus('reconciling');
    activeAbortControllerRef.current.abort();
  };

  const retrySourceDrawerTurn = () => {
    if (!sourceDrawerDraftSnapshot?.retrySubmission) {
      return;
    }

    void handleSendMessage(sourceDrawerDraftSnapshot.retrySubmission.content, {
      targetUserMessageId: sourceDrawerDraftSnapshot.retrySubmission.targetUserMessageId,
    });
  };

  return {
    streamStatus,
    activeClientRequestId,
    activeUserMessageId,
    streamError,
    activeReplay,
    pendingUserMessage,
    draftAssistantMessage,
    sourceDrawerDraftSnapshot,
    assistantMessageHandoff,
    isStreaming: streamStatus === 'streaming',
    turnBusy: streamStatus === 'streaming' || streamStatus === 'reconciling',
    handleSendMessage,
    retrySourceDrawerTurn,
    handleCancelStreaming,
  };
};
