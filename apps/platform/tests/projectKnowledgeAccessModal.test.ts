import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

test('ProjectKnowledgeAccessModal 支持按 allowedModes 过滤可见模式卡片', () => {
  const modalSource = readFileSync(
    new URL(
      '../src/pages/project/components/ProjectKnowledgeAccessModal.tsx',
      import.meta.url,
    ),
    'utf8',
  );

  assert.match(modalSource, /allowedModes\?: ProjectKnowledgeAccessMode\[\]/);
  assert.match(
    modalSource,
    /const visibleModeOptions = modeOptions\.filter\(\(option\) =>[\s\S]*allowedModes/,
  );
});

test('ProjectKnowledgeAccessModal 支持聊天页自定义 project-only 创建文案', () => {
  const modalSource = readFileSync(
    new URL(
      '../src/pages/project/components/ProjectKnowledgeAccessModal.tsx',
      import.meta.url,
    ),
    'utf8',
  );

  assert.match(modalSource, /createProjectSubmitText\?: string/);
  assert.match(modalSource, /createProjectHelperText\?: string/);
  assert.match(modalSource, /createProjectTitle\?: string/);
  assert.match(modalSource, /okText=\{isGlobalMode \? '绑定到当前项目' : createProjectSubmitText\}/);
});
