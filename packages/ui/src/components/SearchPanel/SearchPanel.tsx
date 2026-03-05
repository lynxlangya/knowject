import { useCallback, useMemo, useState, type KeyboardEvent } from 'react';
import { Form, Row, Col, Button, Space } from 'antd';
import {
  DownOutlined,
  ReloadOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import type { SearchPanelProps } from './types';
import {
  getDefaultColProps,
  getDisplayFields,
  getVisibleFields,
  renderFieldControl,
  shouldShowExpandToggle,
} from './searchPanel.helpers';
import styles from './SearchPanel.module.css';

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

  const visibleFields = useMemo(() => getVisibleFields(fields), [fields]);

  // 计算当前应该显示的字段
  const displayFields = useMemo(() => {
    return getDisplayFields(visibleFields, isCollapsed, visibleCount);
  }, [isCollapsed, visibleCount, visibleFields]);

  // 是否需要显示展开/收起按钮
  const showExpandToggle = useMemo(() => {
    return shouldShowExpandToggle(visibleFields, visibleCount);
  }, [visibleCount, visibleFields]);

  const handleToggle = useCallback(() => {
    if (controlledCollapsed === undefined) {
      setInternalCollapsed((prev: boolean) => !prev);
    }
  }, [controlledCollapsed]);

  const handleSearch = useCallback(async () => {
    const values = await form.validateFields();
    onSearch(values);
  }, [form, onSearch]);

  const handleReset = useCallback(() => {
    form.resetFields();
    onReset?.();
  }, [form, onReset]);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === 'Enter' && !event.shiftKey) {
        void handleSearch();
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
                onClick={() => {
                  void handleSearch();
                }}
                loading={loading}
              >
                查询
              </Button>
              <Button onClick={handleReset} icon={<ReloadOutlined />}>
                重置
              </Button>
              {showExpandToggle && (
                <button
                  type="button"
                  className={styles.expandTrigger}
                  onClick={handleToggle}
                >
                  {isCollapsed ? expandText : collapseText}
                  <DownOutlined
                    className={`${styles.expandIcon} ${
                      !isCollapsed ? styles.expandIconRotated : ''
                    }`}
                  />
                </button>
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
