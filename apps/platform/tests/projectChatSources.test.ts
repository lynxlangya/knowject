import assert from 'node:assert/strict';
import test from 'node:test';

type Source = {
  id: string;
  sourceKey: string;
  knowledgeId: string;
  documentId: string;
  chunkId: string;
  chunkIndex: number;
  source: string;
  snippet: string;
  distance: number | null;
};

type CitationContent = {
  version: 1;
  sentences: Array<{
    id: string;
    text: string;
    sourceIds: string[];
    grounded: boolean;
  }>;
};

type GroupedSourceEntry = {
  sourceKey: string;
  knowledgeId: string;
  documentId: string;
  snippet: string;
  distance: number | null;
  chunkIds: string[];
};

const buildFixtureSources = (): Source[] => {
  return [
    {
      id: 'chunk-0',
      sourceKey: 'source1',
      knowledgeId: 'knowledge-a',
      documentId: 'document-a',
      chunkId: 'chunk-a-0-ref',
      chunkIndex: 0,
      source: '/knowledge/a.md',
      snippet: 'A-0',
      distance: 0.12,
    },
    {
      id: 'chunk-9',
      sourceKey: 'source2',
      knowledgeId: 'knowledge-b',
      documentId: 'document-b',
      chunkId: 'chunk-b-9-ref',
      chunkIndex: 9,
      source: '/knowledge/b.md',
      snippet: 'B-9',
      distance: 0.21,
    },
    {
      id: 'chunk-1',
      sourceKey: 'source1',
      knowledgeId: 'knowledge-a',
      documentId: 'document-a',
      chunkId: 'chunk-a-1-ref',
      chunkIndex: 1,
      source: '/knowledge/a.md',
      snippet: 'A-1',
      distance: 0.15,
    },
  ];
};

const buildFixtureSourcesWithUncited = (): Source[] => {
  return [
    ...buildFixtureSources(),
    {
      id: 'chunk-99',
      sourceKey: 'source3',
      knowledgeId: 'knowledge-c',
      documentId: 'document-c',
      chunkId: 'chunk-c-99-ref',
      chunkIndex: 99,
      source: '/knowledge/c.md',
      snippet: 'C-99',
      distance: 0.4,
    },
  ];
};

const buildFixtureCitationContent = (): CitationContent => {
  return {
    version: 1,
    sentences: [
      {
        id: 'sentence-1',
        text: '第一句。',
        sourceIds: ['chunk-0'],
        grounded: true,
      },
      {
        id: 'sentence-2',
        text: '第二句。',
        sourceIds: ['chunk-0', 'chunk-9'],
        grounded: true,
      },
    ],
  };
};

const buildFixtureSeedEntries = (): GroupedSourceEntry[] => {
  return [
    {
      sourceKey: 'source1',
      knowledgeId: 'knowledge-a',
      documentId: 'document-a',
      snippet: 'A-0',
      distance: 0.12,
      chunkIds: ['chunk-a-0-ref', 'chunk-a-1-ref'],
    },
    {
      sourceKey: 'source2',
      knowledgeId: 'knowledge-b',
      documentId: 'document-b',
      snippet: 'B-9',
      distance: 0.21,
      chunkIds: ['chunk-b-9-ref'],
    },
  ];
};

test('buildProjectChatSourceEntries preserves raw source-entry order, resolveSentenceSourceKeys ignores uncited sources, and resolveDrawerSource scopes source1 to its grouped entries', async () => {
  const {
    buildProjectChatSourceEntries,
    resolveDrawerSource,
    resolveSentenceSourceKeys,
  } = (await import('../src/pages/project/projectChatSources')) as {
    buildProjectChatSourceEntries: (sources: Source[]) => Array<{
      id: string;
      sourceKey: string;
      chunkId: string;
      chunkIndex: number;
      snippet: string;
    }>;
    resolveDrawerSource: (
      entries: Array<{
        id: string;
        sourceKey: string;
        chunkId: string;
        chunkIndex: number;
        snippet: string;
      }>,
      sourceKey: string,
    ) => {
      activeEntry: { id: string };
      entries: Array<{ id: string }>;
    } | null;
    resolveSentenceSourceKeys: (
      citationContent: CitationContent,
      sources: Source[],
    ) => string[];
  };
  const sources = buildFixtureSources();
  const sourcesWithUncited = buildFixtureSourcesWithUncited();
  const citationContent = buildFixtureCitationContent();
  const entries = buildProjectChatSourceEntries(sources);
  const drawerSource = resolveDrawerSource(entries, 'source1');

  assert.equal(drawerSource?.activeEntry.id, 'chunk-0');
  assert.deepEqual(
    drawerSource?.entries.map((entry) => entry.id),
    ['chunk-0', 'chunk-1'],
  );
  assert.deepEqual(
    resolveSentenceSourceKeys(citationContent, sourcesWithUncited),
    ['source1', 'source2'],
  );
  assert.deepEqual(entries.map((entry) => entry.id), ['chunk-0', 'chunk-9', 'chunk-1']);
});

test('drift fallback triggers on source-key set/order drift or key-to-document remapping only', async () => {
  const { shouldFallbackToLegacySourceRendering } = (await import(
    '../src/pages/project/projectChatSources'
  )) as {
    shouldFallbackToLegacySourceRendering: (args: {
      seedEntries: GroupedSourceEntry[];
      persistedSources: GroupedSourceEntry[];
    }) => boolean;
  };
  const seedEntries = buildFixtureSeedEntries();

  assert.equal(
    shouldFallbackToLegacySourceRendering({
      seedEntries: [
        { sourceKey: 'source1', knowledgeId: 'k1', documentId: 'd1', snippet: 's1', distance: 0.1, chunkIds: ['c1'] },
        { sourceKey: 'source2', knowledgeId: 'k2', documentId: 'd2', snippet: 's2', distance: 0.2, chunkIds: ['c2'] },
      ],
      persistedSources: [
        { sourceKey: 'source1', knowledgeId: 'k1', documentId: 'd1', snippet: 's1', distance: 0.1, chunkIds: ['c1'] },
        { sourceKey: 'source3', knowledgeId: 'k3', documentId: 'd3', snippet: 's3', distance: 0.3, chunkIds: ['c3'] },
      ],
    }),
    true,
  );

  assert.equal(
    shouldFallbackToLegacySourceRendering({
      seedEntries,
      persistedSources: seedEntries.map((entry) =>
        entry.sourceKey === 'source1'
          ? { ...entry, knowledgeId: `${entry.knowledgeId}-drift` }
          : entry,
      ),
    }),
    true,
  );

  assert.equal(
    shouldFallbackToLegacySourceRendering({
      seedEntries,
      persistedSources: [seedEntries[1]!, seedEntries[0]!],
    }),
    true,
  );

  assert.equal(
    shouldFallbackToLegacySourceRendering({
      seedEntries,
      persistedSources: seedEntries.map((entry) =>
        entry.sourceKey === 'source1'
          ? { ...entry, documentId: `${entry.documentId}-drift` }
          : entry,
      ),
    }),
    true,
  );

  assert.equal(
    shouldFallbackToLegacySourceRendering({
      seedEntries: [
        { sourceKey: 'source1', knowledgeId: 'k1', documentId: 'd1', snippet: 's1', distance: 0.1, chunkIds: ['c1'] },
        { sourceKey: 'source2', knowledgeId: 'k2', documentId: 'd2', snippet: 's2', distance: 0.2, chunkIds: ['c2'] },
        { sourceKey: 'source3', knowledgeId: 'k3', documentId: 'd3', snippet: 's3', distance: 0.3, chunkIds: ['c3'] },
      ],
      persistedSources: [
        { sourceKey: 'source1', knowledgeId: 'k1', documentId: 'd1', snippet: 's1', distance: 0.1, chunkIds: ['c1'] },
        { sourceKey: 'source4', knowledgeId: 'k4', documentId: 'd4', snippet: 's4', distance: 0.4, chunkIds: ['c4'] },
        { sourceKey: 'source2', knowledgeId: 'k2', documentId: 'd2', snippet: 's2', distance: 0.2, chunkIds: ['c2'] },
        { sourceKey: 'source3', knowledgeId: 'k3', documentId: 'd3', snippet: 's3', distance: 0.3, chunkIds: ['c3'] },
      ],
    }),
    true,
  );

  assert.equal(
    shouldFallbackToLegacySourceRendering({
      seedEntries,
      persistedSources: [
        ...seedEntries,
        {
          sourceKey: 'source3',
          knowledgeId: 'knowledge-c',
          documentId: 'document-c',
          snippet: 'C-99',
          distance: 0.4,
          chunkIds: ['chunk-c-99-ref'],
        },
      ],
    }),
    false,
  );

  assert.equal(
    shouldFallbackToLegacySourceRendering({
      seedEntries,
      persistedSources: seedEntries.map((entry) => ({
        ...entry,
        snippet: `${entry.snippet} (updated)`,
        distance: entry.distance === null ? null : entry.distance + 0.3,
        chunkIds: [...entry.chunkIds, `${entry.sourceKey}-extra`],
      })),
    }),
    false,
  );
});
