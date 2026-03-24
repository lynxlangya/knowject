import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import test from 'node:test';
import { renderToStaticMarkup } from 'react-dom/server';

const require = createRequire(import.meta.url);
require.extensions['.css'] = () => undefined;

const buildDrawerTabLabelPattern = (
  sourceKey: string,
): RegExp => {
  return new RegExp(
    `data-project-chat-source-tab="${sourceKey}"[^>]*>(?:\\s|<[^>]+>)*${sourceKey}`,
  );
};

type DrawerSourceEntry = {
  sourceKey: string;
  sourceLabel: string;
  distance: number | null;
  activeEntry: {
    id: string;
    snippet: string;
  };
  entries: Array<{
    id: string;
    snippet: string;
    chunkId: string;
    chunkIndex: number;
  }>;
};

const fixtureEntries: DrawerSourceEntry[] = [
  {
    sourceKey: 'source1',
    sourceLabel: 'architecture.md',
    distance: 0.12,
    activeEntry: {
      id: 'chunk-0',
      snippet: 'default snippet source1',
    },
    entries: [
      {
        id: 'chunk-0',
        snippet: 'default snippet source1',
        chunkId: 'chunk-0',
        chunkIndex: 0,
      },
      {
        id: 'chunk-1',
        snippet: 'alternate snippet source1',
        chunkId: 'chunk-1',
        chunkIndex: 1,
      },
    ],
  },
  {
    sourceKey: 'source2',
    sourceLabel: 'decisions.md',
    distance: 0.21,
    activeEntry: {
      id: 'chunk-9',
      snippet: 'default snippet source2',
    },
    entries: [
      {
        id: 'chunk-9',
        snippet: 'default snippet source2',
        chunkId: 'chunk-9',
        chunkIndex: 9,
      },
    ],
  },
];

test('drawer loading state renders skeleton placeholder', async () => {
  const React = await import('react');
  const { ProjectConversationSourceDrawer } = (await import(
    '../src/pages/project/components/ProjectConversationSourceDrawer'
  )) as {
    ProjectConversationSourceDrawer: (props: {
      state: 'loading' | 'error' | 'ready';
      sourceEntries: DrawerSourceEntry[];
      activeSourceKey: string;
      activeChunkId?: string | null;
      onSourceKeyChange: (sourceKey: string) => void;
      onActiveChunkIdChange: (chunkId: string) => void;
      onRetry: () => void;
      errorMessage?: string;
    }) => React.ReactElement;
  };
  const html = renderToStaticMarkup(
    React.createElement(ProjectConversationSourceDrawer, {
      state: 'loading',
      sourceEntries: fixtureEntries,
      activeSourceKey: 'source1',
      activeChunkId: null,
      onSourceKeyChange: () => undefined,
      onActiveChunkIdChange: () => undefined,
      onRetry: () => undefined,
    }),
  );

  assert.match(html, /data-project-chat-source-drawer-loading="true"/);
  assert.match(html, /placeholder|skeleton/i);
});

test('drawer error state keeps source tabs visible', async () => {
  const React = await import('react');
  const { ProjectConversationSourceDrawer } = (await import(
    '../src/pages/project/components/ProjectConversationSourceDrawer'
  )) as {
    ProjectConversationSourceDrawer: (props: {
      state: 'loading' | 'error' | 'ready';
      sourceEntries: DrawerSourceEntry[];
      activeSourceKey: string;
      activeChunkId?: string | null;
      onSourceKeyChange: (sourceKey: string) => void;
      onActiveChunkIdChange: (chunkId: string) => void;
      onRetry: () => void;
      errorMessage?: string;
    }) => React.ReactElement;
  };
  const html = renderToStaticMarkup(
    React.createElement(ProjectConversationSourceDrawer, {
      state: 'error',
      sourceEntries: fixtureEntries,
      activeSourceKey: 'source1',
      activeChunkId: null,
      onSourceKeyChange: () => undefined,
      onActiveChunkIdChange: () => undefined,
      onRetry: () => undefined,
      errorMessage: 'source payload unavailable',
    }),
  );

  assert.match(html, /source payload unavailable/);
  assert.match(html, buildDrawerTabLabelPattern('source1'));
  assert.match(html, buildDrawerTabLabelPattern('source2'));
  assert.match(html, />\s*Retry\s*</i);
});

test('drawer ready state highlights active tab and default snippet', async () => {
  const React = await import('react');
  const { ProjectConversationSourceDrawer } = (await import(
    '../src/pages/project/components/ProjectConversationSourceDrawer'
  )) as {
    ProjectConversationSourceDrawer: (props: {
      state: 'loading' | 'error' | 'ready';
      sourceEntries: DrawerSourceEntry[];
      activeSourceKey: string;
      activeChunkId?: string | null;
      onSourceKeyChange: (sourceKey: string) => void;
      onActiveChunkIdChange: (chunkId: string) => void;
      onRetry: () => void;
      errorMessage?: string;
    }) => React.ReactElement;
  };
  const html = renderToStaticMarkup(
    React.createElement(ProjectConversationSourceDrawer, {
      state: 'ready',
      sourceEntries: fixtureEntries,
      activeSourceKey: 'source2',
      activeChunkId: null,
      onSourceKeyChange: () => undefined,
      onActiveChunkIdChange: () => undefined,
      onRetry: () => undefined,
    }),
  );

  assert.match(html, /data-project-chat-source-tab-active="source2"/);
  assert.match(html, buildDrawerTabLabelPattern('source2'));
  assert.match(html, /default snippet source2/);
});

test('drawer ready state renders distance and chunk switcher for active source', async () => {
  const React = await import('react');
  const { ProjectConversationSourceDrawer } = (await import(
    '../src/pages/project/components/ProjectConversationSourceDrawer'
  )) as {
    ProjectConversationSourceDrawer: (props: {
      state: 'loading' | 'error' | 'ready';
      sourceEntries: DrawerSourceEntry[];
      activeSourceKey: string;
      activeChunkId?: string | null;
      onSourceKeyChange: (sourceKey: string) => void;
      onActiveChunkIdChange: (chunkId: string) => void;
      onRetry: () => void;
      errorMessage?: string;
    }) => React.ReactElement;
  };
  const html = renderToStaticMarkup(
    React.createElement(ProjectConversationSourceDrawer, {
      state: 'ready',
      sourceEntries: fixtureEntries,
      activeSourceKey: 'source1',
      activeChunkId: 'chunk-1',
      onSourceKeyChange: () => undefined,
      onActiveChunkIdChange: () => undefined,
      onRetry: () => undefined,
    }),
  );

  assert.match(html, /architecture\.md/);
  assert.match(html, /alternate snippet source1/);
  assert.match(html, /0\.12/);
  assert.match(html, /data-project-chat-source-chunk-id="chunk-1"/);
  assert.match(html, /data-project-chat-source-active-chunk-id="chunk-1"/);
});

test('draft to persisted message handoff keeps drawer shell target stable', async () => {
  const {
    resolveProjectConversationSourceDrawerMessageId,
    resolveProjectConversationSourceDrawerStatus,
  } = (await import(
    '../src/pages/project/useProjectConversationSourceDrawer'
  )) as {
    resolveProjectConversationSourceDrawerMessageId: (args: {
      currentMessageId: string | null;
      handoff: {
        draftMessageId: string;
        assistantMessageId: string;
      } | null;
      hasPersistedMessage: boolean;
    }) => string | null;
    resolveProjectConversationSourceDrawerStatus: (args: {
      hasPersistedSources: boolean;
      hasSeedEntries: boolean;
      draftStatus: 'streaming' | 'reconciling' | 'error' | null;
    }) => 'loading' | 'ready' | 'error';
  };

  assert.equal(
    resolveProjectConversationSourceDrawerMessageId({
      currentMessageId: 'draft-assistant:req-1',
      handoff: {
        draftMessageId: 'draft-assistant:req-1',
        assistantMessageId: 'assistant-42',
      },
      hasPersistedMessage: false,
    }),
    'draft-assistant:req-1',
  );
  assert.equal(
    resolveProjectConversationSourceDrawerMessageId({
      currentMessageId: 'draft-assistant:req-1',
      handoff: {
        draftMessageId: 'draft-assistant:req-1',
        assistantMessageId: 'assistant-42',
      },
      hasPersistedMessage: true,
    }),
    'assistant-42',
  );
  assert.equal(
    resolveProjectConversationSourceDrawerMessageId({
      currentMessageId: 'draft-assistant:req-2',
      handoff: {
        draftMessageId: 'draft-assistant:req-1',
        assistantMessageId: 'assistant-42',
      },
      hasPersistedMessage: true,
    }),
    'draft-assistant:req-2',
  );
  assert.equal(
    resolveProjectConversationSourceDrawerStatus({
      hasPersistedSources: false,
      hasSeedEntries: true,
      draftStatus: 'streaming',
    }),
    'loading',
  );
  assert.equal(
    resolveProjectConversationSourceDrawerStatus({
      hasPersistedSources: false,
      hasSeedEntries: true,
      draftStatus: 'reconciling',
    }),
    'loading',
  );
  assert.equal(
    resolveProjectConversationSourceDrawerStatus({
      hasPersistedSources: false,
      hasSeedEntries: true,
      draftStatus: 'error',
    }),
    'error',
  );
  assert.equal(
    resolveProjectConversationSourceDrawerStatus({
      hasPersistedSources: true,
      hasSeedEntries: true,
      draftStatus: 'error',
    }),
    'ready',
  );
});
