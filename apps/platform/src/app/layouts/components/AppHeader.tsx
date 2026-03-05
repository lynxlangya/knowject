import { Button, Layout, Space, Typography } from 'antd';
import { LogoutOutlined } from '@ant-design/icons';
import styles from './AppHeader.module.css';

const { Header } = Layout;

export interface AppHeaderProps {
  onLogout: () => void;
}

export const AppHeader = ({ onLogout }: AppHeaderProps) => {
  return (
    <Header className={styles.header}>
      <div className={styles.brand}>
        <Typography.Text className={styles.title}>知项 · Knowject</Typography.Text>
        <Typography.Text className={styles.subtitle}>
          让项目知识，真正为团队所用。
        </Typography.Text>
      </div>

      <Space>
        <Button type="text" className={styles.logoutButton} onClick={onLogout} icon={<LogoutOutlined />}>
          退出登录
        </Button>
      </Space>
    </Header>
  );
};
