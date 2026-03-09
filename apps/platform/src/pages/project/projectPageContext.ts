import { useOutletContext } from 'react-router-dom';
import type {
  ProjectMember,
  ProjectOverviewStats,
  ProjectSummary,
} from '../../app/project/project.types';
import type { ProjectWorkspaceMeta } from './project.mock';

export interface ProjectPageContextValue {
  activeProject: ProjectSummary;
  members: ProjectMember[];
  meta: ProjectWorkspaceMeta;
  stats: ProjectOverviewStats;
}

export const useProjectPageContext = (): ProjectPageContextValue => {
  return useOutletContext<ProjectPageContextValue>();
};
