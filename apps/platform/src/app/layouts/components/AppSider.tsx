import { Layout, Menu } from 'antd';
import { MenuFoldOutlined, MenuUnfoldOutlined } from '@ant-design/icons';
import { SIDER_COLLAPSED_WIDTH, SIDER_WIDTH } from '../layout.constants';
import { getMenuPath, menuItems } from '../../navigation/menu';
import styles from './AppSider.module.css';

const { Sider } = Layout;

export interface AppSiderProps {
  collapsed: boolean;
  onCollapse: (collapsed: boolean) => void;
  selectedKey: string;
  onNavigate: (path: string) => void;
}

export const AppSider = ({
  collapsed,
  onCollapse,
  selectedKey,
  onNavigate,
}: AppSiderProps) => {
  return (
    <Sider
      collapsible
      collapsed={collapsed}
      onCollapse={onCollapse}
      width={SIDER_WIDTH}
      collapsedWidth={SIDER_COLLAPSED_WIDTH}
      trigger={null}
      className={styles.sider}
    >
      <div className={styles.menuContainer}>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[selectedKey]}
          items={menuItems}
          onClick={({ key }) => onNavigate(getMenuPath(String(key)))}
          inlineCollapsed={collapsed}
        />
      </div>

      <div
        className={styles.collapseTrigger}
        onClick={() => onCollapse(!collapsed)}
        title={collapsed ? '展开菜单' : '折叠菜单'}
      >
        {collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
      </div>
    </Sider>
  );
};
