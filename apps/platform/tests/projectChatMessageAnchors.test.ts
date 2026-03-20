import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import test from 'node:test';
import { renderToStaticMarkup } from 'react-dom/server';

const require = createRequire(import.meta.url);
require.extensions['.css'] = () => undefined;

test('buildProjectChatBubbleItems and bubble wrappers keep stable message anchors for persisted messages', async () => {
  const [
    { buildProjectChatBubbleItems },
    { ProjectChatAssistantFooter, ProjectChatUserMessage },
  ] = await Promise.all([
    import('../src/pages/project/projectChat.adapters'),
    import('../src/pages/project/projectChatBubble.components'),
  ]);

  const messages = [
    {
      id: 'message-1',
      conversationId: 'chat-1',
      role: 'user' as const,
      content: '请总结当前项目对话现状',
      createdAt: '2026-03-20T08:00:00.000Z',
      sources: [],
    },
    {
      id: 'message-2',
      conversationId: 'chat-1',
      role: 'assistant' as const,
      content: '已根据现有对话进行总结。',
      createdAt: '2026-03-20T08:00:05.000Z',
      sources: [],
    },
  ];

  const bubbleItems = buildProjectChatBubbleItems(messages, {
    conversationId: 'chat-1',
    pendingUserMessage: {
      conversationId: 'chat-1',
      id: 'pending-message',
      content: '正在发送的问题',
      createdAt: '2026-03-20T08:01:00.000Z',
    },
    draftAssistantMessage: {
      conversationId: 'chat-1',
      id: 'draft-message',
      content: '正在生成...',
      createdAt: '2026-03-20T08:01:05.000Z',
      status: 'streaming',
    },
  });

  const persistedUserBubble = bubbleItems.find((item) => item.key === 'message-1');
  const persistedAssistantBubble = bubbleItems.find(
    (item) => item.key === 'message-2',
  );
  const pendingBubble = bubbleItems.find((item) => item.key === 'pending-message');
  const draftBubble = bubbleItems.find((item) => item.key === 'draft-message');

  assert.ok(persistedUserBubble);
  assert.ok(persistedAssistantBubble);
  assert.ok(pendingBubble);
  assert.ok(draftBubble);

  assert.equal(persistedUserBubble?.extraInfo?.messageId, 'message-1');
  assert.equal(persistedAssistantBubble?.extraInfo?.messageId, 'message-2');
  assert.equal(pendingBubble?.extraInfo?.messageId, undefined);
  assert.equal(draftBubble?.extraInfo?.messageId, undefined);

  const userHtml = renderToStaticMarkup(
    ProjectChatUserMessage({
      content: String(persistedUserBubble?.content ?? ''),
      extraInfo: persistedUserBubble?.extraInfo as any,
    } as any),
  );

  assert.match(userHtml, /id="project-chat-message-message-1"/);

  const secondPassBubbleItems = buildProjectChatBubbleItems(messages, {
    conversationId: 'chat-1',
  });

  assert.equal(
    secondPassBubbleItems.find((item) => item.key === 'message-1')?.extraInfo
      ?.messageId,
    'message-1',
  );
  assert.equal(
    secondPassBubbleItems.find((item) => item.key === 'message-2')?.extraInfo
      ?.messageId,
    'message-2',
  );

  const bubbleItemsWithAssistantActions = buildProjectChatBubbleItems(messages, {
    conversationId: 'chat-1',
    getAssistantMessageActions: (message) =>
      message.role === 'assistant'
        ? {
            copyDisabled: false,
            retryDisabled: false,
            starDisabled: true,
            starring: false,
            starred: true,
            onCopy: () => undefined,
            onRetry: () => undefined,
            onToggleStar: () => undefined,
          }
        : null,
  });
  const bubbleItemsWithInactiveStarAction = buildProjectChatBubbleItems(messages, {
    conversationId: 'chat-1',
    getAssistantMessageActions: (message) =>
      message.role === 'assistant'
        ? {
            copyDisabled: false,
            retryDisabled: false,
            starDisabled: false,
            starring: false,
            starred: false,
            onCopy: () => undefined,
            onRetry: () => undefined,
            onToggleStar: () => undefined,
          }
        : null,
  });
  const assistantBubble = bubbleItemsWithAssistantActions.find(
    (item) => item.key === 'message-2',
  );
  const inactiveAssistantBubble = bubbleItemsWithInactiveStarAction.find(
    (item) => item.key === 'message-2',
  );
  const assistantFooterHtml = renderToStaticMarkup(
    ProjectChatAssistantFooter({
      extraInfo: assistantBubble?.extraInfo as any,
    } as any),
  );
  const inactiveAssistantFooterHtml = renderToStaticMarkup(
    ProjectChatAssistantFooter({
      extraInfo: inactiveAssistantBubble?.extraInfo as any,
    } as any),
  );
  const draftAssistantFooterHtml = renderToStaticMarkup(
    ProjectChatAssistantFooter({
      extraInfo: draftBubble?.extraInfo as any,
    } as any),
  );

  assert.ok(assistantBubble?.extraInfo?.assistantActions);
  assert.match(assistantFooterHtml, /aria-label="复制回复"/);
  assert.match(assistantFooterHtml, /aria-label="取消加星"/);
  assert.match(
    assistantFooterHtml,
    /class="[^"]*\sbg-amber-50(?:\s|")/,
  );
  assert.match(assistantFooterHtml, /aria-disabled="true"/);
  assert.match(inactiveAssistantFooterHtml, /aria-label="加星"/);
  assert.match(
    inactiveAssistantFooterHtml,
    /class="[^"]*hover:bg-amber-50[^"]*hover:text-amber-600[^"]*"/,
  );
  assert.match(assistantFooterHtml, /aria-label="重新生成回复"/);
  assert.doesNotMatch(assistantFooterHtml, />08:00</);
  assert.match(draftAssistantFooterHtml, /aria-label="加星"/);
  assert.match(draftAssistantFooterHtml, /aria-disabled="true"/);
});
