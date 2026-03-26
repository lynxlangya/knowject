import { Card, Typography } from 'antd';

export type OverviewKnowledgeStatusTone = 'positive' | 'neutral' | 'warning' | 'risk';

export interface OverviewKnowledgeStatusItem {
  id: string;
  label: string;
  value: number | string;
  tone: OverviewKnowledgeStatusTone;
}

export interface OverviewKnowledgeHealthCardProps {
  title: string;
  description: string;
  stateLabel: string;
  knowledgeTotalLabel: string;
  knowledgeTotalValue: string;
  documentTotalLabel: string;
  documentTotalValue: string;
  indexedLabel: string;
  indexedValue: string;
  indexingRateLabel: string;
  indexingRateValue: string;
  indexingProgressPercent?: number | null;
  statusItems: OverviewKnowledgeStatusItem[];
}

const toneBadgeStyles: Record<OverviewKnowledgeStatusTone, string> = {
  positive: 'border-[#C2EDE6] bg-[#F2FDFB] text-[#1A8A77]',
  neutral: 'border-slate-200 bg-slate-50 text-slate-600',
  warning: 'border-amber-200 bg-amber-50 text-amber-700',
  risk: 'border-rose-200 bg-rose-50 text-rose-700',
};

export const OverviewKnowledgeHealthCard = ({
  title,
  description,
  stateLabel,
  knowledgeTotalLabel,
  knowledgeTotalValue,
  documentTotalLabel,
  documentTotalValue,
  indexedLabel,
  indexedValue,
  indexingRateLabel,
  indexingRateValue,
  indexingProgressPercent,
  statusItems,
}: OverviewKnowledgeHealthCardProps) => {
  const safePercent =
    typeof indexingProgressPercent === 'number'
      ? Math.max(0, Math.min(100, indexingProgressPercent))
      : null;

  return (
    <Card
      className="rounded-3xl! border-slate-200! shadow-[0_8px_32px_rgba(15,42,38,0.06)]!"
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

      <div className="grid gap-3 sm:grid-cols-2">
        <article className="rounded-panel border border-slate-200 bg-slate-50/75 px-4 py-3">
          <Typography.Text className="text-caption uppercase tracking-[0.12em] text-slate-500">
            {knowledgeTotalLabel}
          </Typography.Text>
          <Typography.Title level={4} className="mb-0! mt-2! text-slate-900!">
            {knowledgeTotalValue}
          </Typography.Title>
        </article>
        <article className="rounded-panel border border-slate-200 bg-slate-50/75 px-4 py-3">
          <Typography.Text className="text-caption uppercase tracking-[0.12em] text-slate-500">
            {documentTotalLabel}
          </Typography.Text>
          <Typography.Title level={4} className="mb-0! mt-2! text-slate-900!">
            {documentTotalValue}
          </Typography.Title>
        </article>
      </div>

      <div className="mt-4 rounded-panel border border-[#C2EDE6] bg-[#F2FDFB] px-4 py-3">
        <div className="mb-2 flex items-center justify-between gap-3">
          <Typography.Text className="text-caption uppercase tracking-[0.12em] text-[#1A8A77]">
            {indexedLabel}
          </Typography.Text>
          <Typography.Text className="text-caption font-semibold text-[#1A8A77]">
            {indexedValue}
          </Typography.Text>
        </div>
        {safePercent !== null ? (
          <div className="relative h-2 rounded-full bg-[#E3F8F4]">
            <div
              className="absolute inset-y-0 left-0 rounded-full"
              style={{
                width: `${safePercent}%`,
                background: 'linear-gradient(90deg, #28B8A0 0%, #5DDDCF 100%)',
                boxShadow: '0 0 8px rgba(40,184,160,0.35)',
              }}
              aria-hidden="true"
            />
          </div>
        ) : (
          <div className="h-2 rounded-full bg-[#E3F8F4]" aria-hidden="true" />
        )}
        <Typography.Text className="mt-2 block text-caption text-[#1A8A77]">
          {indexingRateLabel}: {indexingRateValue}
        </Typography.Text>
      </div>

      <div className="mt-4 grid gap-2">
        {statusItems.map((item) => (
          <div
            key={item.id}
            className="flex items-center justify-between rounded-panel border border-slate-200 bg-white px-3 py-2"
          >
            <Typography.Text className="text-sm text-slate-700">{item.label}</Typography.Text>
            <span
              className={`inline-flex items-center rounded-full border px-2.5 py-1 text-caption font-semibold ${toneBadgeStyles[item.tone]}`}
            >
              {item.value}
            </span>
          </div>
        ))}
      </div>
    </Card>
  );
};
