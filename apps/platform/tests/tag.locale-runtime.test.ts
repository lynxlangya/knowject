import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import test from 'node:test';
import type { ComponentProps } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import i18n from '../src/i18n';
import { tp as agentsTp } from '../src/pages/agents/agents.i18n';
import { tp as knowledgeTp } from '../src/pages/knowledge/knowledge.i18n';
import { tp as projectTp } from '../src/pages/project/project.i18n';
import { tp as skillsTp } from '../src/pages/skills/skills.i18n';

const require = createRequire(import.meta.url);
require.extensions['.css'] = () => undefined;

const escapeRegExp = (value: string): string => {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

test('tag copy follows runtime locale changes after module initialization', async () => {
  await i18n.changeLanguage('en');
  const React = await import('react');
  globalThis.React = React;

  const { ProjectResourceGroup } = await import(
    '../src/pages/project/components/ProjectResourceGroup'
  );
  type ProjectResourceGroupProps = ComponentProps<typeof ProjectResourceGroup>;
  const { KNOWLEDGE_DOCUMENT_STATUS_META, KNOWLEDGE_INDEX_STATUS_META, KNOWLEDGE_SOURCE_TYPE_META } =
    await import('../src/pages/knowledge/knowledgeDomain.shared');
  const { AGENT_STATUS_META } = await import(
    '../src/pages/agents/constants/agentsManagement.constants'
  );
  const { SOURCE_META, STATUS_META } = await import(
    '../src/pages/skills/constants/skillsManagement.constants'
  );

  const englishProjectPrivate = projectTp('resources.group.sourceProject');
  const englishCompleted = projectTp('resources.group.indexCompleted');
  const englishKnowledgeSource = KNOWLEDGE_SOURCE_TYPE_META.global_docs.label;
  const englishKnowledgeIndex = KNOWLEDGE_INDEX_STATUS_META.completed.label;
  const englishKnowledgeDocument = KNOWLEDGE_DOCUMENT_STATUS_META.completed.label;
  const englishAgentStatus = AGENT_STATUS_META.active.label;
  const englishSkillSource = SOURCE_META.preset.label;
  const englishSkillStatus = STATUS_META.draft.label;

  await i18n.changeLanguage('zh-CN');

  const groupProps: ProjectResourceGroupProps = {
    group: {
      key: 'knowledge',
      title: '知识库',
      description: 'desc',
      items: [
        {
          id: 'knowledge-1',
          type: 'knowledge',
          name: '项目知识',
          description: '项目描述',
          updatedAt: '3/23',
          owner: '维护者',
          usageCount: 0,
          source: 'project',
          documentCount: 3,
          indexStatus: 'completed',
        },
      ],
    },
    onAddProjectResource: () => undefined,
    onOpenGlobal: () => undefined,
  };
  const html = renderToStaticMarkup(
    React.createElement(ProjectResourceGroup, groupProps),
  );

  assert.match(
    html,
    new RegExp(escapeRegExp(projectTp('resources.group.sourceProject'))),
  );
  assert.match(
    html,
    new RegExp(escapeRegExp(projectTp('resources.group.indexCompleted'))),
  );
  assert.doesNotMatch(html, new RegExp(escapeRegExp(englishProjectPrivate)));
  assert.doesNotMatch(html, new RegExp(escapeRegExp(englishCompleted)));

  assert.equal(
    KNOWLEDGE_SOURCE_TYPE_META.global_docs.label,
    knowledgeTp('sourceMeta.global_docs'),
  );
  assert.equal(
    KNOWLEDGE_INDEX_STATUS_META.completed.label,
    knowledgeTp('indexStatus.completed'),
  );
  assert.equal(
    KNOWLEDGE_DOCUMENT_STATUS_META.completed.label,
    knowledgeTp('documentStatus.completed'),
  );
  assert.notEqual(KNOWLEDGE_SOURCE_TYPE_META.global_docs.label, englishKnowledgeSource);
  assert.notEqual(KNOWLEDGE_INDEX_STATUS_META.completed.label, englishKnowledgeIndex);
  assert.notEqual(
    KNOWLEDGE_DOCUMENT_STATUS_META.completed.label,
    englishKnowledgeDocument,
  );

  assert.equal(AGENT_STATUS_META.active.label, agentsTp('status.active'));
  assert.notEqual(AGENT_STATUS_META.active.label, englishAgentStatus);

  assert.equal(SOURCE_META.preset.label, skillsTp('source.preset'));
  assert.equal(STATUS_META.draft.label, skillsTp('status.draftBadge'));
  assert.notEqual(SOURCE_META.preset.label, englishSkillSource);
  assert.notEqual(STATUS_META.draft.label, englishSkillStatus);

  await i18n.changeLanguage('en');
});
