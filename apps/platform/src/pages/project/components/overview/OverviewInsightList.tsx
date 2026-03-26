import { Card, Empty, Typography } from 'antd';
import type { ProjectOverviewInsightLevel } from '../../projectOverview.types';

export interface OverviewInsightItem {
  id: string;
  level: ProjectOverviewInsightLevel;
  levelLabel: string;
  title: string;
  description: string;
}

export interface OverviewInsightListProps {
  title: string;
  description: string;
  items: OverviewInsightItem[];
  emptyLabel: string;
}

const levelBadgeStyles: Record<ProjectOverviewInsightLevel, string> = {
  positive: 'border-[#C2EDE6] bg-[#F2FDFB] text-[#1A8A77]',
  neutral: 'border-slate-200 bg-slate-50 text-slate-600',
  warning: 'border-amber-200 bg-amber-50 text-amber-700',
  risk: 'border-rose-200 bg-rose-50 text-rose-700',
};

const levelRowStyles: Record<ProjectOverviewInsightLevel, { bg: string; border: string; accent: string; title: string; desc: string }> = {
  positive: {
    bg: 'bg-[#F2FDFB]',
    border: 'border-[#C2EDE6]',
    accent: '#28B8A0',
    title: 'text-[#1A8A77]',
    desc: 'text-[#4A6260]',
  },
  neutral: {
    bg: 'bg-slate-50/60',
    border: 'border-slate-200',
    accent: '#94A3B8',
    title: 'text-slate-700',
    desc: 'text-slate-500',
  },
  warning: {
    bg: 'bg-amber-50/45',
    border: 'border-amber-100',
    accent: '#F59E0B',
    title: 'text-amber-800',
    desc: 'text-amber-700',
  },
  risk: {
    bg: 'bg-rose-50/45',
    border: 'border-rose-100',
    accent: '#F43F5E',
    title: 'text-rose-700',
    desc: 'text-rose-600',
  },
};

export const OverviewInsightList = ({
  title,
  description,
  items,
  emptyLabel,
}: OverviewInsightListProps) => {
  return (
    <Card
      className="rounded-3xl! border-slate-200! shadow-[0_8px_32px_rgba(15,42,38,0.06)]!"
      styles={{ body: { padding: '20px' } }}
    >
      <div className="mb-4">
        <Typography.Title level={4} className="mb-1! mt-0! text-slate-800!">
          {title}
        </Typography.Title>
        <Typography.Paragraph className="mb-0! text-sm! text-slate-600!">
          {description}
        </Typography.Paragraph>
      </div>

      {items.length > 0 ? (
        <ul className="m-0 flex list-none flex-col gap-2 p-0">
          {items.map((item) => {
            const style = levelRowStyles[item.level];
            return (
              <li
                key={item.id}
                className={`group relative overflow-hidden rounded-panel border px-4 py-3 transition-shadow duration-200 hover:shadow-[0_4px_16px_rgba(15,42,38,0.06)] ${style.bg} ${style.border}`}
              >
                {/* Brand accent bar */}
                <span
                  className="absolute inset-y-0 left-0 w-0.5 rounded-full"
                  style={{ backgroundColor: style.accent }}
                  aria-hidden="true"
                />
                <div className="mb-2 flex items-center justify-between gap-3 pl-2">
                  <Typography.Text className={`text-sm font-semibold ${style.title}`}>
                    {item.title}
                  </Typography.Text>
                  <span
                    className={`inline-flex items-center rounded-full border px-2.5 py-1 text-caption font-semibold ${levelBadgeStyles[item.level]}`}
                  >
                    {item.levelLabel}
                  </span>
                </div>
                <Typography.Text className={`text-sm pl-2 ${style.desc}`}>
                  {item.description}
                </Typography.Text>
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="rounded-panel border border-dashed border-[#C2EDE6] bg-[#F2FDFB] py-8 shadow-[inset_0_2px_8px_rgba(40,184,160,0.04)]">
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={emptyLabel} />
        </div>
      )}
    </Card>
  );
};
