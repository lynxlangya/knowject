import assert from 'node:assert/strict';
import test from 'node:test';
import { buildProjectOverviewSummary } from '../src/pages/project/projectOverview.adapter';

const projectFixture = {
  id: 'p-1',
  name: 'Project One',
};

test('project overview adapter freezes the summary aggregation contract', () => {
  const summary = buildProjectOverviewSummary({
    project: projectFixture,
    conversations: [
      { id: 'c-1', projectId: 'p-1', title: 'A', preview: '...', updatedAt: '2026-03-25T08:00:00.000Z' },
      { id: 'c-2', projectId: 'p-1', title: 'B', preview: '...', updatedAt: '2026-03-23T08:00:00.000Z' },
    ],
    projectKnowledge: [
      { id: 'pk-1', indexStatus: 'completed', documentCount: 2, chunkCount: 8, updatedAt: '2026-03-24T00:00:00.000Z' },
      { id: 'pk-2', indexStatus: 'processing', documentCount: 0, chunkCount: 0, updatedAt: '2026-03-25T00:00:00.000Z' },
    ],
    now: '2026-03-25T12:00:00.000Z',
  });

  assert.equal(summary.activity.activeConversationCount7d, 2);
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
