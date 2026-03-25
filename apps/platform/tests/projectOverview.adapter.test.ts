import assert from 'node:assert/strict';
import test from 'node:test';
import { buildProjectOverviewSummary } from '../src/pages/project/projectOverview.adapter';

const projectFixture = {
  id: 'p-1',
  name: 'Project One',
  knowledgeBaseIds: ['kb-1'],
  skillIds: ['skill-1'],
  agentIds: [],
};

test('project overview adapter freezes the summary aggregation contract', () => {
  const summary = buildProjectOverviewSummary({
    project: projectFixture,
    conversations: [
    { id: 'c-1', projectId: 'p-1', title: 'A', preview: '...', updatedAt: '2026-03-25T08:00:00.000Z' },
    { id: 'c-1', projectId: 'p-1', title: 'A', preview: 'duplicate entry for same day', updatedAt: '2026-03-25T09:00:00.000Z' },
      { id: 'c-2', projectId: 'p-1', title: 'B', preview: '...', updatedAt: '2026-03-23T08:00:00.000Z' },
    ],
    projectKnowledge: [
      { id: 'pk-1', indexStatus: 'completed', documentCount: 2, chunkCount: 8, updatedAt: '2026-03-24T00:00:00.000Z' },
      { id: 'pk-2', indexStatus: 'processing', documentCount: 0, chunkCount: 0, updatedAt: '2026-03-25T00:00:00.000Z' },
    ],
    now: '2026-03-25T12:00:00.000Z',
  });

  assert.equal(summary.activity.activeConversationCount7d, 2);
  assert.deepEqual(summary.activity.trend7d, [
    { date: '2026-03-19', count: 0 },
    { date: '2026-03-20', count: 0 },
    { date: '2026-03-21', count: 0 },
    { date: '2026-03-22', count: 0 },
    { date: '2026-03-23', count: 1 },
    { date: '2026-03-24', count: 0 },
    { date: '2026-03-25', count: 1 },
  ]);
  assert.equal(summary.activity.lastConversationActivityAt, '2026-03-25T09:00:00.000Z');
  assert.equal(summary.activity.available, true);
  assert.equal(summary.knowledge.globalKnowledgeCount, 1);
  assert.equal(summary.knowledge.projectKnowledgeCount, 2);
  assert.equal(summary.knowledge.knowledgeWithDocumentsCount, 1);
  assert.equal(summary.knowledge.knowledgeDocumentCount, 2);
  assert.equal(summary.knowledge.available, true);
  assert.equal(summary.knowledge.totalKnowledgeCount, 3);
  assert.deepEqual(summary.knowledge.statusBreakdown, {
    completed: 1,
    pending: 0,
    processing: 1,
    failed: 0,
  });
  assert.deepEqual(summary.coverage, {
    knowledge: 3,
    skills: 1,
    agents: 0,
  });
});

test('project overview adapter marks knowledge unavailable when project data is missing', () => {
  const summary = buildProjectOverviewSummary({
    project: projectFixture,
    conversations: [],
    projectKnowledge: undefined,
    now: '2026-03-25T12:00:00.000Z',
  });

  assert.equal(summary.activity.available, true);
  assert.equal(summary.knowledge.available, false);
  assert.equal(summary.knowledge.globalKnowledgeCount, 1);
  assert.equal(summary.knowledge.projectKnowledgeCount, 0);
  assert.equal(summary.knowledge.knowledgeWithDocumentsCount, 0);
  assert.equal(summary.knowledge.knowledgeDocumentCount, 0);
  assert.equal(summary.knowledge.totalKnowledgeCount, 1);
});

test('project overview adapter marks activity unavailable when conversation data is missing', () => {
  const summary = buildProjectOverviewSummary({
    project: projectFixture,
    conversations: undefined,
    projectKnowledge: [],
    now: '2026-03-25T12:00:00.000Z',
  });

  assert.equal(summary.activity.available, false);
  assert.equal(summary.activity.activeConversationCount7d, 0);
  assert.equal(summary.activity.lastConversationActivityAt, null);
  assert.deepEqual(summary.activity.trend7d, [
    { date: '2026-03-19', count: 0 },
    { date: '2026-03-20', count: 0 },
    { date: '2026-03-21', count: 0 },
    { date: '2026-03-22', count: 0 },
    { date: '2026-03-23', count: 0 },
    { date: '2026-03-24', count: 0 },
    { date: '2026-03-25', count: 0 },
  ]);
});
