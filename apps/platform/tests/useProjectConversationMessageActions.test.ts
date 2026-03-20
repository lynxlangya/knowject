import assert from 'node:assert/strict';
import test from 'node:test';
import {
  applyOptimisticProjectConversationMessageStar,
  buildProjectConversationMessageBulkActionState,
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
