import assert from 'node:assert/strict';
import test from 'node:test';
import {
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
