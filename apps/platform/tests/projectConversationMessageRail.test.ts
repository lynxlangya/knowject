import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
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

test('desktop rail hides inactive containers with inert instead of aria-hidden', () => {
  const railSource = readFileSync(
    new URL('../src/pages/project/components/ProjectConversationMessageRail.tsx', import.meta.url),
    'utf8',
  );

  assert.match(railSource, /inert=\{expanded\}/);
  assert.match(railSource, /inert=\{!expanded\}/);
  assert.doesNotMatch(railSource, /aria-hidden=\{expanded\}/);
  assert.doesNotMatch(railSource, /aria-hidden=\{!expanded\}/);
});

test('starred rail controls reuse the shared warm star affordance', async () => {
  const React = await import('react');
  globalThis.React = React;
  const { ProjectConversationMessageRail } = await import(
    '../src/pages/project/components/ProjectConversationMessageRail'
  );

  const baseMessage = {
    id: 'message-1',
    conversationId: 'chat-1',
    role: 'assistant' as const,
    content: '已整理当前项目里的关键结论。',
    createdAt: '2026-03-20T08:00:00.000Z',
    starredAt: '2026-03-20T08:00:10.000Z',
    starredBy: 'user-1',
    sources: [],
  };
  const sharedProps = {
    expanded: true,
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

  const starredHtml = renderToStaticMarkup(
    React.createElement(ProjectConversationMessageRail, {
      ...sharedProps,
      messages: [
        {
          ...baseMessage,
          starred: true,
        },
      ],
      mode: 'starred',
    } as any),
  );

  const browseHtml = renderToStaticMarkup(
    React.createElement(ProjectConversationMessageRail, {
      ...sharedProps,
      messages: [
        {
          ...baseMessage,
          starred: false,
          starredAt: null,
          starredBy: null,
        },
      ],
      mode: 'browse',
    } as any),
  );

  assert.match(
    starredHtml,
    /bg-amber-50![^"]*text-amber-600![\s\S]*?<span>已加星<\/span>/,
  );
  assert.match(
    starredHtml,
    /border-amber-200 bg-amber-50 text-amber-600[\s\S]*?anticon anticon-star text-amber-500/,
  );
  assert.match(
    browseHtml,
    /aria-label="加星"[^>]*class="[^"]*hover:bg-amber-50![^"]*hover:text-amber-600![^"]*"/,
  );
});
