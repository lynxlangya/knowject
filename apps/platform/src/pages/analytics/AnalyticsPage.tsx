import { Typography } from 'antd';
import { useTranslation } from 'react-i18next';

const SUMMARY_KEYS = [
  'activeProjects',
  'knowledgeConnected',
  'recentConversations',
  'attentionProjects',
] as const;

const ATTENTION_KEYS = ['indexing', 'citation', 'activity'] as const;
const CHART_DAY_KEYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const;
const CHART_POINTS = [42, 56, 48, 72, 68, 86, 80];

const buildChartCoordinates = (values: number[]) => {
  return values.map((value, index) => {
    const x = 24 + index * 82;
    const y = 180 - value * 1.2;

    return { x, y };
  });
};

const buildLinePath = (points: Array<{ x: number; y: number }>) => {
  return points
    .map((point, index) =>
      index === 0 ? `M ${point.x} ${point.y}` : `L ${point.x} ${point.y}`,
    )
    .join(' ');
};

const buildAreaPath = (points: Array<{ x: number; y: number }>) => {
  if (points.length === 0) {
    return '';
  }

  const linePath = buildLinePath(points);
  const lastPoint = points.at(-1);
  const firstPoint = points[0];

  if (!lastPoint || !firstPoint) {
    return '';
  }

  return `${linePath} L ${lastPoint.x} 196 L ${firstPoint.x} 196 Z`;
};

export const AnalyticsPage = () => {
  const { t } = useTranslation('pages');
  const chartPoints = buildChartCoordinates(CHART_POINTS);
  const chartLinePath = buildLinePath(chartPoints);
  const chartAreaPath = buildAreaPath(chartPoints);

  return (
    <section className="project-page-surface-enter flex flex-col gap-3">
      <header className="overflow-hidden rounded-3xl border border-slate-200/90 bg-white shadow-surface">
        <div className="bg-[linear-gradient(135deg,rgba(247,251,250,0.98),rgba(255,255,255,0.985)_52%,rgba(241,248,246,0.96))] px-6 py-6 md:px-8 md:py-7">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div className="max-w-3xl">
              <Typography.Text className="text-xs font-semibold uppercase tracking-[0.18em] text-[#1A8A77]">
                {t('analytics.eyebrow')}
              </Typography.Text>
              <Typography.Title level={2} className="mb-0! mt-3 text-slate-900!">
                {t('analytics.title')}
              </Typography.Title>
              <Typography.Paragraph className="mb-0! mt-3 text-sm! leading-6! text-slate-500! md:text-base!">
                {t('analytics.subtitle')}
              </Typography.Paragraph>
            </div>

            <div className="inline-flex self-start rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium tracking-[0.04em] text-slate-500">
              {t('analytics.status')}
            </div>
          </div>
        </div>

        <div className="border-t border-slate-200/80 px-4 py-4 md:px-5">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {SUMMARY_KEYS.map((key) => (
              <article
                key={key}
                className="rounded-2xl border border-slate-200 bg-white px-4 py-4"
              >
                <Typography.Text className="text-caption font-semibold uppercase tracking-[0.14em] text-slate-400">
                  {t(`analytics.summary.items.${key}.label`)}
                </Typography.Text>
                <div className="mt-3 flex items-end justify-between gap-3">
                  <div className="text-[34px] leading-none tracking-[-0.04em] text-slate-900">
                    —
                  </div>
                  <span className="text-[11px] font-medium tracking-[0.04em] text-slate-400">
                    {t('analytics.summary.pending')}
                  </span>
                </div>
              </article>
            ))}
          </div>
        </div>
      </header>

      <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_340px]">
        <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-surface">
          <div className="flex flex-col gap-3 border-b border-slate-200 bg-[linear-gradient(180deg,rgba(248,252,251,0.96),rgba(244,249,247,0.92))] px-6 py-5 md:flex-row md:items-start md:justify-between">
            <div>
              <Typography.Title level={4} className="mb-0! text-slate-900!">
                {t('analytics.chart.title')}
              </Typography.Title>
              <Typography.Paragraph className="mb-0! mt-2 text-sm! leading-6! text-slate-500!">
                {t('analytics.chart.description')}
              </Typography.Paragraph>
            </div>

            <span className="inline-flex self-start rounded-full border border-[#C2EDE6] bg-[#F2FDFB] px-3 py-1 text-xs font-medium text-[#1A8A77]">
              {t('analytics.chart.state')}
            </span>
          </div>

          <div className="px-5 py-5 md:px-6 md:py-6">
            <div className="overflow-hidden rounded-[1.5rem] border border-slate-200 bg-[linear-gradient(180deg,rgba(250,252,252,0.98),rgba(244,249,247,0.96))] p-4 md:p-5">
              <div className="mb-4 flex items-center justify-between gap-3">
                <Typography.Text className="text-xs font-medium tracking-[0.08em] text-slate-400 uppercase">
                  {t('analytics.chart.frameLabel')}
                </Typography.Text>
                <Typography.Text className="text-xs text-slate-400">
                  {t('analytics.footer')}
                </Typography.Text>
              </div>

              <div className="rounded-[1.25rem] bg-white/72 px-2 py-3 md:px-3 md:py-4">
                <svg
                  viewBox="0 0 560 220"
                  className="h-[260px] w-full"
                  role="img"
                  aria-label={t('analytics.chart.title')}
                >
                  <defs>
                    <linearGradient id="analytics-area-fill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="rgba(40,184,160,0.24)" />
                      <stop offset="100%" stopColor="rgba(40,184,160,0.02)" />
                    </linearGradient>
                    <linearGradient id="analytics-line-stroke" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#28B8A0" />
                      <stop offset="100%" stopColor="#5EC8E8" />
                    </linearGradient>
                  </defs>

                  {[40, 92, 144, 196].map((y) => (
                    <line
                      key={y}
                      x1="20"
                      y1={y}
                      x2="540"
                      y2={y}
                      stroke="rgba(148,163,184,0.18)"
                      strokeDasharray="5 7"
                    />
                  ))}

                  <path d={chartAreaPath} fill="url(#analytics-area-fill)" />
                  <path
                    d={chartLinePath}
                    fill="none"
                    stroke="url(#analytics-line-stroke)"
                    strokeWidth="4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />

                  {chartPoints.map((point) => (
                    <g key={`${point.x}-${point.y}`}>
                      <circle cx={point.x} cy={point.y} r="6" fill="#ffffff" />
                      <circle cx={point.x} cy={point.y} r="3.5" fill="#28B8A0" />
                    </g>
                  ))}

                  {CHART_DAY_KEYS.map((key, index) => (
                    <text
                      key={key}
                      x={24 + index * 82}
                      y="214"
                      textAnchor="middle"
                      fill="#94a3b8"
                      fontSize="12"
                      fontWeight="600"
                    >
                      {t(`analytics.chart.days.${key}`)}
                    </text>
                  ))}
                </svg>
              </div>
            </div>
          </div>
        </section>

        <aside className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-surface">
          <div className="border-b border-slate-200 bg-[linear-gradient(180deg,rgba(249,251,254,0.98),rgba(245,248,251,0.94))] px-5 py-5">
            <Typography.Title level={4} className="mb-0! text-slate-900!">
              {t('analytics.attention.title')}
            </Typography.Title>
            <Typography.Paragraph className="mb-0! mt-2 text-sm! leading-6! text-slate-500!">
              {t('analytics.attention.description')}
            </Typography.Paragraph>
          </div>

          <div className="space-y-2 px-4 py-4">
            {ATTENTION_KEYS.map((key) => (
              <article
                key={key}
                className="rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3.5"
              >
                <div className="space-y-2">
                  <span className="inline-flex rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium tracking-[0.04em] text-slate-500">
                    {t(`analytics.attention.items.${key}.label`)}
                  </span>
                  <Typography.Text className="block text-sm font-semibold text-slate-800">
                    {t(`analytics.attention.items.${key}.title`)}
                  </Typography.Text>
                  <Typography.Paragraph className="mb-0! text-sm! leading-6! text-slate-500!">
                    {t(`analytics.attention.items.${key}.description`)}
                  </Typography.Paragraph>
                </div>
              </article>
            ))}
          </div>
        </aside>
      </div>
    </section>
  );
};
