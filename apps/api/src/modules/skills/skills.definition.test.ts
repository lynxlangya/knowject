import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildLegacySkillDefinition,
  buildSkillMarkdownFromDefinition,
} from './skills.definition.js';
import type { SkillDefinitionFields } from './skills.definition.js';

const BASE_DEFINITION = {
  goal: '在需求或方案不清晰时暴露缺口',
  triggerScenarios: ['需求文档边界模糊', '设计方案缺少责任划分'],
  requiredContext: ['PRD', '当前架构文档'],
  workflow: ['阅读输入文档', '列出不清楚的问题', '给出建议补充项'],
  outputContract: ['问题清单', '建议追问', '建议补充内容'],
  guardrails: ['不替用户偷偷决定核心 tradeoff'],
  artifacts: ['补充问题清单'],
  projectBindingNotes: ['优先读取 docs/current/architecture.md'],
  followupQuestionsStrategy: 'required',
} satisfies SkillDefinitionFields;

test('buildSkillMarkdownFromDefinition renders the structured method-asset contract', () => {
  const markdown = buildSkillMarkdownFromDefinition({
    name: '文档反向追问',
    description: '暴露文档中的缺失决策',
    definition: BASE_DEFINITION,
  });

  assert.match(
    markdown,
    /^---\nname: 文档反向追问\ndescription: 暴露文档中的缺失决策\n---/,
  );
  assert.match(markdown, /## Goal\n\n在需求或方案不清晰时暴露缺口/);
  assert.match(
    markdown,
    /## Trigger Scenarios\n\n- 需求文档边界模糊\n- 设计方案缺少责任划分/,
  );
  assert.match(markdown, /## Follow-up Questions Strategy\n\nrequired/);
});

test('buildLegacySkillDefinition preserves legacy fallback fields', () => {
  const definition = buildLegacySkillDefinition({
    name: '旧版 Skill',
    description: '旧模型描述',
    skillMarkdown: '# Legacy Skill\n\n- old body line',
    owner: 'legacy-user',
  });

  assert.equal(definition.goal, '旧模型描述');
  assert.deepEqual(definition.workflow, ['Review the legacy markdown body']);
  assert.deepEqual(definition.artifacts, ['Legacy markdown note']);
  assert.equal(definition.followupQuestionsStrategy, 'optional');
});
