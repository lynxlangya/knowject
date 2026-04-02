import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

test('restore saved create-session state from localStorage', () => {
  const hookSource = readFileSync(
    new URL('../src/pages/skills/hooks/useSkillAuthoringSession.ts', import.meta.url),
    'utf8',
  );

  assert.match(
    hookSource,
    /localStorage\.getItem\('knowject:skills:create-authoring-session'\)/,
  );
  assert.match(hookSource, /stage:\s*'scope_selecting'/);
  assert.match(hookSource, /const EMPTY_SCOPE/);
  assert.match(hookSource, /scenario:\s*null/);
  assert.match(hookSource, /targets:\s*\[\]/);
  assert.match(hookSource, /scope:\s*EMPTY_SCOPE/);
  assert.match(hookSource, /pendingAnswer:\s*''/);
  assert.match(hookSource, /id:\s*'assistant-scope-intro'/);
  assert.match(
    hookSource,
    /content:\s*'先从目标场景和涉及范围开始，我会基于这两个边界继续追问。'/,
  );
});

test('stores a full recoverable authoring session state (not just stage + draft)', () => {
  const typesSource = readFileSync(
    new URL('../src/pages/skills/types/skillsManagement.types.ts', import.meta.url),
    'utf8',
  );

  assert.match(typesSource, /export type SkillAuthoringSessionStage/);
  assert.match(typesSource, /'scope_selecting'/);
  assert.match(typesSource, /'interviewing'/);
  assert.match(typesSource, /'synthesizing'/);
  assert.match(typesSource, /'awaiting_confirmation'/);
  assert.match(typesSource, /'hydrated'/);

  assert.match(typesSource, /scope/);
  assert.match(typesSource, /messages/);
  assert.match(typesSource, /questionCount/);
  assert.match(typesSource, /currentSummary/);
  assert.match(typesSource, /structuredDraft/);
  assert.match(typesSource, /readyForConfirmation/);
  assert.match(typesSource, /pendingAnswer/);
});

test('exposes applyStructuredDraft to hydrate editor state', () => {
  const hookSource = readFileSync(
    new URL('../src/pages/skills/hooks/useSkillAuthoringSession.ts', import.meta.url),
    'utf8',
  );

  assert.match(hookSource, /applyStructuredDraft/);
  assert.match(hookSource, /readyForConfirmation/);
  assert.match(hookSource, /stage:\s*'hydrated'/);
  assert.match(hookSource, /readyForConfirmation:\s*true/);
});

test('falls back to a fresh session when localStorage is corrupted', () => {
  const hookSource = readFileSync(
    new URL('../src/pages/skills/hooks/useSkillAuthoringSession.ts', import.meta.url),
    'utf8',
  );

  assert.match(hookSource, /try\s*\{/);
  assert.match(hookSource, /localStorage\.removeItem\(STORAGE_KEY\)/);
});

test('resumes an existing hydrated draft instead of silently resetting it', () => {
  const hookSource = readFileSync(
    new URL('../src/pages/skills/hooks/useSkillAuthoringSession.ts', import.meta.url),
    'utf8',
  );

  assert.match(hookSource, /hasRecoverableSession/);
  assert.match(hookSource, /resumeExistingSession/);
});

test('does not treat a brand-new intro-only session as recoverable progress', () => {
  const hookSource = readFileSync(
    new URL('../src/pages/skills/hooks/useSkillAuthoringSession.ts', import.meta.url),
    'utf8',
  );

  // Recoverability must depend on real progress, not seeded defaults.
  assert.match(hookSource, /scope\.scenario/);
  assert.match(hookSource, /scope\.targets\.length/);
  assert.match(hookSource, /messages\.length\s*>\s*1/);
  assert.match(hookSource, /questionCount\s*>\s*0/);
  assert.match(hookSource, /currentSummary/);
  assert.match(hookSource, /structuredDraft/);
  assert.match(hookSource, /pendingAnswer/);

  // Keep intro-only session in scope_selecting (no forced stage advance).
  assert.doesNotMatch(hookSource, /Boolean\(session\.scope\)/);
  assert.doesNotMatch(hookSource, /session\.messages\.length\s*>\s*0/);
});

test('aligns authoring turns client to live backend contract', () => {
  const apiSource = readFileSync(
    new URL('../src/api/skills.ts', import.meta.url),
    'utf8',
  );

  assert.match(apiSource, /scope/);
  assert.match(apiSource, /messages/);
  assert.match(apiSource, /questionCount/);
  assert.match(apiSource, /currentSummary/);
  assert.match(apiSource, /currentStructuredDraft/);

  assert.match(apiSource, /stage/);
  assert.match(apiSource, /assistantMessage/);
  assert.match(apiSource, /nextQuestion/);
  assert.match(apiSource, /options/);
  assert.match(apiSource, /structuredDraft/);
  assert.match(apiSource, /readyForConfirmation/);
});

test('enters synthesizing while waiting for the authoring response', () => {
  const hookSource = readFileSync(
    new URL('../src/pages/skills/hooks/useSkillAuthoringSession.ts', import.meta.url),
    'utf8',
  );

  assert.match(hookSource, /stage:\s*'synthesizing'/);
  assert.match(hookSource, /await runSkillAuthoringTurn/);
});

test('strips local message fields back to { role, content } for the backend request', () => {
  const hookSource = readFileSync(
    new URL('../src/pages/skills/hooks/useSkillAuthoringSession.ts', import.meta.url),
    'utf8',
  );

  assert.match(hookSource, /messages:\s*.*\.map\(/);
  assert.match(hookSource, /role:\s*message\.role/);
  assert.match(hookSource, /content:\s*message\.content/);
});
