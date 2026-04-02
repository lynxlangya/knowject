import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

test('restore saved create-session state from localStorage', () => {
  const source = readFileSync(
    new URL('../src/pages/skills/hooks/useSkillAuthoringSession.ts', import.meta.url),
    'utf8',
  );

  assert.match(
    source,
    /localStorage\.getItem\('knowject:skills:create-authoring-session'\)/,
  );
  assert.match(source, /stage:\s*'scope_selecting'/);
});

test('exposes applyStructuredDraft to hydrate editor state', () => {
  const source = readFileSync(
    new URL('../src/pages/skills/hooks/useSkillAuthoringSession.ts', import.meta.url),
    'utf8',
  );

  assert.match(source, /applyStructuredDraft/);
  assert.match(source, /readyForConfirmation/);
});

test('falls back to a fresh session when localStorage is corrupted', () => {
  const source = readFileSync(
    new URL('../src/pages/skills/hooks/useSkillAuthoringSession.ts', import.meta.url),
    'utf8',
  );

  assert.match(source, /try\s*\{/);
  assert.match(source, /localStorage\.removeItem\(STORAGE_KEY\)/);
});

test('resumes an existing hydrated draft instead of silently resetting it', () => {
  const source = readFileSync(
    new URL('../src/pages/skills/hooks/useSkillAuthoringSession.ts', import.meta.url),
    'utf8',
  );

  assert.match(source, /hasRecoverableSession/);
  assert.match(source, /resumeExistingSession/);
});

test('enters synthesizing while waiting for the authoring response', () => {
  const source = readFileSync(
    new URL('../src/pages/skills/hooks/useSkillAuthoringSession.ts', import.meta.url),
    'utf8',
  );

  assert.match(source, /stage:\s*'synthesizing'/);
  assert.match(source, /await runSkillAuthoringTurn/);
});
