import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const files = [
  '../src/pages/home/HomePage.tsx',
  '../src/pages/notfound/NotFoundPage.tsx',
  '../src/pages/analytics/AnalyticsPage.tsx',
  '../src/pages/members/MembersPage.tsx',
  '../src/pages/members/components/MemberDirectoryList.tsx',
  '../src/pages/members/components/MemberDetailPanel.tsx',
  '../src/pages/members/components/MemberFiltersBar.tsx',
  '../src/pages/settings/SettingsPage.tsx',
  '../src/pages/settings/components/SettingsAiTab.tsx',
  '../src/pages/settings/components/SettingsIndexingTab.tsx',
  '../src/pages/settings/components/SettingsWorkspaceTab.tsx',
] as const;

for (const file of files) {
  test(`${file} wires i18n usage`, () => {
    const source = readFileSync(new URL(file, import.meta.url), 'utf8');

    assert.match(source, /useTranslation\(|\bt\(/);
  });
}
