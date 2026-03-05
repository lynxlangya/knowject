import { useState } from 'react';
import { Layout } from 'antd';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { clearToken } from '../auth/token';
import { PATHS } from '../navigation/paths';
import { AppHeader } from './components/AppHeader';
import { AppSider } from './components/AppSider';

const { Content } = Layout;

export const AuthedLayout = () => {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    clearToken();
    navigate(PATHS.login, { replace: true });
  };

  const handleNavigate = (path: string) => {
    navigate(path);
  };

  const selectedKey = location.pathname;

  return (
    <Layout className="h-screen overflow-hidden">
      <AppHeader onLogout={handleLogout} />
      <Layout className="overflow-hidden">
        <AppSider
          collapsed={collapsed}
          onCollapse={setCollapsed}
          selectedKey={selectedKey}
          onNavigate={handleNavigate}
        />
        <Layout className="flex h-full flex-col overflow-hidden bg-gradient-to-b from-slate-50 to-slate-100">
          <Content className="flex-1 overflow-y-auto p-5">
            <Outlet />
          </Content>
        </Layout>
      </Layout>
    </Layout>
  );
};
