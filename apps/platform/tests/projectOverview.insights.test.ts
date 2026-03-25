import assert from 'node:assert/strict';
import test from 'node:test';
import { buildProjectOverviewInsights } from '../src/pages/project/projectOverview.insights';

const severityRank = {
  risk: 4,
  warning: 3,
  neutral: 2,
  positive: 1,
} as const;

const projectFixture = {
  id: 'p-1',
  name: 'Project One',
};

const baseSummary = {
  project: projectFixture,
  activity: {
    activeConversationCount7d: 0,
    lastConversationActivityAt: null,
    trend7d: [],
    available: true,
  },
  knowledge: {
    globalKnowledgeCount: 0,
    projectKnowledgeCount: 0,
    totalKnowledgeCount: 0,
    knowledgeWithDocumentsCount: 0,
    knowledgeDocumentCount: 0,
    statusBreakdown: {
      completed: 0,
      pending: 0,
      processing: 0,
      failed: 0,
    },
    available: true,
  },
  coverage: {
    knowledge: 0,
    skills: 0,
    agents: 0,
  },
};

const coldStartSummary = {
  ...baseSummary,
  knowledge: {
    ...baseSummary.knowledge,
    totalKnowledgeCount: 1,
    knowledgeDocumentCount: 1,
  },
  coverage: {
    knowledge: 3,
    skills: 0,
    agents: 0,
  },
};

const stalledSummary = {
  ...baseSummary,
  activity: {
    activeConversationCount7d: 0,
    lastConversationActivityAt: '2026-03-20T08:00:00.000Z',
    trend7d: [
      { date: '2026-03-19', count: 3 },
      { date: '2026-03-20', count: 1 },
      { date: '2026-03-21', count: 0 },
      { date: '2026-03-22', count: 0 },
    ],
    available: true,
  },
  knowledge: {
    ...baseSummary.knowledge,
    totalKnowledgeCount: 3,
    knowledgeDocumentCount: 5,
    statusBreakdown: {
      completed: 0,
      pending: 1,
      processing: 1,
      failed: 0,
    },
  },
  coverage: {
    knowledge: 2,
    skills: 1,
    agents: 0,
  },
};

const assertSortedBySeverity = (insights: Array<{ id: string; level: string }>) => {
  const severity = (level: string) => severityRank[level as keyof typeof severityRank] ?? 0;
  for (let index = 1; index < insights.length; index += 1) {
    const previous = severity(insights[index - 1].level);
    const current = severity(insights[index].level);
    assert.ok(previous >= current, 'insights should be sorted by descending severity');
  }
};

test('project overview insights freeze cold start and resource stack light inspections', () => {
  const insights = buildProjectOverviewInsights(coldStartSummary);

  assert.deepEqual(insights.map((item) => item.id), ['cold_start', 'resource_stack_light']);
  assert.ok(insights.length <= 4);
  assertSortedBySeverity(insights);
  assert.ok(insights.every((item) => typeof item.level === 'string'));
});

test('project overview insights freeze ai cooling and knowledge not ready inspections', () => {
  const insights = buildProjectOverviewInsights(stalledSummary);

  assert.deepEqual(insights.map((item) => item.id), ['ai_cooling', 'knowledge_not_ready']);
  assert.ok(insights.length <= 4);
  assertSortedBySeverity(insights);
  assert.ok(insights.every((item) => typeof item.level === 'string'));
});
