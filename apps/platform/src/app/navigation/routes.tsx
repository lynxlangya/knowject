import { Navigate, type RouteObject } from 'react-router-dom';
import { RequireAuth } from '../guards/RequireAuth';
import { AuthedLayout } from '../layouts/AuthedLayout';
import { PATHS, ROUTE_PATTERNS } from './paths';
import { LoginPage } from '../../pages/login/LoginPage';
import { HomePage } from '../../pages/home/HomePage';
import { ProjectLayout } from '../../pages/project/ProjectLayout';
import { ProjectOverviewPage } from '../../pages/project/ProjectOverviewPage';
import { ProjectChatPage } from '../../pages/project/ProjectChatPage';
import { ProjectResourcesPage } from '../../pages/project/ProjectResourcesPage';
import { ProjectMembersPage } from '../../pages/project/ProjectMembersPage';
import { KnowledgePage } from '../../pages/knowledge/KnowledgePage';
import { SkillsPage } from '../../pages/skills/SkillsPage';
import { AgentsPage } from '../../pages/agents/AgentsPage';
import { MembersPage } from '../../pages/members/MembersPage';
import { AnalyticsPage } from '../../pages/analytics/AnalyticsPage';
import { SettingsPage } from '../../pages/settings/SettingsPage';
import { NotFoundPage } from '../../pages/notfound/NotFoundPage';
import {
  LegacyProjectAssetRedirect,
  LegacyProjectRedirect,
  ProjectRootRedirect,
} from './routeRedirects';

export const routes: RouteObject[] = [
  {
    path: PATHS.login,
    element: <LoginPage />,
  },
  {
    path: '/',
    element: (
      <RequireAuth>
        <AuthedLayout />
      </RequireAuth>
    ),
    children: [
      {
        index: true,
        element: <Navigate to={PATHS.home} replace />,
      },
      {
        path: PATHS.home,
        element: <HomePage />,
      },
      {
        path: ROUTE_PATTERNS.project,
        element: <ProjectLayout />,
        children: [
          {
            index: true,
            element: <ProjectRootRedirect />,
          },
          {
            path: 'overview',
            element: <ProjectOverviewPage />,
          },
          {
            path: 'chat',
            element: <ProjectChatPage />,
          },
          {
            path: 'chat/:chatId',
            element: <ProjectChatPage />,
          },
          {
            path: 'resources',
            element: <ProjectResourcesPage />,
          },
          {
            path: 'members',
            element: <ProjectMembersPage />,
          },
        ],
      },
      {
        path: ROUTE_PATTERNS.projectKnowledgeLegacy,
        element: <LegacyProjectAssetRedirect focus="knowledge" />,
      },
      {
        path: ROUTE_PATTERNS.projectAgentsLegacy,
        element: <LegacyProjectAssetRedirect focus="agents" />,
      },
      {
        path: ROUTE_PATTERNS.projectSkillsLegacy,
        element: <LegacyProjectAssetRedirect focus="skills" />,
      },
      {
        path: ROUTE_PATTERNS.legacyHomeProject,
        element: <LegacyProjectRedirect section="overview" />,
      },
      {
        path: ROUTE_PATTERNS.legacyHomeProjectChat,
        element: <LegacyProjectRedirect section="chat" />,
      },
      {
        path: ROUTE_PATTERNS.legacyHomeProjectChatDetail,
        element: <LegacyProjectRedirect section="chat" />,
      },
      {
        path: PATHS.knowledge,
        element: <KnowledgePage />,
      },
      {
        path: PATHS.skills,
        element: <SkillsPage />,
      },
      {
        path: PATHS.agents,
        element: <AgentsPage />,
      },
      {
        path: PATHS.members,
        element: <MembersPage />,
      },
      {
        path: PATHS.analytics,
        element: <AnalyticsPage />,
      },
      {
        path: PATHS.settings,
        element: <SettingsPage />,
      },
      {
        path: PATHS.workspace,
        element: <Navigate to={PATHS.home} replace />,
      },
    ],
  },
  {
    path: '*',
    element: <NotFoundPage />,
  },
];
