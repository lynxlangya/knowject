import { theme, type ThemeConfig } from 'antd';
import { KNOWJECT_BRAND } from './brand';

export const themeConfig: ThemeConfig = {
  token: {
    colorPrimary: KNOWJECT_BRAND.primary,
    colorPrimaryHover: KNOWJECT_BRAND.primaryHover,
    colorPrimaryActive: KNOWJECT_BRAND.primaryActive,
    colorLink: KNOWJECT_BRAND.primaryHover,
    colorInfo: KNOWJECT_BRAND.primary,
    controlOutline: KNOWJECT_BRAND.primaryGlow,
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
      itemHoverColor: KNOWJECT_BRAND.primaryHover,
      itemHoverBg: KNOWJECT_BRAND.primarySurface,
      itemSelectedColor: KNOWJECT_BRAND.primaryHover,
      itemSelectedBg: KNOWJECT_BRAND.primarySurfaceStrong,
      activeBarBorderWidth: 0,
    },
  },
  algorithm: theme.defaultAlgorithm,
  zeroRuntime: true,
};
