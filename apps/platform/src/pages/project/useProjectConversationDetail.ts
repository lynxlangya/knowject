import { extractApiErrorMessage } from '@api/error';
import {
  getProjectConversationDetail,
  type ProjectConversationDetailResponse,
} from '@api/projects';
import {
  useEffect,
  useState,
  type MutableRefObject,
} from 'react';

export interface ProjectConversationTargetRefValue {
  projectId: string;
  chatId?: string;
}

interface UseProjectConversationDetailOptions {
  activeProjectId: string;
  chatId?: string;
  latestConversationTargetRef: MutableRefObject<ProjectConversationTargetRefValue>;
}

interface ReconcileConversationDetailOptions {
  projectId: string;
  conversationId: string;
  previousMessageIds: Set<string>;
  submittedContent: string;
  onRecoveredPersistedUserMessage?: () => void;
}

export const useProjectConversationDetail = ({
  activeProjectId,
  chatId,
  latestConversationTargetRef,
}: UseProjectConversationDetailOptions) => {
  const [conversationDetail, setConversationDetail] =
    useState<ProjectConversationDetailResponse | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  useEffect(() => {
    if (!chatId) {
      setConversationDetail(null);
      setDetailError(null);
      setDetailLoading(false);
      return;
    }

    let cancelled = false;

    const loadConversationDetail = async () => {
      setDetailLoading(true);

      try {
        const result = await getProjectConversationDetail(activeProjectId, chatId);

        if (cancelled) {
          return;
        }

        setConversationDetail(result.conversation);
        setDetailError(null);
      } catch (currentError) {
        if (cancelled) {
          return;
        }

        console.error(currentError);
        setConversationDetail(null);
        setDetailError(
          extractApiErrorMessage(currentError, '加载项目对话失败，请稍后重试'),
        );
      } finally {
        if (!cancelled) {
          setDetailLoading(false);
        }
      }
    };

    void loadConversationDetail();

    return () => {
      cancelled = true;
    };
  }, [activeProjectId, chatId]);

  const currentConversationDetail =
    conversationDetail?.projectId === activeProjectId &&
    conversationDetail.id === chatId
      ? conversationDetail
      : null;

  const shouldShowConversationSkeleton =
    Boolean(chatId) &&
    (detailLoading ||
      (conversationDetail !== null && currentConversationDetail === null));

  const reconcileConversationDetail = async ({
    projectId,
    conversationId,
    previousMessageIds,
    submittedContent,
    onRecoveredPersistedUserMessage,
  }: ReconcileConversationDetailOptions) => {
    try {
      const result = await getProjectConversationDetail(projectId, conversationId);
      const recoveredPersistedUserMessage = result.conversation.messages.some(
        (chatMessage) =>
          chatMessage.role === 'user' &&
          chatMessage.content === submittedContent &&
          !previousMessageIds.has(chatMessage.id),
      );

      const latestTarget = latestConversationTargetRef.current;
      if (
        latestTarget.projectId === projectId &&
        latestTarget.chatId === conversationId
      ) {
        setConversationDetail(result.conversation);
        setDetailError(null);

        if (recoveredPersistedUserMessage) {
          onRecoveredPersistedUserMessage?.();
        }
      }
    } catch (currentError) {
      console.error(currentError);

      const latestTarget = latestConversationTargetRef.current;
      if (
        latestTarget.projectId === projectId &&
        latestTarget.chatId === conversationId
      ) {
        setDetailError(
          extractApiErrorMessage(currentError, '刷新项目对话失败，请稍后重试'),
        );
      }
    }
  };

  return {
    conversationDetail,
    currentConversationDetail,
    detailLoading,
    detailError,
    shouldShowConversationSkeleton,
    setConversationDetail,
    setDetailError,
    reconcileConversationDetail,
    syncConversationAfterFailure: reconcileConversationDetail,
  };
};
