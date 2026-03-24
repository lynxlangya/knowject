import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

test('AppSider adds hover language entry and locale updates', () => {
  const siderSource = readFileSync(
    new URL('../src/app/layouts/components/AppSider.tsx', import.meta.url),
    'utf8',
  );
  const accountPanelSource = readFileSync(
    new URL(
      '../src/app/layouts/components/AppSiderAccountPanel.tsx',
      import.meta.url,
    ),
    'utf8',
  );

  assert.match(accountPanelSource, /TranslationOutlined|language/);
  assert.match(accountPanelSource, /trigger=\{\['hover'\]\}|onMouseEnter/);
  assert.match(siderSource, /setLocale\(/);
  assert.match(siderSource, /updateAuthPreferences\(/);
});
