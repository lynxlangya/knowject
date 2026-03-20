import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildConversationMessageMarkdown,
  buildKnowledgeDraftDefaults,
  normalizeMarkdownFileName,
} from '../src/pages/project/projectConversationMessageExport';
import { createMarkdownSourceFile } from '../src/pages/knowledge/knowledgeUpload.shared';

test('buildConversationMessageMarkdown keeps messages in chronological order', () => {
  const markdown = buildConversationMessageMarkdown({
    conversationTitle: '项目对话',
    messages: [
      {
        id: 'message-2',
        role: 'assistant',
        content: '后发的回答',
        createdAt: '2026-03-19T09:00:05.000Z',
      },
      {
        id: 'message-1',
        role: 'user',
        content: '先发的问题',
        createdAt: '2026-03-19T09:00:00.000Z',
      },
    ],
  });

  assert.ok(markdown.includes('先发的问题'));
  assert.ok(markdown.includes('后发的回答'));
  assert.ok(
    markdown.indexOf('先发的问题') < markdown.indexOf('后发的回答'),
  );
});

test('buildKnowledgeDraftDefaults derives default names from the conversation title', () => {
  const defaults = buildKnowledgeDraftDefaults({
    conversationTitle: '  项目周会复盘  ',
    markdownContent: '# 复盘\n\n内容',
  });

  assert.equal(defaults.knowledgeName, '项目周会复盘');
  assert.equal(defaults.documentTitle, '项目周会复盘');
  assert.equal(defaults.markdownContent, '# 复盘\n\n内容');

  const fileName = normalizeMarkdownFileName(defaults.documentTitle);
  const sourceFile = createMarkdownSourceFile({
    title: defaults.documentTitle,
    content: defaults.markdownContent,
  });

  assert.equal(sourceFile.name, fileName);
  assert.equal(fileName, '项目周会复盘.md');
});
