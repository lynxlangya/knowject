import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("SkillEditorModal uses a right drawer shell instead of modal chrome", () => {
  const source = readFileSync(
    new URL(
      "../src/pages/skills/components/SkillEditorModal.tsx",
      import.meta.url,
    ),
    "utf8",
  );

  assert.match(source, /import\s+\{\s*Button,\s*Drawer,\s*Input,/);
  assert.doesNotMatch(
    source,
    /import\s+\{[\s\S]*\bModal\b[\s\S]*\}\s+from 'antd'/,
  );
  assert.match(source, /<Drawer[\s\S]*?open=\{editorMode !== null\}/);
  assert.match(source, /<Drawer[\s\S]*?placement="right"/);
  assert.match(source, /<Drawer[\s\S]*?size="large"/);
  assert.match(source, /<Drawer[\s\S]*?footer=\{/);
  assert.doesNotMatch(source, /<Modal/);
  assert.doesNotMatch(source, /onOk=\{onSubmit\}/);
  assert.doesNotMatch(source, /confirmLoading=\{editorSubmitting\}/);
  assert.doesNotMatch(source, /width=\{960\}/);
});

test("Skill editor drawer wires create flow to conversation-first authoring tab", () => {
  const modalSource = readFileSync(
    new URL(
      "../src/pages/skills/components/SkillEditorModal.tsx",
      import.meta.url,
    ),
    "utf8",
  );
  const hookSource = readFileSync(
    new URL("../src/pages/skills/hooks/useSkillEditor.ts", import.meta.url),
    "utf8",
  );

  assert.match(
    modalSource,
    /onEditorTabKeyChange\([\s\S]*activeKey as ["']conversation["'] \| ["']editor["'] \| ["']preview["'][\s\S]*\)/,
  );
  assert.match(modalSource, /tabPlacement="start"/);
  assert.doesNotMatch(modalSource, /tabPosition=/);
  assert.match(modalSource, /Popconfirm/);
  assert.match(modalSource, /onAuthoringReset/);
  assert.match(modalSource, /tp\(["']authoring\.resetConfirm\.title["']\)/);
  assert.match(
    modalSource,
    /tp\(["']authoring\.resetConfirm\.description["']\)/,
  );
  assert.match(modalSource, /tp\(["']authoring\.resetConfirm\.confirm["']\)/);
  assert.doesNotMatch(
    modalSource,
    /t\(["']skills\.authoring\.resetConfirm\.title["']\)/,
  );
  assert.match(modalSource, /tab\.key === ["']conversation["']/);
  assert.match(hookSource, /editorMode === ["']create["']/);
  assert.match(hookSource, /setEditorTabKey\(["']conversation["']\)/);
  assert.match(hookSource, /hydrateEditorDraftFromAuthoring/);
  assert.match(hookSource, /startFreshSession\(\)/);

  const conversationTabSource = readFileSync(
    new URL(
      "../src/pages/skills/components/SkillAuthoringConversationTab.tsx",
      import.meta.url,
    ),
    "utf8",
  );
  assert.match(
    conversationTabSource,
    /session\.stage === ["']synthesizing["']/,
  );
});

test("SkillsManagementPage passes authoring session props into SkillEditorModal", () => {
  const pageSource = readFileSync(
    new URL("../src/pages/skills/SkillsManagementPage.tsx", import.meta.url),
    "utf8",
  );

  assert.match(
    pageSource,
    /authoringSession=\{skillEditor\.authoringSession\}/,
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

test("create-flow authoring targets are sanitized against controlled allowlist", () => {
  const constantsSource = readFileSync(
    new URL(
      "../src/pages/skills/constants/skillsManagement.constants.ts",
      import.meta.url,
    ),
    "utf8",
  );
  const hookSource = readFileSync(
    new URL("../src/pages/skills/hooks/useSkillEditor.ts", import.meta.url),
    "utf8",
  );

  assert.match(constantsSource, /AUTHORING_SCOPE_TARGET_ALLOWLIST/);
  assert.match(
    hookSource,
    /const sanitizedTargets = sanitizeAuthoringTargets\(current\.scope\.targets\)/,
  );
  assert.match(hookSource, /AUTHORING_SCOPE_TARGET_ALLOWLIST\.includes/);
});

test("successful create clears the recoverable authoring session before reopen", () => {
  const hookSource = readFileSync(
    new URL("../src/pages/skills/hooks/useSkillEditor.ts", import.meta.url),
    "utf8",
  );

  assert.match(hookSource, /if \(editorMode === ["']create["']\) \{/);
  assert.match(hookSource, /await createSkill\(payload\)/);
  assert.match(hookSource, /authoringSession\.startFreshSession\(\)/);
});

test("authoring answer input can continue without pre-confirmed scope", () => {
  const conversationSource = readFileSync(
    new URL(
      "../src/pages/skills/components/SkillAuthoringConversationTab.tsx",
      import.meta.url,
    ),
    "utf8",
  );
  const hookSource = readFileSync(
    new URL("../src/pages/skills/hooks/useSkillEditor.ts", import.meta.url),
    "utf8",
  );

  assert.doesNotMatch(conversationSource, /hasConfirmedScope/);
  assert.match(conversationSource, /disabled=\{authoringSubmitting\}/);
  assert.match(
    conversationSource,
    /value=\{authoringSubmitting \? "" : session\.pendingAnswer\}/,
  );
  assert.doesNotMatch(hookSource, /scope_selecting/);
  assert.match(
    conversationSource,
    /t\("skills\.authoring\.inference\.title"\)/,
  );
  assert.match(
    conversationSource,
    /t\("skills\.authoring\.inference\.summary"\)/,
  );
  assert.doesNotMatch(
    conversationSource,
    /t\("skills\.authoring\.scope\.title"\)/,
  );
  assert.doesNotMatch(conversationSource, /onScenarioChange/);
  assert.doesNotMatch(conversationSource, /onTargetsChange/);
  assert.doesNotMatch(conversationSource, /<Select/);
});

test("authoring inference header uses a compact wrap layout and truncates long text", () => {
  const conversationSource = readFileSync(
    new URL(
      "../src/pages/skills/components/SkillAuthoringConversationTab.tsx",
      import.meta.url,
    ),
    "utf8",
  );

  assert.match(
    conversationSource,
    /buildAuthoringSummaryItems\(session\.currentSummary\)/,
  );
  assert.match(
    conversationSource,
    /flex flex-wrap items-center gap-x-4 gap-y-1\.5 text-\[12px\] leading-5 text-slate-400/,
  );
  assert.match(conversationSource, /summaryItems\.map\(\(item, index\) => \(/);
  assert.match(conversationSource, /{index \+ 1}\./);
  assert.match(
    conversationSource,
    /className="min-w-0 flex-1 truncate text-\[13px\] leading-5 text-slate-600"/,
  );
  assert.match(
    conversationSource,
    /className="mt-2\.5 border-t border-slate-200\/70 pt-2\.5"/,
  );
  assert.doesNotMatch(
    conversationSource,
    /rounded-\[14px\] border border-slate-200\/70 bg-white\/75 px-4 py-3/,
  );
  assert.doesNotMatch(
    conversationSource,
    /md:grid-cols-\[140px_220px_minmax\(0,1fr\)\]/,
  );
});

test("reopen path derives recoverability from sanitized targets in one consistent branch", () => {
  const hookSource = readFileSync(
    new URL("../src/pages/skills/hooks/useSkillEditor.ts", import.meta.url),
    "utf8",
  );

  assert.match(
    hookSource,
    /setSession\(\(current\) => \{[\s\S]*targets: sanitizedTargets[\s\S]*\}\);/s,
  );
  assert.match(
    hookSource,
    /sanitizeAuthoringInference\(current\.currentInference\)\s*\?\?\s*buildAuthoringInference/,
  );
  assert.match(
    hookSource,
    /sanitizeAuthoringHumanOverrides\(current\.humanOverrides\)\s*\?\?\s*buildAuthoringHumanOverrides/,
  );
  assert.doesNotMatch(
    hookSource,
    /authoringSession\.resumeExistingSession\(\)/,
  );
});

test("create-flow reset clears authoring progress and returns the drawer to initial state", () => {
  const hookSource = readFileSync(
    new URL("../src/pages/skills/hooks/useSkillEditor.ts", import.meta.url),
    "utf8",
  );

  assert.match(hookSource, /const handleResetCreateAuthoring = \(\) => \{/);
  assert.match(
    hookSource,
    /if \(editorMode !== ["']create["']\) \{\s*return;\s*\}/,
  );
  assert.match(hookSource, /authoringSession\.startFreshSession\(\)/);
  assert.match(hookSource, /authoringSession\.cancelActiveTurn\(\)/);
  assert.match(hookSource, /setEditorTabKey\(["']conversation["']\)/);
  assert.match(hookSource, /setEditorDraft\(createEmptySkillEditorDraft\(\)\)/);
  assert.match(hookSource, /setEditingSkill\(null\)/);
});

test("create-flow no longer keeps scope-selecting as a prerequisite stage", () => {
  const hookSource = readFileSync(
    new URL("../src/pages/skills/hooks/useSkillEditor.ts", import.meta.url),
    "utf8",
  );

  assert.doesNotMatch(hookSource, /getAuthoringStageAfterScopeChange/);
  assert.doesNotMatch(hookSource, /handleAuthoringScenarioChange/);
  assert.doesNotMatch(hookSource, /handleAuthoringTargetsChange/);
});
