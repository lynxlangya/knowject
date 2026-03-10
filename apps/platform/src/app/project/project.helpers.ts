import type { ProjectSummary } from './project.types';

export const normalizeProjectDescription = (value: string): string => value.trim();

// 保持 pin 状态分组稳定，避免侧栏展示顺序和持久化顺序漂移。
export const orderProjectsForDisplay = (projects: ProjectSummary[]): ProjectSummary[] => {
  const pinnedProjects: ProjectSummary[] = [];
  const regularProjects: ProjectSummary[] = [];

  projects.forEach((project) => {
    if (project.isPinned) {
      pinnedProjects.push(project);
      return;
    }

    regularProjects.push(project);
  });

  return [...pinnedProjects, ...regularProjects];
};
