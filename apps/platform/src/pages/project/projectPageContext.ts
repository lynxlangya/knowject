import type { KnowledgeSummaryResponse } from '@api/knowledge';
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
}

export const useProjectPageContext = (): ProjectPageContextValue => {
  return useOutletContext<ProjectPageContextValue>();
};
