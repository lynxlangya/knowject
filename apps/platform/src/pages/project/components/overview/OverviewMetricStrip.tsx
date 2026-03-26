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

const toneStyles: Record<OverviewMetricTone, { border: string; bg: string; label: string; value: string; hint: string; accent: string }> = {
  default: {
    border: 'border-slate-200',
    bg: 'bg-slate-50/70',
    label: 'text-slate-500',
    value: 'text-slate-900',
    hint: 'text-slate-500',
    accent: '#94A3B8',
  },
  positive: {
    border: 'border-[#C2EDE6]',
    bg: 'bg-[#F2FDFB]',
    label: 'text-[#1A8A77]',
    value: 'text-[#1C2B2A]',
    hint: 'text-[#4A6260]',
    accent: '#28B8A0',
  },
  warning: {
    border: 'border-amber-200',
    bg: 'bg-amber-50/80',
    label: 'text-amber-700',
    value: 'text-amber-900',
    hint: 'text-amber-700',
    accent: '#F59E0B',
  },
};

export const OverviewMetricStrip = ({
  eyebrow,
  title,
  description,
  items,
}: OverviewMetricStripProps) => {
  return (
    <Card
      className="rounded-3xl! border-slate-200! shadow-[0_8px_32px_rgba(15,42,38,0.06)]!"
      styles={{ body: { padding: '20px' } }}
    >
      <div className="mb-5">
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
        {items.map((item, index) => {
          const tone = item.tone ?? 'default';
          const style = toneStyles[tone];
          return (
            <article
              key={item.id}
              className={`group relative overflow-hidden rounded-panel border px-4 py-3.5 transition-shadow duration-200 hover:shadow-[0_6px_20px_rgba(15,42,38,0.08)] ${style.border} ${style.bg}`}
              style={{
                animation: `metricFadeIn 360ms cubic-bezier(0.22,1,0.36,1) both`,
                animationDelay: `${index * 60}ms`,
              }}
            >
              {/* Accent top bar */}
              <span
                className="absolute inset-x-0 top-0 h-0.5 rounded-b-full opacity-60 transition-opacity duration-200 group-hover:opacity-100"
                style={{ backgroundColor: style.accent }}
                aria-hidden="true"
              />
              <Typography.Text className={`text-caption mb-1 block font-semibold uppercase tracking-[0.14em] ${style.label}`}>
                {item.label}
              </Typography.Text>
              <Typography.Title level={3} className={`mb-1! mt-2! ${style.value}`}>
                {item.value}
              </Typography.Title>
              <Typography.Text className={`text-caption ${style.hint}`}>
                {item.hint}
              </Typography.Text>
            </article>
          );
        })}
      </div>
    </Card>
  );
};
