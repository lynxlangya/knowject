import { Navigate, useParams } from 'react-router-dom';
import {
  PATHS,
  buildProjectChatPath,
  buildProjectOverviewPath,
  buildProjectResourcesPath,
} from './paths';

export const ProjectRootRedirect = () => {
  const { projectId } = useParams<{ projectId?: string }>();

  if (!projectId) {
    return <Navigate to={PATHS.home} replace />;
  }

  return <Navigate to={buildProjectOverviewPath(projectId)} replace />;
};

export const LegacyProjectRedirect = () => {
  const { projectId, chatId } = useParams<{
    projectId?: string;
    chatId?: string;
  }>();

  if (!projectId) {
    return <Navigate to={PATHS.home} replace />;
  }

  if (chatId) {
    return <Navigate to={buildProjectChatPath(projectId, chatId)} replace />;
  }

  return <Navigate to={buildProjectOverviewPath(projectId)} replace />;
};

export const LegacyProjectAssetRedirect = ({
  focus,
}: {
  focus: 'knowledge' | 'skills' | 'agents';
}) => {
  const { projectId } = useParams<{ projectId?: string }>();

  if (!projectId) {
    return <Navigate to={PATHS.home} replace />;
  }

  return <Navigate to={buildProjectResourcesPath(projectId, focus)} replace />;
};
