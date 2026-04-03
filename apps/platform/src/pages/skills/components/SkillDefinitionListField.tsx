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
    <div className="rounded-card-lg border border-slate-200/80 bg-[#f8fbfe] px-5 py-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]">
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Typography.Text className="text-sm font-semibold tracking-tight text-slate-800">
            {label}
          </Typography.Text>

          <Button
            type="text"
            icon={<PlusOutlined />}
            className="h-auto rounded-full bg-emerald-50 px-3 py-1 text-sm font-medium text-emerald-700 shadow-none hover:bg-emerald-100! hover:text-emerald-700!"
            onClick={() => {
              onChange([...items, '']);
            }}
          >
            {addLabel}
          </Button>
        </div>

        <div className="space-y-2.5">
          {items.map((item, index) => (
            <div
              key={`${label}-${index}`}
              className="flex items-start gap-2 rounded-card border border-slate-200 bg-white p-3 shadow-[0_1px_2px_rgba(15,23,42,0.03)]"
            >
              <Input
                className="rounded-card border-slate-200 bg-slate-50/60"
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
                className="flex h-11 w-11 items-center justify-center rounded-card border-slate-200 text-slate-500 shadow-none"
                onClick={() => {
                  onChange(items.filter((_, itemIndex) => itemIndex !== index));
                }}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
