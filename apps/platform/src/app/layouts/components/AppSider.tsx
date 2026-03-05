import { Layout, Menu } from 'antd';
import { MenuFoldOutlined, MenuUnfoldOutlined } from '@ant-design/icons';
import { SIDER_COLLAPSED_WIDTH, SIDER_WIDTH } from '../layout.constants';
import { getMenuPath, menuItems } from '../../navigation/menu';

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
      className="h-full border-r! border-slate-900/10! bg-gradient-to-b! from-slate-900! to-slate-950!"
    >
      <div className="h-[calc(100%-48px)] overflow-y-auto pt-2">
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[selectedKey]}
          items={menuItems}
          onClick={({ key }) => onNavigate(getMenuPath(String(key)))}
          inlineCollapsed={collapsed}
          style={{ background: 'transparent' }}
        />
      </div>

      <button
        type="button"
        className="flex h-12 w-full cursor-pointer items-center justify-center bg-black/20 text-white/70 transition-colors hover:bg-black/30 hover:text-white"
        onClick={() => onCollapse(!collapsed)}
        title={collapsed ? '展开菜单' : '折叠菜单'}
      >
        {collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
      </button>
    </Sider>
  );
};
