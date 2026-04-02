import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

test('project resource mapper presents skill ownership with preset and team semantics', () => {
  const source = readFileSync(
    new URL('../src/pages/project/projectResourceMappers.ts', import.meta.url),
    'utf8',
  );

  assert.match(source, /resources\.item\.presetSkill/);
  assert.match(source, /resources\.item\.teamSkill/);
  assert.doesNotMatch(source, /resources\.item\.importedPublic/);
});
