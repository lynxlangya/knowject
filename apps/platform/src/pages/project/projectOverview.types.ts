export interface ProjectOverviewActivityBucket {
  date: string;
  count: number;
}

export interface ProjectOverviewSummary {
  activity: {
    activeConversationCount7d: number;
    lastConversationActivityAt: string | null;
    trend7d: ProjectOverviewActivityBucket[];
    available: boolean;
  };
  knowledge: {
    globalKnowledgeCount: number;
    projectKnowledgeCount: number;
    totalKnowledgeCount: number;
    knowledgeWithDocumentsCount: number;
    knowledgeDocumentCount: number;
    statusBreakdown: Record<"completed" | "pending" | "processing" | "failed", number>;
    available: boolean;
  };
  coverage: {
    knowledge: number;
    skills: number;
    agents: number;
  };
}

export type ProjectOverviewInsightLevel = "positive" | "neutral" | "warning" | "risk";

export type ProjectOverviewInsightId =
  | "cold_start"
  | "ai_cooling"
  | "knowledge_not_ready"
  | "knowledge_empty"
  | "resource_stack_light";

export interface ProjectOverviewInsight {
  id: ProjectOverviewInsightId;
  level: ProjectOverviewInsightLevel;
}
