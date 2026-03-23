import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { pagesMessages as pagesMessagesEn } from '../src/i18n/locales/en/pages';
import { pagesMessages as pagesMessagesZhCN } from '../src/i18n/locales/zh-CN/pages';

const files = [
  '../src/pages/skills/SkillsManagementPage.tsx',
  '../src/pages/skills/components/SkillDetailPane.tsx',
  '../src/pages/skills/components/SkillEditorModal.tsx',
  '../src/pages/skills/components/SkillImportModal.tsx',
  '../src/pages/skills/constants/skillsManagement.constants.ts',
  '../src/pages/skills/hooks/useSkillCatalogActions.ts',
  '../src/pages/skills/hooks/useSkillEditor.ts',
  '../src/pages/skills/hooks/useSkillImportFlow.ts',
  '../src/pages/skills/hooks/useSkillsListState.ts',
  '../src/pages/skills/skills.i18n.ts',
] as const;

test('pages locale resources expose mirrored skills section', () => {
  const enPages = pagesMessagesEn as Record<string, unknown>;
  const zhPages = pagesMessagesZhCN as Record<string, unknown>;
  const enSkills = enPages.skills as Record<string, unknown> | undefined;
  const zhSkills = zhPages.skills as Record<string, unknown> | undefined;

  assert.ok(enSkills);
  assert.ok(zhSkills);
  assert.deepEqual(Object.keys(enSkills), Object.keys(zhSkills));
});

for (const file of files) {
  test(`${file} resolves user-facing copy from skills i18n`, () => {
    const source = readFileSync(new URL(file, import.meta.url), 'utf8');

    assert.match(source, /useTranslation\(|i18n\.t\(|\btp\(/);
  });
}
