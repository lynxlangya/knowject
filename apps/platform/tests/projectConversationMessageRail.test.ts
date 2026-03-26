import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import test from 'node:test';
import type { ComponentProps } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { tp as projectTp } from '../src/pages/project/project.i18n';

const require = createRequire(import.meta.url);
require.extensions['.css'] = () => undefined;

const escapeRegExp = (value: string): string => {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

test('desktop rail keeps a fixed collapsed gutter width even when expanded content is shown', async () => {
  const React = await import('react');
  globalThis.React = React;
  const { ProjectConversationMessageRail } = await import(
    '../src/pages/project/components/ProjectConversationMessageRail'
  );
  type RailProps = ComponentProps<typeof ProjectConversationMessageRail>;

  const baseProps: RailProps = {
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
    }),
  );
  const expandedHtml = renderToStaticMarkup(
    React.createElement(ProjectConversationMessageRail, {
      ...baseProps,
      expanded: true,
    }),
  );

  assert.match(collapsedHtml, /w-\[72px\]/);
  assert.match(
    collapsedHtml,
    new RegExp(
      `aria-label="${escapeRegExp(projectTp('conversation.railExpand'))}"`,
    ),
  );
  assert.match(
    expandedHtml,
    /<aside class="[^"]*w-\[320px\][^"]*"/,
  );
  assert.match(
    expandedHtml,
    /w-\[320px\] h-full shrink-0 bg-white[^"]*pointer-events-auto opacity-100/,
  );
  assert.match(
    expandedHtml,
    new RegExp(
      `aria-label="${escapeRegExp(projectTp('conversation.railCollapse'))}"`,
    ),
  );
  assert.doesNotMatch(
    expandedHtml,
    /pointer-events-none[^"]*pointer-events-auto/,
  );
});

test('selection mode keeps the desktop collapse toggle inside the inert hidden gutter only', async () => {
  const React = await import('react');
  globalThis.React = React;
  const { ProjectConversationMessageRail } = await import(
    '../src/pages/project/components/ProjectConversationMessageRail'
  );
  type RailProps = ComponentProps<typeof ProjectConversationMessageRail>;

  const props: RailProps = {
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
  };
  const selectionHtml = renderToStaticMarkup(
    React.createElement(ProjectConversationMessageRail, props),
  );

  assert.match(
    selectionHtml,
    new RegExp(
      `pointer-events-none" inert="">[\\s\\S]*aria-label="${escapeRegExp(projectTp('conversation.railCollapse'))}"`,
    ),
  );
  assert.doesNotMatch(
    selectionHtml,
    new RegExp(
      `pointer-events-auto[\\s\\S]*aria-label="${escapeRegExp(projectTp('conversation.railCollapse'))}"`,
    ),
  );
});

test('selection mode bulk action buttons render as readonly when nothing is selected', async () => {
  const React = await import('react');
  globalThis.React = React;
  const { ProjectConversationMessageRail } = await import(
    '../src/pages/project/components/ProjectConversationMessageRail'
  );
  type RailProps = ComponentProps<typeof ProjectConversationMessageRail>;

  const props: RailProps = {
    messages: [
      {
        id: 'message-1',
        conversationId: 'chat-1',
        role: 'assistant',
        content: '这是当前回答',
        createdAt: '2026-03-20T08:00:00.000Z',
        starred: false,
        starredAt: null,
        starredBy: null,
        sources: [],
      },
    ],
    mode: 'selection',
    expanded: true,
    selectedMessageIds: [],
    selectableMessageIds: ['message-1'],
    starringMessageId: null,
    exportDisabled: true,
    knowledgeDraftDisabled: true,
    onExpandedChange: () => undefined,
    onModeChange: () => undefined,
    onToggleSelectedMessageId: () => undefined,
    onScrollToMessage: () => undefined,
    onToggleMessageStar: () => undefined,
    onExportMarkdown: () => undefined,
    onGenerateKnowledgeDraft: () => undefined,
  };
  const selectionHtml = renderToStaticMarkup(
    React.createElement(ProjectConversationMessageRail, props),
  );

  assert.match(
    selectionHtml,
    new RegExp(
      `aria-disabled="true"[^>]*class="[^"]*cursor-not-allowed![^"]*"[^>]*>[\\s\\S]*?${escapeRegExp(projectTp('conversation.selection.export'))}`,
    ),
  );
  assert.match(
    selectionHtml,
    new RegExp(
      `aria-disabled="true"[^>]*class="[^"]*cursor-not-allowed![^"]*"[^>]*>[\\s\\S]*?${escapeRegExp(projectTp('conversation.selection.knowledge'))}`,
    ),
  );
  assert.doesNotMatch(selectionHtml, /disabled=""/);
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

test('message rail source exposes editorial shell hooks and removes the legacy chip switch group', () => {
  const railSource = readFileSync(
    new URL('../src/pages/project/components/ProjectConversationMessageRail.tsx', import.meta.url),
    'utf8',
  );
  const toolbarSection = railSource.slice(
    railSource.indexOf('data-project-chat-message-rail-toolbar="true"'),
    railSource.indexOf('data-project-chat-message-rail-list="true"'),
  );

  assert.match(railSource, /data-project-chat-message-rail-header="true"/);
  assert.match(railSource, /data-project-chat-message-rail-toolbar="true"/);
  assert.match(railSource, /data-project-chat-message-rail-list="true"/);
  assert.match(railSource, /data-project-chat-message-rail-spine="true"/);
  assert.doesNotMatch(
    toolbarSection,
    /rounded-full[\s\S]*border-slate-200[\s\S]*bg-slate-100[\s\S]*p-0\.5/,
  );
});

test('empty message rail state does not render the editorial spine', async () => {
  const React = await import('react');
  globalThis.React = React;
  const { ProjectConversationMessageRail } = await import(
    '../src/pages/project/components/ProjectConversationMessageRail'
  );

  const emptyHtml = renderToStaticMarkup(
    React.createElement(ProjectConversationMessageRail, {
      messages: [],
      mode: 'browse',
      expanded: true,
      selectedMessageIds: [],
      selectableMessageIds: [],
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
    }),
  );

  assert.doesNotMatch(emptyHtml, /data-project-chat-message-rail-spine="true"/);
});

test('starred rail controls reuse the shared warm star affordance', async () => {
  const React = await import('react');
  globalThis.React = React;
  const { ProjectConversationMessageRail } = await import(
    '../src/pages/project/components/ProjectConversationMessageRail'
  );
  type RailProps = ComponentProps<typeof ProjectConversationMessageRail>;

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
  const sharedProps: Omit<RailProps, 'messages' | 'mode'> = {
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
    }),
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
    }),
  );

  assert.match(
    starredHtml,
    new RegExp(
      `bg-amber-50![^"]*text-amber-600![\\s\\S]*?<span>${escapeRegExp(projectTp('conversation.railStarred'))}</span>`,
    ),
  );
  assert.match(
    starredHtml,
    /border-amber-200 bg-amber-50 text-amber-600[\s\S]*?anticon anticon-star text-amber-500/,
  );
  assert.match(
    browseHtml,
    new RegExp(
      `aria-label="${escapeRegExp(projectTp('conversation.star'))}"[^>]*class="[^"]*hover:bg-amber-50![^"]*hover:text-amber-600![^"]*"`,
    ),
  );
});

test('message rail rows render as editorial index entries instead of standalone cards', async () => {
  const React = await import('react');
  globalThis.React = React;
  const { ProjectConversationMessageRail } = await import(
    '../src/pages/project/components/ProjectConversationMessageRail'
  );

  const browseHtml = renderToStaticMarkup(
    React.createElement(ProjectConversationMessageRail, {
      messages: [{
        id: 'message-1',
        conversationId: 'chat-1',
        role: 'assistant',
        content: '已整理当前项目里的关键结论。',
        createdAt: '2026-03-26T08:00:00.000Z',
        starred: true,
        starredAt: '2026-03-26T08:00:10.000Z',
        starredBy: 'user-1',
        sources: [],
      }],
      mode: 'browse',
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
    }),
  );

  const selectionHtml = renderToStaticMarkup(
    React.createElement(ProjectConversationMessageRail, {
      messages: [
        {
          id: 'message-1',
          conversationId: 'chat-1',
          role: 'assistant',
          content: '已整理当前项目里的关键结论。',
          createdAt: '2026-03-26T08:00:00.000Z',
          starred: true,
          starredAt: '2026-03-26T08:00:10.000Z',
          starredBy: 'user-1',
          sources: [],
        },
        {
          id: 'message-2',
          conversationId: 'chat-1',
          role: 'user',
          content: '这条消息当前不可被选中。',
          createdAt: '2026-03-26T08:02:00.000Z',
          starred: false,
          starredAt: null,
          starredBy: null,
          sources: [],
        },
      ],
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
    }),
  );

  assert.match(browseHtml, /data-project-chat-message-rail-row="true"/);
  assert.match(browseHtml, /data-project-chat-message-rail-node="true"/);
  assert.match(browseHtml, /data-rail-row-state="default"/);
  assert.doesNotMatch(browseHtml, /rounded-card/);
  assert.match(selectionHtml, /data-rail-row-state="selected"/);
  assert.match(selectionHtml, /data-rail-row-state="disabled"/);
  assert.match(
    selectionHtml,
    /focus-visible:ring-2[^"]*focus-visible:ring-\[#8ab4a5\]\/55[^"]*focus-visible:ring-offset-2/,
  );
  assert.match(selectionHtml, /data-project-chat-message-rail-selection-footer="true"/);
});
