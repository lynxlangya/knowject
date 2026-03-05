import { useState } from 'react';
import { Layout } from 'antd';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { clearToken } from '../auth/token';
import { PATHS } from '../navigation/paths';
import { AppHeader } from './components/AppHeader';
import { AppSider } from './components/AppSider';
import styles from './layout.module.css';

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
    <Layout style={{ height: '100vh', overflow: 'hidden' }}>
      <AppHeader onLogout={handleLogout} />
      <Layout style={{ overflow: 'hidden' }}>
        <AppSider
          collapsed={collapsed}
          onCollapse={setCollapsed}
          selectedKey={selectedKey}
          onNavigate={handleNavigate}
        />
        <Layout className={styles.main}>
          <Content className={styles.content}>
            <Outlet />
          </Content>
        </Layout>
      </Layout>
    </Layout>
  );
};
