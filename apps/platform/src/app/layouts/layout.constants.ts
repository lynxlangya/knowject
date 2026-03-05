/** 布局相关常量 */

/** Header 高度 (px) */
export const HEADER_HEIGHT = 64;

/** Sider 展开宽度 (px) */
export const SIDER_WIDTH = 256;

/** Sider 折叠宽度 (px) */
export const SIDER_COLLAPSED_WIDTH = 65;

/** 根据折叠状态计算 Sider 宽度 */
export const getSiderWidth = (collapsed: boolean): number =>
  collapsed ? SIDER_COLLAPSED_WIDTH : SIDER_WIDTH;
