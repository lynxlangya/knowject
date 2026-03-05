import { DatabaseOutlined } from '@ant-design/icons';
import type { MenuProps } from 'antd';
import { PATHS } from './paths';

type MenuItem = Required<MenuProps>['items'][number];

export const menuItems: MenuItem[] = [
  {
    key: PATHS.workspace,
    icon: <DatabaseOutlined />,
    label: '项目记忆',
  },
];

export const getMenuPath = (key: string): string => key;
