import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const targetDirs = [
  '../src/pages/home',
  '../src/pages/notfound',
  '../src/pages/analytics',
  '../src/pages/members',
  '../src/pages/settings',
  '../src/pages/assets',
  '../src/pages/knowledge',
] as const;

const targetFiles = [
  'HomePage.tsx',
  'NotFoundPage.tsx',
  'AnalyticsPage.tsx',
  'MembersPage.tsx',
  'members.helpers.ts',
  'components/MemberDirectoryList.tsx',
  'components/MemberDetailPanel.tsx',
  'components/MemberFiltersBar.tsx',
  'SettingsPage.tsx',
  'useSettingsPageController.ts',
  'constants.ts',
  'components/SettingsPageParts.tsx',
  'components/SettingsAiTab.tsx',
  'components/SettingsIndexingTab.tsx',
  'components/SettingsWorkspaceTab.tsx',
  'GlobalAssetManagementPage.tsx',
  'components/GlobalAssetLayout.tsx',
  'components/globalAsset.shared.ts',
  'KnowledgeManagementPage.tsx',
  'knowledgeUpload.shared.ts',
  'knowledgeDomain.shared.ts',
  'utils/knowledgeMessages.ts',
  'adapters/knowledgeStats.adapter.ts',
  'constants/knowledgeManagement.constants.ts',
  'hooks/useKnowledgeTabOrchestration.tsx',
  'hooks/useKnowledgeModalState.ts',
  'hooks/useKnowledgeCrudActions.ts',
  'hooks/useKnowledgeDocumentMenuActions.ts',
  'useKnowledgeUploadFlow.ts',
  'useKnowledgeListState.ts',
  'useKnowledgeDetailState.ts',
  'useKnowledgeDocumentActions.ts',
  'components/KnowledgeSidebar.tsx',
  'components/KnowledgeDetailHeader.tsx',
  'components/KnowledgeDocumentsTab.tsx',
  'components/KnowledgeSearchTab.tsx',
  'components/KnowledgeOpsTab.tsx',
  'components/KnowledgeSourcePickerModal.tsx',
  'components/KnowledgeTextInputModal.tsx',
] as const;

const allowPatterns = [
  /Knowject/,
  /zh-CN/,
  /console\.error/,
  /openai/i,
  /google/i,
  /voyage/i,
  /anthropic/i,
  /gemini/i,
  /chroma/i,
  /markdown/i,
  /chunkSize/,
  /chunkOverlap/,
  /clientRequestId/,
  /baseUrl/,
  /apiKey/i,
  /llm/i,
  /indexer/i,
];

const isAllowedLine = (line: string): boolean => {
  return allowPatterns.some((pattern) => pattern.test(line));
};

const quotedCopyPattern =
  /(['"`])([^'"`\n]*[\u4e00-\u9fff][^'"`\n]*)\1/g;

for (const targetDir of targetDirs) {
  test(`${targetDir} does not keep hardcoded user-facing copy`, () => {
    const matches: string[] = [];
    const absoluteDir = path.resolve(__dirname, targetDir);

    for (const file of targetFiles) {
      const absolutePath = path.resolve(absoluteDir, file);

      try {
        const source = readFileSync(absolutePath, 'utf8');
        const lines = source.split('\n');

        lines.forEach((line, index) => {
          if (!quotedCopyPattern.test(line)) {
            quotedCopyPattern.lastIndex = 0;
            return;
          }

          quotedCopyPattern.lastIndex = 0;

          if (isAllowedLine(line)) {
            return;
          }

          matches.push(`${path.basename(absolutePath)}:${index + 1}:${line.trim()}`);
        });
      } catch {
        // The directory-specific target list is intentionally partial.
      }
    }

    assert.deepEqual(matches, []);
  });
}
