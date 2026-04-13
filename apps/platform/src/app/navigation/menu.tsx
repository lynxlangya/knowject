import {
  HomeOutlined,
  BookOutlined,
  AppstoreOutlined,
  RobotOutlined,
  TeamOutlined,
  LineChartOutlined,
  SettingOutlined,
} from "@ant-design/icons";
import type { MenuProps } from "antd";
import { AGENTS_GLOBAL_PAGE_ENABLED } from "./features";
import { PATHS } from "./paths";

type MenuItem = Required<MenuProps>["items"][number];

const MENU_KEYS: string[] = [
  PATHS.home,
  PATHS.knowledge,
  PATHS.skills,
  PATHS.members,
  PATHS.analytics,
  PATHS.settings,
];

if (AGENTS_GLOBAL_PAGE_ENABLED) {
  MENU_KEYS.splice(3, 0, PATHS.agents);
}

export const getMenuItems = (t: (key: string) => string): MenuItem[] => {
  const items: MenuItem[] = [
    {
      key: PATHS.home,
      icon: <HomeOutlined />,
      label: t("menu.home"),
    },
    {
      key: PATHS.knowledge,
      icon: <BookOutlined />,
      label: t("menu.knowledge"),
    },
    {
      key: PATHS.skills,
      icon: <AppstoreOutlined />,
      label: t("menu.skills"),
    },
    {
      key: PATHS.members,
      icon: <TeamOutlined />,
      label: t("menu.members"),
    },
    {
      key: PATHS.analytics,
      icon: <LineChartOutlined />,
      label: t("menu.analytics"),
    },
    {
      key: PATHS.settings,
      icon: <SettingOutlined />,
      label: t("menu.settings"),
    },
  ];

  if (AGENTS_GLOBAL_PAGE_ENABLED) {
    items.splice(3, 0, {
      key: PATHS.agents,
      icon: <RobotOutlined />,
      label: t("menu.agents"),
    });
  }

  return items;
};

export const getMenuPath = (key: string): string => key;

export const getMenuSelectedKey = (pathname: string): string | null => {
  if (pathname.startsWith(`${PATHS.project}/`)) {
    return null;
  }

  const matchedKey = MENU_KEYS.find((item) => {
    return pathname === item || pathname.startsWith(`${item}/`);
  });

  return matchedKey ?? null;
};
