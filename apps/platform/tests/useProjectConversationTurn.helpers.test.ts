import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildOptimisticProjectConversationMessages,
  reconcilePendingProjectConversationTurnSubmission,
  resolvePendingProjectConversationClientRequestId,
  type PendingProjectConversationTurnSubmission,
} from '../src/pages/project/useProjectConversationTurn.helpers';

const createPendingSubmission = (): PendingProjectConversationTurnSubmission => {
  return {
    projectId: 'project-1',
    conversationId: 'chat-1',
    content: '请总结当前项目对话现状',
    clientRequestId: 'request-1',
  };
};

test('resolvePendingProjectConversationClientRequestId reuses the pending request id for the same turn', () => {
  const pendingSubmission = createPendingSubmission();

  const clientRequestId = resolvePendingProjectConversationClientRequestId({
    pendingSubmission,
    projectId: pendingSubmission.projectId,
    conversationId: pendingSubmission.conversationId,
    content: pendingSubmission.content,
    createClientRequestId: () => 'request-2',
  });

  assert.equal(clientRequestId, 'request-1');
});

test('resolvePendingProjectConversationClientRequestId creates a new id when replay target changes', () => {
  const pendingSubmission = {
    ...createPendingSubmission(),
    targetUserMessageId: 'msg-user-1',
  } satisfies PendingProjectConversationTurnSubmission;

  const clientRequestId = resolvePendingProjectConversationClientRequestId({
    pendingSubmission,
    projectId: pendingSubmission.projectId,
    conversationId: pendingSubmission.conversationId,
    content: pendingSubmission.content,
    targetUserMessageId: 'msg-user-2',
    createClientRequestId: () => 'request-2',
  });

  assert.equal(clientRequestId, 'request-2');
});

test('reconcilePendingProjectConversationTurnSubmission preserves pending retries when the turn is unfinished', () => {
  const pendingSubmission = createPendingSubmission();

  const nextPendingSubmission =
    reconcilePendingProjectConversationTurnSubmission({
      pendingSubmission,
      submission: pendingSubmission,
      clearPendingSubmission: false,
    });

  assert.deepEqual(nextPendingSubmission, pendingSubmission);
});

test('reconcilePendingProjectConversationTurnSubmission clears the pending retry only after completion', () => {
  const pendingSubmission = createPendingSubmission();

  const nextPendingSubmission =
    reconcilePendingProjectConversationTurnSubmission({
      pendingSubmission,
      submission: pendingSubmission,
      clearPendingSubmission: true,
    });

  assert.equal(nextPendingSubmission, null);
});

test('buildOptimisticProjectConversationMessages truncates later turns and updates the replayed user message', () => {
  const messages = [
    {
      id: 'msg-user-1',
      conversationId: 'chat-1',
      role: 'user' as const,
      content: '第一轮问题',
      createdAt: '2026-03-19T09:00:00.000Z',
    },
    {
      id: 'msg-assistant-1',
      conversationId: 'chat-1',
      role: 'assistant' as const,
      content: '第一轮回答',
      createdAt: '2026-03-19T09:00:05.000Z',
    },
    {
      id: 'msg-user-2',
      conversationId: 'chat-1',
      role: 'user' as const,
      content: '第二轮问题',
      createdAt: '2026-03-19T09:01:00.000Z',
    },
    {
      id: 'msg-assistant-2',
      conversationId: 'chat-1',
      role: 'assistant' as const,
      content: '第二轮回答',
      createdAt: '2026-03-19T09:01:05.000Z',
    },
  ];

  const optimisticMessages = buildOptimisticProjectConversationMessages({
    messages,
    replay: {
      targetUserMessageId: 'msg-user-1',
      content: '第一轮问题（编辑后）',
    },
  });

  assert.deepEqual(
    optimisticMessages.map((message) => ({
      id: message.id,
      content: message.content,
    })),
    [
      {
        id: 'msg-user-1',
        content: '第一轮问题（编辑后）',
      },
    ],
  );
  assert.deepEqual(
    messages.map((message) => ({
      id: message.id,
      content: message.content,
    })),
    [
      {
        id: 'msg-user-1',
        content: '第一轮问题',
      },
      {
        id: 'msg-assistant-1',
        content: '第一轮回答',
      },
      {
        id: 'msg-user-2',
        content: '第二轮问题',
      },
      {
        id: 'msg-assistant-2',
        content: '第二轮回答',
      },
    ],
  );
});

test('buildOptimisticProjectConversationMessages restores the original thread when replay clears', () => {
  const messages = [
    {
      id: 'msg-user-1',
      conversationId: 'chat-1',
      role: 'user' as const,
      content: '第一轮问题',
      createdAt: '2026-03-19T09:00:00.000Z',
    },
    {
      id: 'msg-assistant-1',
      conversationId: 'chat-1',
      role: 'assistant' as const,
      content: '第一轮回答',
      createdAt: '2026-03-19T09:00:05.000Z',
    },
  ];

  buildOptimisticProjectConversationMessages({
    messages,
    replay: {
      targetUserMessageId: 'msg-user-1',
      content: '第一轮问题（编辑后）',
    },
  });

  const restoredMessages = buildOptimisticProjectConversationMessages({
    messages,
    replay: null,
  });

  assert.deepEqual(restoredMessages, messages);
});

test('buildOptimisticProjectConversationMessages ignores invalid replay targets', () => {
  const messages = [
    {
      id: 'msg-assistant-1',
      conversationId: 'chat-1',
      role: 'assistant' as const,
      content: '已有回答',
      createdAt: '2026-03-19T09:00:05.000Z',
    },
  ];

  const optimisticMessages = buildOptimisticProjectConversationMessages({
    messages,
    replay: {
      targetUserMessageId: 'msg-user-missing',
      content: '不会生效',
    },
  });

  assert.deepEqual(optimisticMessages, messages);
});
