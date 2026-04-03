import type {
  SkillCategory,
  SkillSource,
  SkillStatus,
} from '@api/skills';
import { tp } from '../skills.i18n';
import type { EditorMode } from '../types/skillsManagement.types';

export const getSkillsPageSubtitle = (): string => tp('subtitle');

const createSkillMeta = <TMeta extends Record<string, unknown>>(
  meta: TMeta,
  labelKey: string,
): TMeta & { readonly label: string } => ({
  ...meta,
  get label(): string {
    return tp(labelKey);
  },
});

export const getEditorTabs = (editorMode: EditorMode) => {
  const tabs: Array<{
    key: 'conversation' | 'editor' | 'preview';
    label: string;
  }> = [];

  if (editorMode === 'create') {
    tabs.push({ key: 'conversation' as const, label: tp('tabs.conversation') });
  }

  tabs.push({ key: 'editor' as const, label: tp('tabs.editor') });
  tabs.push({ key: 'preview' as const, label: tp('tabs.preview') });

  return tabs;
};

export const SOURCE_META: Record<
  SkillSource,
  { label: string; accentClass: string }
> = {
  preset: createSkillMeta(
    { accentClass: 'border-sky-200 bg-sky-50 text-sky-700' },
    'source.preset',
  ),
  team: createSkillMeta(
    { accentClass: 'border-emerald-200 bg-emerald-50 text-emerald-700' },
    'source.team',
  ),
};

export const STATUS_META: Record<
  SkillStatus,
  { label: string; accentClass: string }
> = {
  draft: createSkillMeta(
    { accentClass: 'border-amber-200 bg-amber-50 text-amber-700' },
    'status.draftBadge',
  ),
  active: createSkillMeta(
    { accentClass: 'border-emerald-200 bg-emerald-50 text-emerald-700' },
    'status.activeBadge',
  ),
  deprecated: createSkillMeta(
    { accentClass: 'border-orange-200 bg-orange-50 text-orange-700' },
    'status.deprecatedBadge',
  ),
  archived: createSkillMeta(
    { accentClass: 'border-slate-200 bg-slate-100 text-slate-600' },
    'status.archivedBadge',
  ),
};

export const CATEGORY_META: Record<
  SkillCategory,
  { label: string; accentClass: string }
> = {
  documentation_architecture: createSkillMeta(
    { accentClass: 'border-cyan-200 bg-cyan-50 text-cyan-700' },
    'category.documentation_architecture',
  ),
  engineering_execution: createSkillMeta(
    { accentClass: 'border-violet-200 bg-violet-50 text-violet-700' },
    'category.engineering_execution',
  ),
  governance_capture: createSkillMeta(
    { accentClass: 'border-fuchsia-200 bg-fuchsia-50 text-fuchsia-700' },
    'category.governance_capture',
  ),
};

export const getCategoryOptions = () =>
  (Object.keys(CATEGORY_META) as SkillCategory[]).map((value) => ({
    value,
    label: CATEGORY_META[value].label,
  }));

export const getStatusOptions = () =>
  (Object.keys(STATUS_META) as SkillStatus[]).map((value) => ({
    value,
    label: tp(`status.option.${value}`),
  }));

export const AUTHORING_SCOPE_TARGET_ALLOWLIST = [
  'apps/platform/src/pages/skills',
  'docs/current/architecture.md',
] as const;

export const getAuthoringScopeTargetOptions = () => [
  {
    value: AUTHORING_SCOPE_TARGET_ALLOWLIST[0],
    label: tp('authoring.scope.targetOptions.skillsPage'),
  },
  {
    value: AUTHORING_SCOPE_TARGET_ALLOWLIST[1],
    label: tp('authoring.scope.targetOptions.architecture'),
  },
];

export const definitionSectionOrder = [
  'goal',
  'triggerScenarios',
  'requiredContext',
  'workflow',
  'outputContract',
  'guardrails',
  'artifacts',
  'projectBindingNotes',
  'followupQuestionsStrategy',
] as const;
