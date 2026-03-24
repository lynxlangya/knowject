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

const buildFixtureSources = (): Source[] => {
  return [
    {
      id: 'source-record-0',
      sourceKey: 'source1',
      knowledgeId: 'knowledge-a',
      documentId: 'document-a',
      chunkId: 'chunk-a-0',
      chunkIndex: 0,
      source: '/knowledge/a.md',
      snippet: 'A-0',
      distance: 0.12,
    },
    {
      id: 'source-record-1',
      sourceKey: 'source1',
      knowledgeId: 'knowledge-a',
      documentId: 'document-a',
      chunkId: 'chunk-a-1',
      chunkIndex: 1,
      source: '/knowledge/a.md',
      snippet: 'A-1',
      distance: 0.15,
    },
    {
      id: 'source-record-9',
      sourceKey: 'source2',
      knowledgeId: 'knowledge-b',
      documentId: 'document-b',
      chunkId: 'chunk-b-9',
      chunkIndex: 9,
      source: '/knowledge/b.md',
      snippet: 'B-9',
      distance: 0.21,
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
        sourceIds: ['source-record-0'],
        grounded: true,
      },
      {
        id: 'sentence-2',
        text: '第二句。',
        sourceIds: ['source-record-0', 'source-record-9'],
        grounded: true,
      },
    ],
  };
};

test('seeded source entries freeze source key order for drawer defaults', async () => {
  const {
    buildProjectChatSourceEntries,
    resolveSentenceSourceKeys,
  } = (await import('../src/pages/project/projectChatSources')) as {
    buildProjectChatSourceEntries: (sources: Source[]) => Array<{
      id: string;
      sourceKey: string;
      activeEntry: { id: string };
    }>;
    resolveSentenceSourceKeys: (
      citationContent: CitationContent,
      sources: Source[],
    ) => string[];
  };
  const sources = buildFixtureSources();
  const citationContent = buildFixtureCitationContent();
  const entries = buildProjectChatSourceEntries(sources);

  assert.equal(
    entries.find((entry) => entry.sourceKey === 'source1')?.activeEntry.id,
    'chunk-0',
  );
  assert.deepEqual(resolveSentenceSourceKeys(citationContent, sources), ['source1', 'source2']);
  assert.deepEqual(entries.map((entry) => entry.id), ['chunk-0', 'chunk-1', 'chunk-9']);
});

test('drift fallback triggers on source-key set/order drift or key-to-document remapping only', async () => {
  const { buildProjectChatSourceEntries, shouldFallbackToLegacySourceRendering } = (await import(
    '../src/pages/project/projectChatSources'
  )) as {
    buildProjectChatSourceEntries: (sources: Source[]) => Array<{
      id: string;
      sourceKey: string;
      knowledgeId: string;
      documentId: string;
      snippet: string;
      distance: number | null;
      chunkIds: string[];
    }>;
    shouldFallbackToLegacySourceRendering: (args: {
      seedEntries: Array<{
        sourceKey: string;
        knowledgeId: string;
        documentId: string;
        snippet: string;
        distance: number | null;
        chunkIds: string[];
      }>;
      persistedSources: Array<{
        sourceKey: string;
        knowledgeId: string;
        documentId: string;
        snippet: string;
        distance: number | null;
        chunkIds: string[];
      }>;
    }) => boolean;
  };
  const seedEntries = buildProjectChatSourceEntries(buildFixtureSources());

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
      persistedSources: seedEntries.map((entry) => ({
        ...entry,
        snippet: `${entry.snippet} (updated)`,
        distance: entry.distance === null ? null : entry.distance + 0.3,
        chunkIds: [...entry.chunkIds, `${entry.id}-extra`],
      })),
    }),
    false,
  );
});
