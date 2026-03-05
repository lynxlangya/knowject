import { theme, type ThemeConfig } from 'antd';

export const themeConfig: ThemeConfig = {
  token: {
    colorPrimary: '#3B82F6',
    borderRadius: 10,
    fontFamily:
      "'Noto Sans SC', 'PingFang SC', 'Microsoft YaHei', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  },
  algorithm: theme.defaultAlgorithm,
  zeroRuntime: true,
};
