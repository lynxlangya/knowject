import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("restore saved create-session state from localStorage", () => {
  const hookSource = readFileSync(
    new URL(
      "../src/pages/skills/hooks/useSkillAuthoringSession.ts",
      import.meta.url,
    ),
    "utf8",
  );

  assert.match(
    hookSource,
    /localStorage\.getItem\(["']knowject:skills:create-authoring-session["']\)/,
  );
  assert.match(hookSource, /stage:\s*["']interviewing["']/);
  assert.match(hookSource, /const EMPTY_SCOPE/);
  assert.match(hookSource, /scenario:\s*null/);
  assert.match(hookSource, /targets:\s*\[\]/);
  assert.match(hookSource, /scope:\s*EMPTY_SCOPE/);
  assert.match(hookSource, /pendingAnswer:\s*["']{2}/);
  assert.match(hookSource, /id:\s*["']assistant-scope-intro["']/);
  assert.match(
    hookSource,
    /content:\s*["']先直接说清这个 Skill 想解决什么问题，我会在对话里逐步收敛范围和草稿。["']/,
  );
});

test("stores a full recoverable authoring session state (not just stage + draft)", () => {
  const typesSource = readFileSync(
    new URL(
      "../src/pages/skills/types/skillsManagement.types.ts",
      import.meta.url,
    ),
    "utf8",
  );
  const apiSkillsSource = readFileSync(
    new URL("../src/api/skills.ts", import.meta.url),
    "utf8",
  );

  assert.match(typesSource, /export type SkillAuthoringSessionStage =/);
  assert.match(apiSkillsSource, /export type SkillAuthoringStage/);
  assert.match(apiSkillsSource, /["']interviewing["']/);
  assert.match(apiSkillsSource, /["']synthesizing["']/);
  assert.match(apiSkillsSource, /["']awaiting_confirmation["']/);
  assert.doesNotMatch(apiSkillsSource, /["']scope_selecting["']/);
  assert.doesNotMatch(apiSkillsSource, /["']hydrated["']/);
  assert.match(typesSource, /["']hydrated["']/);

  assert.match(typesSource, /scope/);
  assert.match(typesSource, /messages/);
  assert.match(typesSource, /questionCount/);
  assert.match(typesSource, /currentSummary/);
  assert.match(typesSource, /structuredDraft/);
  assert.match(typesSource, /currentInference/);
  assert.match(typesSource, /humanOverrides/);
  assert.match(typesSource, /readyForConfirmation/);
  assert.match(typesSource, /pendingAnswer/);
});

test("exposes applyStructuredDraft to hydrate editor state", () => {
  const hookSource = readFileSync(
    new URL(
      "../src/pages/skills/hooks/useSkillAuthoringSession.ts",
      import.meta.url,
    ),
    "utf8",
  );

  assert.match(hookSource, /applyStructuredDraft/);
  assert.match(hookSource, /readyForConfirmation/);
  assert.match(hookSource, /stage:\s*["']hydrated["']/);
  assert.match(hookSource, /readyForConfirmation:\s*true/);
});

test("falls back to a fresh session when localStorage is corrupted", () => {
  const hookSource = readFileSync(
    new URL(
      "../src/pages/skills/hooks/useSkillAuthoringSession.ts",
      import.meta.url,
    ),
    "utf8",
  );

  assert.match(hookSource, /try\s*\{/);
  assert.match(hookSource, /localStorage\.removeItem\(STORAGE_KEY\)/);
  assert.match(hookSource, /const isValidScope/);
  assert.match(hookSource, /const isSkillCategory/);
  assert.match(hookSource, /const isValidInference/);
  assert.match(hookSource, /const isValidHumanOverrides/);
  assert.match(hookSource, /SKILL_CATEGORY_VALUES/);
  assert.match(hookSource, /Array\.isArray\(scope\.targets\)/);
  assert.match(hookSource, /const isValidMessages/);
  assert.match(
    hookSource,
    /if\s*\(record\.scope && !isValidScope\(record\.scope\)\)/,
  );
  assert.match(
    hookSource,
    /if\s*\(record\.messages && !isValidMessages\(record\.messages\)\)/,
  );
});

test("rejects stale scenario values during localStorage restore instead of replaying invalid sessions", () => {
  const hookSource = readFileSync(
    new URL(
      "../src/pages/skills/hooks/useSkillAuthoringSession.ts",
      import.meta.url,
    ),
    "utf8",
  );

  assert.match(hookSource, /scope\.scenario === null/);
  assert.match(hookSource, /scope\.scenario === undefined/);
  assert.match(hookSource, /isSkillCategory\(scope\.scenario\)/);
});

test("sanitizes stale scope targets during localStorage restore against the controlled allowlist", () => {
  const hookSource = readFileSync(
    new URL(
      "../src/pages/skills/hooks/useSkillAuthoringSession.ts",
      import.meta.url,
    ),
    "utf8",
  );

  assert.match(hookSource, /AUTHORING_SCOPE_TARGET_ALLOWLIST/);
  assert.match(hookSource, /const sanitizeStoredAuthoringTargets = \(/);
  assert.match(
    hookSource,
    /targets:\s*sanitizeStoredAuthoringTargets\(record\.scope\?\.targets\)/,
  );
  assert.match(
    hookSource,
    /contextTargets:\s*sanitizeStoredAuthoringTargets\(\s*record\.currentInference\.contextTargets,/,
  );
  assert.match(
    hookSource,
    /contextTargets:\s*sanitizeStoredAuthoringTargets\(\s*record\.humanOverrides\.contextTargets,/,
  );
});

test("normalizes legacy scope_selecting sessions into interviewing during localStorage restore", () => {
  const hookSource = readFileSync(
    new URL(
      "../src/pages/skills/hooks/useSkillAuthoringSession.ts",
      import.meta.url,
    ),
    "utf8",
  );

  assert.match(hookSource, /const normalizeStoredStage = \(/);
  assert.match(
    hookSource,
    /if \(value === ["']scope_selecting["']\) \{\s*return ["']interviewing["'];\s*\}/,
  );
});

test("resumes an existing hydrated draft instead of silently resetting it", () => {
  const hookSource = readFileSync(
    new URL(
      "../src/pages/skills/hooks/useSkillAuthoringSession.ts",
      import.meta.url,
    ),
    "utf8",
  );

  assert.match(hookSource, /hasRecoverableSession/);
  assert.match(hookSource, /resumeExistingSession/);
});

test("does not reopen unsent draft answers as a synthesizing state", () => {
  const hookSource = readFileSync(
    new URL(
      "../src/pages/skills/hooks/useSkillAuthoringSession.ts",
      import.meta.url,
    ),
    "utf8",
  );

  assert.match(hookSource, /const resolveAuthoringResumeStage = \(/);
  assert.doesNotMatch(
    hookSource,
    /if \(current\.pendingAnswer\.trim\(\)\) return ["']synthesizing["']/,
  );
  assert.match(hookSource, /return ["']interviewing["']/);
});

test("does not treat a brand-new intro-only session as recoverable progress", () => {
  const hookSource = readFileSync(
    new URL(
      "../src/pages/skills/hooks/useSkillAuthoringSession.ts",
      import.meta.url,
    ),
    "utf8",
  );

  // Recoverability must depend on real progress, not seeded defaults.
  assert.match(hookSource, /scope\.scenario/);
  assert.match(hookSource, /scope\.targets\.length/);
  assert.match(hookSource, /messages\.length\s*>\s*1/);
  assert.match(hookSource, /questionCount\s*>\s*0/);
  assert.match(hookSource, /currentSummary/);
  assert.match(hookSource, /structuredDraft/);
  assert.match(hookSource, /currentInference/);
  assert.match(hookSource, /humanOverrides/);
  assert.match(hookSource, /pendingAnswer/);

  // Keep intro-only session in interviewing without manufacturing extra progress.
  assert.doesNotMatch(hookSource, /Boolean\(session\.scope\)/);
  assert.doesNotMatch(hookSource, /session\.messages\.length\s*>\s*0/);
});

test("aligns authoring turns client to live backend contract", () => {
  const apiSource = readFileSync(
    new URL("../src/api/skills.ts", import.meta.url),
    "utf8",
  );

  assert.match(apiSource, /scope/);
  assert.match(apiSource, /messages/);
  assert.match(apiSource, /questionCount/);
  assert.match(apiSource, /currentSummary/);
  assert.match(apiSource, /currentStructuredDraft/);
  assert.match(apiSource, /currentInference/);
  assert.match(apiSource, /humanOverrides/);

  assert.match(apiSource, /stage/);
  assert.match(apiSource, /assistantMessage/);
  assert.match(apiSource, /nextQuestion/);
  assert.match(apiSource, /options/);
  assert.match(apiSource, /structuredDraft/);
  assert.match(apiSource, /readyForConfirmation/);
  assert.match(apiSource, /const SKILL_AUTHORING_TURN_TIMEOUT_MS = 35000/);
  assert.match(
    apiSource,
    /client\.post<ApiEnvelope<SkillAuthoringTurnResponse>>\([\s\S]*timeout:\s*SKILL_AUTHORING_TURN_TIMEOUT_MS/,
  );
  assert.match(apiSource, /SkillAuthoringTurnStreamEventType/);
  assert.doesNotMatch(apiSource, /stage:\s*["']synthesizing["']/);
});

test("consumes Skill authoring via SSE stream transport", () => {
  const streamSource = readFileSync(
    new URL("../src/api/skills.stream.ts", import.meta.url),
    "utf8",
  );

  assert.match(streamSource, /\/api\/skills\/authoring\/turns\/stream/);
  assert.match(streamSource, /text\/event-stream/);
  assert.match(streamSource, /LOCALE_HEADER/);
  assert.match(streamSource, /signal:\s*options\.signal/);
  assert.match(streamSource, /type === 'done'/);
  assert.match(streamSource, /type === 'error'/);
  assert.match(
    streamSource,
    /new ApiError\(event\.message,\s*event\.status,\s*event\.code/,
  );
});

test("enters synthesizing while waiting for the authoring response", () => {
  const hookSource = readFileSync(
    new URL(
      "../src/pages/skills/hooks/useSkillAuthoringSession.ts",
      import.meta.url,
    ),
    "utf8",
  );

  assert.match(hookSource, /stage:\s*["']synthesizing["']/);
  assert.match(hookSource, /await streamSkillAuthoringTurn/);
});

test("restores the draft answer and editable session when the authoring request fails", () => {
  const hookSource = readFileSync(
    new URL(
      "../src/pages/skills/hooks/useSkillAuthoringSession.ts",
      import.meta.url,
    ),
    "utf8",
  );

  assert.match(hookSource, /const previousSession = session/);
  assert.match(hookSource, /catch \(error\) \{/);
  assert.match(hookSource, /stage:\s*previousSession\.stage/);
  assert.match(hookSource, /messages:\s*previousSession\.messages/);
  assert.match(hookSource, /pendingAnswer:\s*answer/);
});

test("authoring session can cancel an in-flight stream and avoid stale replay after reset or close", () => {
  const hookSource = readFileSync(
    new URL(
      "../src/pages/skills/hooks/useSkillAuthoringSession.ts",
      import.meta.url,
    ),
    "utf8",
  );

  assert.match(hookSource, /useRef/);
  assert.match(hookSource, /const activeTurnRef = useRef/);
  assert.match(hookSource, /new AbortController\(\)/);
  assert.match(hookSource, /controller\.abort\(reason\)/);
  assert.match(hookSource, /cancelActiveTurn/);
  assert.match(
    hookSource,
    /getSkillAuthoringAbortReason\(controller\.signal\) === ["']cancel["']/,
  );
  assert.match(hookSource, /activeTurnRef\.current\?\.requestId !== requestId/);
});

test("strips local message fields back to { role, content } for the backend request", () => {
  const hookSource = readFileSync(
    new URL(
      "../src/pages/skills/hooks/useSkillAuthoringSession.ts",
      import.meta.url,
    ),
    "utf8",
  );

  assert.match(hookSource, /messages:\s*.*\.map\(/);
  assert.match(hookSource, /role:\s*message\.role/);
  assert.match(hookSource, /content:\s*message\.content/);
  assert.match(hookSource, /currentInference/);
  assert.match(hookSource, /humanOverrides/);
});

test("authoring session stores server-returned currentInference instead of reusing stale local inference", () => {
  const hookSource = readFileSync(
    new URL(
      "../src/pages/skills/hooks/useSkillAuthoringSession.ts",
      import.meta.url,
    ),
    "utf8",
  );

  assert.match(hookSource, /currentInference:\s*result\.currentInference/);
});
