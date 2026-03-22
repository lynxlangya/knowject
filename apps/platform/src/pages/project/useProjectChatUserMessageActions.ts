import { App } from 'antd';
import { useEffect, useMemo, useState } from 'react';
import type { ProjectConversationDetailResponse } from '@api/projects';
import { copyProjectChatText } from './projectChat.clipboard';
import type { ProjectChatUserBubbleActions } from './projectChatBubble.components';
import { tp } from './project.i18n';

interface UseProjectChatUserMessageActionsOptions {
  currentConversationDetail: ProjectConversationDetailResponse | null;
  turnBusy: boolean;
  handleSendMessage: (
    content: string,
    options?: {
      targetUserMessageId?: string;
    },
  ) => Promise<void>;
}

export const useProjectChatUserMessageActions = ({
  currentConversationDetail,
  turnBusy,
  handleSendMessage,
}: UseProjectChatUserMessageActionsOptions) => {
  const { message } = App.useApp();
  const [editingUserMessageId, setEditingUserMessageId] = useState<string | null>(
    null,
  );

  const userMessageMap = useMemo(() => {
    return new Map(
      (currentConversationDetail?.messages ?? [])
        .filter((chatMessage) => chatMessage.role === 'user')
        .map((chatMessage) => [chatMessage.id, chatMessage] as const),
    );
  }, [currentConversationDetail?.messages]);

  useEffect(() => {
    if (!editingUserMessageId) {
      return;
    }

    if (!userMessageMap.has(editingUserMessageId)) {
      setEditingUserMessageId(null);
    }
  }, [editingUserMessageId, userMessageMap]);

  const startEditingUserMessage = (messageId: string) => {
    if (turnBusy || (editingUserMessageId && editingUserMessageId !== messageId)) {
      return;
    }

    if (!userMessageMap.has(messageId)) {
      message.warning(tp('conversation.userActions.missingEdit'));
      return;
    }

    setEditingUserMessageId(messageId);
  };

  const retryUserMessage = (messageId: string) => {
    if (turnBusy || editingUserMessageId) {
      return;
    }

    const targetUserMessage = userMessageMap.get(messageId);

    if (!targetUserMessage) {
      message.warning(tp('conversation.userActions.missingRetry'));
      return;
    }

    void handleSendMessage(targetUserMessage.content, {
      targetUserMessageId: targetUserMessage.id,
    });
  };

  const copyUserMessage = async (messageId: string) => {
    if (turnBusy || editingUserMessageId) {
      return;
    }

    const targetUserMessage = userMessageMap.get(messageId);

    if (!targetUserMessage) {
      message.warning(tp('conversation.userActions.missingCopy'));
      return;
    }

    try {
      await copyProjectChatText(targetUserMessage.content);
      message.success(tp('conversation.userActions.copied'));
    } catch (error) {
      console.error(error);
      message.error(tp('conversation.userActions.copyFailed'));
    }
  };

  const confirmEditedUserMessage = (messageId: string, nextContent: string) => {
    const trimmedContent = nextContent.trim();

    if (!trimmedContent) {
      message.warning(tp('conversation.userActions.contentRequired'));
      return;
    }

    if (!userMessageMap.has(messageId)) {
      message.warning(tp('conversation.userActions.missingSave'));
      setEditingUserMessageId(null);
      return;
    }

    setEditingUserMessageId(null);
    void handleSendMessage(trimmedContent, {
      targetUserMessageId: messageId,
    });
  };

  const cancelEditingUserMessage = () => {
    setEditingUserMessageId(null);
  };

  const getUserMessageActionHandlers = (
    messageId: string,
  ): ProjectChatUserBubbleActions | null => {
    if (!userMessageMap.has(messageId)) {
      return null;
    }

    const editing = editingUserMessageId === messageId;
    const disabled =
      turnBusy || (!!editingUserMessageId && editingUserMessageId !== messageId);

    return {
      editing,
      disabled,
      onRetry: () => retryUserMessage(messageId),
      onEditStart: () => startEditingUserMessage(messageId),
      onEditConfirm: (content) => confirmEditedUserMessage(messageId, content),
      onEditCancel: cancelEditingUserMessage,
      onCopy: () => {
        void copyUserMessage(messageId);
      },
    };
  };

  return {
    editingUserMessageId,
    messageActionLocked: turnBusy || editingUserMessageId !== null,
    getUserMessageActionHandlers,
  };
};
