import type {
  SkillLifecycleStatus,
  SkillRuntimeStatus,
  SkillSource,
} from '@api/skills';

export const SKILLS_PAGE_SUBTITLE =
  '让 Skill 成为可治理、可复用、可发布的全局方法资产';

export const editorTabs = [
  { key: 'editor', label: '编辑器' },
  { key: 'preview', label: '预览' },
] as const;

export const lifecycleOptions = [
  { value: 'draft', label: 'draft · 草稿' },
  { value: 'published', label: 'published · 已发布' },
] satisfies Array<{ value: SkillLifecycleStatus; label: string }>;

export const SOURCE_META: Record<
  SkillSource,
  { label: string; accentClass: string; cardTintClass: string }
> = {
  system: {
    label: '系统内置',
    accentClass: 'border-sky-200 bg-sky-50 text-sky-700',
    cardTintClass: 'from-sky-50/70 via-white to-white',
  },
  custom: {
    label: '自建 Skill',
    accentClass: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    cardTintClass: 'from-emerald-50/60 via-white to-white',
  },
  imported: {
    label: '公网导入',
    accentClass: 'border-amber-200 bg-amber-50 text-amber-700',
    cardTintClass: 'from-amber-50/60 via-white to-white',
  },
};

export const RUNTIME_STATUS_META: Record<
  SkillRuntimeStatus,
  { label: string; accentClass: string }
> = {
  available: {
    label: '已接服务',
    accentClass: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  },
  contract_only: {
    label: '契约预留',
    accentClass: 'border-slate-200 bg-slate-100 text-slate-600',
  },
};

export const LIFECYCLE_STATUS_META: Record<
  SkillLifecycleStatus,
  { label: string; accentClass: string }
> = {
  draft: {
    label: '草稿',
    accentClass: 'border-amber-200 bg-amber-50 text-amber-700',
  },
  published: {
    label: '已发布',
    accentClass: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  },
};
