import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

test('SkillEditorModal uses a right drawer shell instead of modal chrome', () => {
  const source = readFileSync(
    new URL(
      '../src/pages/skills/components/SkillEditorModal.tsx',
      import.meta.url,
    ),
    'utf8',
  );

  assert.match(source, /import\s+\{\s*Alert,\s*Button,\s*Drawer,\s*Input,/);
  assert.doesNotMatch(source, /import\s+\{[\s\S]*\bModal\b[\s\S]*\}\s+from 'antd'/);
  assert.match(source, /<Drawer[\s\S]*?open=\{editorMode !== null\}/);
  assert.match(source, /<Drawer[\s\S]*?placement="right"/);
  assert.match(source, /<Drawer[\s\S]*?size=\{720\}/);
  assert.match(source, /<Drawer[\s\S]*?footer=\{/);
  assert.doesNotMatch(source, /<Modal/);
  assert.doesNotMatch(source, /onOk=\{onSubmit\}/);
  assert.doesNotMatch(source, /confirmLoading=\{editorSubmitting\}/);
  assert.doesNotMatch(source, /width=\{960\}/);
});
