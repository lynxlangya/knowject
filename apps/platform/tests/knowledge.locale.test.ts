import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { pagesMessages as pagesMessagesEn } from '../src/i18n/locales/en/pages';
import { pagesMessages as pagesMessagesZhCN } from '../src/i18n/locales/zh-CN/pages';

const componentFiles = [
  '../src/pages/assets/GlobalAssetManagementPage.tsx',
  '../src/pages/knowledge/KnowledgeManagementPage.tsx',
  '../src/pages/knowledge/components/KnowledgeSidebar.tsx',
  '../src/pages/knowledge/components/KnowledgeDetailHeader.tsx',
  '../src/pages/knowledge/components/KnowledgeDocumentsTab.tsx',
  '../src/pages/knowledge/components/KnowledgeSearchTab.tsx',
  '../src/pages/knowledge/components/KnowledgeOpsTab.tsx',
  '../src/pages/knowledge/components/KnowledgeSourcePickerModal.tsx',
  '../src/pages/knowledge/components/KnowledgeTextInputModal.tsx',
  '../src/pages/knowledge/hooks/useKnowledgeTabOrchestration.tsx',
] as const;

const helperFiles = [
  '../src/pages/knowledge/constants/knowledgeManagement.constants.ts',
  '../src/pages/knowledge/knowledgeUpload.shared.ts',
  '../src/pages/knowledge/knowledgeDomain.shared.ts',
  '../src/pages/knowledge/utils/knowledgeMessages.ts',
  '../src/pages/knowledge/useKnowledgeUploadFlow.ts',
  '../src/pages/knowledge/hooks/useKnowledgeModalState.ts',
  '../src/pages/knowledge/hooks/useKnowledgeCrudActions.ts',
  '../src/pages/knowledge/hooks/useKnowledgeDocumentMenuActions.ts',
  '../src/pages/knowledge/useKnowledgeListState.ts',
  '../src/pages/knowledge/useKnowledgeDetailState.ts',
  '../src/pages/knowledge/useKnowledgeDocumentActions.ts',
  '../src/pages/knowledge/adapters/knowledgeStats.adapter.ts',
] as const;

test('pages locale resources expose mirrored assets and knowledge sections', () => {
  const enPages = pagesMessagesEn as Record<string, unknown>;
  const zhPages = pagesMessagesZhCN as Record<string, unknown>;
  const enKnowledge = enPages.knowledge as Record<string, unknown> | undefined;
  const zhKnowledge = zhPages.knowledge as Record<string, unknown> | undefined;
  const enAssets = enPages.assets as Record<string, unknown> | undefined;
  const zhAssets = zhPages.assets as Record<string, unknown> | undefined;

  assert.ok(enKnowledge);
  assert.ok(zhKnowledge);
  assert.ok(enAssets);
  assert.ok(zhAssets);
  assert.deepEqual(Object.keys(enKnowledge), Object.keys(zhKnowledge));
  assert.deepEqual(Object.keys(enAssets), Object.keys(zhAssets));
});

for (const file of componentFiles) {
  test(`${file} wires i18n usage`, () => {
    const source = readFileSync(new URL(file, import.meta.url), 'utf8');

    assert.match(source, /useTranslation\(/);
  });
}

for (const file of helperFiles) {
  test(`${file} resolves copy from i18n resources`, () => {
    const source = readFileSync(new URL(file, import.meta.url), 'utf8');

    assert.match(source, /i18n\.t\(|\btp\(/);
  });
}
