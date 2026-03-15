import type { AgentResponse } from '@api/agents';
import type { KnowledgeSummaryResponse } from '@api/knowledge';
import type { SkillSummaryResponse } from '@api/skills';
import { useOutletContext } from 'react-router-dom';
import type {
  ConversationSummary,
  ProjectSummary,
  ProjectWorkspaceSnapshot,
} from '@app/project/project.types';

export interface ProjectPageContextValue extends ProjectWorkspaceSnapshot {
  activeProject: ProjectSummary;
  conversations: ConversationSummary[];
  conversationsLoading: boolean;
  conversationsError: string | null;
  knowledgeCatalog: KnowledgeSummaryResponse[];
  knowledgeCatalogLoading: boolean;
  knowledgeCatalogError: string | null;
  agentsCatalog: AgentResponse[];
  agentsCatalogLoading: boolean;
  agentsCatalogError: string | null;
  skillsCatalog: SkillSummaryResponse[];
  skillsCatalogLoading: boolean;
  skillsCatalogError: string | null;
}

export const useProjectPageContext = (): ProjectPageContextValue => {
  return useOutletContext<ProjectPageContextValue>();
};
