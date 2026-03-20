import { App } from 'antd';
import {
  useCallback,
  useState,
  type Dispatch,
  type SetStateAction,
} from 'react';
import type {
  ProjectConversationDetailResponse,
  ProjectConversationMessageResponse,
} from '../../api/projects';
import { createMarkdownSourceFile } from '../knowledge/knowledgeUpload.shared';
import { copyProjectChatText } from './projectChat.clipboard';
import {
  buildConversationMessageMarkdown,
  buildKnowledgeDraftDefaults,
  type KnowledgeDraftDefaults,
} from './projectConversationMessageExport';
import type { ProjectChatAssistantBubbleActions } from './projectChatBubble.components';

export interface ProjectKnowledgeDraftValues extends KnowledgeDraftDefaults {}

export interface ProjectConversationMessageBulkActionState {
  exportDisabled: boolean;
  knowledgeDraftDisabled: boolean;
}

export interface ProjectConversationAssistantActionState {
  retryDisabled: boolean;
  starDisabled: boolean;
}

export interface SaveProjectKnowledgeDraftResult {
  status: 'success' | 'partial_failure' | 'error';
  knowledgeId?: string;
  message?: string;
}

const getErrorMessage = (error: unknown, fallback: string): string => {
  return error instanceof Error && error.message ? error.message : fallback;
};

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

const downloadMarkdownFile = (file: File) => {
  const downloadUrl = URL.createObjectURL(file);
  const anchor = document.createElement('a');

  anchor.href = downloadUrl;
  anchor.download = file.name;
  anchor.rel = 'noopener';
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(downloadUrl);
};

interface UseProjectConversationMessageActionsOptions {
  activeProjectId: string;
  conversationId?: string;
  currentConversationDetail: ProjectConversationDetailResponse | null;
  messageActionLocked: boolean;
  turnBusy: boolean;
  handleSendMessage: (
    content: string,
    options?: {
      targetUserMessageId?: string;
    },
  ) => Promise<void>;
  setConversationDetail: Dispatch<
    SetStateAction<ProjectConversationDetailResponse | null>
  >;
  refreshProjectKnowledge?: () => void | Promise<void>;
}

export const useProjectConversationMessageActions = ({
  activeProjectId,
  conversationId,
  currentConversationDetail,
  messageActionLocked,
  turnBusy,
  handleSendMessage,
  setConversationDetail,
  refreshProjectKnowledge,
}: UseProjectConversationMessageActionsOptions) => {
  const { message } = App.useApp();
  const [starringMessageId, setStarringMessageId] = useState<string | null>(null);
  const [savingKnowledgeDraft, setSavingKnowledgeDraft] = useState(false);

  const getSelectedMessages = useCallback(
    (selectedMessageIds: string[]): ProjectConversationMessageResponse[] => {
      if (!currentConversationDetail) {
        return [];
      }

      const selectedMessageIdSet = new Set(selectedMessageIds);

      return currentConversationDetail.messages.filter((conversationMessage) =>
        selectedMessageIdSet.has(conversationMessage.id),
      );
    },
    [currentConversationDetail],
  );

  const buildSelectedMessagesMarkdown = useCallback(
    (selectedMessageIds: string[]): string | null => {
      if (!currentConversationDetail) {
        return null;
      }

      const selectedMessages = getSelectedMessages(selectedMessageIds);

      if (selectedMessages.length <= 0) {
        return null;
      }

      return buildConversationMessageMarkdown({
        conversationTitle: currentConversationDetail.title,
        messages: selectedMessages,
      });
    },
    [currentConversationDetail, getSelectedMessages],
  );

  const toggleMessageStar = useCallback(
    async (messageId: string, starred: boolean): Promise<boolean> => {
      if (!currentConversationDetail || !conversationId) {
        message.warning('当前对话尚未准备完成，暂时无法更新消息星标');
        return false;
      }

      const optimisticResult = applyOptimisticProjectConversationMessageStar({
        conversation: currentConversationDetail,
        messageId,
        starred,
      });

      if (!optimisticResult.previousMessage) {
        message.warning('目标消息不存在，无法更新星标');
        return false;
      }

      setConversationDetail(optimisticResult.conversation);
      setStarringMessageId(messageId);

      try {
        const { updateProjectConversationMessageMetadata } = await import(
          '../../api/projects'
        );
        const result = await updateProjectConversationMessageMetadata(
          activeProjectId,
          conversationId,
          messageId,
          {
            starred,
          },
        );

        setConversationDetail((currentConversation) => {
          if (!currentConversation || currentConversation.id !== conversationId) {
            return currentConversation;
          }

          return replaceProjectConversationMessage({
            conversation: currentConversation,
            message: result.message,
          });
        });
        return true;
      } catch (currentError) {
        setConversationDetail((currentConversation) => {
          if (!currentConversation || currentConversation.id !== conversationId) {
            return currentConversation;
          }

          return restoreProjectConversationMessage({
            conversation: currentConversation,
            message: optimisticResult.previousMessage!,
          });
        });
        message.error(
          getErrorMessage(currentError, '更新消息星标失败，请稍后重试'),
        );
        return false;
      } finally {
        setStarringMessageId((currentMessageId) =>
          currentMessageId === messageId ? null : currentMessageId,
        );
      }
    },
    [
      activeProjectId,
      conversationId,
      currentConversationDetail,
      message,
      setConversationDetail,
    ],
  );

  const copyAssistantMessage = useCallback(
    async (content: string): Promise<boolean> => {
      try {
        await copyProjectChatText(content);
        message.success('已复制回复');
        return true;
      } catch (currentError) {
        console.error(currentError);
        message.error('复制回复失败，请稍后重试');
        return false;
      }
    },
    [message],
  );

  const copyPersistedAssistantMessage = useCallback(
    async (messageId: string): Promise<boolean> => {
      const targetAssistantMessage = currentConversationDetail?.messages.find(
        (conversationMessage) =>
          conversationMessage.id === messageId &&
          conversationMessage.role === 'assistant',
      );

      if (!targetAssistantMessage) {
        message.warning('目标助手回复不存在，无法复制');
        return false;
      }

      return copyAssistantMessage(targetAssistantMessage.content);
    },
    [copyAssistantMessage, currentConversationDetail, message],
  );

  const retryAssistantMessage = useCallback(
    async (messageId: string): Promise<boolean> => {
      if (messageActionLocked) {
        return false;
      }

      if (!currentConversationDetail) {
        message.warning('当前对话尚未准备完成，暂时无法重试该回复');
        return false;
      }

      const retryTarget = findProjectConversationAssistantRetryTarget({
        conversation: currentConversationDetail,
        messageId,
      });

      if (!retryTarget) {
        message.warning('未找到可重试的上一条用户消息');
        return false;
      }

      void handleSendMessage(retryTarget.content, {
        targetUserMessageId: retryTarget.id,
      });
      return true;
    },
    [
      currentConversationDetail,
      handleSendMessage,
      message,
      messageActionLocked,
    ],
  );

  const getAssistantMessageActionHandlers = useCallback(
    (messageId: string): ProjectChatAssistantBubbleActions | null => {
      const targetAssistantMessage = currentConversationDetail?.messages.find(
        (conversationMessage) =>
          conversationMessage.id === messageId &&
          conversationMessage.role === 'assistant',
      );

      if (!targetAssistantMessage) {
        return null;
      }

      const assistantActionState = buildProjectConversationAssistantActionState({
        messageActionLocked,
        turnBusy,
        starringMessageId,
        messageId,
      });

      return {
        copyDisabled: false,
        retryDisabled: assistantActionState.retryDisabled,
        starDisabled: assistantActionState.starDisabled,
        starring: starringMessageId === messageId,
        starred: targetAssistantMessage.starred,
        onCopy: () => {
          void copyPersistedAssistantMessage(messageId);
        },
        onRetry: () => {
          void retryAssistantMessage(messageId);
        },
        onToggleStar: () => {
          void toggleMessageStar(messageId, !targetAssistantMessage.starred);
        },
      };
    },
    [
      copyPersistedAssistantMessage,
      currentConversationDetail,
      messageActionLocked,
      retryAssistantMessage,
      starringMessageId,
      toggleMessageStar,
      turnBusy,
    ],
  );

  const getDraftAssistantMessageActionHandlers = useCallback(
    (content: string): ProjectChatAssistantBubbleActions => ({
      copyDisabled: content.trim().length <= 0,
      retryDisabled: true,
      starDisabled: true,
      starring: false,
      starred: false,
      onCopy: () => {
        void copyAssistantMessage(content);
      },
      onRetry: () => undefined,
      onToggleStar: () => undefined,
    }),
    [copyAssistantMessage],
  );

  const exportSelectedMessagesAsMarkdown = useCallback(
    (selectedMessageIds: string[]): boolean => {
      if (typeof document === 'undefined') {
        return false;
      }

      const markdownContent = buildSelectedMessagesMarkdown(selectedMessageIds);

      if (!markdownContent || !currentConversationDetail) {
        message.warning('请先选择至少一条已持久化的消息');
        return false;
      }

      const markdownFile = createMarkdownSourceFile({
        title: currentConversationDetail.title,
        content: markdownContent,
      });

      downloadMarkdownFile(markdownFile);
      return true;
    },
    [buildSelectedMessagesMarkdown, currentConversationDetail, message],
  );

  const buildKnowledgeDraftFromSelection = useCallback(
    (selectedMessageIds: string[]): ProjectKnowledgeDraftValues | null => {
      const markdownContent = buildSelectedMessagesMarkdown(selectedMessageIds);

      if (!markdownContent || !currentConversationDetail) {
        return null;
      }

      return buildKnowledgeDraftDefaults({
        conversationTitle: currentConversationDetail.title,
        markdownContent,
      });
    },
    [buildSelectedMessagesMarkdown, currentConversationDetail],
  );

  const saveKnowledgeDraft = useCallback(
    async (
      draft: ProjectKnowledgeDraftValues,
      options?: {
        existingKnowledgeId?: string | null;
      },
    ): Promise<SaveProjectKnowledgeDraftResult> => {
      const knowledgeName = draft.knowledgeName.trim();
      const knowledgeDescription = draft.knowledgeDescription.trim();
      const documentTitle = draft.documentTitle.trim();
      const markdownContent = draft.markdownContent.trim();

      if (!knowledgeName || !documentTitle || !markdownContent) {
        return {
          status: 'error',
          message: '请补全知识名称、文档标题和 Markdown 内容',
        };
      }

      setSavingKnowledgeDraft(true);

      let knowledgeId = options?.existingKnowledgeId ?? null;

      try {
        if (!knowledgeId) {
          const { createProjectKnowledge } = await import('../../api/knowledge');
          const result = await createProjectKnowledge(activeProjectId, {
            name: knowledgeName,
            description: knowledgeDescription,
            sourceType: 'global_docs',
          });

          knowledgeId = result.knowledge.id;
          await Promise.resolve(refreshProjectKnowledge?.());
        }

        const markdownFile = createMarkdownSourceFile({
          title: documentTitle,
          content: markdownContent,
        });

        const { uploadProjectKnowledgeDocument } = await import(
          '../../api/knowledge'
        );
        await uploadProjectKnowledgeDocument(
          activeProjectId,
          knowledgeId,
          markdownFile,
        );
        await Promise.resolve(refreshProjectKnowledge?.());

        return {
          status: 'success',
          knowledgeId,
        };
      } catch (currentError) {
        const errorMessage = getErrorMessage(
          currentError,
          knowledgeId && !options?.existingKnowledgeId
            ? '知识库已创建，但 Markdown 上传失败，请稍后重试'
            : '保存知识草稿失败，请稍后重试',
        );

        if (knowledgeId) {
          await Promise.resolve(refreshProjectKnowledge?.());

          return {
            status: 'partial_failure',
            knowledgeId,
            message: errorMessage,
          };
        }

        return {
          status: 'error',
          message: errorMessage,
        };
      } finally {
        setSavingKnowledgeDraft(false);
      }
    },
    [activeProjectId, refreshProjectKnowledge],
  );

  return {
    starringMessageId,
    savingKnowledgeDraft,
    toggleMessageStar,
    getAssistantMessageActionHandlers,
    getDraftAssistantMessageActionHandlers,
    exportSelectedMessagesAsMarkdown,
    buildKnowledgeDraftFromSelection,
    saveKnowledgeDraft,
  };
};
