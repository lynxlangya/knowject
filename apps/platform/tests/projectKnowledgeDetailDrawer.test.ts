import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

test('ProjectKnowledgeDetailDrawer uses Alert title instead of deprecated message prop', () => {
  const drawerSource = readFileSync(
    new URL(
      '../src/pages/project/components/ProjectKnowledgeDetailDrawer.tsx',
      import.meta.url,
    ),
    'utf8',
  );

  assert.doesNotMatch(drawerSource, /message="加载知识库详情失败"/);
  assert.doesNotMatch(drawerSource, /message="当前项目内对全局知识库保持只读"/);
  assert.doesNotMatch(drawerSource, /message="加载诊断信息失败"/);
  assert.doesNotMatch(drawerSource, /message="Collection 状态异常"/);
  assert.doesNotMatch(drawerSource, /message="Indexer 返回了降级信息"/);

  assert.match(drawerSource, /title="加载知识库详情失败"/);
  assert.match(drawerSource, /title="当前项目内对全局知识库保持只读"/);
  assert.match(drawerSource, /title="加载诊断信息失败"/);
  assert.match(drawerSource, /title="Collection 状态异常"/);
  assert.match(drawerSource, /title="Indexer 返回了降级信息"/);
});
