import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

test('useProjectKnowledgeDetailController 对项目知识刷新使用安全 catch', () => {
  const controllerSource = readFileSync(
    new URL(
      '../src/pages/project/hooks/useProjectKnowledgeDetailController.ts',
      import.meta.url,
    ),
    'utf8',
  );

  assert.match(controllerSource, /safelyRefreshProjectKnowledge/);
  assert.match(
    controllerSource,
    /Promise\.resolve\(refreshProjectKnowledge\(\)\)\.catch\(/,
  );
  assert.match(controllerSource, /刷新项目知识目录失败/);
});
