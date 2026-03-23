import assert from 'node:assert/strict';
import test from 'node:test';
import {
  DOCUMENT_UPLOAD_ACCEPT,
  KNOWLEDGE_UPLOAD_TOOLTIP,
  validateKnowledgeSourceFile,
} from '../src/pages/knowledge/knowledgeUpload.shared';
import { tp as knowledgeTp } from '../src/pages/knowledge/knowledge.i18n';

const createFile = (name: string, size = 1024): File => {
  return new File([new Uint8Array(size)], name, {
    type: 'application/octet-stream',
  });
};

test('DOCUMENT_UPLOAD_ACCEPT 扩展到 md/markdown/txt/pdf/docx/xlsx', () => {
  assert.equal(
    DOCUMENT_UPLOAD_ACCEPT,
    '.md,.markdown,.txt,.pdf,.docx,.xlsx,text/markdown,text/plain,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  );
});

test('KNOWLEDGE_UPLOAD_TOOLTIP 展示新增格式、doc/xls 不支持与数字 PDF 限制', () => {
  assert.equal(KNOWLEDGE_UPLOAD_TOOLTIP, knowledgeTp('upload.tooltip'));
  assert.match(KNOWLEDGE_UPLOAD_TOOLTIP, /\.md/);
  assert.match(KNOWLEDGE_UPLOAD_TOOLTIP, /\.markdown/);
  assert.match(KNOWLEDGE_UPLOAD_TOOLTIP, /\.txt/);
  assert.match(KNOWLEDGE_UPLOAD_TOOLTIP, /\.pdf/);
  assert.match(KNOWLEDGE_UPLOAD_TOOLTIP, /\.docx/);
  assert.match(KNOWLEDGE_UPLOAD_TOOLTIP, /\.xlsx/);
  assert.match(KNOWLEDGE_UPLOAD_TOOLTIP, /\.doc/);
  assert.match(KNOWLEDGE_UPLOAD_TOOLTIP, /\.xls/);
  assert.match(KNOWLEDGE_UPLOAD_TOOLTIP, /PDF/i);
  assert.match(KNOWLEDGE_UPLOAD_TOOLTIP, /digital|数字/i);
  assert.match(KNOWLEDGE_UPLOAD_TOOLTIP, /OCR|scan|扫描/i);
});

test('validateKnowledgeSourceFile 接受新扩展并拒绝 doc/xls', () => {
  assert.equal(validateKnowledgeSourceFile(createFile('a.md')), null);
  assert.equal(validateKnowledgeSourceFile(createFile('a.markdown')), null);
  assert.equal(validateKnowledgeSourceFile(createFile('a.txt')), null);
  assert.equal(validateKnowledgeSourceFile(createFile('a.pdf')), null);
  assert.equal(validateKnowledgeSourceFile(createFile('a.docx')), null);
  assert.equal(validateKnowledgeSourceFile(createFile('a.xlsx')), null);

  const docError = validateKnowledgeSourceFile(createFile('a.doc'));
  const xlsError = validateKnowledgeSourceFile(createFile('a.xls'));

  assert.equal(docError, knowledgeTp('upload.invalidType'));
  assert.equal(xlsError, knowledgeTp('upload.invalidType'));
});
