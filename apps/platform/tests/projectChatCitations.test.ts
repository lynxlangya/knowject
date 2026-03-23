import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import test from 'node:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { tp as projectTp } from '../src/pages/project/project.i18n';

const require = createRequire(import.meta.url);
require.extensions['.css'] = () => undefined;

const escapeRegExp = (value: string): string => {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

const renderAssistantBubble = async (message: {
  id: string;
  conversationId: string;
  role: 'assistant';
  content: string;
  createdAt: string;
  sources: Array<{
    id: string;
    knowledgeId: string;
    documentId: string;
    chunkId: string;
    chunkIndex: number;
    source: string;
    snippet: string;
    distance: number | null;
  }>;
  citationContent?: {
    version: 1;
    sentences: Array<{
      id: string;
      text: string;
      sourceIds: string[];
      grounded: boolean;
    }>;
  };
}) => {
  const React = await import('react');
  globalThis.React = React;
  const [
    { buildProjectChatBubbleItems },
    { ProjectChatAssistantFooter, ProjectChatAssistantMessage },
  ] = await Promise.all([
    import('../src/pages/project/projectChat.adapters'),
    import('../src/pages/project/projectChatBubble.components'),
  ]);

  const bubbleItem = buildProjectChatBubbleItems([message], {
    conversationId: message.conversationId,
  }).find((item) => item.key === message.id);

  assert.ok(bubbleItem);

  return {
    messageHtml: renderToStaticMarkup(
      ProjectChatAssistantMessage({
        content: message.content,
        extraInfo: bubbleItem.extraInfo as any,
      } as any),
    ),
    footerHtml: renderToStaticMarkup(
      ProjectChatAssistantFooter({
        content: message.content,
        extraInfo: bubbleItem.extraInfo as any,
      } as any),
    ),
  };
};

test('buildProjectChatCitationViewModel groups same-document sources into one marker group', async () => {
  const { buildProjectChatCitationViewModel } = await import(
    '../src/pages/project/projectChatCitations'
  );

  const viewModel = buildProjectChatCitationViewModel(
    {
      version: 1,
      sentences: [
        {
          id: 'sentence-1',
          text: '第一句来自同一份文档。',
          sourceIds: ['source-1', 'source-2'],
          grounded: true,
        },
        {
          id: 'sentence-2',
          text: '第二句跨两份文档。',
          sourceIds: ['source-1', 'source-3'],
          grounded: true,
        },
      ],
    },
    [
      {
        id: 'source-1',
        knowledgeId: 'knowledge-1',
        documentId: 'document-1',
        chunkId: 'chunk-1',
        chunkIndex: 0,
        source: '/knowledge/spec-alpha.md',
        snippet: '同文档 chunk 1',
        distance: 0.11,
      },
      {
        id: 'source-2',
        knowledgeId: 'knowledge-1',
        documentId: 'document-1',
        chunkId: 'chunk-2',
        chunkIndex: 1,
        source: '/knowledge/spec-alpha.md',
        snippet: '同文档 chunk 2',
        distance: 0.14,
      },
      {
        id: 'source-3',
        knowledgeId: 'knowledge-1',
        documentId: 'document-2',
        chunkId: 'chunk-3',
        chunkIndex: 0,
        source: '/knowledge/spec-beta.md',
        snippet: '另一份文档 chunk',
        distance: 0.21,
      },
    ],
  );

  assert.equal(viewModel.mode, 'citation');
  assert.equal(viewModel.documentGroups.length, 2);
  assert.equal(viewModel.documentGroups[0]?.markerNumber, 1);
  assert.equal(viewModel.documentGroups[1]?.markerNumber, 2);
  assert.equal(viewModel.documentGroups[0]?.entries.length, 2);
  assert.equal(viewModel.documentGroups[1]?.entries.length, 1);
  assert.equal(viewModel.sentences[0]?.primaryMarkerNumber, 1);
  assert.equal(viewModel.sentences[0]?.hasMoreSources, false);
  assert.equal(viewModel.sentences[0]?.documentGroupIds.length, 1);
  assert.equal(viewModel.sentences[1]?.primaryMarkerNumber, 1);
  assert.equal(viewModel.sentences[1]?.hasMoreSources, true);
  assert.equal(viewModel.sentences[1]?.documentGroupIds.length, 2);
});

test('grounded sentences render inline citation markers and ungrounded sentences stay marker-free', async () => {
  const { messageHtml, footerHtml } = await renderAssistantBubble({
    id: 'message-1',
    conversationId: 'chat-1',
    role: 'assistant',
    content: '第一句结论。仍需人工确认。第二句有双重依据。',
    createdAt: '2026-03-23T08:00:00.000Z',
    sources: [
      {
        id: 'source-1',
        knowledgeId: 'knowledge-1',
        documentId: 'document-1',
        chunkId: 'chunk-1',
        chunkIndex: 0,
        source: '/knowledge/spec-alpha.md',
        snippet: '这是第一条证据。',
        distance: 0.11,
      },
      {
        id: 'source-2',
        knowledgeId: 'knowledge-1',
        documentId: 'document-2',
        chunkId: 'chunk-2',
        chunkIndex: 1,
        source: '/knowledge/spec-beta.md',
        snippet: '这是第二条证据。',
        distance: 0.19,
      },
    ],
    citationContent: {
      version: 1,
      sentences: [
        {
          id: 'sentence-1',
          text: '第一句结论。',
          sourceIds: ['source-1'],
          grounded: true,
        },
        {
          id: 'sentence-2',
          text: '仍需人工确认。',
          sourceIds: [],
          grounded: false,
        },
        {
          id: 'sentence-3',
          text: '第二句有双重依据。',
          sourceIds: ['source-1', 'source-2'],
          grounded: true,
        },
      ],
    },
  });

  assert.match(
    messageHtml,
    /data-citation-sentence="sentence-1"[\s\S]*?第一句结论。[\s\S]*?data-citation-marker="1"/,
  );
  assert.match(
    messageHtml,
    /data-citation-sentence="sentence-1"[\s\S]*?>\[1\]</,
  );
  assert.match(
    messageHtml,
    /data-citation-sentence="sentence-2"[^>]*data-grounded="false"[^>]*>[\s\S]*?仍需人工确认。[\s\S]*?<\/span>/,
  );
  assert.doesNotMatch(
    messageHtml,
    /data-citation-sentence="sentence-2"[^>]*>[^<]*<a/,
  );
  assert.match(
    messageHtml,
    /data-citation-sentence="sentence-3"[\s\S]*?第二句有双重依据。[\s\S]*?data-citation-marker="1"[\s\S]*?>\[1\+\]</,
  );
  assert.doesNotMatch(footerHtml, /data-citation-evidence-block="true"/);
  assert.match(footerHtml, /data-conversation-sources-trigger="true"/);
  assert.match(
    footerHtml,
    new RegExp(
      `aria-label="${escapeRegExp(projectTp('conversation.viewSources'))}"`,
    ),
  );
  assert.match(
    footerHtml,
    new RegExp(`>${escapeRegExp(projectTp('conversation.sources'))}<`),
  );
  assert.doesNotMatch(footerHtml, /spec-alpha\.md/);
  assert.doesNotMatch(footerHtml, /spec-beta\.md/);
});

test('legacy assistant messages without citationContent collapse sources into footer trigger', async () => {
  const { messageHtml, footerHtml } = await renderAssistantBubble({
    id: 'message-legacy',
    conversationId: 'chat-1',
    role: 'assistant',
    content: '这里继续沿用旧版 sources 展示。',
    createdAt: '2026-03-23T08:05:00.000Z',
    sources: [
      {
        id: 'source-legacy',
        knowledgeId: 'knowledge-1',
        documentId: 'document-legacy',
        chunkId: 'chunk-legacy',
        chunkIndex: 0,
        source: '/knowledge/legacy-evidence.md',
        snippet: '旧版证据块仍然可见。',
        distance: 0.22,
      },
    ],
  });

  assert.doesNotMatch(messageHtml, /data-citation-sentence=/);
  assert.doesNotMatch(footerHtml, /data-citation-evidence-block="true"/);
  assert.match(footerHtml, /data-conversation-sources-trigger="true"/);
  assert.match(
    footerHtml,
    new RegExp(
      `aria-label="${escapeRegExp(projectTp('conversation.viewSources'))}"`,
    ),
  );
  assert.match(
    footerHtml,
    new RegExp(`>${escapeRegExp(projectTp('conversation.sources'))}<`),
  );
  assert.doesNotMatch(footerHtml, /legacy-evidence\.md/);
});

test('citation mode conservatively suppresses trailing pseudo citation blocks before sentence rendering', async () => {
  const { messageHtml, footerHtml } = await renderAssistantBubble({
    id: 'message-pseudo-citation',
    conversationId: 'chat-1',
    role: 'assistant',
    content: '第一句结论。\n\n依据：\n- 来源 2\n- 来源 3',
    createdAt: '2026-03-23T08:07:00.000Z',
    sources: [
      {
        id: 'source-1',
        knowledgeId: 'knowledge-1',
        documentId: 'document-1',
        chunkId: 'chunk-1',
        chunkIndex: 0,
        source: '/knowledge/spec-alpha.md',
        snippet: '这是第一条证据。',
        distance: 0.11,
      },
    ],
    citationContent: {
      version: 1,
      sentences: [
        {
          id: 'sentence-1',
          text: '第一句结论。',
          sourceIds: ['source-1'],
          grounded: true,
        },
      ],
    },
  });

  assert.match(messageHtml, /data-citation-sentence="sentence-1"/);
  assert.doesNotMatch(messageHtml, /依据：/);
  assert.doesNotMatch(messageHtml, /来源 2/);
  assert.doesNotMatch(messageHtml, /来源 3/);
  assert.doesNotMatch(footerHtml, /data-citation-evidence-block="true"/);
  assert.match(footerHtml, /data-conversation-sources-trigger="true"/);
});

test('pseudo citation suppression runs before markdown fail-closed', async () => {
  const { messageHtml, footerHtml } = await renderAssistantBubble({
    id: 'message-pseudo-citation-order',
    conversationId: 'chat-1',
    role: 'assistant',
    content: '第一句结论。\n\n依据：\n- 来源 2',
    createdAt: '2026-03-23T08:08:00.000Z',
    sources: [
      {
        id: 'source-1',
        knowledgeId: 'knowledge-1',
        documentId: 'document-1',
        chunkId: 'chunk-1',
        chunkIndex: 0,
        source: '/knowledge/spec-alpha.md',
        snippet: '这是第一条证据。',
        distance: 0.11,
      },
    ],
    citationContent: {
      version: 1,
      sentences: [
        {
          id: 'sentence-1',
          text: '第一句结论。',
          sourceIds: ['source-1'],
          grounded: true,
        },
      ],
    },
  });

  assert.match(messageHtml, /data-citation-sentence="sentence-1"/);
  assert.doesNotMatch(messageHtml, /依据：/);
  assert.match(footerHtml, /data-conversation-sources-trigger="true"/);
  assert.doesNotMatch(footerHtml, /spec-alpha\.md/);
});

test('markdown-rich cited assistant content fails closed to legacy markdown rendering', async () => {
  const { messageHtml, footerHtml } = await renderAssistantBubble({
    id: 'message-markdown',
    conversationId: 'chat-1',
    role: 'assistant',
    content: '# 已整理结论\n\n- 关键项一\n- 关键项二\n\n详见[设计稿](https://example.com)。',
    createdAt: '2026-03-23T08:10:00.000Z',
    sources: [
      {
        id: 'source-markdown',
        knowledgeId: 'knowledge-1',
        documentId: 'document-markdown',
        chunkId: 'chunk-markdown',
        chunkIndex: 0,
        source: '/knowledge/markdown-evidence.md',
        snippet: 'Markdown 内容仍应保留原有渲染语义。',
        distance: 0.15,
      },
    ],
    citationContent: {
      version: 1,
      sentences: [
        {
          id: 'sentence-markdown',
          text: '已整理结论。',
          sourceIds: ['source-markdown'],
          grounded: true,
        },
      ],
    },
  });

  assert.doesNotMatch(messageHtml, /data-citation-sentence=/);
  assert.doesNotMatch(footerHtml, /data-citation-evidence-block="true"/);
  assert.match(footerHtml, /data-conversation-sources-trigger="true"/);
  assert.doesNotMatch(footerHtml, /markdown-evidence\.md/);
});

test('inline emphasis markdown in cited assistant content fails closed to legacy rendering', async () => {
  const { messageHtml, footerHtml } = await renderAssistantBubble({
    id: 'message-inline-markdown',
    conversationId: 'chat-1',
    role: 'assistant',
    content: '这里有 **重点** 需要保留 markdown 语义。',
    createdAt: '2026-03-23T08:11:00.000Z',
    sources: [
      {
        id: 'source-inline-markdown',
        knowledgeId: 'knowledge-1',
        documentId: 'document-inline-markdown',
        chunkId: 'chunk-inline-markdown',
        chunkIndex: 0,
        source: '/knowledge/inline-markdown-evidence.md',
        snippet: 'inline emphasis 也必须回退 legacy。',
        distance: 0.16,
      },
    ],
    citationContent: {
      version: 1,
      sentences: [
        {
          id: 'sentence-inline-markdown',
          text: '这里有重点需要保留 markdown 语义。',
          sourceIds: ['source-inline-markdown'],
          grounded: true,
        },
      ],
    },
  });

  assert.doesNotMatch(messageHtml, /data-citation-sentence=/);
  assert.doesNotMatch(footerHtml, /data-citation-evidence-block="true"/);
  assert.match(footerHtml, /data-conversation-sources-trigger="true"/);
  assert.doesNotMatch(footerHtml, /inline-markdown-evidence\.md/);
});

test('citationContent with unresolved sourceIds fails closed to legacy source evidence block', async () => {
  const { messageHtml, footerHtml } = await renderAssistantBubble({
    id: 'message-drift',
    conversationId: 'chat-1',
    role: 'assistant',
    content: '这条回答的 citation sourceIds 已与 sources 漂移。',
    createdAt: '2026-03-23T08:12:00.000Z',
    sources: [
      {
        id: 'source-real',
        knowledgeId: 'knowledge-1',
        documentId: 'document-real',
        chunkId: 'chunk-real',
        chunkIndex: 0,
        source: '/knowledge/drift-fallback.md',
        snippet: '即使 citation 失配，legacy evidence block 也不能丢。',
        distance: 0.18,
      },
    ],
    citationContent: {
      version: 1,
      sentences: [
        {
          id: 'sentence-drift',
          text: '这条回答的 citation sourceIds 已与 sources 漂移。',
          sourceIds: ['missing-source-1', 'missing-source-2'],
          grounded: true,
        },
      ],
    },
  });

  assert.doesNotMatch(messageHtml, /data-citation-sentence=/);
  assert.doesNotMatch(footerHtml, /data-citation-evidence-block="true"/);
  assert.match(footerHtml, /data-conversation-sources-trigger="true"/);
  assert.doesNotMatch(footerHtml, /drift-fallback\.md/);
});
