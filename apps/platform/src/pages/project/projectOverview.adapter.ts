import type { KnowledgeSummaryResponse } from "@api/knowledge";
import type {
  ConversationSummary,
  ProjectSummary,
} from "../../app/project/project.types";
import { AGENTS_FEATURE_ENABLED } from "../../app/navigation/features";
import type {
  ProjectOverviewActivityBucket,
  ProjectOverviewSummary,
} from "./projectOverview.types";

type ProjectKnowledgeSummary = Pick<
  KnowledgeSummaryResponse,
  "id" | "indexStatus" | "documentCount" | "chunkCount" | "updatedAt"
>;

export interface BuildProjectOverviewSummaryInput {
  project: Pick<
    ProjectSummary,
    "id" | "knowledgeBaseIds" | "skillIds" | "agentIds"
  >;
  conversations: ConversationSummary[] | undefined;
  boundKnowledge: ProjectKnowledgeSummary[] | undefined;
  projectKnowledge: ProjectKnowledgeSummary[] | undefined;
  now?: string;
}

const startOfUtcDay = (value: Date): Date =>
  new Date(
    Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()),
  );

const addUtcDays = (value: Date, deltaDays: number): Date =>
  new Date(value.getTime() + deltaDays * 24 * 60 * 60 * 1000);

const toUtcDateKey = (value: Date): string => value.toISOString().slice(0, 10);

const buildRecent7dBuckets = (
  nowIso: string,
): ProjectOverviewActivityBucket[] => {
  const now = new Date(nowIso);
  const today = startOfUtcDay(now);
  const start = addUtcDays(today, -6);

  const buckets: ProjectOverviewActivityBucket[] = [];
  for (let offset = 0; offset < 7; offset += 1) {
    const day = addUtcDays(start, offset);
    buckets.push({ date: toUtcDateKey(day), count: 0 });
  }

  return buckets;
};

const createEmptyStatusBreakdown = (): Record<
  "completed" | "pending" | "processing" | "failed",
  number
> => ({
  completed: 0,
  pending: 0,
  processing: 0,
  failed: 0,
});

export const buildProjectOverviewSummary = ({
  project,
  conversations,
  boundKnowledge,
  projectKnowledge,
  now = new Date().toISOString(),
}: BuildProjectOverviewSummaryInput): ProjectOverviewSummary => {
  const conversationsAvailable = conversations !== undefined;
  const conversationItems = conversations ?? [];

  const trend7d = buildRecent7dBuckets(now);
  const bucketIndexByDate = new Map<string, number>(
    trend7d.map((bucket, index) => [bucket.date, index]),
  );

  const nowInstant = new Date(now);
  const nowDayStart = startOfUtcDay(nowInstant);
  const windowStart = addUtcDays(nowDayStart, -6).getTime();
  const windowEnd = nowInstant.getTime();

  const activityByDay = new Map<string, Set<string>>();
  let latestActivityAt: string | null = null;
  let latestActivityMs = -1;

  for (const conversation of conversationItems) {
    const timestamp = new Date(conversation.updatedAt);
    const timestampMs = timestamp.getTime();
    if (Number.isNaN(timestampMs)) continue;

    if (
      timestampMs > latestActivityMs ||
      (timestampMs === latestActivityMs &&
        latestActivityAt !== null &&
        conversation.updatedAt > latestActivityAt)
    ) {
      latestActivityMs = timestampMs;
      latestActivityAt = conversation.updatedAt;
    }

    if (timestampMs < windowStart || timestampMs > windowEnd) continue;

    const dayKey = toUtcDateKey(startOfUtcDay(timestamp));
    if (!bucketIndexByDate.has(dayKey)) continue;

    const daySet = activityByDay.get(dayKey) ?? new Set<string>();
    daySet.add(conversation.id);
    activityByDay.set(dayKey, daySet);
  }

  const activeConversationIds7d = new Set<string>();
  for (const [dayKey, ids] of activityByDay.entries()) {
    const index = bucketIndexByDate.get(dayKey);
    if (typeof index !== "number") continue;
    trend7d[index] = { date: dayKey, count: ids.size };
    for (const id of ids) activeConversationIds7d.add(id);
  }

  const knowledgeAvailable =
    boundKnowledge !== undefined && projectKnowledge !== undefined;
  const boundKnowledgeItems = boundKnowledge ?? [];
  const projectKnowledgeItems = projectKnowledge ?? [];
  const globalKnowledgeCount = knowledgeAvailable
    ? new Set(boundKnowledgeItems.map((item) => item.id)).size
    : 0;
  const projectKnowledgeCount = knowledgeAvailable
    ? new Set(projectKnowledgeItems.map((item) => item.id)).size
    : 0;
  const trackedKnowledge = knowledgeAvailable
    ? Array.from(
        new Map(
          [...boundKnowledgeItems, ...projectKnowledgeItems].map(
            (item) => [item.id, item] as const,
          ),
        ).values(),
      )
    : [];

  const statusBreakdown = createEmptyStatusBreakdown();
  let knowledgeWithDocumentsCount = 0;
  let knowledgeDocumentCount = 0;

  if (knowledgeAvailable) {
    for (const item of trackedKnowledge) {
      knowledgeDocumentCount += item.documentCount;
      if (item.documentCount > 0) knowledgeWithDocumentsCount += 1;

      switch (item.indexStatus) {
        case "completed":
          statusBreakdown.completed += 1;
          break;
        case "pending":
          statusBreakdown.pending += 1;
          break;
        case "processing":
          statusBreakdown.processing += 1;
          break;
        case "failed":
          statusBreakdown.failed += 1;
          break;
        default:
          break;
      }
    }
  }

  const totalKnowledgeCount = trackedKnowledge.length;

  return {
    activity: {
      activeConversationCount7d: activeConversationIds7d.size,
      lastConversationActivityAt: latestActivityAt,
      trend7d,
      available: conversationsAvailable,
    },
    knowledge: {
      globalKnowledgeCount,
      projectKnowledgeCount,
      totalKnowledgeCount,
      knowledgeWithDocumentsCount,
      knowledgeDocumentCount,
      statusBreakdown,
      available: knowledgeAvailable,
    },
    coverage: {
      knowledge: totalKnowledgeCount,
      skills: new Set(project.skillIds).size,
      agents: AGENTS_FEATURE_ENABLED ? new Set(project.agentIds).size : 0,
    },
  };
};
