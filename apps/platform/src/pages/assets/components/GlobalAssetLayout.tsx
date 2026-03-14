import { Card, Typography } from 'antd';
import type { ReactNode } from 'react';

export interface GlobalAssetSummaryItem {
  label: string;
  value: ReactNode;
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
  'rounded-[24px]! border-slate-200! shadow-[0_12px_30px_rgba(15,23,42,0.04)]!';
export const GLOBAL_ASSET_CONTENT_CARD_CLASS_NAME =
  'rounded-[24px]! border-slate-200! shadow-[0_8px_24px_rgba(15,23,42,0.035)]!';
export const GLOBAL_ASSET_SUMMARY_CARD_CLASS_NAME =
  'min-w-[160px] rounded-[20px] border border-slate-200 bg-slate-50/70 px-4 py-4';

export const GlobalAssetPageHeader = ({
  title,
  subtitle,
  actions,
  summaryItems = [],
}: GlobalAssetPageHeaderProps) => {
  return (
    <Card
      className={GLOBAL_ASSET_HEADER_CARD_CLASS_NAME}
      styles={{ body: { padding: '22px 22px 20px' } }}
    >
      <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
        <div className="max-w-3xl">
          <Typography.Title level={3} className="mb-0! text-slate-800!">
            {title}
          </Typography.Title>
          <Typography.Paragraph className="mb-0! mt-2 text-sm! text-slate-500!">
            {subtitle}
          </Typography.Paragraph>
        </div>

        {actions ? <div className="shrink-0">{actions}</div> : null}
      </div>

      {summaryItems.length > 0 ? (
        <div className="mt-5 flex flex-wrap gap-3">
          {summaryItems.map((item) => (
            <div
              key={item.label}
              className={GLOBAL_ASSET_SUMMARY_CARD_CLASS_NAME}
            >
              <Typography.Text className="text-xs font-medium uppercase tracking-[0.14em] text-slate-400">
                {item.label}
              </Typography.Text>
              <Typography.Title
                level={4}
                className="mb-0! mt-2 text-slate-800!"
              >
                {item.value}
              </Typography.Title>
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
      className="h-full min-h-0 rounded-3xl! border-slate-200! shadow-[0_8px_24px_rgba(15,23,42,0.035)]!"
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
      className={`w-full rounded-[16px] border px-3 py-2.5 text-left transition ${
        active
          ? 'border-emerald-200 bg-emerald-50/70'
          : 'border-slate-200 bg-slate-50/70 hover:border-slate-300 hover:bg-white'
      }`}
    >
      {children}
    </button>
  );
};
