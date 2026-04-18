import assert from 'node:assert/strict';
import test from 'node:test';
import type { SkillSummaryResponse } from '../src/api/skills';
import { createSkillOptions } from '../src/pages/agents/adapters/agentOption.adapter';
import { createAgentPayload } from '../src/pages/agents/adapters/agentPayload.adapter';

test('createAgentPayload trims text fields and preserves selected bindings', () => {
  const payload = createAgentPayload({
    name: '  Review Agent  ',
    description: '  Reviews risky changes  ',
    systemPrompt: '  Focus on regression risks.  ',
    boundKnowledgeIds: ['knowledge-1'],
    boundSkillIds: ['skill-1', 'skill-2'],
    status: 'active',
  });

  assert.deepEqual(payload, {
    name: 'Review Agent',
    description: 'Reviews risky changes',
    systemPrompt: 'Focus on regression risks.',
    boundKnowledgeIds: ['knowledge-1'],
    boundSkillIds: ['skill-1', 'skill-2'],
    status: 'active',
  });
});

test('createSkillOptions labels bound skills by preset vs team semantics', () => {
  const skillItems = [
    {
      id: 'preset-skill',
      slug: 'preset-skill',
      name: '架构草图生成',
      description: '生成架构图',
      type: 'markdown_bundle',
      source: 'preset',
      origin: null,
      handler: null,
      parametersSchema: null,
      runtimeStatus: 'contract_only',
      lifecycleStatus: 'published',
      category: 'documentation_architecture',
      status: 'active',
      owner: 'Knowject Core',
      definition: undefined,
      statusChangedAt: null,
      bindable: true,
      markdownExcerpt: 'preview',
      bundleFileCount: 1,
      importProvenance: null,
      createdBy: 'system',
      createdAt: '2026-04-01T00:00:00.000Z',
      updatedAt: '2026-04-01T00:00:00.000Z',
      publishedAt: '2026-04-01T00:00:00.000Z',
    },
    {
      id: 'team-skill',
      slug: 'team-skill',
      name: '实现前检查',
      description: '先收紧边界',
      type: 'markdown_bundle',
      source: 'team',
      origin: null,
      handler: null,
      parametersSchema: null,
      runtimeStatus: 'contract_only',
      lifecycleStatus: 'published',
      category: 'engineering_execution',
      status: 'active',
      owner: 'Team Infra',
      definition: undefined,
      statusChangedAt: null,
      bindable: true,
      markdownExcerpt: 'preview',
      bundleFileCount: 1,
      importProvenance: null,
      createdBy: 'team-user',
      createdAt: '2026-04-01T00:00:00.000Z',
      updatedAt: '2026-04-01T00:00:00.000Z',
      publishedAt: '2026-04-01T00:00:00.000Z',
    },
  ] satisfies SkillSummaryResponse[];

  const selectableOptions = createSkillOptions(skillItems, []);
  assert.equal(selectableOptions.length, 1);
  assert.equal(selectableOptions[0]?.label, '实现前检查 · Team method asset');

  const preservedOptions = createSkillOptions(skillItems, ['preset-skill']);
  const presetOption = preservedOptions.find((option) => option.value === 'preset-skill');
  const teamOption = preservedOptions.find((option) => option.value === 'team-skill');

  assert.equal(presetOption?.label, '架构草图生成 · Preset method asset');
  assert.equal(teamOption?.label, '实现前检查 · Team method asset');
});
