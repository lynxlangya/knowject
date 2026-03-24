import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildProjectConversationCitationSources,
  normalizeProjectConversationCitationContent,
} from './project-conversation-citation.js';
import type { ProjectConversationSourceDocument } from './projects.types.js';

const createSource = (
  overrides: Partial<ProjectConversationSourceDocument> = {},
): ProjectConversationSourceDocument => {
  return {
    knowledgeId: 'kb-1',
    documentId: 'doc-1',
    chunkId: 'chunk-1',
    chunkIndex: 0,
    source: 'architecture.md',
    snippet: '项目对话已经接入 merged retrieval。',
    distance: 0.12,
    ...overrides,
  };
};

test('buildProjectConversationCitationSources groups chunks by document and assigns stable source keys', () => {
  const groupedSources = buildProjectConversationCitationSources([
    createSource({
      id: 'upstream-source-id',
      knowledgeId: 'kb-1',
      documentId: 'doc-1',
      chunkId: 'chunk-1',
      chunkIndex: 0,
      source: 'architecture.md',
      distance: 0.08,
    }),
    createSource({
      knowledgeId: 'kb-2',
      documentId: 'doc-2',
      chunkId: 'chunk-9',
      chunkIndex: 0,
      source: 'runtime.md',
      distance: 0.18,
    }),
    createSource({
      id: 'another-upstream-id',
      knowledgeId: 'kb-1',
      documentId: 'doc-1',
      chunkId: 'chunk-2',
      chunkIndex: 1,
      source: 'architecture.md',
      distance: 0.12,
    }),
  ]);

  assert.deepEqual(groupedSources.map((source) => source.sourceKey), [
    'source1',
    'source1',
    'source2',
  ]);
  assert.equal(groupedSources[0]?.sourceKey, groupedSources[1]?.sourceKey);
  assert.notEqual(groupedSources[1]?.sourceKey, groupedSources[2]?.sourceKey);
  assert.deepEqual(
    groupedSources.map((source) => source.id),
    ['s1', 's2', 's3'],
  );
  assert.deepEqual(
    groupedSources.map((source) => [
      source.documentId,
      source.chunkId,
      source.chunkIndex,
      source.sourceKey,
      source.id,
    ]),
    [
      ['doc-1', 'chunk-1', 0, 'source1', 's1'],
      ['doc-1', 'chunk-2', 1, 'source1', 's2'],
      ['doc-2', 'chunk-9', 0, 'source2', 's3'],
    ],
  );
});

test('buildProjectConversationCitationSources freezes sourceKey precedence across retrieval index, distance, knowledgeId, and documentId', () => {
  type RankedSource = ProjectConversationSourceDocument & {
    retrievalIndex: number;
  };
  const rankedSources: RankedSource[] = [
    createSource({
      knowledgeId: 'kb-z',
      documentId: 'doc-retrieval-first',
      chunkId: 'chunk-r1',
      distance: 0.91,
    }) as RankedSource,
    createSource({
      knowledgeId: 'kb-a',
      documentId: 'doc-retrieval-second',
      chunkId: 'chunk-r2',
      distance: 0.01,
    }) as RankedSource,
    createSource({
      knowledgeId: 'kb-a',
      documentId: 'doc-distance-far',
      chunkId: 'chunk-d2',
      distance: 0.25,
    }) as RankedSource,
    createSource({
      knowledgeId: 'kb-a',
      documentId: 'doc-distance-near',
      chunkId: 'chunk-d1',
      distance: 0.05,
    }) as RankedSource,
    createSource({
      knowledgeId: 'kb-b',
      documentId: 'doc-knowledge-b',
      chunkId: 'chunk-k2',
      distance: 0.4,
    }) as RankedSource,
    createSource({
      knowledgeId: 'kb-a',
      documentId: 'doc-knowledge-a',
      chunkId: 'chunk-k1',
      distance: 0.4,
    }) as RankedSource,
    createSource({
      knowledgeId: 'kb-c',
      documentId: 'doc-b',
      chunkId: 'chunk-doc2',
      distance: 0.6,
    }) as RankedSource,
    createSource({
      knowledgeId: 'kb-c',
      documentId: 'doc-a',
      chunkId: 'chunk-doc1',
      distance: 0.6,
    }) as RankedSource,
  ];

  rankedSources[0].retrievalIndex = 0;
  rankedSources[1].retrievalIndex = 1;
  rankedSources[2].retrievalIndex = 2;
  rankedSources[3].retrievalIndex = 2;
  rankedSources[4].retrievalIndex = 3;
  rankedSources[5].retrievalIndex = 3;
  rankedSources[6].retrievalIndex = 4;
  rankedSources[7].retrievalIndex = 4;

  const groupedSources = buildProjectConversationCitationSources(
    rankedSources as ProjectConversationSourceDocument[],
  );

  const sourceKeyNumberByDocument = new Map(
    groupedSources.map((source) => [
      source.documentId,
      Number(source.sourceKey?.replace('source', '')),
    ]),
  );

  assert.ok(
    (sourceKeyNumberByDocument.get('doc-retrieval-first') ?? Infinity) <
      (sourceKeyNumberByDocument.get('doc-retrieval-second') ?? -Infinity),
  );
  assert.ok(
    (sourceKeyNumberByDocument.get('doc-distance-near') ?? Infinity) <
      (sourceKeyNumberByDocument.get('doc-distance-far') ?? -Infinity),
  );
  assert.ok(
    (sourceKeyNumberByDocument.get('doc-knowledge-a') ?? Infinity) <
      (sourceKeyNumberByDocument.get('doc-knowledge-b') ?? -Infinity),
  );
  assert.ok(
    (sourceKeyNumberByDocument.get('doc-a') ?? Infinity) <
      (sourceKeyNumberByDocument.get('doc-b') ?? -Infinity),
  );
});

test('normalizeProjectConversationCitationContent strips source placeholders and keeps clean prose', () => {
  const sources = buildProjectConversationCitationSources([createSource()]);

  const result = normalizeProjectConversationCitationContent(
    {
      version: 1,
      sentences: [
        {
          id: 'sent-1',
          text: '当前项目已经接入 merged retrieval。[[source1]][[source1]]',
          sourceIds: ['s1'],
          grounded: true,
        },
      ],
    },
    '当前项目已经接入 merged retrieval。[[source1]][[source1]]',
    sources,
  );

  assert.deepEqual(result, {
    version: 1,
    sentences: [
      {
        id: 'sent-1',
        text: '当前项目已经接入 merged retrieval。',
        sourceIds: ['s1'],
        grounded: true,
      },
    ],
  });
});

test('normalizeProjectConversationCitationContent removes unknown and duplicate source ids while keeping order', () => {
  const sources = buildProjectConversationCitationSources([
    createSource(),
    createSource({
      knowledgeId: 'kb-2',
      documentId: 'doc-2',
      chunkId: 'chunk-2',
      chunkIndex: 1,
      source: 'runtime.md',
    }),
  ]);

  const result = normalizeProjectConversationCitationContent(
    {
      version: 1,
      sentences: [
        {
          id: 'sent-1',
          text: '当前项目已经接入 merged retrieval。',
          sourceIds: ['unknown', 's2', 's1', 's2'],
          grounded: true,
        },
      ],
    },
    '当前项目已经接入 merged retrieval。',
    sources,
  );

  assert.deepEqual(result, {
    version: 1,
    sentences: [
      {
        id: 'sent-1',
        text: '当前项目已经接入 merged retrieval。',
        sourceIds: ['s2', 's1'],
        grounded: true,
      },
    ],
  });
});

test('normalizeProjectConversationCitationContent downgrades grounded sentences when no legal source ids remain', () => {
  const sources = buildProjectConversationCitationSources([createSource()]);

  const result = normalizeProjectConversationCitationContent(
    {
      version: 1,
      sentences: [
        {
          id: 'sent-1',
          text: '当前回答缺少可验证来源。',
          sourceIds: ['missing-source'],
          grounded: true,
        },
      ],
    },
    '当前回答缺少可验证来源。',
    sources,
  );

  assert.deepEqual(result, {
    version: 1,
    sentences: [
      {
        id: 'sent-1',
        text: '当前回答缺少可验证来源。',
        sourceIds: [],
        grounded: false,
      },
    ],
  });
});

test('normalizeProjectConversationCitationContent unwraps fenced json strings before validation', () => {
  const sources = buildProjectConversationCitationSources([createSource()]);

  const result = normalizeProjectConversationCitationContent(
    '```json\n{"version":1,"sentences":[{"id":"sent-1","text":"当前项目已经接入 merged retrieval。","sourceIds":["s1"],"grounded":true}]}\n```',
    '当前项目已经接入 merged retrieval。',
    sources,
  );

  assert.deepEqual(result, {
    version: 1,
    sentences: [
      {
        id: 'sent-1',
        text: '当前项目已经接入 merged retrieval。',
        sourceIds: ['s1'],
        grounded: true,
      },
    ],
  });
});

test('normalizeProjectConversationCitationContent returns null for malformed payloads', () => {
  const sources = buildProjectConversationCitationSources([createSource()]);

  assert.equal(
    normalizeProjectConversationCitationContent(
      {
        version: 2,
        sentences: [],
      },
      '任意答案',
      sources,
    ),
    null,
  );
  assert.equal(
    normalizeProjectConversationCitationContent(
      {
        version: 1,
        sentences: [
          {
            id: 'sent-1',
            text: '',
            sourceIds: ['s1'],
            grounded: true,
          },
        ],
      },
      '任意答案',
      sources,
    ),
    null,
  );
  assert.equal(
    normalizeProjectConversationCitationContent('{not-json}',
      '任意答案',
      sources,
    ),
    null,
  );
});

test('normalizeProjectConversationCitationContent returns null when non-empty answer has empty sentences', () => {
  const sources = buildProjectConversationCitationSources([createSource()]);

  assert.equal(
    normalizeProjectConversationCitationContent(
      {
        version: 1,
        sentences: [],
      },
      '当前项目已经接入 merged retrieval。',
      sources,
    ),
    null,
  );
});

test('normalizeProjectConversationCitationContent returns null when sentence text cannot rebuild answer', () => {
  const sources = buildProjectConversationCitationSources([createSource()]);

  assert.equal(
    normalizeProjectConversationCitationContent(
      {
        version: 1,
        sentences: [
          {
            id: 'sent-1',
            text: '当前项目已经接入。',
            sourceIds: ['s1'],
            grounded: true,
          },
          {
            id: 'sent-2',
            text: 'merged retrieval。',
            sourceIds: ['s1'],
            grounded: true,
          },
        ],
      },
      '当前项目已经接入 merged retrieval。',
      sources,
    ),
    null,
  );
  assert.equal(
    normalizeProjectConversationCitationContent(
      {
        version: 1,
        sentences: [
          {
            id: 'sent-1',
            text: '第二句',
            sourceIds: ['s1'],
            grounded: true,
          },
          {
            id: 'sent-2',
            text: '第一句',
            sourceIds: ['s1'],
            grounded: true,
          },
        ],
      },
      '第一句第二句',
      sources,
    ),
    null,
  );
});
