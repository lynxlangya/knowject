import assert from 'node:assert/strict';
import test from 'node:test';
import {
  normalizeUploadedFileName,
  sanitizeFileName,
} from './knowledge.shared.js';

test('normalizeUploadedFileName decodes multipart mojibake Chinese filenames', () => {
  assert.equal(
    normalizeUploadedFileName('çŸ¥é¡¹ Knowject-æ–‡æ¡£-v2.md'),
    '知项 Knowject-文档-v2.md',
  );
  assert.equal(
    normalizeUploadedFileName('ç¥é¡¹Knowject-é¡¹ç®è®¤ç¥æ»ç»-v2.md'),
    '知项Knowject-项目认知总结-v2.md',
  );
});

test('normalizeUploadedFileName keeps already-correct utf8 names', () => {
  assert.equal(normalizeUploadedFileName('知项 Knowject-文档-v2.md'), '知项 Knowject-文档-v2.md');
  assert.equal(normalizeUploadedFileName('Resume-v2.md'), 'Resume-v2.md');
});

test('sanitizeFileName preserves Chinese while stripping invalid path characters', () => {
  assert.equal(
    sanitizeFileName('知项 Knowject: 文档?.md'),
    '知项_Knowject__文档_.md',
  );
});
