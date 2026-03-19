import type { ReactNode } from 'react';
import type { GlobalAssetSummaryItem } from './GlobalAssetLayout';

const GLOBAL_ASSET_UPDATED_AT_FORMATTER = new Intl.DateTimeFormat('zh-CN', {
  month: 'numeric',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

export const createGlobalAssetSummaryItem = (
  label: string,
  value: ReactNode,
  hint?: ReactNode,
): GlobalAssetSummaryItem => {
  return { label, value, hint };
};

export const formatGlobalAssetUpdatedAt = (value: string): string => {
  return GLOBAL_ASSET_UPDATED_AT_FORMATTER.format(new Date(value));
};
