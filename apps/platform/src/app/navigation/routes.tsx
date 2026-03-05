import { Navigate, type RouteObject } from 'react-router-dom';
import { RequireAuth } from '../guards/RequireAuth';
import { AuthedLayout } from '../layouts/AuthedLayout';
import { PATHS, ROUTE_PATTERNS } from './paths';
import { LoginPage } from '../../pages/login/LoginPage';
import { HomePage } from '../../pages/home/HomePage';
import { KnowledgePage } from '../../pages/knowledge/KnowledgePage';
import { SkillsPage } from '../../pages/skills/SkillsPage';
import { AgentsPage } from '../../pages/agents/AgentsPage';
import { AnalyticsPage } from '../../pages/analytics/AnalyticsPage';
import { SettingsPage } from '../../pages/settings/SettingsPage';
import { NotFoundPage } from '../../pages/notfound/NotFoundPage';

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
        path: ROUTE_PATTERNS.homeProject,
        element: <HomePage />,
      },
      {
        path: ROUTE_PATTERNS.homeProjectChat,
        element: <HomePage />,
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
