import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

test('LoginPage wires account locale and guest locale switching', () => {
  const source = readFileSync(
    new URL('../src/pages/login/LoginPage.tsx', import.meta.url),
    'utf8',
  );

  assert.match(source, /result\.user\.locale/);
  assert.match(source, /writeGuestLocale/);
  assert.match(source, /setLocale\(/);
  assert.match(
    source,
    /name: values\.name\?\.trim\(\) \?\? '',\s*locale,\s*\}\s*satisfies RegisterRequest/s,
  );
  assert.match(
    source,
    /password: values\.password,\s*locale,\s*\}\s*satisfies LoginRequest/s,
  );
  assert.match(source, /message\.success\(/);
});
