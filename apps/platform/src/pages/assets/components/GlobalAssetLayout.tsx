import { Card, Typography } from 'antd';
import type { CSSProperties, ReactNode } from 'react';

export interface GlobalAssetSummaryItem {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
}

interface GlobalAssetSidebarFilterItemProps {
  active?: boolean;
  label: ReactNode;
  count?: ReactNode;
  onClick: () => void;
  ariaPressed?: boolean;
}

interface GlobalAssetMetaPillProps {
  children: ReactNode;
  className?: string;
}

interface GlobalAssetPageHeaderProps {
  title: string;
  subtitle: string;
  actions?: ReactNode;
  summaryItems?: GlobalAssetSummaryItem[];
}

interface GlobalAssetPageLayoutProps {
  header: ReactNode;
  alert?: ReactNode;
  sidebar: ReactNode;
  children: ReactNode;
}

interface GlobalAssetSidebarProps {
  header?: ReactNode;
  children: ReactNode;
}

interface GlobalAssetSidebarSectionProps {
  title?: string;
  children: ReactNode;
}

interface GlobalAssetSidebarItemProps {
  active?: boolean;
  children: ReactNode;
  onClick: () => void;
  ariaPressed?: boolean;
}

export const GLOBAL_ASSET_PAGE_CLASS_NAME =
  'flex min-h-full flex-col gap-4 pr-4 md:pr-5';
export const GLOBAL_ASSET_CONTENT_GRID_CLASS_NAME =
  'grid min-h-0 flex-1 gap-4 xl:grid-cols-[360px_minmax(0,1fr)]';
export const GLOBAL_ASSET_HEADER_CARD_CLASS_NAME =
  'shrink-0 overflow-hidden rounded-hero';
export const GLOBAL_ASSET_CONTENT_CARD_CLASS_NAME =
  'rounded-3xl! border-slate-200! shadow-surface!';
const GLOBAL_ASSET_META_PILL_CLASS_NAME =
  'inline-flex items-center rounded-full border px-2.5 py-1 text-caption font-medium';

const GLOBAL_ASSET_HEADER_CARD_STYLE: CSSProperties = {
  borderRadius: 28,
  border: '1px solid #C2EDE6',
  background: [
    'radial-gradient(circle at 0% 0%, rgba(40,184,160,0.06) 0%, rgba(40,184,160,0) 34%)',
    'radial-gradient(circle at 100% 0%, rgba(242,253,251,0.96) 0%, rgba(242,253,251,0) 38%)',
    'linear-gradient(135deg, rgba(242,253,251,0.98), rgba(255,255,255,0.98) 54%, rgba(237,245,251,0.98))',
  ].join(', '),
  boxShadow: '0 18px 42px rgba(15, 23, 42, 0.06)',
  overflow: 'hidden',
};

export const GlobalAssetPageHeader = ({
  title,
  subtitle,
  actions,
  summaryItems = [],
}: GlobalAssetPageHeaderProps) => {
  return (
    <Card
      className={`${GLOBAL_ASSET_HEADER_CARD_CLASS_NAME} relative`}
      style={GLOBAL_ASSET_HEADER_CARD_STYLE}
      styles={{ body: { padding: '24px 24px 22px' } }}
    >
      <span
        className="absolute inset-x-0 top-0 h-1 rounded-b-full opacity-40"
        style={{ background: 'linear-gradient(90deg, transparent 0%, #28B8A0 30%, #5DDDCF 50%, #28B8A0 70%, transparent 100%)' }}
        aria-hidden="true"
      />
      <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
        <div className="max-w-3xl">
          <Typography.Title level={3} className="mb-0! text-slate-900!">
            {title}
          </Typography.Title>
          <Typography.Paragraph className="mb-0! mt-2.5 text-sm! leading-6! text-[#4A6260]!">
            {subtitle}
          </Typography.Paragraph>
        </div>

        {actions ? <div className="shrink-0">{actions}</div> : null}
      </div>

      {summaryItems.length > 0 ? (
        <div className="mt-6 flex flex-wrap gap-3">
          {summaryItems.map((item, index) => (
            <div
              key={item.label}
              className="group relative overflow-hidden rounded-panel border px-4 py-4 transition-shadow duration-200 hover:shadow-[0_6px_20px_rgba(15,42,38,0.08)] animate-metric-fade-in"
              style={{
                borderColor: '#C2EDE6',
                background: '#F2FDFB',
                animationDelay: `${index * 60}ms`,
                boxShadow: '0 10px 24px rgba(15, 23, 42, 0.04)',
              }}
            >
              <span
                className="absolute inset-x-0 top-0 h-0.5 rounded-b-full opacity-60 transition-opacity duration-200 group-hover:opacity-100"
                style={{ backgroundColor: '#28B8A0' }}
                aria-hidden="true"
              />
              <Typography.Text className="text-label font-semibold text-[#1A8A77] uppercase tracking-[0.14em]">
                {item.label}
              </Typography.Text>
              <Typography.Title
                level={4}
                className="mb-0! mt-2.5 text-slate-800!"
              >
                {item.value}
              </Typography.Title>
              {item.hint ? (
                <Typography.Paragraph className="mb-0! mt-2 text-xs! leading-5! text-[#4A6260]!">
                  {item.hint}
                </Typography.Paragraph>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}
    </Card>
  );
};

export const GlobalAssetPageLayout = ({
  header,
  alert,
  sidebar,
  children,
}: GlobalAssetPageLayoutProps) => {
  return (
    <section className={GLOBAL_ASSET_PAGE_CLASS_NAME}>
      {header}
      {alert}
      <div className={GLOBAL_ASSET_CONTENT_GRID_CLASS_NAME}>
        {sidebar}
        <div className="min-h-0 space-y-4">{children}</div>
      </div>
    </section>
  );
};

export const GlobalAssetSidebar = ({
  header,
  children,
}: GlobalAssetSidebarProps) => {
  return (
    <Card
      className="h-full min-h-0 rounded-3xl! border-slate-200! shadow-surface!"
      styles={{
        body: {
          padding: '20px',
          height: '100%',
          minHeight: 0,
          display: 'flex',
          flexDirection: 'column',
        },
      }}
    >
      {header ? <div className="mb-4">{header}</div> : null}

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="min-h-0 flex-1 overflow-y-auto pr-1">
          <div className="space-y-4">{children}</div>
        </div>
      </div>
    </Card>
  );
};

export const GlobalAssetSidebarSection = ({
  title,
  children,
}: GlobalAssetSidebarSectionProps) => {
  return (
    <section className="space-y-2.5">
      {title ? (
        <Typography.Text className="px-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
          {title}
        </Typography.Text>
      ) : null}
      <div className="flex flex-col gap-2">{children}</div>
    </section>
  );
};

export const GlobalAssetSidebarItem = ({
  active = false,
  children,
  onClick,
  ariaPressed,
}: GlobalAssetSidebarItemProps) => {
  return (
    <button
      type="button"
      aria-pressed={ariaPressed ?? active}
      onClick={onClick}
      className={`w-full rounded-2xl border px-3 py-2.5 text-left transition-all duration-200 ${
        active
          ? 'border-[#C2EDE6] bg-[#F2FDFB]'
          : 'border-slate-200 bg-slate-50/70 hover:border-[#C2EDE6] hover:bg-white hover:shadow-[0_4px_12px_rgba(15,42,38,0.06)]'
      }`}
    >
      {children}
    </button>
  );
};

export const GlobalAssetSidebarFilterItem = ({
  active = false,
  label,
  count,
  onClick,
  ariaPressed,
}: GlobalAssetSidebarFilterItemProps) => {
  return (
    <GlobalAssetSidebarItem
      active={active}
      onClick={onClick}
      ariaPressed={ariaPressed}
    >
      <div className="flex items-center justify-between gap-3">
        <Typography.Text
          className={`text-sm font-medium ${
            active ? 'text-slate-900!' : 'text-slate-600!'
          }`}
        >
          {label}
        </Typography.Text>
        {count ? (
          <Typography.Text className="text-xs text-slate-400">
            {count}
          </Typography.Text>
        ) : null}
      </div>
    </GlobalAssetSidebarItem>
  );
};

export const GlobalAssetMetaPill = ({
  children,
  className,
}: GlobalAssetMetaPillProps) => {
  return (
    <span
      className={[GLOBAL_ASSET_META_PILL_CLASS_NAME, className]
        .filter(Boolean)
        .join(' ')}
    >
      {children}
    </span>
  );
};
