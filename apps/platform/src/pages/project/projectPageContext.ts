import type { AgentResponse } from '@api/agents';
import type { KnowledgeSummaryResponse } from '@api/knowledge';
import type { SkillSummaryResponse } from '@api/skills';
import { useOutletContext } from 'react-router-dom';
import type {
  ConversationSummary,
  ProjectSummary,
  ProjectWorkspaceSnapshot,
} from '@app/project/project.types';

export interface ProjectPageListState<TItem> {
  items: TItem[];
  loading: boolean;
  error: string | null;
}

export interface ProjectPageRefreshableListState<TItem>
  extends ProjectPageListState<TItem> {
  refresh: () => void | Promise<void>;
}

export interface ProjectPageGlobalAssetCatalogs {
  knowledge: ProjectPageListState<KnowledgeSummaryResponse>;
  agents: ProjectPageListState<AgentResponse>;
  skills: ProjectPageListState<SkillSummaryResponse>;
}

export interface ProjectPageKnowledgeCatalogState
  extends ProjectPageRefreshableListState<KnowledgeSummaryResponse> {
  shouldPoll: boolean;
  pollingAttempts: number;
  pollingStopped: boolean;
}

export interface ProjectPageContextValue extends ProjectWorkspaceSnapshot {
  activeProject: ProjectSummary;
  conversations: ProjectPageRefreshableListState<ConversationSummary>;
  globalAssetCatalogs: ProjectPageGlobalAssetCatalogs;
  projectKnowledge: ProjectPageKnowledgeCatalogState;
}

export const useProjectPageContext = (): ProjectPageContextValue => {
  return useOutletContext<ProjectPageContextValue>();
};
