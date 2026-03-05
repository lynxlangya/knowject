import { theme, type ThemeConfig } from 'antd';

export const themeConfig: ThemeConfig = {
  token: {
    colorPrimary: '#3B82F6',
    borderRadius: 10,
    colorBgLayout: '#f8fafc',
    fontFamily:
      "'Noto Sans SC', 'PingFang SC', 'Microsoft YaHei', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  },
  components: {
    Layout: {
      bodyBg: '#f8fafc',
      siderBg: '#f8fafc',
    },
    Menu: {
      itemBg: '#f8fafc',
      itemColor: '#0f172a',
      itemHoverColor: '#1d4ed8',
      itemHoverBg: '#eff6ff',
      itemSelectedColor: '#2563eb',
      itemSelectedBg: '#dbeafe',
      activeBarBorderWidth: 0,
    },
  },
  algorithm: theme.defaultAlgorithm,
  zeroRuntime: true,
};
