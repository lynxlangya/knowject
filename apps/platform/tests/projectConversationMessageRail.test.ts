import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import test from 'node:test';
import { renderToStaticMarkup } from 'react-dom/server';

const require = createRequire(import.meta.url);
require.extensions['.css'] = () => undefined;

test('desktop rail keeps a fixed collapsed gutter width even when expanded content is shown', async () => {
  const React = await import('react');
  globalThis.React = React;
  const { ProjectConversationMessageRail } = await import(
    '../src/pages/project/components/ProjectConversationMessageRail'
  );

  const baseProps = {
    messages: [
      {
        id: 'message-1',
        conversationId: 'chat-1',
        role: 'user' as const,
        content: '请总结当前项目状态',
        createdAt: '2026-03-20T08:00:00.000Z',
        starred: false,
        starredAt: null,
        starredBy: null,
        sources: [],
      },
    ],
    mode: 'browse' as const,
    selectedMessageIds: [],
    selectableMessageIds: ['message-1'],
    starringMessageId: null,
    exportDisabled: false,
    knowledgeDraftDisabled: false,
    onExpandedChange: () => undefined,
    onModeChange: () => undefined,
    onToggleSelectedMessageId: () => undefined,
    onScrollToMessage: () => undefined,
    onToggleMessageStar: () => undefined,
    onExportMarkdown: () => undefined,
    onGenerateKnowledgeDraft: () => undefined,
  };

  const collapsedHtml = renderToStaticMarkup(
    React.createElement(ProjectConversationMessageRail, {
      ...baseProps,
      expanded: false,
    } as any),
  );
  const expandedHtml = renderToStaticMarkup(
    React.createElement(ProjectConversationMessageRail, {
      ...baseProps,
      expanded: true,
    } as any),
  );

  assert.match(collapsedHtml, /w-\[72px\]/);
  assert.match(collapsedHtml, /aria-label="展开消息导航"/);
  assert.match(
    expandedHtml,
    /<aside class="[^"]*w-\[320px\][^"]*"/,
  );
  assert.match(
    expandedHtml,
    /w-\[320px\] h-full shrink-0 bg-white[^"]*pointer-events-auto opacity-100/,
  );
  assert.match(expandedHtml, /aria-label="收起消息导航"/);
  assert.doesNotMatch(
    expandedHtml,
    /pointer-events-none[^"]*pointer-events-auto/,
  );
});

test('selection mode does not render a desktop collapse toggle because the rail is forced open', async () => {
  const React = await import('react');
  globalThis.React = React;
  const { ProjectConversationMessageRail } = await import(
    '../src/pages/project/components/ProjectConversationMessageRail'
  );

  const selectionHtml = renderToStaticMarkup(
    React.createElement(ProjectConversationMessageRail, {
      messages: [],
      mode: 'selection',
      expanded: true,
      selectedMessageIds: ['message-1'],
      selectableMessageIds: ['message-1'],
      starringMessageId: null,
      exportDisabled: false,
      knowledgeDraftDisabled: false,
      onExpandedChange: () => undefined,
      onModeChange: () => undefined,
      onToggleSelectedMessageId: () => undefined,
      onScrollToMessage: () => undefined,
      onToggleMessageStar: () => undefined,
      onExportMarkdown: () => undefined,
      onGenerateKnowledgeDraft: () => undefined,
    } as any),
  );

  assert.doesNotMatch(selectionHtml, /aria-label="收起消息 Rail"/);
});
