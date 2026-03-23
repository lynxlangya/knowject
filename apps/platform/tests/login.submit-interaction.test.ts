import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

test('LoginFormPanel submits the auth form when enter is pressed in inputs', () => {
  const source = readFileSync(
    new URL('../src/pages/login/components/LoginFormPanel.tsx', import.meta.url),
    'utf8',
  );

  assert.match(
    source,
    /const handlePressEnter = \(event: KeyboardEvent<HTMLInputElement>\) => \{\s*event\.preventDefault\(\);\s*void form\.submit\(\);\s*\};/,
  );
  assert.equal((source.match(/onPressEnter=\{handlePressEnter\}/g) ?? []).length, 4);
});
