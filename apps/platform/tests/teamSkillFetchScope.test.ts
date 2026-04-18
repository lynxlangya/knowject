import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

test('project, agent, and members read catalogs keep full skill metadata while bind selectors stay team-only', () => {
  const projectResourceOptionsSource = readFileSync(
    new URL('../src/app/project/useProjectResourceOptions.ts', import.meta.url),
    'utf8',
  );
  const projectCatalogSource = readFileSync(
    new URL('../src/pages/project/useGlobalAssetCatalogs.ts', import.meta.url),
    'utf8',
  );
  const agentsListSource = readFileSync(
    new URL('../src/pages/agents/hooks/useAgentsListState.ts', import.meta.url),
    'utf8',
  );
  const membersPageSource = readFileSync(
    new URL('../src/pages/members/MembersPage.tsx', import.meta.url),
    'utf8',
  );
  const agentOptionAdapterSource = readFileSync(
    new URL('../src/pages/agents/adapters/agentOption.adapter.ts', import.meta.url),
    'utf8',
  );

  assert.match(projectResourceOptionsSource, /listSkills\(\)/);
  assert.match(projectResourceOptionsSource, /\.filter\(\(item\) => item\.source === "team" && item\.bindable\)/);
  assert.match(projectCatalogSource, /listSkills\(\)/);
  assert.match(agentsListSource, /listSkills\(\)/);
  assert.match(agentOptionAdapterSource, /\.filter\(\(item\) => item\.source === 'team' && item\.bindable\)/);
  assert.match(membersPageSource, /listSkills\(\)/);
});
