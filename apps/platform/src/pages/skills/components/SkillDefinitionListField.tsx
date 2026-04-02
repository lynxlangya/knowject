import { DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import { Button, Input, Typography } from 'antd';
import { useTranslation } from 'react-i18next';

interface SkillDefinitionListFieldProps {
  label: string;
  addLabel: string;
  placeholder: string;
  value: string[];
  onChange: (value: string[]) => void;
}

export const SkillDefinitionListField = ({
  label,
  addLabel,
  placeholder,
  value,
  onChange,
}: SkillDefinitionListFieldProps) => {
  useTranslation('pages');

  const items = value.length > 0 ? value : [''];

  return (
    <div className="space-y-2.5">
      <Typography.Text className="text-sm font-medium text-slate-700">
        {label}
      </Typography.Text>

      <div className="space-y-2">
        {items.map((item, index) => (
          <div key={`${label}-${index}`} className="flex items-start gap-2">
            <Input
              value={item}
              placeholder={placeholder}
              onChange={(event) => {
                const nextItems = [...items];
                nextItems[index] = event.target.value;
                onChange(nextItems);
              }}
            />
            <Button
              aria-label={addLabel}
              icon={<DeleteOutlined />}
              disabled={items.length === 1}
              onClick={() => {
                onChange(items.filter((_, itemIndex) => itemIndex !== index));
              }}
            />
          </div>
        ))}
      </div>

      <Button
        type="dashed"
        icon={<PlusOutlined />}
        onClick={() => {
          onChange([...items, '']);
        }}
      >
        {addLabel}
      </Button>
    </div>
  );
};

