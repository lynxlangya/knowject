import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { getInitialIndexingDraft } from '../src/pages/settings/constants';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

test('getInitialIndexingDraft 默认支持 md/txt/pdf/docx/xlsx', () => {
  const draft = getInitialIndexingDraft(null);

  assert.deepEqual(draft.supportedTypes, ['md', 'txt', 'pdf', 'docx', 'xlsx']);
});

test('SettingsIndexingTab 不再渲染“即将支持”占位，并包含新增类型选项文案', () => {
  const source = readFileSync(
    path.resolve(
      __dirname,
      '../src/pages/settings/components/SettingsIndexingTab.tsx',
    ),
    'utf8',
  );

  assert.doesNotMatch(source, /即将支持/);
  assert.match(source, /useTranslation\(/);
  assert.match(source, /Markdown \(\.md\)/);
  assert.match(source, /Text \(\.txt\)/);
  assert.match(source, /PDF \(\.pdf\)/);
  assert.match(source, /Word \(\.docx\)/);
  assert.match(source, /Excel \(\.xlsx\)/);
  assert.match(source, /settings\.alerts\.markdownAlias/);
});
