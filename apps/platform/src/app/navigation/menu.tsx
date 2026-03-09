import {
  HomeOutlined,
  BookOutlined,
  AppstoreOutlined,
  RobotOutlined,
  TeamOutlined,
  LineChartOutlined,
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

  if (pathname === PATHS.members || pathname.startsWith(`${PATHS.members}/`)) {
    return PATHS.members;
  }

  if (pathname === PATHS.analytics || pathname.startsWith(`${PATHS.analytics}/`)) {
    return PATHS.analytics;
  }

  return null;
};
