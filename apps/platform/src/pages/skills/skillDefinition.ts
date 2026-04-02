import type {
  SkillDefinitionFields,
  SkillFollowupStrategy,
} from '@api/skills';
import type {
  SkillEditorDraft,
  SkillEditorValidation,
} from './types/skillsManagement.types';
import { tp } from './skills.i18n';

export type { SkillEditorDraft, SkillEditorValidation };

type SkillDefinitionListKey = Exclude<
  keyof SkillDefinitionFields,
  'goal' | 'followupQuestionsStrategy'
>;

interface SkillDefinitionListSectionMeta {
  key: SkillDefinitionListKey;
  heading: string;
  labelKey: string;
  addLabelKey: string;
  placeholderKey: string;
}

interface SkillDefinitionListSection {
  key: SkillDefinitionListKey;
  heading: string;
  label: string;
  addLabel: string;
  placeholder: string;
}

interface SkillDefinitionScalarSection {
  key: 'goal';
  heading: string;
  label: string;
  placeholder: string;
}

const normalizeLine = (value: string): string => value.trim();

const normalizeList = (items: string[]): string[] => {
  return items.map(normalizeLine).filter(Boolean);
};

const renderListSection = (heading: string, items: string[]): string => {
  return [`## ${heading}`, '', ...items.map((item) => `- ${item}`)].join('\n');
};

const renderScalarSection = (heading: string, value: string): string => {
  return `## ${heading}\n\n${value}`;
};

const skillDefinitionGoalSectionMeta = {
  key: 'goal',
  heading: 'Goal',
} as const;

const skillDefinitionListSectionMeta: SkillDefinitionListSectionMeta[] = [
  {
    key: 'triggerScenarios',
    heading: 'Trigger Scenarios',
    labelKey: 'definition.triggerScenarios.label',
    addLabelKey: 'definition.triggerScenarios.add',
    placeholderKey: 'definition.triggerScenarios.placeholder',
  },
  {
    key: 'requiredContext',
    heading: 'Required Context',
    labelKey: 'definition.requiredContext.label',
    addLabelKey: 'definition.requiredContext.add',
    placeholderKey: 'definition.requiredContext.placeholder',
  },
  {
    key: 'workflow',
    heading: 'Workflow',
    labelKey: 'definition.workflow.label',
    addLabelKey: 'definition.workflow.add',
    placeholderKey: 'definition.workflow.placeholder',
  },
  {
    key: 'outputContract',
    heading: 'Output Contract',
    labelKey: 'definition.outputContract.label',
    addLabelKey: 'definition.outputContract.add',
    placeholderKey: 'definition.outputContract.placeholder',
  },
  {
    key: 'guardrails',
    heading: 'Guardrails',
    labelKey: 'definition.guardrails.label',
    addLabelKey: 'definition.guardrails.add',
    placeholderKey: 'definition.guardrails.placeholder',
  },
  {
    key: 'artifacts',
    heading: 'Artifacts',
    labelKey: 'definition.artifacts.label',
    addLabelKey: 'definition.artifacts.add',
    placeholderKey: 'definition.artifacts.placeholder',
  },
  {
    key: 'projectBindingNotes',
    heading: 'Project Binding Notes',
    labelKey: 'definition.projectBindingNotes.label',
    addLabelKey: 'definition.projectBindingNotes.add',
    placeholderKey: 'definition.projectBindingNotes.placeholder',
  },
];

export const getSkillDefinitionGoalSection = (): SkillDefinitionScalarSection => ({
  key: skillDefinitionGoalSectionMeta.key,
  heading: skillDefinitionGoalSectionMeta.heading,
  label: tp('definition.goal.label'),
  placeholder: tp('definition.goal.placeholder'),
});

export const getSkillDefinitionListSections = (): SkillDefinitionListSection[] => {
  return skillDefinitionListSectionMeta.map((section) => ({
    key: section.key,
    heading: section.heading,
    label: tp(section.labelKey),
    addLabel: tp(section.addLabelKey),
    placeholder: tp(section.placeholderKey),
  }));
};

export const getSkillFollowupStrategyOptions = (): Array<{
  value: SkillFollowupStrategy;
  label: string;
}> => [
  {
    value: 'none',
    label: tp('definition.followupQuestionsStrategy.options.none'),
  },
  {
    value: 'optional',
    label: tp('definition.followupQuestionsStrategy.options.optional'),
  },
  {
    value: 'required',
    label: tp('definition.followupQuestionsStrategy.options.required'),
  },
];

export const createEmptySkillDefinition = (): SkillDefinitionFields => {
  return {
    goal: '',
    triggerScenarios: [''],
    requiredContext: [''],
    workflow: [''],
    outputContract: [''],
    guardrails: [''],
    artifacts: [''],
    projectBindingNotes: [''],
    followupQuestionsStrategy: 'optional',
  };
};

const DEFAULT_CATEGORY: SkillEditorDraft['category'] = 'engineering_execution';

const ensureEditableList = (items: string[] | undefined): string[] => {
  const normalizedItems = normalizeList(items ?? []);
  return normalizedItems.length > 0 ? normalizedItems : [''];
};

const buildRequiredFieldMessage = (label: string): string => {
  return tp('editor.validation.required', { field: label });
};

export const cloneSkillDefinition = (
  definition: SkillDefinitionFields,
): SkillDefinitionFields => {
  return {
    goal: definition.goal,
    triggerScenarios: [...definition.triggerScenarios],
    requiredContext: [...definition.requiredContext],
    workflow: [...definition.workflow],
    outputContract: [...definition.outputContract],
    guardrails: [...definition.guardrails],
    artifacts: [...definition.artifacts],
    projectBindingNotes: [...definition.projectBindingNotes],
    followupQuestionsStrategy: definition.followupQuestionsStrategy,
  };
};

export const normalizeSkillDefinition = (
  definition: SkillDefinitionFields,
): SkillDefinitionFields => {
  return {
    goal: normalizeLine(definition.goal),
    triggerScenarios: normalizeList(definition.triggerScenarios),
    requiredContext: normalizeList(definition.requiredContext),
    workflow: normalizeList(definition.workflow),
    outputContract: normalizeList(definition.outputContract),
    guardrails: normalizeList(definition.guardrails),
    artifacts: normalizeList(definition.artifacts),
    projectBindingNotes: normalizeList(definition.projectBindingNotes),
    followupQuestionsStrategy: definition.followupQuestionsStrategy,
  };
};

export const createEmptySkillEditorDraft = (): SkillEditorDraft => {
  return {
    name: '',
    description: '',
    category: DEFAULT_CATEGORY,
    owner: '',
    status: 'draft',
    definition: createEmptySkillDefinition(),
  };
};

export const createSkillEditorDraftFromDetail = ({
  name,
  description,
  category,
  owner,
  status,
  definition,
}: Partial<SkillEditorDraft>): SkillEditorDraft => {
  const baseDefinition = definition ?? createEmptySkillDefinition();

  return {
    name: name ?? '',
    description: description ?? '',
    category: category ?? DEFAULT_CATEGORY,
    owner: owner ?? '',
    status: status ?? 'draft',
    definition: {
      goal: baseDefinition.goal ?? '',
      triggerScenarios: ensureEditableList(baseDefinition.triggerScenarios),
      requiredContext: ensureEditableList(baseDefinition.requiredContext),
      workflow: ensureEditableList(baseDefinition.workflow),
      outputContract: ensureEditableList(baseDefinition.outputContract),
      guardrails: ensureEditableList(baseDefinition.guardrails),
      artifacts: ensureEditableList(baseDefinition.artifacts),
      projectBindingNotes: ensureEditableList(baseDefinition.projectBindingNotes),
      followupQuestionsStrategy:
        baseDefinition.followupQuestionsStrategy ?? 'optional',
    },
  };
};

export const validateSkillEditorDraft = (
  draft: SkillEditorDraft,
): SkillEditorValidation => {
  const errors: string[] = [];
  const goalSection = getSkillDefinitionGoalSection();
  const listSections = getSkillDefinitionListSections();

  if (!normalizeLine(draft.name)) {
    errors.push(buildRequiredFieldMessage(tp('editor.fields.name')));
  }

  if (!normalizeLine(draft.description)) {
    errors.push(buildRequiredFieldMessage(tp('editor.fields.description')));
  }

  if (!normalizeLine(draft.owner)) {
    errors.push(buildRequiredFieldMessage(tp('editor.fields.owner')));
  }

  if (!normalizeLine(draft.definition.goal)) {
    errors.push(buildRequiredFieldMessage(goalSection.label));
  }

  for (const section of listSections) {
    if (normalizeList(draft.definition[section.key]).length === 0) {
      errors.push(buildRequiredFieldMessage(section.label));
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
};

export const buildSkillMarkdownPreview = ({
  name,
  description,
  definition,
}: {
  name: string;
  description: string;
  definition: SkillDefinitionFields;
}): string => {
  const goalSection = getSkillDefinitionGoalSection();
  const listSections = getSkillDefinitionListSections();

  const sections = [
    renderScalarSection(goalSection.heading, normalizeLine(definition.goal)),
    ...listSections.map((section) => {
      return renderListSection(
        section.heading,
        normalizeList(definition[section.key]),
      );
    }),
    renderScalarSection(
      'Follow-up Questions Strategy',
      definition.followupQuestionsStrategy,
    ),
  ];

  return [
    '---',
    `name: ${normalizeLine(name)}`,
    `description: ${normalizeLine(description)}`,
    '---',
    '',
    ...sections.flatMap((section, index) => (index === 0 ? [section] : ['', section])),
    '',
  ].join('\n');
};
