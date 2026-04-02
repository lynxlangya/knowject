import assert from 'node:assert/strict';
import test from 'node:test';
import i18n from '../src/i18n';
import {
  buildSkillMarkdownPreview,
  createEmptySkillDefinition,
  getSkillDefinitionGoalSection,
  getSkillDefinitionListSections,
  getSkillFollowupStrategyOptions,
} from '../src/pages/skills/skillDefinition';
import {
  getCategoryOptions,
  getEditorTabs,
  getStatusOptions,
} from '../src/pages/skills/constants/skillsManagement.constants';

test('buildSkillMarkdownPreview renders structured definition sections into markdown', () => {
  const markdown = buildSkillMarkdownPreview({
    name: 'implementation-readiness',
    description: 'Tighten scope and validation before coding.',
    definition: {
      goal: 'Reduce rework before implementation starts.',
      triggerScenarios: ['Before a cross-module change starts'],
      requiredContext: ['Task scope', 'Existing code paths'],
      workflow: ['Inspect current facts', 'List the intended file boundary'],
      outputContract: ['Current facts', 'Edit plan', 'Validation checklist'],
      guardrails: ['Do not invent APIs or routes'],
      artifacts: ['Implementation checklist'],
      projectBindingNotes: ['Prefer the current skills contract and page scope'],
      followupQuestionsStrategy: 'required',
    },
  });

  assert.match(
    markdown,
    /^---\nname: implementation-readiness\ndescription: Tighten scope and validation before coding\.\n---/u,
  );
  assert.match(markdown, /## Goal\n\nReduce rework before implementation starts\./u);
  assert.match(
    markdown,
    /## Trigger Scenarios\n\n- Before a cross-module change starts/u,
  );
  assert.match(markdown, /## Output Contract\n\n- Current facts/u);
  assert.match(
    markdown,
    /## Follow-up Questions Strategy\n\nrequired/u,
  );
});

test('createEmptySkillDefinition prepares editable defaults for every structured section', () => {
  const definition = createEmptySkillDefinition();

  assert.deepEqual(definition.triggerScenarios, ['']);
  assert.deepEqual(definition.requiredContext, ['']);
  assert.deepEqual(definition.workflow, ['']);
  assert.deepEqual(definition.outputContract, ['']);
  assert.deepEqual(definition.guardrails, ['']);
  assert.deepEqual(definition.artifacts, ['']);
  assert.deepEqual(definition.projectBindingNotes, ['']);
  assert.equal(definition.followupQuestionsStrategy, 'optional');
});

test('skill editor copy follows the active locale at runtime', async () => {
  const previousLanguage = i18n.language;

  try {
    await i18n.changeLanguage('en');
    assert.equal(getSkillDefinitionGoalSection().label, 'Goal');
    assert.equal(getSkillDefinitionListSections()[0]?.label, 'Trigger scenarios');
    assert.equal(
      getSkillFollowupStrategyOptions()[1]?.label,
      'optional · Ask only when needed',
    );
    assert.equal(getEditorTabs()[0]?.label, 'Editor');
    assert.equal(getCategoryOptions()[0]?.label, 'Documentation / Architecture');
    assert.equal(getStatusOptions()[0]?.label, 'draft · Draft');

    await i18n.changeLanguage('zh-CN');
    assert.equal(getSkillDefinitionGoalSection().label, '目标');
    assert.equal(getSkillDefinitionListSections()[0]?.label, '触发场景');
    assert.equal(
      getSkillFollowupStrategyOptions()[1]?.label,
      'optional · 需要时追问',
    );
    assert.equal(getEditorTabs()[0]?.label, '编辑器');
    assert.equal(getCategoryOptions()[0]?.label, '文档与架构');
    assert.equal(getStatusOptions()[0]?.label, 'draft · 草稿');
  } finally {
    await i18n.changeLanguage(previousLanguage);
  }
});
