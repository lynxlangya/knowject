import { useOutletContext } from 'react-router-dom';
import type {
  ProjectSummary,
  ProjectWorkspaceSnapshot,
} from '@app/project/project.types';

export interface ProjectPageContextValue extends ProjectWorkspaceSnapshot {
  activeProject: ProjectSummary;
}

export const useProjectPageContext = (): ProjectPageContextValue => {
  return useOutletContext<ProjectPageContextValue>();
};
