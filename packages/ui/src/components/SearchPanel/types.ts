import type { ReactNode } from 'react';
import type { FormInstance, ColProps } from 'antd';

/**
 * 支持的字段类型
 */
export type FieldType =
  | 'input'
  | 'select'
  | 'dateRange'
  | 'rangePicker'
  | 'number'
  | 'custom';

/**
 * 搜索字段配置
 */
export interface SearchField {
  /** 字段名称，对应 Form.Item name */
  name: string | string[];
  /** 字段标签 */
  label: ReactNode;
  /** 字段类型 */
  type: FieldType;
  /** 传给对应控件的 props */
  props?: Record<string, unknown>;
  /** Select 选项 */
  options?: Array<{ label: ReactNode; value: unknown }>;
  /** 栅格配置 */
  col?: ColProps;
  /** 是否隐藏 */
  hidden?: boolean;
  /** 是否为高级字段（仅展开时显示） */
  advanced?: boolean;
  /** 自定义渲染（type=custom 时使用） */
  render?: (form: FormInstance) => ReactNode;
}

/**
 * SearchPanel 组件属性
 */
export interface SearchPanelProps {
  /** 字段配置数组 */
  fields: SearchField[];
  /** 查询回调 */
  onSearch: (values: Record<string, unknown>) => void;
  /** 重置回调 */
  onReset?: () => void;
  /** 查询按钮 loading 状态 */
  loading?: boolean;
  /** 受控的展开/收起状态 */
  collapsed?: boolean;
  /** 默认展开/收起状态 */
  defaultCollapsed?: boolean;
  /** 收起时显示的字段数量 */
  visibleCount?: number;
  /** 展开文案 */
  expandText?: string;
  /** 收起文案 */
  collapseText?: string;
  /** 额外操作区（如导出按钮） */
  extraActions?: ReactNode;
  /** 表单初始值 */
  initialValues?: Record<string, unknown>;
  /** 表单值变化回调 */
  onValuesChange?: (
    changedValues: Record<string, unknown>,
    allValues: Record<string, unknown>
  ) => void;
  /** 操作按钮对齐方式 */
  actionsAlign?: 'left' | 'right';
  /** 表单布局：horizontal 左侧标签（默认），vertical 顶部标签 */
  layout?: 'horizontal' | 'vertical';
}
