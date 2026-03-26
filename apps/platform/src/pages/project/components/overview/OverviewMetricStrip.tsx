import { Card, Typography } from 'antd';

export type OverviewMetricTone = 'default' | 'positive' | 'warning';

export interface OverviewMetricItem {
  id: string;
  label: string;
  value: string;
  hint: string;
  tone?: OverviewMetricTone;
}

export interface OverviewMetricStripProps {
  eyebrow: string;
  title: string;
  description: string;
  items: OverviewMetricItem[];
}

const toneStyles: Record<OverviewMetricTone, string> = {
  default: 'border-slate-200 bg-slate-50/70 text-slate-700',
  positive: 'border-[#C2EDE6] bg-[#F2FDFB] text-[#1A8A77]',
  warning: 'border-amber-200 bg-amber-50/80 text-amber-800',
};

export const OverviewMetricStrip = ({
  eyebrow,
  title,
  description,
  items,
}: OverviewMetricStripProps) => {
  return (
    <Card
      className="rounded-3xl! border-slate-200! shadow-surface!"
      styles={{ body: { padding: '20px' } }}
    >
      <div className="mb-4">
        <Typography.Text className="text-caption font-semibold uppercase tracking-[0.16em] text-slate-400">
          {eyebrow}
        </Typography.Text>
        <Typography.Title level={4} className="mb-1! mt-2! text-slate-800!">
          {title}
        </Typography.Title>
        <Typography.Paragraph className="mb-0! text-sm! text-slate-600!">
          {description}
        </Typography.Paragraph>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {items.map((item) => {
          const tone = item.tone ?? 'default';
          return (
            <article
              key={item.id}
              className={`rounded-panel border px-4 py-3 ${toneStyles[tone]}`}
            >
              <Typography.Text className="text-caption font-semibold uppercase tracking-[0.14em] text-slate-500">
                {item.label}
              </Typography.Text>
              <Typography.Title level={3} className="mb-1! mt-2! text-slate-900!">
                {item.value}
              </Typography.Title>
              <Typography.Text className="text-caption text-slate-500">
                {item.hint}
              </Typography.Text>
            </article>
          );
        })}
      </div>
    </Card>
  );
};
