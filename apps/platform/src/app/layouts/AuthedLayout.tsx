import { Layout } from 'antd';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { clearAuthSession } from '@app/auth/user';
import { getMenuSelectedKey } from '@app/navigation/menu';
import { PATHS } from '@app/navigation/paths';
import { ProjectProvider } from '@app/project/ProjectContext';
import { KNOWJECT_BRAND } from '@styles/brand';
import { AppSider } from './components/AppSider';

const { Content } = Layout;

export const AuthedLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const pinnedContentScrollbarPaths = new Set<string>([
    PATHS.members,
    PATHS.knowledge,
    PATHS.skills,
    PATHS.agents,
  ]);
  const shouldPinContentScrollbar =
    pinnedContentScrollbarPaths.has(location.pathname);

  const handleLogout = () => {
    clearAuthSession();
    void navigate(PATHS.login, { replace: true });
  };

  const handleNavigate = (path: string) => {
    void navigate(path);
  };

  const selectedKey = getMenuSelectedKey(location.pathname);

  return (
    <ProjectProvider>
      <Layout className="h-screen overflow-hidden" style={{ backgroundColor: KNOWJECT_BRAND.shellBg }}>
        <AppSider selectedKey={selectedKey} onNavigate={handleNavigate} onLogout={handleLogout} />
        <Layout
          className="h-full min-w-0 overflow-hidden bg-linear-to-b"
          style={{
            backgroundImage: KNOWJECT_BRAND.shellContentGradient,
          }}
        >
          <Content
            className={`flex-1 overflow-y-auto ${
              shouldPinContentScrollbar
                ? 'pb-4 pl-4 pr-0 pt-4 md:pb-5 md:pl-5 md:pr-0 md:pt-5'
                : 'p-4 md:p-5'
            }`}
          >
            <Outlet />
          </Content>
        </Layout>
      </Layout>
    </ProjectProvider>
  );
};
