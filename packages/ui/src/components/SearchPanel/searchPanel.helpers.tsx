import {
  DatePicker,
  Input,
  InputNumber,
  Select,
  type ColProps,
  type FormInstance,
} from 'antd';
import type { ReactNode } from 'react';
import type { SearchField } from './types';

const { RangePicker } = DatePicker;

const getLabelText = (field: SearchField): string =>
  typeof field.label === 'string' ? field.label : '';

export const getDefaultColProps = (): ColProps => {
  return { xs: 24, sm: 12, md: 8, lg: 6, xl: 6 };
};

export const getVisibleFields = (fields: SearchField[]): SearchField[] => {
  return fields.filter((field) => !field.hidden);
};

export const getDisplayFields = (
  fields: SearchField[],
  collapsed: boolean,
  visibleCount: number
): SearchField[] => {
  if (!collapsed) {
    return fields;
  }

  return fields.filter((field, index) => !field.advanced && index < visibleCount);
};

export const shouldShowExpandToggle = (
  fields: SearchField[],
  visibleCount: number
): boolean => {
  const hasAdvancedFields = fields.some((field) => field.advanced);
  const hasHiddenFields = fields.length > visibleCount;
  return hasAdvancedFields || hasHiddenFields;
};

export const renderFieldControl = (
  field: SearchField,
  form: FormInstance
): ReactNode => {
  const { type, props = {}, options = [], render } = field;
  const labelText = getLabelText(field);

  switch (type) {
    case 'input':
      return <Input placeholder={`请输入${labelText}`} allowClear {...props} />;
    case 'select':
      return (
        <Select
          placeholder={`请选择${labelText}`}
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
          placeholder={`请输入${labelText}`}
          style={{ width: '100%' }}
          {...props}
        />
      );
    case 'custom':
      return render ? render(form) : null;
    default:
      return null;
  }
};
