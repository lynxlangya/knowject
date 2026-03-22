import { App } from 'antd';
import {
  useEffect,
  useState,
  type Dispatch,
  type MutableRefObject,
  type SetStateAction,
} from 'react';
import { useNavigate } from 'react-router-dom';
import { extractApiErrorCode, extractApiErrorMessage } from '@api/error';
import {
  createProjectConversation,
  deleteProjectConversation,
  updateProjectConversation,
} from '@api/projects';
import { buildProjectChatPath } from '@app/navigation/paths';
import type { ConversationSummary } from '@app/project/project.types';
import type { ProjectPageRefreshableListState } from './projectPageContext';
import type { ProjectConversationContextAction } from './projectChat.adapters';
import type {
  ProjectChatIssue,
} from './useProjectChatSettings';
import type { ProjectConversationTargetRefValue } from './useProjectConversationDetail';
import { tp } from './project.i18n';

interface UseProjectChatActionsOptions {
  activeProjectId: string;
  latestConversationTargetRef: MutableRefObject<ProjectConversationTargetRefValue>;
  conversations: ProjectPageRefreshableListState<ConversationSummary>;
  turnBusy: boolean;
  setConversationDetail: Dispatch<
    SetStateAction<import('@api/projects').ProjectConversationDetailResponse | null>
  >;
  setDetailError: Dispatch<SetStateAction<string | null>>;
  setChatRuntimeIssue: Dispatch<SetStateAction<ProjectChatIssue | null>>;
  buildChatIssueFromError: (
    error: unknown,
    fallback: string,
  ) => ProjectChatIssue | null;
}

export const useProjectChatActions = ({
  activeProjectId,
  latestConversationTargetRef,
  conversations,
  turnBusy,
  setConversationDetail,
  setDetailError,
  setChatRuntimeIssue,
  buildChatIssueFromError,
}: UseProjectChatActionsOptions) => {
  const { message, modal } = App.useApp();
  const navigate = useNavigate();
  const [renameTargetConversation, setRenameTargetConversation] =
    useState<ConversationSummary | null>(null);
  const [renameConversationTitleDraft, setRenameConversationTitleDraft] =
    useState('');
  const [creatingConversation, setCreatingConversation] = useState(false);
  const [renamingConversation, setRenamingConversation] = useState(false);
  const [deletingConversation, setDeletingConversation] = useState(false);

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

  const createActionLocked = creatingConversation || turnBusy;
  const conversationActionsLocked =
    renamingConversation || deletingConversation;

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
          tp('conversation.actions.createFailed'),
        );

        if (nextIssue) {
          setChatRuntimeIssue(nextIssue);
        } else {
          message.error(
            extractApiErrorMessage(currentError, tp('conversation.actions.createFailed')),
          );
        }
      }
    } finally {
      setCreatingConversation(false);
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
      message.warning(tp('conversation.actions.renameRequired'));
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
      message.success(tp('conversation.actions.renameSuccess'));
    } catch (currentError) {
      console.error(currentError);
      message.error(
        extractApiErrorMessage(currentError, tp('conversation.actions.renameFailed')),
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
      message.warning(tp('conversation.actions.keepOne'));
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
      title: tp('conversation.actions.deleteTitle'),
      content: tp('conversation.actions.deleteContent', { title: currentTitle }),
      okText: tp('conversation.actions.deleteConfirm'),
      okButtonProps: { danger: true },
      cancelText: tp('conversation.actions.cancel'),
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

            message.success(tp('conversation.actions.deleteSuccess', { title: currentTitle }));
          } catch (currentError) {
            console.error(currentError);

            if (
              extractApiErrorCode(currentError) ===
              'PROJECT_CONVERSATION_LAST_THREAD_FORBIDDEN'
            ) {
              message.warning(
                extractApiErrorMessage(
                  currentError,
                  tp('conversation.actions.keepOne'),
                ),
              );
            } else {
              message.error(
                extractApiErrorMessage(
                  currentError,
                  tp('conversation.actions.deleteFailed'),
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
        message.info(tp('conversation.actions.shareSoon'));
        return;
      case 'knowledge':
        message.info(tp('conversation.actions.knowledgeSoon'));
        return;
      case 'resources':
        message.info(tp('conversation.actions.resourcesSoon'));
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
    renameTargetConversation,
    renameConversationTitleDraft,
    setRenameConversationTitleDraft,
    creatingConversation,
    renamingConversation,
    deletingConversation,
    createActionLocked,
    conversationActionsLocked,
    handleCreateChat,
    handleConversationContextAction,
    handleUpdateConversationTitle,
    handleCancelRenamingConversation,
    handleSelectConversation,
  };
};
