import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { projectMessages as projectMessagesEn } from '../src/i18n/locales/en/project';
import { projectMessages as projectMessagesZhCN } from '../src/i18n/locales/zh-CN/project';

const componentFiles = [
  '../src/pages/project/ProjectLayout.tsx',
  '../src/pages/project/ProjectOverviewPage.tsx',
  '../src/pages/project/ProjectMembersPage.tsx',
  '../src/pages/project/components/ProjectHeader.tsx',
  '../src/pages/project/components/ProjectChatComposer.tsx',
  '../src/pages/project/components/ProjectSkillAccessModal.tsx',
] as const;

const helperFiles = [
  '../src/pages/project/projectConversationMessageExport.ts',
  '../src/pages/project/projectKnowledgeDraft.helpers.ts',
  '../src/pages/project/projectWorkspaceSnapshot.mock.ts',
  '../src/pages/project/useGlobalAssetCatalogs.ts',
  '../src/pages/project/useProjectChatSettings.ts',
  '../src/pages/project/useProjectConversationDetail.ts',
  '../src/pages/project/useProjectConversations.ts',
  '../src/pages/project/useProjectKnowledgeCatalog.ts',
  '../src/pages/project/projectChat.markdown.tsx',
  '../src/pages/project/hooks/useProjectKnowledgeMutations.ts',
] as const;

const localeSensitiveFiles = [
  '../src/pages/project/ProjectOverviewPage.tsx',
  '../src/pages/project/ProjectMembersPage.tsx',
  '../src/pages/project/projectConversationMessageExport.ts',
] as const;

const overviewDashboardKeys = [
  'summary',
  'activity',
  'knowledge',
  'coverage',
  'insights',
  'states',
] as const;

const ensureRecord = (value: unknown, message: string) => {
  assert.ok(value && typeof value === 'object' && !Array.isArray(value), message);
  return value as Record<string, unknown>;
};

test('project locale resources expose mirrored layout, overview, members, header, chat settings, and draft defaults', () => {
  const enProject = projectMessagesEn as Record<string, unknown>;
  const zhProject = projectMessagesZhCN as Record<string, unknown>;

  for (const key of ['layout', 'overview', 'members', 'header', 'chatSettings'] as const) {
    const enSection = enProject[key] as Record<string, unknown> | undefined;
    const zhSection = zhProject[key] as Record<string, unknown> | undefined;

    assert.ok(enSection, `missing en project.${key}`);
    assert.ok(zhSection, `missing zh-CN project.${key}`);
    assert.deepEqual(Object.keys(enSection), Object.keys(zhSection));
  }

  const enResources = enProject.resources as Record<string, unknown> | undefined;
  const zhResources = zhProject.resources as Record<string, unknown> | undefined;
  const enDraft = enResources?.draft as Record<string, unknown> | undefined;
  const zhDraft = zhResources?.draft as Record<string, unknown> | undefined;

  assert.ok(enDraft);
  assert.ok(zhDraft);

  for (const key of ['defaultDocumentTitle', 'defaultKnowledgeDescription', 'missingKnowledge', 'invalidDocument'] as const) {
    assert.ok(enDraft?.[key], `missing en project.resources.draft.${key}`);
    assert.ok(zhDraft?.[key], `missing zh-CN project.resources.draft.${key}`);
  }
});

test('overview locale dashboard contract exposes required sections', () => {
  const enOverview = projectMessagesEn.overview as Record<string, unknown> | undefined;
  const zhOverview = projectMessagesZhCN.overview as Record<string, unknown> | undefined;

  assert.ok(enOverview, 'missing en project.overview');
  assert.ok(zhOverview, 'missing zh-CN project.overview');

  for (const key of overviewDashboardKeys) {
    const enSection = enOverview?.[key];
    const zhSection = zhOverview?.[key];

    const enRecord = ensureRecord(enSection, `missing or invalid en project.overview.${key}`);
    const zhRecord = ensureRecord(zhSection, `missing or invalid zh-CN project.overview.${key}`);

    assert.deepEqual(
      Object.keys(enRecord),
      Object.keys(zhRecord),
      `overview section ${key} has drifted between locales`
    );
  }
});

test('project resource locale exposes preset and team skill ownership copy', () => {
  const enItems = projectMessagesEn.resources.item as Record<string, unknown>;
  const zhItems = projectMessagesZhCN.resources.item as Record<string, unknown>;

  assert.equal(enItems.presetSkill, 'Preset method asset');
  assert.equal(zhItems.presetSkill, '预置方法资产');
  assert.equal(enItems.teamSkill, 'Team method asset');
  assert.equal(zhItems.teamSkill, '团队方法资产');
});

test('project resource locale exposes skill access modal copy in both locales', () => {
  const enSkillAccess = (projectMessagesEn.resources as Record<string, unknown>)
    .skillAccess as Record<string, unknown>;
  const zhSkillAccess = (projectMessagesZhCN.resources as Record<string, unknown>)
    .skillAccess as Record<string, unknown>;

  assert.ok(enSkillAccess);
  assert.ok(zhSkillAccess);
  assert.deepEqual(Object.keys(enSkillAccess), Object.keys(zhSkillAccess));
  assert.equal(enSkillAccess.confirm, 'Add');
  assert.equal(zhSkillAccess.confirm, '引入');
});

test('project conversation locale exposes composer plus aria copy in both locales', () => {
  const enConversation = projectMessagesEn.conversation as Record<string, unknown>;
  const zhConversation = projectMessagesZhCN.conversation as Record<string, unknown>;

  assert.equal(
    enConversation.composerPlusAria,
    'Open more input actions (coming soon)',
  );
  assert.equal(
    zhConversation.composerPlusAria,
    '打开更多输入能力（即将支持）',
  );
});

test('project conversation locale exposes skill picker copy in both locales', () => {
  const enSkillPicker = (projectMessagesEn.conversation as Record<string, unknown>)
    .skillPicker as Record<string, unknown>;
  const zhSkillPicker = (projectMessagesZhCN.conversation as Record<string, unknown>)
    .skillPicker as Record<string, unknown>;

  assert.ok(enSkillPicker);
  assert.ok(zhSkillPicker);
  assert.deepEqual(Object.keys(enSkillPicker), Object.keys(zhSkillPicker));
});

test('ProjectOverviewPage no longer depends on legacy overview copy or recent resources helper', () => {
  const source = readFileSync(new URL('../src/pages/project/ProjectOverviewPage.tsx', import.meta.url), 'utf8');

  assert.doesNotMatch(source, /overview\.recentTitle/);
  assert.doesNotMatch(source, /overview\.resourcesTitle/);
  assert.doesNotMatch(source, /overview\.quickActionsTitle/);
  assert.doesNotMatch(source, /getRecentProjectResources/);
});

for (const file of componentFiles) {
  test(`${file} wires project i18n usage`, () => {
    const source = readFileSync(new URL(file, import.meta.url), 'utf8');

    assert.match(source, /useTranslation\(|\btp\(/);
  });
}

for (const file of helperFiles) {
  test(`${file} resolves user-facing copy from project i18n`, () => {
    const source = readFileSync(new URL(file, import.meta.url), 'utf8');

    assert.match(source, /i18n\.t\(|\btp\(/);
  });
}

for (const file of localeSensitiveFiles) {
  test(`${file} does not hardcode zh-CN date formatting`, () => {
    const source = readFileSync(new URL(file, import.meta.url), 'utf8');

    assert.doesNotMatch(source, /DateTimeFormat\(\s*['"]zh-CN['"]/);
  });
}
