import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { pagesMessages as pagesMessagesEn } from '../src/i18n/locales/en/pages';
import { pagesMessages as pagesMessagesZhCN } from '../src/i18n/locales/zh-CN/pages';

const files = [
  '../src/pages/agents/AgentsManagementPage.tsx',
  '../src/pages/agents/components/AgentDetailPane.tsx',
  '../src/pages/agents/components/AgentFormModal.tsx',
  '../src/pages/agents/components/AgentsSidebar.tsx',
  '../src/pages/agents/constants/agentsManagement.constants.ts',
  '../src/pages/agents/hooks/useAgentForm.ts',
  '../src/pages/agents/hooks/useAgentMutations.tsx',
  '../src/pages/agents/hooks/useAgentsListState.ts',
  '../src/pages/agents/agents.i18n.ts',
] as const;

test('pages locale resources expose mirrored agents section', () => {
  const enPages = pagesMessagesEn as Record<string, unknown>;
  const zhPages = pagesMessagesZhCN as Record<string, unknown>;
  const enAgents = enPages.agents as Record<string, unknown> | undefined;
  const zhAgents = zhPages.agents as Record<string, unknown> | undefined;

  assert.ok(enAgents);
  assert.ok(zhAgents);
  assert.deepEqual(Object.keys(enAgents), Object.keys(zhAgents));
});

for (const file of files) {
  test(`${file} resolves user-facing copy from agents i18n`, () => {
    const source = readFileSync(new URL(file, import.meta.url), 'utf8');

    assert.match(source, /useTranslation\(|i18n\.t\(|\btp\(/);
  });
}
