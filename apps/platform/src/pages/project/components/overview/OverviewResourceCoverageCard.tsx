import { Card, Typography } from 'antd';

export interface OverviewCoverageItem {
  id: string;
  label: string;
  value: number;
  share: number;
}

export interface OverviewResourceCoverageCardProps {
  title: string;
  description: string;
  stateLabel: string;
  totalLabel: string;
  totalValue: string;
  items: OverviewCoverageItem[];
}

export const OverviewResourceCoverageCard = ({
  title,
  description,
  stateLabel,
  totalLabel,
  totalValue,
  items,
}: OverviewResourceCoverageCardProps) => {
  return (
    <Card
      className="rounded-3xl! border-slate-200! shadow-surface!"
      styles={{ body: { padding: '20px' } }}
    >
      <div className="mb-4">
        <Typography.Title level={4} className="mb-1! mt-0! text-slate-800!">
          {title}
        </Typography.Title>
        <Typography.Paragraph className="mb-2! text-sm! text-slate-600!">
          {description}
        </Typography.Paragraph>
        <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-caption font-medium text-slate-600">
          {stateLabel}
        </span>
      </div>

      <div className="mb-4 rounded-panel border border-blue-100 bg-blue-50/60 px-4 py-3">
        <Typography.Text className="text-caption uppercase tracking-[0.14em] text-blue-700">
          {totalLabel}
        </Typography.Text>
        <Typography.Title level={3} className="mb-0! mt-2! text-blue-800!">
          {totalValue}
        </Typography.Title>
      </div>

      <div className="flex flex-col gap-2">
        {items.map((item) => (
          <article
            key={item.id}
            className="rounded-panel border border-slate-200 bg-white px-4 py-3"
          >
            <div className="mb-2 flex items-center justify-between gap-3">
              <Typography.Text className="text-sm text-slate-700">{item.label}</Typography.Text>
              <Typography.Text className="text-sm font-semibold text-slate-900">
                {item.value}
              </Typography.Text>
            </div>
            <div className="h-2 rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-blue-500"
                style={{ width: `${item.share}%` }}
                aria-hidden="true"
              />
            </div>
          </article>
        ))}
      </div>
    </Card>
  );
};
