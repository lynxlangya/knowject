import { App, ConfigProvider } from 'antd';
import enUS from 'antd/locale/en_US';
import zhCN from 'antd/locale/zh_CN';
import type { ReactNode } from 'react';
import { useLocale } from './locale.context';
import { themeConfig } from '@styles/antd-theme';

interface AntdProviderProps {
  children: ReactNode;
}

export function AntdProvider({ children }: AntdProviderProps) {
  const { locale } = useLocale();

  return (
    <ConfigProvider
      theme={themeConfig}
      locale={locale === 'zh-CN' ? zhCN : enUS}
    >
      <App>{children}</App>
    </ConfigProvider>
  );
}
