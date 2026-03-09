import { useContext } from 'react';
import { ProjectContext } from './projectContext.shared';
import type { ProjectContextValue } from './projectContext.shared';

export const useProjectContext = (): ProjectContextValue => {
  const context = useContext(ProjectContext);
  if (!context) {
    throw new Error('useProjectContext 必须在 ProjectProvider 内使用');
  }

  return context;
};
