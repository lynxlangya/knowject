import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { pagesMessages as pagesMessagesEn } from '../src/i18n/locales/en/pages';
import { pagesMessages as pagesMessagesZhCN } from '../src/i18n/locales/zh-CN/pages';

const files = [
  '../src/pages/skills/SkillsManagementPage.tsx',
  '../src/pages/skills/components/SkillDetailPane.tsx',
  '../src/pages/skills/components/SkillEditorModal.tsx',
  '../src/pages/skills/components/SkillDefinitionListField.tsx',
  '../src/pages/skills/constants/skillsManagement.constants.ts',
  '../src/pages/skills/hooks/useSkillCatalogActions.ts',
  '../src/pages/skills/hooks/useSkillEditor.ts',
  '../src/pages/skills/hooks/useSkillsListState.ts',
  '../src/pages/skills/skillDefinition.ts',
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

test('skills locale resources reflect structured method-asset vocabulary', () => {
  const enPages = pagesMessagesEn as Record<string, unknown>;
  const zhPages = pagesMessagesZhCN as Record<string, unknown>;
  const enSkills = enPages.skills as Record<string, unknown>;
  const zhSkills = zhPages.skills as Record<string, unknown>;
  const enAction = enSkills.action as Record<string, unknown>;
  const zhAction = zhSkills.action as Record<string, unknown>;
  const enSource = enSkills.source as Record<string, unknown>;
  const zhSource = zhSkills.source as Record<string, unknown>;
  const enStatus = enSkills.status as Record<string, unknown>;
  const zhStatus = zhSkills.status as Record<string, unknown>;
  const enDefinition = enSkills.definition as Record<string, unknown>;
  const zhDefinition = zhSkills.definition as Record<string, unknown>;

  assert.ok(enStatus);
  assert.ok(zhStatus);
  assert.ok(enDefinition);
  assert.ok(zhDefinition);
  assert.ok(!('import' in enSkills));
  assert.ok(!('import' in zhSkills));
  assert.ok(!('importFlow' in enSkills));
  assert.ok(!('importFlow' in zhSkills));
  assert.ok(!('publish' in enAction));
  assert.ok(!('publish' in zhAction));
  assert.equal(enSource.preset, 'Preset');
  assert.equal(zhSource.preset, '预置');
  assert.equal(enSource.team, 'Team');
  assert.equal(zhSource.team, '团队');
});

test('skills locale resources freeze conversation authoring copy', () => {
  const enPages = pagesMessagesEn as Record<string, unknown>;
  const zhPages = pagesMessagesZhCN as Record<string, unknown>;
  const enSkills = enPages.skills as Record<string, unknown>;
  const zhSkills = zhPages.skills as Record<string, unknown>;
  const enAuthoring = enSkills.authoring as Record<string, unknown>;
  const zhAuthoring = zhSkills.authoring as Record<string, unknown>;
  const enScope = enAuthoring.scope as Record<string, unknown>;
  const zhScope = zhAuthoring.scope as Record<string, unknown>;
  const enActions = enAuthoring.actions as Record<string, unknown>;
  const zhActions = zhAuthoring.actions as Record<string, unknown>;

  assert.ok(enAuthoring);
  assert.ok(zhAuthoring);
  assert.ok(enScope);
  assert.ok(zhScope);
  assert.ok(enActions);
  assert.ok(zhActions);

  assert.equal(
    zhAuthoring.intro,
    '先通过对话把问题说清，再把整理结果填充为 Skill。',
  );
  assert.equal(
    enAuthoring.intro,
    'Clarify the method through conversation first, then fill the structured Skill draft.',
  );
  assert.equal(zhActions.confirmDraft, '确认并填充 Skill');
  assert.equal(enActions.confirmDraft, 'Confirm and fill Skill');
  assert.equal(zhScope.scenario, '目标场景');
  assert.equal(enScope.scenario, 'Target scenario');
  assert.equal(zhScope.targets, '涉及范围');
  assert.equal(enScope.targets, 'Scope targets');
});

test('skills contract and governance docs mention the live authoring turn flow', () => {
  const contractSource = readFileSync(
    new URL('../../../docs/contracts/skills-contract.md', import.meta.url),
    'utf8',
  );
  const governanceSource = readFileSync(
    new URL('../../../docs/current/skills-governance.md', import.meta.url),
    'utf8',
  );

  assert.match(contractSource, /POST \/api\/skills\/authoring\/turns/);
  assert.match(contractSource, /scope\.scenario/);
  assert.match(contractSource, /scope\.targets/);
  assert.match(contractSource, /currentStructuredDraft/);

  assert.match(governanceSource, /conversation/);
  assert.match(governanceSource, /structuredDraft/);
  assert.match(governanceSource, /POST \/api\/skills/);
});

for (const file of files) {
  test(`${file} resolves user-facing copy from skills i18n`, () => {
    const source = readFileSync(new URL(file, import.meta.url), 'utf8');

    assert.match(source, /useTranslation\(|i18n\.t\(|\btp\(/);
  });
}
