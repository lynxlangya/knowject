import { useState, useCallback } from 'react';
import {
  Form,
  Row,
  Col,
  Input,
  Select,
  DatePicker,
  InputNumber,
  Button,
  Space,
} from 'antd';
import {
  DownOutlined,
  ReloadOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import type { SearchField, SearchPanelProps } from './types';
import styles from './SearchPanel.module.css';

const { RangePicker } = DatePicker;

/**
 * 根据字段配置渲染对应控件
 */
function renderFieldControl(
  field: SearchField,
  form: ReturnType<typeof Form.useForm>[0]
) {
  const { type, props = {}, options = [], render } = field;

  switch (type) {
    case 'input':
      return (
        <Input
          placeholder={`请输入${typeof field.label === 'string' ? field.label : ''}`}
          allowClear
          {...props}
        />
      );
    case 'select':
      return (
        <Select
          placeholder={`请选择${typeof field.label === 'string' ? field.label : ''}`}
          allowClear
          options={options}
          {...props}
        />
      );
    case 'dateRange':
    case 'rangePicker':
      return <RangePicker style={{ width: '100%' }} {...props} />;
    case 'number':
      return (
        <InputNumber
          placeholder={`请输入${typeof field.label === 'string' ? field.label : ''}`}
          style={{ width: '100%' }}
          {...props}
        />
      );
    case 'custom':
      return render ? render(form) : null;
    default:
      return null;
  }
}

/**
 * 获取默认栅格配置
 */
function getDefaultColProps(): {
  xs: number;
  sm: number;
  md: number;
  lg: number;
  xl: number;
} {
  return { xs: 24, sm: 12, md: 8, lg: 6, xl: 6 };
}

/**
 * SearchPanel 高可用搜索组件
 *
 * @description 配置驱动的搜索表单，支持展开/收起、查询/重置、响应式布局
 */
export function SearchPanel({
  fields,
  onSearch,
  onReset,
  loading = false,
  collapsed: controlledCollapsed,
  defaultCollapsed = true,
  visibleCount = 3,
  expandText = '展开',
  collapseText = '收起',
  extraActions,
  initialValues,
  onValuesChange,
  actionsAlign = 'right',
  layout = 'horizontal',
}: SearchPanelProps) {
  const [form] = Form.useForm();
  const [internalCollapsed, setInternalCollapsed] = useState(defaultCollapsed);

  // 支持受控和非受控模式
  const isCollapsed = controlledCollapsed ?? internalCollapsed;

  // 过滤可见字段
  const visibleFields = fields.filter((f) => !f.hidden);

  // 计算当前应该显示的字段
  const displayFields = isCollapsed
    ? visibleFields.filter((f, idx) => !f.advanced && idx < visibleCount)
    : visibleFields;

  // 是否需要显示展开/收起按钮
  const hasAdvancedFields = visibleFields.some((f) => f.advanced);
  const hasHiddenFields = visibleFields.length > visibleCount;
  const showExpandToggle = hasAdvancedFields || hasHiddenFields;

  const handleToggle = useCallback(() => {
    if (controlledCollapsed === undefined) {
      setInternalCollapsed((prev: boolean) => !prev);
    }
  }, [controlledCollapsed]);

  const handleSearch = useCallback(() => {
    form.validateFields().then((values) => {
      onSearch(values);
    });
  }, [form, onSearch]);

  const handleReset = useCallback(() => {
    form.resetFields();
    onReset?.();
  }, [form, onReset]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        handleSearch();
      }
    },
    [handleSearch]
  );

  return (
    <div className={styles.container}>
      <Form
        form={form}
        layout={layout}
        initialValues={initialValues}
        onValuesChange={onValuesChange}
        onKeyDown={handleKeyDown}
      >
        <Row gutter={16} className={styles.formRow}>
          {displayFields.map((field) => {
            const colProps = field.col ?? getDefaultColProps();
            return (
              <Col key={String(field.name)} {...colProps}>
                <Form.Item
                  name={field.name}
                  label={field.label}
                  className={styles.formItem}
                >
                  {renderFieldControl(field, form)}
                </Form.Item>
              </Col>
            );
          })}

          {/* 操作按钮区 */}
          <Col
            flex="auto"
            className={`${styles.actionsCol} ${
              actionsAlign === 'right'
                ? styles.actionsRight
                : styles.actionsLeft
            }`}
            style={
              layout === 'vertical' ? { alignSelf: 'flex-end' } : undefined
            }
          >
            <Space wrap>
              <Button
                type="primary"
                icon={<SearchOutlined />}
                onClick={handleSearch}
                loading={loading}
              >
                查询
              </Button>
              <Button onClick={handleReset} icon={<ReloadOutlined />}>
                重置
              </Button>
              {showExpandToggle && (
                <span className={styles.expandTrigger} onClick={handleToggle}>
                  {isCollapsed ? expandText : collapseText}
                  <DownOutlined
                    className={`${styles.expandIcon} ${
                      !isCollapsed ? styles.expandIconRotated : ''
                    }`}
                  />
                </span>
              )}
              {extraActions}
            </Space>
          </Col>
        </Row>
      </Form>
    </div>
  );
}

export default SearchPanel;
