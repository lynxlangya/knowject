import { apiErrorMessages as apiErrorsEn } from './locales/en/api-errors';
import { authMessages as authEn } from './locales/en/auth';
import { commonMessages as commonEn } from './locales/en/common';
import { navigationMessages as navigationEn } from './locales/en/navigation';
import { pagesMessages as pagesEn } from './locales/en/pages';
import { projectMessages as projectEn } from './locales/en/project';
import { apiErrorMessages as apiErrorsZhCN } from './locales/zh-CN/api-errors';
import { authMessages as authZhCN } from './locales/zh-CN/auth';
import { commonMessages as commonZhCN } from './locales/zh-CN/common';
import { navigationMessages as navigationZhCN } from './locales/zh-CN/navigation';
import { pagesMessages as pagesZhCN } from './locales/zh-CN/pages';
import { projectMessages as projectZhCN } from './locales/zh-CN/project';

export const resources = {
  en: {
    common: commonEn,
    navigation: navigationEn,
    auth: authEn,
    pages: pagesEn,
    project: projectEn,
    'api-errors': apiErrorsEn,
  },
  'zh-CN': {
    common: commonZhCN,
    navigation: navigationZhCN,
    auth: authZhCN,
    pages: pagesZhCN,
    project: projectZhCN,
    'api-errors': apiErrorsZhCN,
  },
} as const;

export type LocaleNamespace = keyof (typeof resources)['en'];

export const localeNamespaces = Object.keys(
  resources.en,
) as LocaleNamespace[];
