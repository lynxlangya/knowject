import assert from 'node:assert/strict';
import test from 'node:test';
import {
  applyOptimisticProjectConversationMessageStar,
  buildProjectConversationAssistantActionState,
  buildProjectConversationMessageBulkActionState,
  findProjectConversationAssistantRetryTarget,
  restoreProjectConversationMessage,
} from '../src/pages/project/useProjectConversationMessageActions';

test('applyOptimisticProjectConversationMessageStar can roll back to the previous message snapshot', () => {
  const conversation = {
    id: 'chat-1',
    projectId: 'project-1',
    title: '项目对话',
    updatedAt: '2026-03-20T08:00:10.000Z',
    preview: '当前对话摘要',
    messages: [
      {
        id: 'message-1',
        conversationId: 'chat-1',
        role: 'assistant' as const,
        content: '现有回答',
        createdAt: '2026-03-20T08:00:00.000Z',
        sources: [],
        starred: false,
        starredAt: null,
        starredBy: null,
      },
    ],
  };

  const optimisticResult = applyOptimisticProjectConversationMessageStar({
    conversation,
    messageId: 'message-1',
    starred: true,
  });

  assert.equal(optimisticResult.conversation.messages[0]?.starred, true);
  assert.ok(optimisticResult.previousMessage);

  const restoredConversation = restoreProjectConversationMessage({
    conversation: optimisticResult.conversation,
    message: optimisticResult.previousMessage!,
  });

  assert.equal(restoredConversation.messages[0]?.starred, false);
  assert.equal(restoredConversation.messages[0]?.starredAt, null);
});

test('buildProjectConversationMessageBulkActionState disables export and knowledge actions while streaming', () => {
  const actionState = buildProjectConversationMessageBulkActionState({
    isStreaming: true,
    selectedMessageCount: 3,
  });

  assert.equal(actionState.exportDisabled, true);
  assert.equal(actionState.knowledgeDraftDisabled, true);
});

test('buildProjectConversationAssistantActionState disables retry while message actions are locked', () => {
  const actionState = buildProjectConversationAssistantActionState({
    messageActionLocked: true,
    turnBusy: false,
    starringMessageId: null,
    messageId: 'message-assistant-1',
  });

  assert.equal(actionState.retryDisabled, true);
  assert.equal(actionState.starDisabled, false);
});

test('buildProjectConversationAssistantActionState keeps retry enabled when only star state is idle', () => {
  const actionState = buildProjectConversationAssistantActionState({
    messageActionLocked: false,
    turnBusy: false,
    starringMessageId: null,
    messageId: 'message-assistant-1',
  });

  assert.equal(actionState.retryDisabled, false);
  assert.equal(actionState.starDisabled, false);
});

test('findProjectConversationAssistantRetryTarget resolves the nearest previous user message', () => {
  const conversation = {
    id: 'chat-1',
    projectId: 'project-1',
    title: '项目对话',
    updatedAt: '2026-03-20T08:00:10.000Z',
    preview: '当前对话摘要',
    messages: [
      {
        id: 'message-user-1',
        conversationId: 'chat-1',
        role: 'user' as const,
        content: '第一轮问题',
        createdAt: '2026-03-20T08:00:00.000Z',
        sources: [],
        starred: false,
        starredAt: null,
        starredBy: null,
      },
      {
        id: 'message-assistant-1',
        conversationId: 'chat-1',
        role: 'assistant' as const,
        content: '第一轮回答',
        createdAt: '2026-03-20T08:00:02.000Z',
        sources: [],
        starred: false,
        starredAt: null,
        starredBy: null,
      },
      {
        id: 'message-user-2',
        conversationId: 'chat-1',
        role: 'user' as const,
        content: '第二轮问题',
        createdAt: '2026-03-20T08:01:00.000Z',
        sources: [],
        starred: false,
        starredAt: null,
        starredBy: null,
      },
      {
        id: 'message-assistant-2',
        conversationId: 'chat-1',
        role: 'assistant' as const,
        content: '第二轮回答',
        createdAt: '2026-03-20T08:01:02.000Z',
        sources: [],
        starred: true,
        starredAt: '2026-03-20T08:01:03.000Z',
        starredBy: 'user-1',
      },
    ],
  };

  const retryTarget = findProjectConversationAssistantRetryTarget({
    conversation,
    messageId: 'message-assistant-2',
  });

  assert.equal(retryTarget?.id, 'message-user-2');
  assert.equal(retryTarget?.content, '第二轮问题');
});

test('findProjectConversationAssistantRetryTarget returns null when no previous user message exists', () => {
  const conversation = {
    id: 'chat-1',
    projectId: 'project-1',
    title: '项目对话',
    updatedAt: '2026-03-20T08:00:10.000Z',
    preview: '当前对话摘要',
    messages: [
      {
        id: 'message-assistant-1',
        conversationId: 'chat-1',
        role: 'assistant' as const,
        content: '孤立回答',
        createdAt: '2026-03-20T08:00:02.000Z',
        sources: [],
        starred: false,
        starredAt: null,
        starredBy: null,
      },
    ],
  };

  const retryTarget = findProjectConversationAssistantRetryTarget({
    conversation,
    messageId: 'message-assistant-1',
  });

  assert.equal(retryTarget, null);
});
