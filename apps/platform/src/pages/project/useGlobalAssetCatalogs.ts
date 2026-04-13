import { useCallback, useEffect, useRef, useState } from "react";
import { listAgents, type AgentResponse } from "@api/agents";
import { extractApiErrorMessage } from "@api/error";
import { listKnowledge, type KnowledgeSummaryResponse } from "@api/knowledge";
import { listSkills, type SkillSummaryResponse } from "@api/skills";
import { AGENTS_FEATURE_ENABLED } from "@app/navigation/features";
import { tp } from "./project.i18n";

export interface UseGlobalAssetCatalogsResult {
  knowledge: {
    items: KnowledgeSummaryResponse[];
    loading: boolean;
    error: string | null;
  };
  agents: {
    items: AgentResponse[];
    loading: boolean;
    error: string | null;
  };
  skills: {
    items: SkillSummaryResponse[];
    loading: boolean;
    error: string | null;
  };
}

export const useGlobalAssetCatalogs = (
  projectId: string | null,
): UseGlobalAssetCatalogsResult => {
  const latestProjectIdRef = useRef<string | null>(projectId);
  const [knowledgeItems, setKnowledgeItems] = useState<
    KnowledgeSummaryResponse[]
  >([]);
  const [knowledgeLoading, setKnowledgeLoading] = useState(false);
  const [knowledgeError, setKnowledgeError] = useState<string | null>(null);
  const [agentsItems, setAgentsItems] = useState<AgentResponse[]>([]);
  const [agentsLoading, setAgentsLoading] = useState(false);
  const [agentsError, setAgentsError] = useState<string | null>(null);
  const [skillsItems, setSkillsItems] = useState<SkillSummaryResponse[]>([]);
  const [skillsLoading, setSkillsLoading] = useState(false);
  const [skillsError, setSkillsError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const requestProjectId = latestProjectIdRef.current;

    if (!requestProjectId) {
      return;
    }

    setKnowledgeLoading(true);
    setSkillsLoading(true);
    setAgentsLoading(AGENTS_FEATURE_ENABLED);

    const [knowledgeResult, agentsResult, skillsResult] =
      await Promise.allSettled([
        listKnowledge(),
        AGENTS_FEATURE_ENABLED ? listAgents() : Promise.resolve({ items: [] }),
        listSkills(),
      ]);

    if (latestProjectIdRef.current !== requestProjectId) {
      return;
    }

    if (knowledgeResult.status === "fulfilled") {
      setKnowledgeItems(knowledgeResult.value.items);
      setKnowledgeError(null);
    } else {
      console.error(
        "[ProjectLayout] 加载知识库目录失败:",
        knowledgeResult.reason,
      );
      setKnowledgeItems([]);
      setKnowledgeError(
        extractApiErrorMessage(
          knowledgeResult.reason,
          tp("resources.alertGlobalKnowledge"),
        ),
      );
    }

    if (agentsResult.status === "fulfilled") {
      setAgentsItems(agentsResult.value.items);
      setAgentsError(null);
    } else if (AGENTS_FEATURE_ENABLED) {
      console.error(
        "[ProjectLayout] 加载 Agent 目录失败:",
        agentsResult.reason,
      );
      setAgentsItems([]);
      setAgentsError(
        extractApiErrorMessage(
          agentsResult.reason,
          tp("resources.alertAgents"),
        ),
      );
    } else {
      setAgentsItems([]);
      setAgentsError(null);
    }

    if (skillsResult.status === "fulfilled") {
      setSkillsItems(skillsResult.value.items);
      setSkillsError(null);
    } else {
      console.error(
        "[ProjectLayout] 加载 Skill 目录失败:",
        skillsResult.reason,
      );
      setSkillsItems([]);
      setSkillsError(
        extractApiErrorMessage(
          skillsResult.reason,
          tp("resources.alertSkills"),
        ),
      );
    }

    setKnowledgeLoading(false);
    setAgentsLoading(false);
    setSkillsLoading(false);
  }, []);

  useEffect(() => {
    latestProjectIdRef.current = projectId;
  }, [projectId]);

  useEffect(() => {
    if (!projectId) {
      return;
    }

    let cancelled = false;

    const scheduleRefresh = async () => {
      await Promise.resolve();

      if (cancelled) {
        return;
      }

      await refresh();
    };

    void scheduleRefresh();

    return () => {
      cancelled = true;
    };
  }, [projectId, refresh]);

  return {
    knowledge: {
      items: knowledgeItems,
      loading: knowledgeLoading,
      error: knowledgeError,
    },
    agents: {
      items: agentsItems,
      loading: agentsLoading,
      error: agentsError,
    },
    skills: {
      items: skillsItems,
      loading: skillsLoading,
      error: skillsError,
    },
  };
};
