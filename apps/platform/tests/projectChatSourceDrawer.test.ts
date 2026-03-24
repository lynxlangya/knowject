import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import test from 'node:test';
import { renderToStaticMarkup } from 'react-dom/server';

const require = createRequire(import.meta.url);
require.extensions['.css'] = () => undefined;

type DrawerSourceEntry = {
  sourceKey: string;
  label: string;
  activeEntry: {
    id: string;
    snippet: string;
  };
};

const fixtureEntries: DrawerSourceEntry[] = [
  {
    sourceKey: 'source1',
    label: 'source1',
    activeEntry: {
      id: 'chunk-0',
      snippet: 'default snippet source1',
    },
  },
  {
    sourceKey: 'source2',
    label: 'source2',
    activeEntry: {
      id: 'chunk-9',
      snippet: 'default snippet source2',
    },
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
      onSourceKeyChange: (sourceKey: string) => void;
      errorMessage?: string;
    }) => React.ReactElement;
  };
  const html = renderToStaticMarkup(
    React.createElement(ProjectConversationSourceDrawer, {
      state: 'loading',
      sourceEntries: fixtureEntries,
      activeSourceKey: 'source1',
      onSourceKeyChange: () => undefined,
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
      onSourceKeyChange: (sourceKey: string) => void;
      errorMessage?: string;
    }) => React.ReactElement;
  };
  const html = renderToStaticMarkup(
    React.createElement(ProjectConversationSourceDrawer, {
      state: 'error',
      sourceEntries: fixtureEntries,
      activeSourceKey: 'source1',
      onSourceKeyChange: () => undefined,
      errorMessage: 'source payload unavailable',
    }),
  );

  assert.match(html, /source payload unavailable/);
  assert.match(html, /data-project-chat-source-tab="source1"/);
  assert.match(html, /data-project-chat-source-tab="source2"/);
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
      onSourceKeyChange: (sourceKey: string) => void;
      errorMessage?: string;
    }) => React.ReactElement;
  };
  const html = renderToStaticMarkup(
    React.createElement(ProjectConversationSourceDrawer, {
      state: 'ready',
      sourceEntries: fixtureEntries,
      activeSourceKey: 'source2',
      onSourceKeyChange: () => undefined,
    }),
  );

  assert.match(html, /data-project-chat-source-tab-active="source2"/);
  assert.match(html, /default snippet source2/);
});
