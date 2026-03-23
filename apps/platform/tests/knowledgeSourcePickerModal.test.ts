import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { pagesMessages as enPagesMessages } from '../src/i18n/locales/en/pages';
import { pagesMessages as zhCnPagesMessages } from '../src/i18n/locales/zh-CN/pages';

test('KnowledgeSourcePickerModal 文案与当前多格式上传能力一致', () => {
  const modalSource = readFileSync(
    new URL(
      '../src/pages/knowledge/components/KnowledgeSourcePickerModal.tsx',
      import.meta.url,
    ),
    'utf8',
  );
  const descriptions = [
    enPagesMessages.knowledge.upload.sourcePickerDropDescription,
    zhCnPagesMessages.knowledge.upload.sourcePickerDropDescription,
  ];

  assert.match(
    modalSource,
    /t\('knowledge\.upload\.sourcePickerDropDescription',\s*\{/,
  );

  descriptions.forEach((description) => {
    assert.match(description, /\.md/);
    assert.match(description, /\.markdown/);
    assert.match(description, /\.txt/);
    assert.match(description, /\.pdf/);
    assert.match(description, /\.docx/);
    assert.match(description, /\.xlsx/);
    assert.match(description, /\.doc/);
    assert.match(description, /\.xls/);
    assert.match(description, /PDF/i);
    assert.match(description, /OCR|scan|扫描/i);
  });
});
