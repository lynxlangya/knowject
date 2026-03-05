import { App, ConfigProvider } from 'antd';
import type { ReactNode } from 'react';
import { themeConfig } from '@/styles/antd-theme';

interface AntdProviderProps {
  children: ReactNode;
}

export function AntdProvider({ children }: AntdProviderProps) {
  return (
    <ConfigProvider theme={themeConfig}>
      <App>{children}</App>
    </ConfigProvider>
  );
}
