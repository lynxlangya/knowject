import { Navigate, type RouteObject } from 'react-router-dom';
import { RequireAuth } from '../guards/RequireAuth';
import { AuthedLayout } from '../layouts/AuthedLayout';
import { PATHS } from './paths';
import { LoginPage } from '../../pages/login/LoginPage';
import { WorkspacePage } from '../../pages/workspace';
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
        element: <Navigate to={PATHS.workspace} replace />,
      },
      {
        path: PATHS.workspace,
        element: <WorkspacePage />,
      },
    ],
  },
  {
    path: '*',
    element: <NotFoundPage />,
  },
];
