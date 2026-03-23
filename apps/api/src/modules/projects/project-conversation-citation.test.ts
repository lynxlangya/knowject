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

test('buildProjectConversationCitationSources assigns stable message-local source ids', () => {
  const result = buildProjectConversationCitationSources([
    createSource({
      id: 'upstream-source-id',
      source: 'architecture.md',
    }),
    createSource({
      id: 'another-upstream-id',
      knowledgeId: 'kb-2',
      documentId: 'doc-2',
      chunkId: 'chunk-2',
      chunkIndex: 1,
      source: 'runtime.md',
    }),
  ]);

  assert.deepEqual(
    result.map((source) => source.id),
    ['s1', 's2'],
  );
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
