import assert from 'node:assert/strict';
import test from 'node:test';
import {
  DOCUMENT_UPLOAD_ACCEPT,
  KNOWLEDGE_UPLOAD_TOOLTIP,
  validateKnowledgeSourceFile,
} from '../src/pages/knowledge/knowledgeUpload.shared';

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
  assert.match(KNOWLEDGE_UPLOAD_TOOLTIP, /\.md/);
  assert.match(KNOWLEDGE_UPLOAD_TOOLTIP, /\.markdown/);
  assert.match(KNOWLEDGE_UPLOAD_TOOLTIP, /\.txt/);
  assert.match(KNOWLEDGE_UPLOAD_TOOLTIP, /\.pdf/);
  assert.match(KNOWLEDGE_UPLOAD_TOOLTIP, /\.docx/);
  assert.match(KNOWLEDGE_UPLOAD_TOOLTIP, /\.xlsx/);
  assert.match(KNOWLEDGE_UPLOAD_TOOLTIP, /doc/);
  assert.match(KNOWLEDGE_UPLOAD_TOOLTIP, /xls/);
  assert.match(KNOWLEDGE_UPLOAD_TOOLTIP, /不支持/);
  assert.match(KNOWLEDGE_UPLOAD_TOOLTIP, /数字 PDF|数字文本 PDF/);
  assert.match(KNOWLEDGE_UPLOAD_TOOLTIP, /OCR|扫描/);
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

  assert.equal(
    docError,
    '仅支持 md、markdown、txt、pdf、docx、xlsx 文件（不支持 doc、xls）',
  );
  assert.equal(
    xlsError,
    '仅支持 md、markdown、txt、pdf、docx、xlsx 文件（不支持 doc、xls）',
  );
});
