import { Layout } from 'antd';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { clearToken } from '../auth/token';
import { getMenuSelectedKey } from '../navigation/menu';
import { PATHS } from '../navigation/paths';
import { ProjectProvider } from '../project/ProjectContext';
import { AppSider } from './components/AppSider';

const { Content } = Layout;

export const AuthedLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    clearToken();
    navigate(PATHS.login, { replace: true });
  };

  const handleNavigate = (path: string) => {
    navigate(path);
  };

  const selectedKey = getMenuSelectedKey(location.pathname);

  return (
    <ProjectProvider>
      <Layout className="h-screen overflow-hidden bg-slate-100">
        <AppSider selectedKey={selectedKey} onNavigate={handleNavigate} onLogout={handleLogout} />
        <Layout className="h-full min-w-0 overflow-hidden bg-gradient-to-b from-slate-50 via-slate-50 to-slate-100/80">
          <Content className="flex-1 overflow-y-auto p-4 md:p-5">
            <Outlet />
          </Content>
        </Layout>
      </Layout>
    </ProjectProvider>
  );
};
