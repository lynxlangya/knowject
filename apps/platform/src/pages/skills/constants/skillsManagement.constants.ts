import type {
  SkillLifecycleStatus,
  SkillRuntimeStatus,
  SkillSource,
} from '@api/skills';
import { tp } from '../skills.i18n';

export const SKILLS_PAGE_SUBTITLE =
  tp('subtitle');

const createSkillMeta = <TMeta extends Record<string, unknown>>(
  meta: TMeta,
  labelKey: string,
): TMeta & { readonly label: string } => ({
  ...meta,
  get label(): string {
    return tp(labelKey);
  },
});

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
  system: createSkillMeta(
    { accentClass: 'border-sky-200 bg-sky-50 text-sky-700' },
    'source.system',
  ),
  custom: createSkillMeta(
    { accentClass: 'border-emerald-200 bg-emerald-50 text-emerald-700' },
    'source.custom',
  ),
  imported: createSkillMeta(
    { accentClass: 'border-amber-200 bg-amber-50 text-amber-700' },
    'source.imported',
  ),
};

export const RUNTIME_STATUS_META: Record<
  SkillRuntimeStatus,
  { label: string; accentClass: string }
> = {
  available: createSkillMeta(
    { accentClass: 'border-emerald-200 bg-emerald-50 text-emerald-700' },
    'runtime.available',
  ),
  contract_only: createSkillMeta(
    { accentClass: 'border-slate-200 bg-slate-100 text-slate-600' },
    'runtime.contractOnly',
  ),
};

export const LIFECYCLE_STATUS_META: Record<
  SkillLifecycleStatus,
  { label: string; accentClass: string }
> = {
  draft: createSkillMeta(
    { accentClass: 'border-amber-200 bg-amber-50 text-amber-700' },
    'lifecycle.draftBadge',
  ),
  published: createSkillMeta(
    { accentClass: 'border-emerald-200 bg-emerald-50 text-emerald-700' },
    'lifecycle.publishedBadge',
  ),
};
