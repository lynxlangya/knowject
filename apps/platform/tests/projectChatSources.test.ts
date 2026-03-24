import assert from 'node:assert/strict';
import test from 'node:test';

type Source = {
  id: string;
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
      id: 'chunk-0',
      knowledgeId: 'knowledge-a',
      documentId: 'document-a',
      chunkId: 'chunk-0',
      chunkIndex: 0,
      source: '/knowledge/a.md',
      snippet: 'A-0',
      distance: 0.12,
    },
    {
      id: 'chunk-1',
      knowledgeId: 'knowledge-a',
      documentId: 'document-a',
      chunkId: 'chunk-1',
      chunkIndex: 1,
      source: '/knowledge/a.md',
      snippet: 'A-1',
      distance: 0.15,
    },
    {
      id: 'chunk-9',
      knowledgeId: 'knowledge-b',
      documentId: 'document-b',
      chunkId: 'chunk-9',
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

test('seeded source entries freeze source key order for drawer defaults', async () => {
  const {
    seedSourceEntries,
    resolveDrawerSource,
    resolveSentenceSourceKeys,
  } = (await import('../src/pages/project/projectChatSources')) as {
    seedSourceEntries: (args: {
      sources: Source[];
      citationContent: CitationContent;
    }) => Array<{ id: string; sourceKey: string }>;
    resolveDrawerSource: (
      entries: Array<{ id: string; sourceKey: string }>,
      sourceKey: string,
    ) => { activeEntry: { id: string } } | null;
    resolveSentenceSourceKeys: (
      entries: Array<{ id: string; sourceKey: string }>,
      sentenceSourceIds: string[],
    ) => string[];
  };
  const entries = seedSourceEntries({
    sources: buildFixtureSources(),
    citationContent: buildFixtureCitationContent(),
  });

  assert.equal(resolveDrawerSource(entries, 'source1')?.activeEntry.id, 'chunk-0');
  assert.deepEqual(resolveSentenceSourceKeys(entries, ['chunk-0', 'chunk-9']), ['source1', 'source2']);
  assert.deepEqual(entries.map((entry) => entry.id), ['chunk-0', 'chunk-1', 'chunk-9']);
});

test('drift fallback only triggers on source-key topology drift', async () => {
  const { shouldFallbackToLegacySourceRendering } = (await import(
    '../src/pages/project/projectChatSources'
  )) as {
    shouldFallbackToLegacySourceRendering: (args: {
      seedSourceKeys: string[];
      persistedSourceKeys: string[];
      seedSourceMetaByKey?: Record<string, { knowledgeId: string; documentId: string }>;
      persistedSourceMetaByKey?: Record<
        string,
        {
          knowledgeId: string;
          documentId: string;
          snippet?: string;
          distance?: number | null;
          chunkIds?: string[];
        }
      >;
    }) => boolean;
  };

  assert.equal(shouldFallbackToLegacySourceRendering({
    seedSourceKeys: ['source1', 'source2'],
    persistedSourceKeys: ['source1', 'source3'],
  }), true);

  assert.equal(
    shouldFallbackToLegacySourceRendering({
      seedSourceKeys: ['source1', 'source2'],
      persistedSourceKeys: ['source1', 'source2'],
      seedSourceMetaByKey: {
        source1: { knowledgeId: 'knowledge-a', documentId: 'doc-a' },
      },
      persistedSourceMetaByKey: {
        source1: { knowledgeId: 'knowledge-b', documentId: 'doc-a' },
      },
    }),
    true,
  );

  assert.equal(
    shouldFallbackToLegacySourceRendering({
      seedSourceKeys: ['source1', 'source2', 'source3'],
      persistedSourceKeys: ['source1', 'source4', 'source2', 'source3'],
    }),
    true,
  );

  assert.equal(
    shouldFallbackToLegacySourceRendering({
      seedSourceKeys: ['source1', 'source2'],
      persistedSourceKeys: ['source1', 'source2'],
      seedSourceMetaByKey: {
        source1: { knowledgeId: 'knowledge-a', documentId: 'doc-a' },
        source2: { knowledgeId: 'knowledge-b', documentId: 'doc-b' },
      },
      persistedSourceMetaByKey: {
        source1: {
          knowledgeId: 'knowledge-a',
          documentId: 'doc-a',
          snippet: 'updated snippet only',
          distance: 0.95,
          chunkIds: ['chunk-100', 'chunk-101'],
        },
        source2: {
          knowledgeId: 'knowledge-b',
          documentId: 'doc-b',
          snippet: 'updated snippet only',
          distance: null,
          chunkIds: ['chunk-200'],
        },
      },
    }),
    false,
  );
});
