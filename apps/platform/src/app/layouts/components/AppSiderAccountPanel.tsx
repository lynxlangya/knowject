import { useState } from 'react';
import { Popover, Typography } from 'antd';
import { useTranslation } from 'react-i18next';
import {
  LogoutOutlined,
  SettingOutlined,
  TranslationOutlined,
} from '@ant-design/icons';
import { KNOWJECT_BRAND } from '@styles/brand';
import type { SupportedLocale } from '@app/providers/locale.storage';

interface AppSiderAccountUser {
  username?: string | null;
  name?: string | null;
}

interface AppSiderAccountPanelProps {
  authUser: AppSiderAccountUser | null;
  locale: SupportedLocale;
  onLocaleChange: (locale: SupportedLocale) => void | Promise<void>;
  onNavigateToSettings: () => void;
  onLogout: () => void;
}

export const AppSiderAccountPanel = ({
  authUser,
  locale,
  onLocaleChange,
  onNavigateToSettings,
  onLogout,
}: AppSiderAccountPanelProps) => {
  const { t } = useTranslation('navigation');
  const [accountPanelOpen, setAccountPanelOpen] = useState(false);
  const accountPrimary =
    authUser?.username || authUser?.name || 'current@knowject.ai';
  const accountSecondary =
    authUser?.name && authUser.name !== accountPrimary
      ? authUser.name
      : t('account.current');
  const accountAvatar = (authUser?.name || authUser?.username || 'K')
    .trim()
    .charAt(0)
    .toUpperCase();

  const handleLocaleAction = (nextLocale: SupportedLocale) => {
    setAccountPanelOpen(false);
    void onLocaleChange(nextLocale);
  };

  const languagePanelContent = (
    <div className="flex w-40 flex-col gap-1 rounded-card p-1.5">
      {[
        {
          locale: 'en' as const,
          label: t('account.english'),
        },
        {
          locale: 'zh-CN' as const,
          label: t('account.chineseSimplified'),
        },
      ].map((option) => {
        const active = option.locale === locale;

        return (
          <button
            key={option.locale}
            type="button"
            className={[
              'flex h-9 items-center rounded-[12px] px-3 text-left text-sm font-medium transition-colors',
              active
                ? 'text-white!'
                : 'text-slate-600 hover:bg-white hover:text-slate-900',
            ].join(' ')}
            style={
              active
                ? {
                    backgroundImage: KNOWJECT_BRAND.navGradient,
                  }
                : undefined
            }
            onClick={() => handleLocaleAction(option.locale)}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );

  const accountPanelContent = (
    <div className="w-68 rounded-card p-2">
      <div className="flex items-center gap-3 rounded-2xl px-2.5 py-2">
        <div
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[14px] text-sm font-semibold text-white"
          style={{
            backgroundImage: KNOWJECT_BRAND.iconGradient,
            boxShadow: `0 6px 18px rgba(40,184,160,0.22), inset 0 1px 0 rgba(255,255,255,0.55)`,
          }}
        >
          {accountAvatar}
        </div>
        <div className="min-w-0">
          <Typography.Text className="block truncate text-label font-semibold text-slate-800">
            {accountPrimary}
          </Typography.Text>
          <Typography.Text className="block truncate text-caption text-slate-500">
            {accountSecondary}
          </Typography.Text>
        </div>
      </div>

      <div className="mx-2 my-1.5 h-px bg-slate-200/80" />

      <button
        type="button"
        className="flex h-10 w-full items-center gap-3 rounded-[14px] px-3 text-left text-slate-600 transition-colors hover:bg-white hover:text-slate-900"
        onClick={() => {
          setAccountPanelOpen(false);
          onNavigateToSettings();
        }}
      >
        <SettingOutlined className="text-body" />
        <span className="text-sm font-medium">{t('account.settings')}</span>
      </button>

      <Popover
        trigger={['hover']}
        placement="rightTop"
        arrow={false}
        content={languagePanelContent}
        styles={{
          container: {
            padding: 0,
            borderRadius: 18,
            background: KNOWJECT_BRAND.shellSurfaceStrong,
            border: '1px solid rgba(255,255,255,0.72)',
            boxShadow: '0 18px 36px rgba(15,42,38,0.08)',
            backdropFilter: 'blur(18px)',
          },
        }}
      >
        <button
          type="button"
          className="flex h-10 w-full items-center gap-3 rounded-[14px] px-3 text-left text-slate-600 transition-colors hover:bg-white hover:text-slate-900"
        >
          <TranslationOutlined className="text-body" />
          <span className="text-sm font-medium">{t('account.language')}</span>
        </button>
      </Popover>

      <div className="mx-2 my-1.5 h-px bg-slate-200/80" />

      <button
        type="button"
        className="flex h-10 w-full items-center gap-3 rounded-[14px] px-3 text-left text-slate-600 transition-colors hover:bg-white hover:text-slate-900"
        onClick={() => {
          setAccountPanelOpen(false);
          onLogout();
        }}
      >
        <LogoutOutlined className="text-body" />
        <span className="text-sm font-medium">{t('account.logout')}</span>
      </button>
    </div>
  );

  return (
    <div className="mb-2">
      <Popover
        open={accountPanelOpen}
        onOpenChange={setAccountPanelOpen}
        placement="top"
        trigger="click"
        content={accountPanelContent}
        arrow={false}
        styles={{
          container: {
            padding: 0,
            borderRadius: 20,
            background: KNOWJECT_BRAND.shellSurfaceStrong,
            border: '1px solid rgba(255,255,255,0.72)',
            boxShadow: '0 18px 36px rgba(15,42,38,0.08)',
            backdropFilter: 'blur(18px)',
          },
        }}
      >
        <button
          type="button"
          className="flex h-10 w-full items-center gap-2 border px-3 text-left text-slate-700 transition-all duration-200 hover:border-slate-200 hover:bg-white/92 hover:text-slate-900 hover:shadow-[0_12px_24px_rgba(15,42,38,0.06)] active:bg-white"
          style={{
            borderColor: 'rgba(255,255,255,0.72)',
            background: KNOWJECT_BRAND.shellSurfaceStrong,
            boxShadow: '0 10px 24px rgba(15,42,38,0.03)',
            borderRadius: 'var(--radius-sidebar-item)',
          }}
        >
          <SettingOutlined className="shrink-0 text-base text-slate-500" />
          <span className="text-label font-semibold">{t('account.settings')}</span>
        </button>
      </Popover>
    </div>
  );
};
