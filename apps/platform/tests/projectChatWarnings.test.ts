import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import test from 'node:test';

const require = createRequire(import.meta.url);
require.extensions['.css'] = () => undefined;

test('ProjectChatMarkdown sanitizes legacy class props before spreading DOM props', () => {
  const markdownSource = readFileSync(
    new URL('../src/pages/project/projectChat.markdown.tsx', import.meta.url),
    'utf8',
  );

  assert.match(markdownSource, /class:\s*legacyClassName/);
});

test('draft assistant bubbles keep citation payload empty until final detail reconcile', () => {
  const adaptersSource = readFileSync(
    new URL('../src/pages/project/projectChat.adapters.ts', import.meta.url),
    'utf8',
  );

  assert.match(adaptersSource, /citationContent:\s*message\.citationContent/);
  assert.match(
    adaptersSource,
    /options\.draftAssistantMessage[\s\S]*?extraInfo:\s*\{[\s\S]*?sources:\s*\[\],[\s\S]*?citationContent:\s*undefined,[\s\S]*?status:\s*options\.draftAssistantMessage\.status/,
  );
  assert.doesNotMatch(
    adaptersSource,
    /options\.draftAssistantMessage[\s\S]*?citationContent:\s*options\.draftAssistantMessage\./,
  );
});

test('project chat drawers use Drawer size instead of deprecated width', () => {
  const projectChatPageSource = readFileSync(
    new URL('../src/pages/project/ProjectChatPage.tsx', import.meta.url),
    'utf8',
  );
  const projectKnowledgeDraftDrawerSource = readFileSync(
    new URL(
      '../src/pages/project/components/ProjectKnowledgeDraftDrawer.tsx',
      import.meta.url,
    ),
    'utf8',
  );

  assert.doesNotMatch(projectChatPageSource, /<Drawer[\s\S]*?width=\{/);
  assert.match(projectChatPageSource, /<Drawer[\s\S]*?size=\{360\}/);

  assert.doesNotMatch(
    projectKnowledgeDraftDrawerSource,
    /<Drawer[\s\S]*?width=\{/,
  );
  assert.match(
    projectKnowledgeDraftDrawerSource,
    /<Drawer[\s\S]*?size=\{520\}/,
  );
});

test('conversation sources use message-local popover instead of right drawer', () => {
  const bubbleSource = readFileSync(
    new URL('../src/pages/project/projectChatBubble.components.tsx', import.meta.url),
    'utf8',
  );

  assert.match(
    bubbleSource,
    /import\s+\{\s*Popover,\s*Typography\s*\}\s+from\s+'antd'/,
  );
  assert.match(bubbleSource, /data-conversation-source-tag="true"/);
  assert.match(
    bubbleSource,
    /data-conversation-source-tag="true"[\s\S]*?h-5[\s\S]*?px-2[\s\S]*?text-\[8px\]/,
  );
  assert.match(bubbleSource, /<Popover[\s\S]*?trigger="click"/);
  assert.doesNotMatch(bubbleSource, /const\s+\[sourcesDrawerOpen,\s*setSourcesDrawerOpen\]/);
  assert.doesNotMatch(bubbleSource, /<Drawer[\s\S]*?placement="right"/);
});

test('project knowledge draft flow source no longer keeps legacy create-then-upload copy or partial failure state', () => {
  const projectChatPageSource = readFileSync(
    new URL('../src/pages/project/ProjectChatPage.tsx', import.meta.url),
    'utf8',
  );
  const projectKnowledgeDraftDrawerSource = readFileSync(
    new URL(
      '../src/pages/project/components/ProjectKnowledgeDraftDrawer.tsx',
      import.meta.url,
    ),
    'utf8',
  );

  assert.doesNotMatch(
    projectKnowledgeDraftDrawerSource,
    /当前会按“先创建项目私有知识库，再上传一份 Markdown 文档”的顺序保存/,
  );
  assert.doesNotMatch(projectKnowledgeDraftDrawerSource, /知识名称/);
  assert.doesNotMatch(projectKnowledgeDraftDrawerSource, /知识描述/);
  assert.doesNotMatch(projectChatPageSource, /knowledgeDraftExistingKnowledgeId/);
  assert.doesNotMatch(
    projectChatPageSource,
    /knowledgeDraftPartialFailureMessage/,
  );
  assert.match(
    projectChatPageSource,
    /projectKnowledgeLoading=\{projectKnowledge\.loading\}/,
  );
  assert.match(
    projectChatPageSource,
    /projectKnowledgeError=\{projectKnowledge\.error\}/,
  );
  assert.match(
    projectChatPageSource,
    /setKnowledgeDraftSelectedKnowledgeId\(null\);/,
  );
  assert.doesNotMatch(
    projectChatPageSource,
    /if \(currentKnowledgeId && knowledgeIds\.includes\(currentKnowledgeId\)\)/,
  );
});
