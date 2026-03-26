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
  positive: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  neutral: 'border-slate-200 bg-slate-50 text-slate-600',
  warning: 'border-amber-200 bg-amber-50 text-amber-700',
  risk: 'border-rose-200 bg-rose-50 text-rose-700',
};

const levelRowStyles: Record<ProjectOverviewInsightLevel, string> = {
  positive: 'border-[#C2EDE6] bg-[#F2FDFB]',
  neutral: 'border-slate-200 bg-slate-50/60',
  warning: 'border-amber-100 bg-amber-50/45',
  risk: 'border-rose-100 bg-rose-50/45',
};

export const OverviewInsightList = ({
  title,
  description,
  items,
  emptyLabel,
}: OverviewInsightListProps) => {
  return (
    <Card
      className="rounded-3xl! border-slate-200! shadow-surface!"
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
          {items.map((item, index) => (
            <li
              key={item.id}
              className={`rounded-panel border px-4 py-3 ${levelRowStyles[item.level]} ${index === 0 ? 'border-l-[3px] border-l-[#28B8A0]' : ''}`}
            >
              <div className="mb-2 flex items-center justify-between gap-3">
                <Typography.Text className={`text-sm font-semibold ${index === 0 ? 'text-white' : 'text-slate-800'}`}>
                  {item.title}
                </Typography.Text>
                <span
                  className={`inline-flex items-center rounded-full border px-2.5 py-1 text-caption font-semibold ${levelBadgeStyles[item.level]}`}
                >
                  {item.levelLabel}
                </span>
              </div>
              <Typography.Text className={`text-sm ${index === 0 ? 'text-white/75' : 'text-slate-600'}`}>
                {item.description}
              </Typography.Text>
            </li>
          ))}
        </ul>
      ) : (
        <div className="rounded-panel border border-dashed border-slate-200 bg-slate-50/60 py-8">
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={emptyLabel} />
        </div>
      )}
    </Card>
  );
};
