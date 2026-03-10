import { Navigate, useParams } from 'react-router-dom';
import {
  PATHS,
  buildProjectChatPath,
  buildProjectSectionPath,
  buildProjectResourcesPath,
} from './paths';
import type {
  ProjectResourceFocus,
  ProjectSectionKey,
} from '@app/project/project.types';

export const ProjectSectionRedirect = ({
  section = 'overview',
}: {
  section?: ProjectSectionKey;
}) => {
  const { projectId, chatId } = useParams<{
    projectId?: string;
    chatId?: string;
  }>();

  if (!projectId) {
    return <Navigate to={PATHS.home} replace />;
  }

  if (section === 'chat') {
    return <Navigate to={buildProjectChatPath(projectId, chatId)} replace />;
  }

  return <Navigate to={buildProjectSectionPath(projectId, section)} replace />;
};

export const ProjectResourceRedirect = ({
  focus,
}: {
  focus: ProjectResourceFocus;
}) => {
  const { projectId } = useParams<{ projectId?: string }>();

  if (!projectId) {
    return <Navigate to={PATHS.home} replace />;
  }

  return <Navigate to={buildProjectResourcesPath(projectId, focus)} replace />;
};
