import type {
  SkillLifecycleStatus,
  SkillRuntimeStatus,
  SkillSource,
} from '@api/skills';
import { tp } from '../skills.i18n';

export const SKILLS_PAGE_SUBTITLE =
  tp('subtitle');

export const editorTabs = [
  { key: 'editor', label: tp('tabs.editor') },
  { key: 'preview', label: tp('tabs.preview') },
] as const;

export const lifecycleOptions = [
  { value: 'draft', label: tp('lifecycle.draft') },
  { value: 'published', label: tp('lifecycle.published') },
] satisfies Array<{ value: SkillLifecycleStatus; label: string }>;

export const SOURCE_META: Record<
  SkillSource,
  { label: string; accentClass: string }
> = {
  system: {
    label: tp('source.system'),
    accentClass: 'border-sky-200 bg-sky-50 text-sky-700',
  },
  custom: {
    label: tp('source.custom'),
    accentClass: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  },
  imported: {
    label: tp('source.imported'),
    accentClass: 'border-amber-200 bg-amber-50 text-amber-700',
  },
};

export const RUNTIME_STATUS_META: Record<
  SkillRuntimeStatus,
  { label: string; accentClass: string }
> = {
  available: {
    label: tp('runtime.available'),
    accentClass: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  },
  contract_only: {
    label: tp('runtime.contractOnly'),
    accentClass: 'border-slate-200 bg-slate-100 text-slate-600',
  },
};

export const LIFECYCLE_STATUS_META: Record<
  SkillLifecycleStatus,
  { label: string; accentClass: string }
> = {
  draft: {
    label: tp('lifecycle.draftBadge'),
    accentClass: 'border-amber-200 bg-amber-50 text-amber-700',
  },
  published: {
    label: tp('lifecycle.publishedBadge'),
    accentClass: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  },
};
