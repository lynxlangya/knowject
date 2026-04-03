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

  assert.match(source, /import\s+\{\s*Button,\s*Drawer,\s*Input,/);
  assert.doesNotMatch(source, /import\s+\{[\s\S]*\bModal\b[\s\S]*\}\s+from 'antd'/);
  assert.match(source, /<Drawer[\s\S]*?open=\{editorMode !== null\}/);
  assert.match(source, /<Drawer[\s\S]*?placement="right"/);
  assert.match(source, /<Drawer[\s\S]*?size="large"/);
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
  assert.match(modalSource, /tabPlacement="start"/);
  assert.doesNotMatch(modalSource, /tabPosition=/);
  assert.match(modalSource, /Popconfirm/);
  assert.match(modalSource, /onAuthoringReset/);
  assert.match(modalSource, /tp\('authoring\.resetConfirm\.title'\)/);
  assert.match(modalSource, /tp\('authoring\.resetConfirm\.description'\)/);
  assert.match(modalSource, /tp\('authoring\.resetConfirm\.confirm'\)/);
  assert.doesNotMatch(modalSource, /t\('skills\.authoring\.resetConfirm\.title'\)/);
  assert.match(modalSource, /tab\.key === 'conversation'/);
  assert.match(hookSource, /editorMode === 'create'/);
  assert.match(hookSource, /setEditorTabKey\('conversation'\)/);
  assert.match(hookSource, /hydrateEditorDraftFromAuthoring/);
  assert.match(hookSource, /startFreshSession\(\)/);

  const conversationTabSource = readFileSync(
    new URL(
      '../src/pages/skills/components/SkillAuthoringConversationTab.tsx',
      import.meta.url,
    ),
    'utf8',
  );
  assert.match(conversationTabSource, /session\.stage === 'synthesizing'/);
});

test('SkillsManagementPage passes authoring session props into SkillEditorModal', () => {
  const pageSource = readFileSync(
    new URL('../src/pages/skills/SkillsManagementPage.tsx', import.meta.url),
    'utf8',
  );

  assert.match(pageSource, /authoringSession=\{skillEditor\.authoringSession\}/);
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
  assert.match(
    pageSource,
    /onAuthoringReset=\{skillEditor\.handleResetCreateAuthoring\}/,
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
    /const sanitizedTargets = sanitizeAuthoringTargets\(targets\)/,
  );
  assert.match(
    hookSource,
    /AUTHORING_SCOPE_TARGET_ALLOWLIST\.includes/,
  );
});

test('successful create clears the recoverable authoring session before reopen', () => {
  const hookSource = readFileSync(
    new URL('../src/pages/skills/hooks/useSkillEditor.ts', import.meta.url),
    'utf8',
  );

  assert.match(hookSource, /if \(editorMode === 'create'\) \{/);
  assert.match(hookSource, /await createSkill\(payload\)/);
  assert.match(hookSource, /authoringSession\.startFreshSession\(\)/);
});

test('scope must be confirmed before the authoring answer input can continue', () => {
  const conversationSource = readFileSync(
    new URL(
      '../src/pages/skills/components/SkillAuthoringConversationTab.tsx',
      import.meta.url,
    ),
    'utf8',
  );
  const hookSource = readFileSync(
    new URL('../src/pages/skills/hooks/useSkillEditor.ts', import.meta.url),
    'utf8',
  );

  assert.match(conversationSource, /session\.stage !== 'scope_selecting'/);
  assert.match(
    conversationSource,
    /disabled=\{!hasConfirmedScope \|\| authoringSubmitting\}/,
  );
  assert.match(
    conversationSource,
    /value=\{authoringSubmitting \? '' : session\.pendingAnswer\}/,
  );
  assert.match(
    hookSource,
    /if \(authoringSession\.session\.stage === 'scope_selecting'\) \{/,
  );
  assert.match(
    conversationSource,
    /placeholder=\{t\('skills\.authoring\.scope\.placeholders\.scenario'\)\}/,
  );
  assert.match(
    conversationSource,
    /placeholder=\{t\('skills\.authoring\.scope\.placeholders\.targets'\)\}/,
  );
  assert.doesNotMatch(conversationSource, /showArrow/);
});

test('reopen path derives recoverability from sanitized targets in one consistent branch', () => {
  const hookSource = readFileSync(
    new URL('../src/pages/skills/hooks/useSkillEditor.ts', import.meta.url),
    'utf8',
  );

  assert.match(
    hookSource,
    /setSession\(\(current\) => \(\{[\s\S]*targets: sanitizeAuthoringTargets\(current\.scope\.targets\)/,
  );
  assert.doesNotMatch(hookSource, /authoringSession\.resumeExistingSession\(\)/);
});

test('create-flow reset clears authoring progress and returns the drawer to initial state', () => {
  const hookSource = readFileSync(
    new URL('../src/pages/skills/hooks/useSkillEditor.ts', import.meta.url),
    'utf8',
  );

  assert.match(hookSource, /const handleResetCreateAuthoring = \(\) => \{/);
  assert.match(hookSource, /if \(editorMode !== 'create'\) \{\s*return;\s*\}/);
  assert.match(hookSource, /authoringSession\.startFreshSession\(\)/);
  assert.match(hookSource, /authoringSession\.cancelActiveTurn\(\)/);
  assert.match(hookSource, /setEditorTabKey\('conversation'\)/);
  assert.match(hookSource, /setEditorDraft\(createEmptySkillEditorDraft\(\)\)/);
  assert.match(hookSource, /setEditingSkill\(null\)/);
});

test('scope selection auto-advances from reset state once scenario and targets are complete', () => {
  const hookSource = readFileSync(
    new URL('../src/pages/skills/hooks/useSkillEditor.ts', import.meta.url),
    'utf8',
  );

  assert.match(hookSource, /const getAuthoringStageAfterScopeChange = \(/);
  assert.match(
    hookSource,
    /if \(!scenario \|\| targets.length === 0\) \{\s*return 'scope_selecting';\s*\}/,
  );
  assert.match(
    hookSource,
    /return currentStage === 'scope_selecting' \? 'interviewing' : currentStage;/,
  );
  assert.match(
    hookSource,
    /stage: getAuthoringStageAfterScopeChange\([\s\S]*scenario[\s\S]*\)/,
  );
  assert.match(
    hookSource,
    /stage: getAuthoringStageAfterScopeChange\([\s\S]*sanitizeAuthoringTargets\(targets\)[\s\S]*\)/,
  );
});
