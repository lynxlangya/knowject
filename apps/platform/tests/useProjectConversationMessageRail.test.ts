import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildProjectConversationMessageRailSnapshot,
  closeProjectConversationMessageKnowledgeDrawer,
  completeProjectConversationMessageKnowledgeSave,
  getSelectableProjectConversationMessageIds,
} from '../src/pages/project/useProjectConversationMessageRail';

test('selection mode keeps the rail expanded even when panelOpen is false', () => {
  const snapshot = buildProjectConversationMessageRailSnapshot({
    mode: 'selection',
    panelOpen: false,
    selectedMessageIds: ['message-1'],
    messages: [],
  });

  assert.equal(snapshot.expanded, true);
  assert.equal(snapshot.panelOpen, false);
  assert.equal(snapshot.mode, 'selection');
});

test('browse mode only expands when the desktop panel is explicitly opened', () => {
  const collapsedSnapshot = buildProjectConversationMessageRailSnapshot({
    mode: 'browse',
    panelOpen: false,
    messages: [],
  });
  const expandedSnapshot = buildProjectConversationMessageRailSnapshot({
    mode: 'browse',
    panelOpen: true,
    messages: [],
  });

  assert.equal(collapsedSnapshot.expanded, false);
  assert.equal(expandedSnapshot.expanded, true);
});

test('getSelectableProjectConversationMessageIds filters pending user and draft assistant messages', () => {
  const selectableMessageIds = getSelectableProjectConversationMessageIds({
    messages: [
      {
        id: 'message-1',
        role: 'user',
        createdAt: '2026-03-19T09:00:00.000Z',
      },
      {
        id: 'message-2',
        role: 'assistant',
        createdAt: '2026-03-19T09:00:05.000Z',
      },
      {
        id: 'pending-user-message',
        role: 'user',
        createdAt: '2026-03-19T09:00:10.000Z',
      },
      {
        id: 'draft-assistant-message',
        role: 'assistant',
        createdAt: '2026-03-19T09:00:15.000Z',
      },
    ],
    pendingUserMessageId: 'pending-user-message',
    draftAssistantMessageId: 'draft-assistant-message',
  });

  assert.deepEqual(selectableMessageIds, ['message-1', 'message-2']);
});

test('closing the knowledge draft drawer keeps selection mode and selected ids', () => {
  const nextSelectionState = closeProjectConversationMessageKnowledgeDrawer({
    mode: 'selection',
    selectedMessageIds: ['message-1', 'message-2'],
  });

  assert.equal(nextSelectionState.mode, 'selection');
  assert.deepEqual(nextSelectionState.selectedMessageIds, [
    'message-1',
    'message-2',
  ]);
});

test('knowledge save success clears selection and returns to browse mode', () => {
  const nextSelectionState = completeProjectConversationMessageKnowledgeSave({
    mode: 'selection',
    selectedMessageIds: ['message-1'],
  });

  assert.equal(nextSelectionState.mode, 'browse');
  assert.deepEqual(nextSelectionState.selectedMessageIds, []);
});
