import { Navigate, useLocation } from 'react-router-dom';
import { getToken } from '../auth/token';
import { PATHS } from '../navigation/paths';

interface RequireAuthProps {
  children: React.ReactNode;
}

export const RequireAuth = ({ children }: RequireAuthProps) => {
  const token = getToken();
  const location = useLocation();

  if (!token) {
    return <Navigate to={PATHS.login} state={{ from: location }} replace />;
  }

  return <>{children}</>;
};
