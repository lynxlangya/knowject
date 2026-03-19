import { App } from 'antd';
import { useEffect, useMemo, useState } from 'react';
import type { ProjectConversationDetailResponse } from '@api/projects';
import { copyProjectChatText } from './projectChat.clipboard';
import type { ProjectChatUserBubbleActions } from './projectChatBubble.components';

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
      message.warning('目标用户消息不存在，无法编辑');
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
      message.warning('目标用户消息不存在，无法重试');
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
      message.warning('目标用户消息不存在，无法复制');
      return;
    }

    try {
      await copyProjectChatText(targetUserMessage.content);
      message.success('已复制消息');
    } catch (error) {
      console.error(error);
      message.error('复制消息失败，请稍后重试');
    }
  };

  const confirmEditedUserMessage = (messageId: string, nextContent: string) => {
    const trimmedContent = nextContent.trim();

    if (!trimmedContent) {
      message.warning('请输入消息内容');
      return;
    }

    if (!userMessageMap.has(messageId)) {
      message.warning('目标用户消息不存在，无法保存');
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
