import {
  HomeOutlined,
  BookOutlined,
  AppstoreOutlined,
  RobotOutlined,
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

  if (pathname === PATHS.home || pathname.startsWith(`${PATHS.home}/`)) {
    return PATHS.home;
  }

  if (pathname === PATHS.knowledge || pathname.startsWith(`${PATHS.knowledge}/`)) {
    return PATHS.knowledge;
  }

  if (pathname === PATHS.skills || pathname.startsWith(`${PATHS.skills}/`)) {
    return PATHS.skills;
  }

  if (pathname === PATHS.agents || pathname.startsWith(`${PATHS.agents}/`)) {
    return PATHS.agents;
  }

  if (pathname === PATHS.analytics || pathname.startsWith(`${PATHS.analytics}/`)) {
    return PATHS.analytics;
  }

  if (pathname === PATHS.settings || pathname.startsWith(`${PATHS.settings}/`)) {
    return PATHS.settings;
  }

  return null;
};
