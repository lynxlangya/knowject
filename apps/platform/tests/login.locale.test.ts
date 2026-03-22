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
  assert.match(source, /message\.success\(/);
});
