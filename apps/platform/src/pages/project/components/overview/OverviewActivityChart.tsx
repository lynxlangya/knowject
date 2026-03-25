import { Card, Empty, Typography } from 'antd';

export interface OverviewActivityPoint {
  id: string;
  label: string;
  tooltip: string;
  value: number;
}

export interface OverviewActivityChartProps {
  title: string;
  description: string;
  points: OverviewActivityPoint[];
  avgLabel: string;
  peakLabel: string;
  emptyLabel: string;
  statsAvailable?: boolean;
}

const chartWidth = 560;
const chartHeight = 188;
const paddingX = 18;
const paddingTop = 10;
const paddingBottom = 34;

export const OverviewActivityChart = ({
  title,
  description,
  points,
  avgLabel,
  peakLabel,
  emptyLabel,
  statsAvailable = true,
}: OverviewActivityChartProps) => {
  const hasPoints = points.length > 0;
  const safePoints = hasPoints ? points : [{ id: 'placeholder', label: '-', tooltip: '-', value: 0 }];
  const maxValue = Math.max(...safePoints.map((point) => point.value), 1);

  const plotWidth = chartWidth - paddingX * 2;
  const baselineY = chartHeight - paddingBottom;
  const chartInnerHeight = baselineY - paddingTop;
  const stepX = safePoints.length > 1 ? plotWidth / (safePoints.length - 1) : 0;

  const coordinates = safePoints.map((point, index) => {
    const x = paddingX + index * stepX;
    const y = baselineY - (point.value / maxValue) * chartInnerHeight;
    return { x, y };
  });

  const linePath = coordinates
    .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`)
    .join(' ');
  const areaPath = `${linePath} L ${coordinates[coordinates.length - 1].x} ${baselineY} L ${coordinates[0].x} ${baselineY} Z`;

  const total = points.reduce((sum, point) => sum + point.value, 0);
  const average = points.length > 0 ? (total / points.length).toFixed(1) : '0.0';
  const peak = points.reduce(
    (current, point) => (point.value > current ? point.value : current),
    0,
  );
  const displayAverage = statsAvailable ? average : '—';
  const displayPeak = statsAvailable ? String(peak) : '—';

  return (
    <Card
      className="rounded-3xl! border-slate-200! shadow-surface!"
      styles={{ body: { padding: '20px' } }}
    >
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <Typography.Title level={4} className="mb-1! mt-0! text-slate-800!">
            {title}
          </Typography.Title>
          <Typography.Text className="text-sm text-slate-600">{description}</Typography.Text>
        </div>
        <div className="flex items-center gap-2 text-caption text-slate-600">
          <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1">
            {avgLabel}: {displayAverage}
          </span>
          <span className="rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-blue-700">
            {peakLabel}: {displayPeak}
          </span>
        </div>
      </div>

      {hasPoints ? (
        <div className="overflow-hidden rounded-panel border border-slate-200 bg-gradient-to-b from-slate-50 to-white px-3 py-3">
          <svg
            className="h-48 w-full"
            viewBox={`0 0 ${chartWidth} ${chartHeight}`}
            role="img"
            aria-label={title}
          >
            <defs>
              <linearGradient id="overview-activity-fill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#93c5fd" stopOpacity="0.36" />
                <stop offset="100%" stopColor="#dbeafe" stopOpacity="0.08" />
              </linearGradient>
            </defs>
            <line
              x1={paddingX}
              y1={baselineY}
              x2={chartWidth - paddingX}
              y2={baselineY}
              stroke="#dbe2ef"
              strokeWidth={1}
            />
            <path d={areaPath} fill="url(#overview-activity-fill)" />
            <path
              d={linePath}
              fill="none"
              stroke="#2563eb"
              strokeWidth={2.5}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {safePoints.map((point, index) => {
              const coordinate = coordinates[index];
              return (
                <g key={point.id}>
                  <circle cx={coordinate.x} cy={coordinate.y} r={3.5} fill="#1d4ed8" />
                  <text
                    x={coordinate.x}
                    y={baselineY + 20}
                    textAnchor="middle"
                    fontSize="11"
                    fill="#64748b"
                  >
                    {point.label}
                  </text>
                  <title>
                    {point.tooltip}: {point.value}
                  </title>
                </g>
              );
            })}
          </svg>
        </div>
      ) : (
        <div className="rounded-panel border border-dashed border-slate-200 bg-slate-50/60 py-10">
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={emptyLabel} />
        </div>
      )}
    </Card>
  );
};
