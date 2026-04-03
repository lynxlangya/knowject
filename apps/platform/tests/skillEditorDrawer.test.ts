import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

test('SkillEditorModal uses a right drawer shell instead of modal chrome', () => {
  const source = readFileSync(
    new URL(
      '../src/pages/skills/components/SkillEditorModal.tsx',
      import.meta.url,
    ),
    'utf8',
  );

  assert.match(source, /import\s+\{\s*Alert,\s*Button,\s*Drawer,\s*Input,/);
  assert.doesNotMatch(source, /import\s+\{[\s\S]*\bModal\b[\s\S]*\}\s+from 'antd'/);
  assert.match(source, /<Drawer[\s\S]*?open=\{editorMode !== null\}/);
  assert.match(source, /<Drawer[\s\S]*?placement="right"/);
  assert.match(source, /<Drawer[\s\S]*?size=\{720\}/);
  assert.match(source, /<Drawer[\s\S]*?footer=\{/);
  assert.doesNotMatch(source, /<Modal/);
  assert.doesNotMatch(source, /onOk=\{onSubmit\}/);
  assert.doesNotMatch(source, /confirmLoading=\{editorSubmitting\}/);
  assert.doesNotMatch(source, /width=\{960\}/);
});

test('Skill editor drawer wires create flow to conversation-first authoring tab', () => {
  const modalSource = readFileSync(
    new URL(
      '../src/pages/skills/components/SkillEditorModal.tsx',
      import.meta.url,
    ),
    'utf8',
  );
  const hookSource = readFileSync(
    new URL('../src/pages/skills/hooks/useSkillEditor.ts', import.meta.url),
    'utf8',
  );

  assert.match(
    modalSource,
    /onEditorTabKeyChange\(activeKey as 'conversation' \| 'editor' \| 'preview'\)/,
  );
  assert.match(modalSource, /tab\.key === 'conversation'/);
  assert.match(hookSource, /editorMode === 'create'/);
  assert.match(hookSource, /setEditorTabKey\('conversation'\)/);
  assert.match(hookSource, /hydrateEditorDraftFromAuthoring/);
  assert.match(hookSource, /stage === 'synthesizing'/);
  assert.match(hookSource, /startFreshSession\(\)/);
});

test('SkillsManagementPage passes authoring session props into SkillEditorModal', () => {
  const pageSource = readFileSync(
    new URL('../src/pages/skills/SkillsManagementPage.tsx', import.meta.url),
    'utf8',
  );

  assert.match(pageSource, /authoringSession=\{skillEditor\.authoringSession\}/);
  assert.match(pageSource, /authoringSubmitting=\{skillEditor\.authoringSubmitting\}/);
  assert.match(
    pageSource,
    /onAuthoringScenarioChange=\{skillEditor\.handleAuthoringScenarioChange\}/,
  );
  assert.match(
    pageSource,
    /onAuthoringTargetsChange=\{skillEditor\.handleAuthoringTargetsChange\}/,
  );
  assert.match(
    pageSource,
    /onAuthoringConfirmScope=\{skillEditor\.handleConfirmAuthoringScope\}/,
  );
  assert.match(
    pageSource,
    /onAuthoringAnswerChange=\{skillEditor\.handleAuthoringAnswerChange\}/,
  );
  assert.match(
    pageSource,
    /onAuthoringSubmitAnswer=\{[\s\S]*handleSubmitAuthoringAnswer[\s\S]*\}/,
  );
  assert.match(
    pageSource,
    /onAuthoringConfirmDraft=\{skillEditor\.handleConfirmAuthoringDraft\}/,
  );
});

test('create-flow authoring targets are sanitized against controlled allowlist', () => {
  const constantsSource = readFileSync(
    new URL(
      '../src/pages/skills/constants/skillsManagement.constants.ts',
      import.meta.url,
    ),
    'utf8',
  );
  const hookSource = readFileSync(
    new URL('../src/pages/skills/hooks/useSkillEditor.ts', import.meta.url),
    'utf8',
  );

  assert.match(constantsSource, /AUTHORING_SCOPE_TARGET_ALLOWLIST/);
  assert.match(
    hookSource,
    /sanitizeAuthoringTargets\([\s\S]*authoringSession\.session\.scope\.targets[\s\S]*\)/,
  );
  assert.match(
    hookSource,
    /targets:\s*sanitizeAuthoringTargets\(targets\)/,
  );
  assert.match(
    hookSource,
    /AUTHORING_SCOPE_TARGET_ALLOWLIST\.includes/,
  );
});
