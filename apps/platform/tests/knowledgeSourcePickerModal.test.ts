import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

test('KnowledgeSourcePickerModal 文案与当前多格式上传能力一致', () => {
  const modalSource = readFileSync(
    new URL(
      '../src/pages/knowledge/components/KnowledgeSourcePickerModal.tsx',
      import.meta.url,
    ),
    'utf8',
  );

  assert.match(modalSource, /支持 \.md、\.markdown、\.txt、\.pdf、\.docx、\.xlsx/);
  assert.match(modalSource, /不支持 \.doc、\.xls/);
  assert.match(modalSource, /PDF\s*仅支持数字文本 PDF/);
  assert.match(modalSource, /OCR\s*\/\s*扫描件/);
});
