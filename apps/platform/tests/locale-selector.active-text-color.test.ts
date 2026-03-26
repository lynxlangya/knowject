import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

test('locale selectors force active labels to white', () => {
  const loginSource = readFileSync(
    new URL('../src/pages/login/components/LoginFormPanel.tsx', import.meta.url),
    'utf8',
  );
  const accountPanelSource = readFileSync(
    new URL(
      '../src/app/layouts/components/AppSiderAccountPanel.tsx',
      import.meta.url,
    ),
    'utf8',
  );

  assert.match(
    loginSource,
    /active\s*\?\s*'text-white! shadow-\[0_8px_18px_rgba\(27,80,183,0\.24\)\]'/,
  );
  assert.match(accountPanelSource, /active\s*\?\s*'text-white!'/);
});
