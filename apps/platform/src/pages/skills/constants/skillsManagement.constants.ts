import type {
  SkillCategory,
  SkillCreationTemplateHint,
  SkillStatus,
} from "@api/skills";
import type { SkillCreationTemplateOption } from "../types/skillsManagement.types";
import { tp } from "../skills.i18n";

export const getSkillsPageSubtitle = (): string => tp("subtitle");

const createSkillMeta = <TMeta extends Record<string, unknown>>(
  meta: TMeta,
  labelKey: string,
): TMeta & { readonly label: string } => ({
  ...meta,
  get label(): string {
    return tp(labelKey);
  },
});

export const STATUS_META: Record<
  SkillStatus,
  { label: string; accentClass: string }
> = {
  draft: createSkillMeta(
    { accentClass: "border-amber-200 bg-amber-50 text-amber-700" },
    "status.draftBadge",
  ),
  active: createSkillMeta(
    { accentClass: "border-emerald-200 bg-emerald-50 text-emerald-700" },
    "status.activeBadge",
  ),
  deprecated: createSkillMeta(
    { accentClass: "border-orange-200 bg-orange-50 text-orange-700" },
    "status.deprecatedBadge",
  ),
  archived: createSkillMeta(
    { accentClass: "border-slate-200 bg-slate-100 text-slate-600" },
    "status.archivedBadge",
  ),
};

export const CATEGORY_META: Record<
  SkillCategory,
  { label: string; accentClass: string }
> = {
  documentation_architecture: createSkillMeta(
    { accentClass: "border-cyan-200 bg-cyan-50 text-cyan-700" },
    "category.documentation_architecture",
  ),
  engineering_execution: createSkillMeta(
    { accentClass: "border-violet-200 bg-violet-50 text-violet-700" },
    "category.engineering_execution",
  ),
  governance_capture: createSkillMeta(
    { accentClass: "border-fuchsia-200 bg-fuchsia-50 text-fuchsia-700" },
    "category.governance_capture",
  ),
};

const createTemplateMeta = (
  value: SkillCreationTemplateHint,
  labelKey: string,
  previewKey: string,
): SkillCreationTemplateOption => ({
  value,
  label: tp(labelKey),
  preview: tp(previewKey),
});

export const getSkillCreationTemplateOptions = (): SkillCreationTemplateOption[] => {
  return [
    createTemplateMeta(
      "goal",
      "creation.templates.goal.label",
      "creation.templates.goal.preview",
    ),
    createTemplateMeta(
      "workflow",
      "creation.templates.workflow.label",
      "creation.templates.workflow.preview",
    ),
    createTemplateMeta(
      "output",
      "creation.templates.output.label",
      "creation.templates.output.preview",
    ),
    createTemplateMeta(
      "guardrails",
      "creation.templates.guardrails.label",
      "creation.templates.guardrails.preview",
    ),
  ];
};
