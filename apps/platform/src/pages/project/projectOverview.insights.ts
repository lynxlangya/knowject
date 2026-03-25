import type {
  ProjectOverviewInsight,
  ProjectOverviewInsightLevel,
  ProjectOverviewSummary,
} from "./projectOverview.types";

const severityRank: Record<ProjectOverviewInsightLevel, number> = {
  risk: 4,
  warning: 3,
  neutral: 2,
  positive: 1,
};

const buildInsight = (
  id: string,
  level: ProjectOverviewInsightLevel,
): ProjectOverviewInsight => ({ id, level });

export const buildProjectOverviewInsights = (
  summary: ProjectOverviewSummary,
): ProjectOverviewInsight[] => {
  const candidates: Array<ProjectOverviewInsight & { _order: number }> = [];
  const push = (insight: ProjectOverviewInsight) => {
    candidates.push({ ...insight, _order: candidates.length });
  };

  const hasAnyResources =
    summary.coverage.knowledge > 0 ||
    summary.coverage.skills > 0 ||
    summary.coverage.agents > 0;

  if (
    !hasAnyResources &&
    summary.activity.activeConversationCount7d === 0 &&
    summary.activity.lastConversationActivityAt === null
  ) {
    push(buildInsight("cold_start", "risk"));
  }

  const completed = summary.knowledge.statusBreakdown.completed ?? 0;
  const pending = summary.knowledge.statusBreakdown.pending ?? 0;
  const processing = summary.knowledge.statusBreakdown.processing ?? 0;
  const failed = summary.knowledge.statusBreakdown.failed ?? 0;

  if (
    summary.knowledge.available &&
    completed === 0 &&
    pending + processing + failed > 0
  ) {
    push(buildInsight("knowledge_not_ready", "risk"));
  }

  if (
    summary.activity.activeConversationCount7d === 0 &&
    summary.activity.lastConversationActivityAt !== null
  ) {
    push(buildInsight("ai_cooling", "warning"));
  }

  if (
    summary.knowledge.available &&
    summary.knowledge.projectKnowledgeCount > 0 &&
    summary.knowledge.knowledgeDocumentCount === 0
  ) {
    push(buildInsight("knowledge_empty", "warning"));
  }

  if (
    summary.coverage.knowledge > 0 &&
    summary.coverage.skills === 0 &&
    summary.coverage.agents === 0
  ) {
    push(buildInsight("resource_stack_light", "warning"));
  }

  return candidates
    .sort((left, right) => {
      const severityDelta =
        (severityRank[right.level] ?? 0) - (severityRank[left.level] ?? 0);
      if (severityDelta !== 0) return severityDelta;
      return left._order - right._order;
    })
    .slice(0, 4)
    .map(({ _order: _unused, ...insight }) => insight);
};
