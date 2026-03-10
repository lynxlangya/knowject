import { Navigate, useLocation } from 'react-router-dom';
import { clearAuthSession, getAuthSession } from '@app/auth/user';
import { PATHS } from '@app/navigation/paths';

interface RequireAuthProps {
  children: React.ReactNode;
}

export const RequireAuth = ({ children }: RequireAuthProps) => {
  const authSession = getAuthSession();
  const location = useLocation();

  if (!authSession) {
    clearAuthSession();
    return <Navigate to={PATHS.login} state={{ from: location }} replace />;
  }

  return <>{children}</>;
};
