import assert from 'node:assert/strict';
import test from 'node:test';
import { buildProjectOverviewInsights } from '../src/pages/project/projectOverview.insights';

const severityRank = {
  risk: 4,
  warning: 3,
  neutral: 2,
  positive: 1,
} as const;

const allowedLevels = new Set(['positive', 'neutral', 'warning', 'risk']);

const projectFixture = {
  id: 'p-1',
  name: 'Project One',
};

const assertSortedBySeverity = (insights: Array<{ level: string }>) => {
  const severity = (level: string) => severityRank[level as keyof typeof severityRank] ?? 0;
  for (let index = 1; index < insights.length; index += 1) {
    const previous = severity(insights[index - 1].level);
    const current = severity(insights[index].level);
    assert.ok(previous >= current, 'insights should be sorted by descending severity');
  }
};

const assertInsightContract = (
  insights: Array<{ id: string; level: string }>,
  expected: Array<{ id: string; level: string }>,
) => {
  assert.deepEqual(insights.map((item) => item.id), expected.map((item) => item.id));
  assert.deepEqual(insights.map((item) => item.level), expected.map((item) => item.level));
  assert.ok(insights.length <= 4);
  assertSortedBySeverity(insights);

  const semanticPattern = /^[a-z0-9_.-]+$/i;
  const candidateTextFields = ['title', 'description', 'message', 'text', 'copy'];

  for (const insight of insights) {
    assert.ok(typeof insight.id === 'string', 'insight id must be a string');
    assert.ok(allowedLevels.has(insight.level), 'insight level must be a known severity');

    const record = insight as Record<string, unknown>;
    for (const field of candidateTextFields) {
      if (field in record) {
        const value = record[field];
        assert.match(String(value), semanticPattern, `insight.${field} must stay keyword-like`);
      }
    }
  }
};

const emptySummary = {
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

const resourceStackLightSummary = {
  ...emptySummary,
  knowledge: {
    ...emptySummary.knowledge,
    totalKnowledgeCount: 2,
    globalKnowledgeCount: 1,
    projectKnowledgeCount: 1,
    knowledgeWithDocumentsCount: 2,
    knowledgeDocumentCount: 4,
    statusBreakdown: {
      completed: 1,
      pending: 0,
      processing: 0,
      failed: 0,
    },
  },
  coverage: {
    knowledge: 2,
    skills: 0,
    agents: 0,
  },
};

const stalledSummary = {
  ...emptySummary,
  activity: {
    activeConversationCount7d: 0,
    lastConversationActivityAt: '2026-03-20T08:00:00.000Z',
    trend7d: [
      { date: '2026-03-19', count: 0 },
      { date: '2026-03-20', count: 0 },
      { date: '2026-03-21', count: 0 },
      { date: '2026-03-22', count: 0 },
      { date: '2026-03-23', count: 0 },
      { date: '2026-03-24', count: 0 },
      { date: '2026-03-25', count: 0 },
    ],
    available: true,
  },
  knowledge: {
    ...emptySummary.knowledge,
    totalKnowledgeCount: 3,
    globalKnowledgeCount: 1,
    projectKnowledgeCount: 2,
    knowledgeWithDocumentsCount: 3,
    knowledgeDocumentCount: 5,
    statusBreakdown: {
      completed: 0,
      pending: 1,
      processing: 1,
      failed: 0,
    },
  },
  coverage: {
    knowledge: 3,
    skills: 1,
    agents: 0,
  },
};

test('project overview insights freeze cold start rule', () => {
  const insights = buildProjectOverviewInsights(emptySummary);

  assertInsightContract(insights, [{ id: 'cold_start', level: 'risk' }]);
});

test('project overview insights freeze resource stack light rule', () => {
  const insights = buildProjectOverviewInsights(resourceStackLightSummary);

  assertInsightContract(insights, [{ id: 'resource_stack_light', level: 'warning' }]);
});

test('project overview insights freeze ai cooling and knowledge not ready diagnostics', () => {
  const insights = buildProjectOverviewInsights(stalledSummary);

  assertInsightContract(insights, [
    { id: 'knowledge_not_ready', level: 'risk' },
    { id: 'ai_cooling', level: 'warning' },
  ]);
});
