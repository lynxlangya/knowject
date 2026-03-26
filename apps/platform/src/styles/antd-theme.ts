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
    colorText: KNOWJECT_BRAND.textStrong,
    colorTextSecondary: KNOWJECT_BRAND.textBody,
    colorTextTertiary: KNOWJECT_BRAND.textMuted,
    borderRadius: 12,
    colorBgLayout: KNOWJECT_BRAND.canvasBg,
    fontFamily:
      "'Plus Jakarta Sans', 'Noto Sans SC', 'PingFang SC', 'Microsoft YaHei', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    fontFamilyCode:
      "'Plus Jakarta Sans', 'Noto Sans SC', 'PingFang SC', 'Microsoft YaHei', monospace",
  },
  components: {
    Layout: {
      bodyBg: KNOWJECT_BRAND.canvasBg,
      siderBg: KNOWJECT_BRAND.shellBg,
    },
    Menu: {
      itemBg: 'transparent',
      itemColor: KNOWJECT_BRAND.textBody,
      itemHoverColor: KNOWJECT_BRAND.textStrong,
      itemHoverBg: KNOWJECT_BRAND.shellSurfaceStrong,
      itemSelectedColor: KNOWJECT_BRAND.primaryText,
      itemSelectedBg: KNOWJECT_BRAND.primarySurfaceStrong,
      itemBorderRadius: 14,
      itemHeight: 44,
      activeBarBorderWidth: 0,
    },
    Button: {
      borderRadius: 14,
      defaultBorderColor: '#D7E1ED',
      defaultColor: KNOWJECT_BRAND.textStrong,
      defaultShadow: 'none',
      primaryShadow: `0 12px 22px ${KNOWJECT_BRAND.primaryGlow}`,
    },
    Card: {
      borderRadiusLG: 24,
    },
  },
  algorithm: theme.defaultAlgorithm,
  zeroRuntime: true,
};
