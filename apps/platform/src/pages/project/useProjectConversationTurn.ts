import { App } from 'antd';
import {
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type MutableRefObject,
  type SetStateAction,
} from 'react';
import { ApiError } from '@knowject/request';
import { extractApiErrorMessage } from '@api/error';
import type { ProjectConversationDetailResponse } from '@api/projects';
import { streamProjectConversationMessage } from '@api/projects.stream';
import type { ConversationSummary } from '@app/project/project.types';
import type { ProjectPageRefreshableListState } from './projectPageContext';
import {
  reconcilePendingProjectConversationTurnSubmission,
  resolvePendingProjectConversationClientRequestId,
  type PendingProjectConversationTurnSubmission,
} from './useProjectConversationTurn.helpers';
import type { ProjectChatIssue } from './useProjectChatSettings';
import type { ProjectConversationTargetRefValue } from './useProjectConversationDetail';

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
  conversationId: string;
  content: string;
  createdAt: string;
  status: Extract<ProjectConversationStreamStatus, 'streaming' | 'reconciling'>;
}

interface UseProjectConversationTurnOptions {
  activeProjectId: string;
  chatId?: string;
  latestConversationTargetRef: MutableRefObject<ProjectConversationTargetRefValue>;
  conversations: ProjectPageRefreshableListState<ConversationSummary>;
  currentConversationDetail: ProjectConversationDetailResponse | null;
  setComposerValue: Dispatch<SetStateAction<string>>;
  setChatRuntimeIssue: Dispatch<SetStateAction<ProjectChatIssue | null>>;
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
    setActiveClientRequestId(null);
    setActiveUserMessageId(null);
    setStreamError(null);
    setStreamStatus('idle');
    activeAbortController?.abort();
  }, [activeProjectId, chatId]);

  const clearDraftMessages = () => {
    setPendingUserMessage(null);
    setDraftAssistantMessage(null);
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
      resetTurnState();
      setStreamStatus('idle');
    }
  };

  const handleSendMessage = async (rawContent: string) => {
    if (!chatId) {
      message.warning('请先选择或新建一个对话线程');
      return;
    }

    const nextContent = rawContent.trim();

    if (!nextContent) {
      message.warning('请输入消息内容');
      return;
    }

    if (streamStatus === 'streaming' || streamStatus === 'reconciling') {
      return;
    }

    const requestProjectId = activeProjectId;
    const requestConversationId = chatId;
    const clientRequestId = resolvePendingProjectConversationClientRequestId({
      pendingSubmission: pendingSubmissionRef.current,
      projectId: requestProjectId,
      conversationId: requestConversationId,
      content: nextContent,
    });
    const previousMessageIds = new Set(
      currentConversationDetail?.messages.map((chatMessage) => chatMessage.id) ?? [],
    );
    const currentSubmission = {
      projectId: requestProjectId,
      conversationId: requestConversationId,
      content: nextContent,
      clientRequestId,
    } satisfies PendingProjectConversationTurnSubmission;
    const abortController = new AbortController();
    let receivedDone = false;
    let streamEventError: ApiError | null = null;

    pendingSubmissionRef.current = currentSubmission;
    activeTurnRef.current = currentSubmission;
    activeAbortControllerRef.current = abortController;
    setChatRuntimeIssue(null);
    setStreamError(null);
    setStreamStatus('streaming');
    setActiveClientRequestId(clientRequestId);
    setActiveUserMessageId(null);
    setPendingUserMessage({
      id: `pending-user:${clientRequestId}`,
      conversationId: requestConversationId,
      content: nextContent,
      createdAt: new Date().toISOString(),
    });
    setDraftAssistantMessage({
      id: `draft-assistant:${clientRequestId}`,
      conversationId: requestConversationId,
      content: '',
      createdAt: new Date().toISOString(),
      status: 'streaming',
    });

    try {
      await streamProjectConversationMessage(
        requestProjectId,
        requestConversationId,
        {
          content: nextContent,
          clientRequestId,
        },
        {
          signal: abortController.signal,
          onEvent: async (event) => {
            if (!isCurrentTurn(currentSubmission)) {
              return;
            }

            switch (event.type) {
              case 'ack':
                setActiveUserMessageId(event.userMessageId);
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
                return;
              case 'done':
                receivedDone = true;
                setDraftAssistantMessage((currentValue) => {
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
          '项目对话流在完成前已提前结束',
          502,
          'PROJECT_CONVERSATION_STREAM_UNEXPECTED_EOF',
        );
      }

      await reconcileAfterStream({
        submission: currentSubmission,
        previousMessageIds,
        clearPendingSubmission: true,
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
        setStreamStatus('error');
        setStreamError(
          extractApiErrorMessage(currentError, '发送消息失败，请稍后重试'),
        );
      }

      if (isCurrentConversationTarget(requestProjectId, requestConversationId)) {
        const nextIssue = buildChatIssueFromError(
          currentError,
          '发送消息失败，请稍后重试',
        );

        if (nextIssue) {
          setChatRuntimeIssue(nextIssue);
        } else {
          message.error(
            extractApiErrorMessage(currentError, '发送消息失败，请稍后重试'),
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
    setStreamStatus('reconciling');
    activeAbortControllerRef.current.abort();
  };

  return {
    streamStatus,
    activeClientRequestId,
    activeUserMessageId,
    streamError,
    pendingUserMessage,
    draftAssistantMessage,
    isStreaming: streamStatus === 'streaming',
    turnBusy: streamStatus === 'streaming' || streamStatus === 'reconciling',
    handleSendMessage,
    handleCancelStreaming,
  };
};
