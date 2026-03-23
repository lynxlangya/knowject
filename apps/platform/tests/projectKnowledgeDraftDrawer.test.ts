import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

test('ProjectKnowledgeDraftDrawer 收口为项目私有知识库选择 + 文档编辑语义', () => {
  const drawerSource = readFileSync(
    new URL(
      '../src/pages/project/components/ProjectKnowledgeDraftDrawer.tsx',
      import.meta.url,
    ),
    'utf8',
  );

  assert.match(
    drawerSource,
    /projectKnowledgeOptions: Array<\{ label: string; value: string \}>/,
  );
  assert.match(drawerSource, /selectedKnowledgeId: string \| null/);
  assert.match(
    drawerSource,
    /onKnowledgeChange: \(knowledgeId: string \| null\) => void/,
  );
  assert.match(drawerSource, /onCreateKnowledge: \(\) => void/);
  assert.match(drawerSource, /projectKnowledgeLoading: boolean/);
  assert.match(drawerSource, /projectKnowledgeError\?: string \| null/);
  assert.match(drawerSource, /tp\('resources\.draft\.knowledgeLabel'\)/);
  assert.match(drawerSource, /tp\('resources\.draft\.create'\)/);
  assert.match(drawerSource, /tp\('resources\.draft\.knowledgePlaceholder'\)/);
  assert.match(drawerSource, /tp\('resources\.draft\.loading'\)/);
  assert.match(drawerSource, /tp\('resources\.draft\.loadFailed'\)/);
});

test('ProjectKnowledgeDraftDrawer 已删除旧的创建知识库字段与文案', () => {
  const drawerSource = readFileSync(
    new URL(
      '../src/pages/project/components/ProjectKnowledgeDraftDrawer.tsx',
      import.meta.url,
    ),
    'utf8',
  );

  assert.doesNotMatch(
    drawerSource,
    /当前会按“先创建项目私有知识库，再上传一份 Markdown 文档”的顺序保存/,
  );
  assert.doesNotMatch(drawerSource, /知识名称/);
  assert.doesNotMatch(drawerSource, /知识描述/);
});
