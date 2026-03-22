import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

test('AppSider adds hover language entry and locale updates', () => {
  const source = readFileSync(
    new URL('../src/app/layouts/components/AppSider.tsx', import.meta.url),
    'utf8',
  );

  assert.match(source, /TranslationOutlined|language/);
  assert.match(source, /trigger=\{\["hover"\]\}|onMouseEnter/);
  assert.match(source, /setLocale\(/);
  assert.match(source, /updateAuthPreferences\(/);
});
