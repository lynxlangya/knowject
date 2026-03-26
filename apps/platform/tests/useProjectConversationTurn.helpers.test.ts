import assert from 'node:assert/strict';
import test from 'node:test';
import * as turnHelpers from '../src/pages/project/useProjectConversationTurn.helpers';
import {
  patchProjectConversationSummariesFromStreamDone,
  buildOptimisticProjectConversationMessages,
  reconcileProjectConversationDetailFromStreamDone,
  reconcilePendingProjectConversationTurnSubmission,
  resolvePendingProjectConversationClientRequestId,
  type PendingProjectConversationTurnSubmission,
} from '../src/pages/project/useProjectConversationTurn.helpers';
import type {
  ProjectConversationDetailResponse,
  ProjectConversationMessageResponse,
  ProjectConversationSummaryResponse,
} from '../src/api/projects';

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

test('patchMessageCitationContent replaces citationContent for the targeted assistant message only', () => {
  const detail = createConversationDetail();
  const patchMessageCitationContent = (
    turnHelpers as Record<string, unknown>
  ).patchMessageCitationContent as
    | ((
        currentDetail: ProjectConversationDetailResponse,
        messageId: string,
        citationContent: NonNullable<ProjectConversationMessageResponse['citationContent']>,
      ) => ProjectConversationDetailResponse)
    | undefined;

  assert.equal(typeof patchMessageCitationContent, 'function');

  const nextDetail = patchMessageCitationContent!(
    {
      ...detail,
      messages: [
        ...detail.messages,
        {
          id: 'msg-assistant-new',
          conversationId: 'chat-1',
          role: 'assistant',
          content: '当前项目已经具备最小对话写链路，并开始接入项目级检索。',
          createdAt: '2026-03-23T10:00:10.000Z',
          sources: [
            {
              id: 's1',
              knowledgeId: 'kb-1',
              documentId: 'doc-1',
              chunkId: 'chunk-1',
              chunkIndex: 0,
              source: 'chat-core.md',
              snippet:
                '项目对话已经具备最小消息写链路，并开始接入项目级 merged retrieval。',
              distance: 0.18,
            },
          ],
          starred: false,
          starredAt: null,
          starredBy: null,
        },
      ],
    },
    'msg-assistant-new',
    {
      version: 1,
      sentences: [
        {
          id: 'sent-1',
          text: '当前项目已经具备最小对话写链路，并开始接入项目级检索。',
          sourceIds: ['s1'],
          grounded: true,
        },
      ],
    },
  );

  assert.equal(nextDetail.messages[1]?.citationContent, undefined);
  const persistedAssistantMessage = nextDetail.messages.find(
    (message) => message.id === 'msg-assistant-new',
  );

  assert.deepEqual(persistedAssistantMessage?.citationContent, {
    version: 1,
    sentences: [
      {
        id: 'sent-1',
        text: '当前项目已经具备最小对话写链路，并开始接入项目级检索。',
        sourceIds: ['s1'],
        grounded: true,
      },
    ],
  });
});

test('reconcileProjectConversationDetailFromStreamDone applies a buffered citation patch to the persisted assistant message', () => {
  const submission = createPendingSubmission();
  const detail = createConversationDetail();

  const nextDetail = reconcileProjectConversationDetailFromStreamDone({
    currentDetail: detail,
    submission,
    activeUserMessageId: 'msg-user-new',
    pendingUserMessageCreatedAt: '2026-03-23T10:00:00.000Z',
    assistantMessage: {
      id: 'msg-assistant-new',
      conversationId: 'chat-1',
      role: 'assistant',
      content: '当前项目已经具备最小对话写链路，并开始接入项目级检索。',
      createdAt: '2026-03-23T10:00:10.000Z',
      sources: [
        {
          id: 's1',
          knowledgeId: 'kb-1',
          documentId: 'doc-1',
          chunkId: 'chunk-1',
          chunkIndex: 0,
          source: 'chat-core.md',
          snippet:
            '项目对话已经具备最小消息写链路，并开始接入项目级 merged retrieval。',
          distance: 0.18,
        },
      ],
      starred: false,
      starredAt: null,
      starredBy: null,
    },
    conversationSummary: {
      id: 'chat-1',
      projectId: 'project-1',
      projectName: '当前项目',
      title: '已有会话',
      preview: '当前项目已经具备最小对话写链路，并开始接入项目级检索。',
      updatedAt: '2026-03-23T10:00:10.000Z',
      createdAt: '2026-03-22T09:00:00.000Z',
      messageCount: 3,
    },
    citationPatch: {
      assistantMessageId: 'msg-assistant-new',
      citationContent: {
        version: 1,
        sentences: [
          {
            id: 'sent-1',
            text: '当前项目已经具备最小对话写链路，并开始接入项目级检索。',
            sourceIds: ['s1'],
            grounded: true,
          },
        ],
      },
    },
  } as Parameters<typeof reconcileProjectConversationDetailFromStreamDone>[0] & {
    citationPatch: {
      assistantMessageId: string;
      citationContent: NonNullable<ProjectConversationMessageResponse['citationContent']>;
    };
  });

  const persistedAssistantMessage = nextDetail.messages.find(
    (message) => message.id === 'msg-assistant-new',
  );

  assert.deepEqual(persistedAssistantMessage?.citationContent, {
    version: 1,
    sentences: [
      {
        id: 'sent-1',
        text: '当前项目已经具备最小对话写链路，并开始接入项目级检索。',
        sourceIds: ['s1'],
        grounded: true,
      },
    ],
  });
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

const createConversationDetail = (): ProjectConversationDetailResponse => {
  return {
    id: 'chat-1',
    projectId: 'project-1',
    title: '已有会话',
    updatedAt: '2026-03-23T10:00:00.000Z',
    preview: '上一轮回答',
    messages: [
      {
        id: 'msg-user-existing',
        conversationId: 'chat-1',
        role: 'user',
        content: '上一轮问题',
        createdAt: '2026-03-23T09:59:00.000Z',
        starred: false,
        starredAt: null,
        starredBy: null,
      },
      {
        id: 'msg-assistant-existing',
        conversationId: 'chat-1',
        role: 'assistant',
        content: '上一轮回答',
        createdAt: '2026-03-23T09:59:05.000Z',
        starred: false,
        starredAt: null,
        starredBy: null,
      },
    ],
  };
};

const createAssistantMessage = (): ProjectConversationMessageResponse => {
  return {
    id: 'msg-assistant-new',
    conversationId: 'chat-1',
    role: 'assistant',
    content: '当前项目已经具备最小对话写链路，并开始接入项目级检索。',
    createdAt: '2026-03-23T10:00:10.000Z',
    sources: [
      {
        id: 's1',
        knowledgeId: 'kb-1',
        documentId: 'doc-1',
        chunkId: 'chunk-1',
        chunkIndex: 0,
        source: 'chat-core.md',
        snippet: '项目对话已经具备最小消息写链路，并开始接入项目级 merged retrieval。',
        distance: 0.18,
      },
    ],
    citationContent: {
      version: 1,
      sentences: [
        {
          id: 'sent-1',
          text: '当前项目已经具备最小对话写链路，并开始接入项目级检索。',
          sourceIds: ['s1'],
          grounded: true,
        },
      ],
    },
    starred: false,
    starredAt: null,
    starredBy: null,
  };
};

test('reconcileProjectConversationDetailFromStreamDone appends the persisted user and assistant message without readback', () => {
  const detail = createConversationDetail();

  const nextDetail = reconcileProjectConversationDetailFromStreamDone({
    currentDetail: detail,
    submission: {
      projectId: 'project-1',
      conversationId: 'chat-1',
      content: '请总结当前项目对话现状',
      clientRequestId: 'request-2',
    },
    activeUserMessageId: 'msg-user-new',
    pendingUserMessageCreatedAt: '2026-03-23T10:00:05.000Z',
    assistantMessage: createAssistantMessage(),
    conversationSummary: {
      id: 'chat-1',
      projectId: 'project-1',
      title: '已有会话',
      updatedAt: '2026-03-23T10:00:10.000Z',
      preview: '当前项目已经具备最小对话写链路，并开始接入项目级检索。',
    },
  });

  assert.deepEqual(
    nextDetail.messages.map((message) => ({
      id: message.id,
      role: message.role,
      content: message.content,
    })),
    [
      {
        id: 'msg-user-existing',
        role: 'user',
        content: '上一轮问题',
      },
      {
        id: 'msg-assistant-existing',
        role: 'assistant',
        content: '上一轮回答',
      },
      {
        id: 'msg-user-new',
        role: 'user',
        content: '请总结当前项目对话现状',
      },
      {
        id: 'msg-assistant-new',
        role: 'assistant',
        content: '当前项目已经具备最小对话写链路，并开始接入项目级检索。',
      },
    ],
  );
  assert.equal(nextDetail.preview, '当前项目已经具备最小对话写链路，并开始接入项目级检索。');
  assert.equal(nextDetail.messages[3]?.sources?.[0]?.id, 's1');
});

test('reconcileProjectConversationDetailFromStreamDone truncates replayed turns and replaces the target user message content', () => {
  const detail = {
    ...createConversationDetail(),
    messages: [
      {
        id: 'msg-user-1',
        conversationId: 'chat-1',
        role: 'user' as const,
        content: '第一轮问题',
        createdAt: '2026-03-23T09:58:00.000Z',
        starred: false,
        starredAt: null,
        starredBy: null,
      },
      {
        id: 'msg-assistant-1',
        conversationId: 'chat-1',
        role: 'assistant' as const,
        content: '第一轮回答',
        createdAt: '2026-03-23T09:58:05.000Z',
        starred: false,
        starredAt: null,
        starredBy: null,
      },
      {
        id: 'msg-user-2',
        conversationId: 'chat-1',
        role: 'user' as const,
        content: '第二轮问题',
        createdAt: '2026-03-23T09:59:00.000Z',
        starred: false,
        starredAt: null,
        starredBy: null,
      },
      {
        id: 'msg-assistant-2',
        conversationId: 'chat-1',
        role: 'assistant' as const,
        content: '第二轮回答',
        createdAt: '2026-03-23T09:59:05.000Z',
        starred: false,
        starredAt: null,
        starredBy: null,
      },
    ],
  } satisfies ProjectConversationDetailResponse;

  const nextDetail = reconcileProjectConversationDetailFromStreamDone({
    currentDetail: detail,
    submission: {
      projectId: 'project-1',
      conversationId: 'chat-1',
      content: '第一轮问题（编辑后）',
      clientRequestId: 'request-3',
      targetUserMessageId: 'msg-user-1',
    },
    activeUserMessageId: 'msg-user-1',
    pendingUserMessageCreatedAt: '2026-03-23T10:00:05.000Z',
    assistantMessage: createAssistantMessage(),
    conversationSummary: {
      id: 'chat-1',
      projectId: 'project-1',
      title: '已有会话',
      updatedAt: '2026-03-23T10:00:10.000Z',
      preview: '当前项目已经具备最小对话写链路，并开始接入项目级检索。',
    },
  });

  assert.deepEqual(
    nextDetail.messages.map((message) => ({
      id: message.id,
      role: message.role,
      content: message.content,
    })),
    [
      {
        id: 'msg-user-1',
        role: 'user',
        content: '第一轮问题（编辑后）',
      },
      {
        id: 'msg-assistant-new',
        role: 'assistant',
        content: '当前项目已经具备最小对话写链路，并开始接入项目级检索。',
      },
    ],
  );
});

test('patchProjectConversationSummariesFromStreamDone patches the updated conversation and moves it to the front', () => {
  const summaries = [
    {
      id: 'chat-older',
      projectId: 'project-1',
      title: '较旧会话',
      updatedAt: '2026-03-23T09:00:00.000Z',
      preview: '较旧预览',
    },
    {
      id: 'chat-1',
      projectId: 'project-1',
      title: '已有会话',
      updatedAt: '2026-03-23T08:00:00.000Z',
      preview: '旧预览',
    },
  ] satisfies ProjectConversationSummaryResponse[];

  const nextSummaries = patchProjectConversationSummariesFromStreamDone({
    summaries,
    conversationSummary: {
      id: 'chat-1',
      projectId: 'project-1',
      title: '已有会话',
      updatedAt: '2026-03-23T10:00:10.000Z',
      preview: '当前项目已经具备最小对话写链路，并开始接入项目级检索。',
    },
  });

  assert.deepEqual(
    nextSummaries.map((summary) => ({
      id: summary.id,
      preview: summary.preview,
    })),
    [
      {
        id: 'chat-1',
        preview: '当前项目已经具备最小对话写链路，并开始接入项目级检索。',
      },
      {
        id: 'chat-older',
        preview: '较旧预览',
      },
    ],
  );
});
