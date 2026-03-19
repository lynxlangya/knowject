import { App } from 'antd';
import { useEffect, useRef, useState, type Dispatch, type MutableRefObject, type SetStateAction } from 'react';
import { useNavigate } from 'react-router-dom';
import { extractApiErrorCode, extractApiErrorMessage } from '@api/error';
import {
  createProjectConversation,
  createProjectConversationMessage,
  deleteProjectConversation,
  updateProjectConversation,
  type ProjectConversationDetailResponse,
} from '@api/projects';
import { buildProjectChatPath } from '@app/navigation/paths';
import type { ConversationSummary } from '@app/project/project.types';
import type { ProjectPageRefreshableListState } from './projectPageContext';
import type { ProjectConversationContextAction } from './projectChat.adapters';
import type {
  ProjectChatIssue,
} from './useProjectChatSettings';
import type { ProjectConversationTargetRefValue } from './useProjectConversationDetail';

interface UseProjectChatActionsOptions {
  activeProjectId: string;
  chatId?: string;
  latestConversationTargetRef: MutableRefObject<ProjectConversationTargetRefValue>;
  conversations: ProjectPageRefreshableListState<ConversationSummary>;
  currentConversationDetail: ProjectConversationDetailResponse | null;
  detailLoading: boolean;
  chatSettingsLoading: boolean;
  blockingChatIssue: ProjectChatIssue | null;
  setConversationDetail: Dispatch<
    SetStateAction<ProjectConversationDetailResponse | null>
  >;
  setDetailError: Dispatch<SetStateAction<string | null>>;
  setChatRuntimeIssue: Dispatch<SetStateAction<ProjectChatIssue | null>>;
  buildChatIssueFromError: (
    error: unknown,
    fallback: string,
  ) => ProjectChatIssue | null;
  syncConversationAfterFailure: (options: {
    projectId: string;
    conversationId: string;
    previousMessageIds: Set<string>;
    submittedContent: string;
    onRecoveredPersistedUserMessage?: () => void;
  }) => Promise<void>;
}

interface PendingProjectChatSubmission {
  projectId: string;
  conversationId: string;
  content: string;
  clientRequestId: string;
}

export const useProjectChatActions = ({
  activeProjectId,
  chatId,
  latestConversationTargetRef,
  conversations,
  currentConversationDetail,
  detailLoading,
  chatSettingsLoading,
  blockingChatIssue,
  setConversationDetail,
  setDetailError,
  setChatRuntimeIssue,
  buildChatIssueFromError,
  syncConversationAfterFailure,
}: UseProjectChatActionsOptions) => {
  const { message, modal } = App.useApp();
  const navigate = useNavigate();
  const [composerValue, setComposerValue] = useState('');
  const [renameTargetConversation, setRenameTargetConversation] =
    useState<ConversationSummary | null>(null);
  const [renameConversationTitleDraft, setRenameConversationTitleDraft] =
    useState('');
  const [creatingConversation, setCreatingConversation] = useState(false);
  const [renamingConversation, setRenamingConversation] = useState(false);
  const [deletingConversation, setDeletingConversation] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);
  const pendingSubmissionRef = useRef<PendingProjectChatSubmission | null>(null);

  useEffect(() => {
    setComposerValue('');
    pendingSubmissionRef.current = null;
  }, [activeProjectId, chatId]);

  useEffect(() => {
    setRenameTargetConversation(null);
    setRenameConversationTitleDraft('');
  }, [activeProjectId]);

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

  const createActionLocked = creatingConversation || sendingMessage;
  const conversationActionsLocked =
    detailLoading || renamingConversation || deletingConversation;
  const sendActionLocked =
    sendingMessage ||
    detailLoading ||
    chatSettingsLoading ||
    blockingChatIssue !== null;
  const canSubmitMessage = composerValue.trim().length > 0 && !sendActionLocked;

  const handleCreateChat = async () => {
    if (createActionLocked) {
      return;
    }

    const requestProjectId = activeProjectId;
    setCreatingConversation(true);

    try {
      const result = await createProjectConversation(requestProjectId);

      if (!isCurrentProject(requestProjectId)) {
        return;
      }

      setChatRuntimeIssue(null);
      void navigate(buildProjectChatPath(requestProjectId, result.conversation.id));
      void conversations.refresh();
    } catch (currentError) {
      console.error(currentError);

      if (isCurrentProject(requestProjectId)) {
        const nextIssue = buildChatIssueFromError(
          currentError,
          '新建对话失败，请稍后重试',
        );

        if (nextIssue) {
          setChatRuntimeIssue(nextIssue);
        } else {
          message.error(
            extractApiErrorMessage(currentError, '新建对话失败，请稍后重试'),
          );
        }
      }
    } finally {
      setCreatingConversation(false);
    }
  };

  const handleSendMessage = async () => {
    if (!chatId) {
      message.warning('请先选择或新建一个对话线程');
      return;
    }

    const nextContent = composerValue.trim();

    if (!nextContent) {
      message.warning('请输入消息内容');
      return;
    }

    if (sendActionLocked) {
      return;
    }

    const requestProjectId = activeProjectId;
    const requestConversationId = chatId;
    const existingPendingSubmission = pendingSubmissionRef.current;
    const clientRequestId =
      existingPendingSubmission &&
      existingPendingSubmission.projectId === requestProjectId &&
      existingPendingSubmission.conversationId === requestConversationId &&
      existingPendingSubmission.content === nextContent
        ? existingPendingSubmission.clientRequestId
        : globalThis.crypto.randomUUID();
    const previousMessageIds = new Set(
      currentConversationDetail?.messages.map((chatMessage) => chatMessage.id) ?? [],
    );
    pendingSubmissionRef.current = {
      projectId: requestProjectId,
      conversationId: requestConversationId,
      content: nextContent,
      clientRequestId,
    };
    setSendingMessage(true);

    try {
      const result = await createProjectConversationMessage(
        requestProjectId,
        requestConversationId,
        {
          content: nextContent,
          clientRequestId,
        },
      );

      if (isCurrentConversationTarget(requestProjectId, requestConversationId)) {
        setChatRuntimeIssue(null);
        setConversationDetail(result.conversation);
        setDetailError(null);
        setComposerValue('');
      }
      pendingSubmissionRef.current = null;

      if (isCurrentProject(requestProjectId)) {
        void conversations.refresh();
      }
    } catch (currentError) {
      console.error(currentError);

      if (isCurrentProject(requestProjectId)) {
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

      await Promise.allSettled([
        isCurrentProject(requestProjectId)
          ? conversations.refresh()
          : Promise.resolve(),
        isCurrentConversationTarget(requestProjectId, requestConversationId)
          ? syncConversationAfterFailure({
              projectId: requestProjectId,
              conversationId: requestConversationId,
              previousMessageIds,
              submittedContent: nextContent,
            })
          : Promise.resolve(),
      ]);
    } finally {
      setSendingMessage(false);
    }
  };

  const handleStartRenamingConversation = (
    conversation: ConversationSummary,
  ) => {
    if (conversationActionsLocked) {
      return;
    }

    setRenameTargetConversation(conversation);
    setRenameConversationTitleDraft(conversation.title);
  };

  const handleCancelRenamingConversation = () => {
    if (renamingConversation) {
      return;
    }

    setRenameTargetConversation(null);
    setRenameConversationTitleDraft('');
  };

  const handleUpdateConversationTitle = async () => {
    if (!renameTargetConversation || renamingConversation) {
      return;
    }

    const nextTitle = renameConversationTitleDraft.trim();

    if (!nextTitle) {
      message.warning('请输入对话标题');
      return;
    }

    if (nextTitle === renameTargetConversation.title.trim()) {
      handleCancelRenamingConversation();
      return;
    }

    const requestProjectId = activeProjectId;
    const requestConversationId = renameTargetConversation.id;
    setRenamingConversation(true);

    try {
      const result = await updateProjectConversation(
        requestProjectId,
        requestConversationId,
        {
          title: nextTitle,
        },
      );

      if (isCurrentConversationTarget(requestProjectId, requestConversationId)) {
        setConversationDetail(result.conversation);
        setDetailError(null);
      }

      if (isCurrentProject(requestProjectId)) {
        void conversations.refresh();
      }

      setRenameTargetConversation(null);
      setRenameConversationTitleDraft('');
      message.success('对话标题已更新');
    } catch (currentError) {
      console.error(currentError);
      message.error(
        extractApiErrorMessage(currentError, '更新对话标题失败，请稍后重试'),
      );
    } finally {
      setRenamingConversation(false);
    }
  };

  const handleDeleteConversation = (conversation: ConversationSummary) => {
    if (deletingConversation) {
      return;
    }

    if (conversations.items.length <= 1) {
      message.warning('至少保留一个对话线程');
      return;
    }

    const requestProjectId = activeProjectId;
    const requestConversationId = conversation.id;
    const currentTitle = conversation.title;
    const currentIndex = conversations.items.findIndex(
      (item) => item.id === requestConversationId,
    );
    const remainingConversations = conversations.items.filter(
      (item) => item.id !== requestConversationId,
    );
    const nextConversation =
      remainingConversations[currentIndex] ??
      remainingConversations[currentIndex - 1] ??
      remainingConversations[0] ??
      null;

    modal.confirm({
      title: '删除当前线程',
      content: `确定删除「${currentTitle}」吗？此操作不可撤销。`,
      okText: '删除',
      okButtonProps: { danger: true },
      cancelText: '取消',
      onOk: () => {
        return (async () => {
          setDeletingConversation(true);

          try {
            await deleteProjectConversation(requestProjectId, requestConversationId);

            if (isCurrentProject(requestProjectId)) {
              void conversations.refresh();
            }

            if (isCurrentConversationTarget(requestProjectId, requestConversationId)) {
              setConversationDetail(null);
              setDetailError(null);
              void navigate(
                nextConversation
                  ? buildProjectChatPath(requestProjectId, nextConversation.id)
                  : buildProjectChatPath(requestProjectId),
              );
            }

            if (renameTargetConversation?.id === requestConversationId) {
              setRenameTargetConversation(null);
              setRenameConversationTitleDraft('');
            }

            message.success(`已删除「${currentTitle}」`);
          } catch (currentError) {
            console.error(currentError);

            if (
              extractApiErrorCode(currentError) ===
              'PROJECT_CONVERSATION_LAST_THREAD_FORBIDDEN'
            ) {
              message.warning(
                extractApiErrorMessage(
                  currentError,
                  '至少保留一个对话线程',
                ),
              );
            } else {
              message.error(
                extractApiErrorMessage(
                  currentError,
                  '删除对话失败，请稍后重试',
                ),
              );
            }

            throw currentError;
          } finally {
            setDeletingConversation(false);
          }
        })();
      },
    });
  };

  const handleConversationContextAction = (
    action: ProjectConversationContextAction,
    conversation: ConversationSummary,
  ) => {
    switch (action) {
      case 'share':
        message.info('后续将支持分享线程。');
        return;
      case 'knowledge':
        message.info('后续将支持把当前讨论沉淀为知识条目。');
        return;
      case 'resources':
        message.info('后续将支持从线程上下文直接查看相关资源。');
        return;
      case 'rename':
        handleStartRenamingConversation(conversation);
        return;
      case 'delete':
        handleDeleteConversation(conversation);
        return;
      default:
        return;
    }
  };

  const handleSelectConversation = (conversationId: string) => {
    if (renameTargetConversation !== null) {
      setRenameTargetConversation(null);
      setRenameConversationTitleDraft('');
    }

    void navigate(buildProjectChatPath(activeProjectId, conversationId));
  };

  return {
    composerValue,
    setComposerValue,
    renameTargetConversation,
    renameConversationTitleDraft,
    setRenameConversationTitleDraft,
    creatingConversation,
    renamingConversation,
    deletingConversation,
    sendingMessage,
    createActionLocked,
    conversationActionsLocked,
    sendActionLocked,
    canSubmitMessage,
    handleCreateChat,
    handleSendMessage,
    handleConversationContextAction,
    handleUpdateConversationTitle,
    handleCancelRenamingConversation,
    handleSelectConversation,
  };
};
