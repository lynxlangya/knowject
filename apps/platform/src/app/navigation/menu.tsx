import {
  HomeOutlined,
  BookOutlined,
  AppstoreOutlined,
  RobotOutlined,
  TeamOutlined,
  LineChartOutlined,
  SettingOutlined,
} from '@ant-design/icons';
import type { MenuProps } from 'antd';
import { PATHS } from './paths';

type MenuItem = Required<MenuProps>['items'][number];

export const menuItems: MenuItem[] = [
  {
    key: PATHS.home,
    icon: <HomeOutlined />,
    label: '主页',
  },
  {
    key: PATHS.knowledge,
    icon: <BookOutlined />,
    label: '知识库',
  },
  {
    key: PATHS.skills,
    icon: <AppstoreOutlined />,
    label: '技能',
  },
  {
    key: PATHS.agents,
    icon: <RobotOutlined />,
    label: '智能体',
  },
  {
    key: PATHS.members,
    icon: <TeamOutlined />,
    label: '成员',
  },
  {
    key: PATHS.analytics,
    icon: <LineChartOutlined />,
    label: '分析',
  },
  {
    key: PATHS.settings,
    icon: <SettingOutlined />,
    label: '设置',
  },
];

export const getMenuPath = (key: string): string => key;

export const getMenuSelectedKey = (pathname: string): string | null => {
  if (pathname.startsWith(`${PATHS.project}/`)) {
    return null;
  }

  const matchedItem = menuItems.find((item) => {
    if (!item || typeof item.key !== 'string') {
      return false;
    }

    return pathname === item.key || pathname.startsWith(`${item.key}/`);
  });

  return typeof matchedItem?.key === 'string' ? matchedItem.key : null;
};
