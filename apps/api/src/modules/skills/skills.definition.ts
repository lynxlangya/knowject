import { getFallbackMessage } from '@lib/locale.messages.js';
import {
  createValidationAppError,
  readOptionalStringField,
} from '@lib/validation.js';

export const SKILL_CATEGORIES = [
  'documentation_architecture',
  'engineering_execution',
  'governance_capture',
] as const;
export type SkillCategory = (typeof SKILL_CATEGORIES)[number];

export const SKILL_STATUSES = [
  'draft',
  'active',
  'deprecated',
  'archived',
] as const;
export type SkillStatus = (typeof SKILL_STATUSES)[number];

export const SKILL_FOLLOWUP_STRATEGIES = [
  'none',
  'optional',
  'required',
] as const;
export type SkillFollowupStrategy =
  (typeof SKILL_FOLLOWUP_STRATEGIES)[number];

export interface SkillDefinitionFields {
  goal: string;
  triggerScenarios: string[];
  requiredContext: string[];
  workflow: string[];
  outputContract: string[];
  guardrails: string[];
  artifacts: string[];
  projectBindingNotes: string[];
  followupQuestionsStrategy: SkillFollowupStrategy;
}

type DefinitionArrayField =
  | 'triggerScenarios'
  | 'requiredContext'
  | 'workflow'
  | 'outputContract'
  | 'guardrails'
  | 'artifacts'
  | 'projectBindingNotes';

const stringifyList = (items: string[]): string => {
  return items.map((item) => `- ${item}`).join('\n');
};

const renderDefinitionSection = (heading: string, content: string): string => {
  return `## ${heading}\n\n${content}`;
};

const renderDefinitionListSection = (
  heading: string,
  items: string[],
): string => {
  return renderDefinitionSection(heading, stringifyList(items));
};

export const buildSkillMarkdownFromDefinition = ({
  name,
  description,
  definition,
}: {
  name: string;
  description: string;
  definition: SkillDefinitionFields;
}): string => {
  const normalizedName = name.trim();
  const normalizedDescription = description.trim();

  return [
    '---',
    `name: ${normalizedName}`,
    `description: ${normalizedDescription}`,
    '---',
    '',
    renderDefinitionSection('Goal', definition.goal),
    '',
    renderDefinitionListSection(
      'Trigger Scenarios',
      definition.triggerScenarios,
    ),
    '',
    renderDefinitionListSection('Required Context', definition.requiredContext),
    '',
    renderDefinitionListSection('Workflow', definition.workflow),
    '',
    renderDefinitionListSection('Output Contract', definition.outputContract),
    '',
    renderDefinitionListSection('Guardrails', definition.guardrails),
    '',
    renderDefinitionListSection('Artifacts', definition.artifacts),
    '',
    renderDefinitionListSection(
      'Project Binding Notes',
      definition.projectBindingNotes,
    ),
    '',
    renderDefinitionSection(
      'Follow-up Questions Strategy',
      definition.followupQuestionsStrategy,
    ),
    '',
  ].join('\n');
};

export const buildLegacySkillDefinition = ({
  name,
  description,
  skillMarkdown,
  owner,
}: {
  name: string;
  description: string;
  skillMarkdown: string;
  owner?: string;
}): SkillDefinitionFields => {
  const normalizedName = name.trim();
  const normalizedDescription = description.trim();
  const normalizedOwner = owner?.trim();
  const hasMarkdownBody = skillMarkdown
    .replace(/^---[\s\S]*?---/u, '')
    .trim().length > 0;

  return {
    goal: normalizedDescription || `Follow the existing intent of ${normalizedName}.`,
    triggerScenarios: [
      `Use this method asset when ${normalizedName} is selected as the preferred workflow.`,
    ],
    requiredContext: normalizedOwner
      ? ['Legacy SKILL.md body', `Coordinate with ${normalizedOwner} when context is missing`]
      : ['Legacy SKILL.md body'],
    workflow: [
      hasMarkdownBody
        ? 'Review the legacy markdown body'
        : 'Review the legacy skill notes',
    ],
    outputContract: ['Follow the legacy skill contract'],
    guardrails: ['Preserve the intent captured by the legacy skill body'],
    artifacts: ['Legacy markdown note'],
    projectBindingNotes: normalizedOwner
      ? [`Current owner: ${normalizedOwner}`]
      : ['No explicit project binding notes were stored in the legacy record'],
    followupQuestionsStrategy: 'optional',
  };
};

const createDefinitionValidationError = (
  messageKey: Parameters<typeof getFallbackMessage>[0],
  field: string,
): never => {
  const message =
    messageKey === 'validation.required.field'
      ? getFallbackMessage(messageKey, { field })
      : getFallbackMessage(messageKey);
  throw createValidationAppError(
    message,
    {
      [field]: message,
    },
    messageKey,
    messageKey === 'validation.required.field' ? { field } : undefined,
  );
};

const readRequiredGoal = (input: Record<string, unknown>): string => {
  const goal = readOptionalStringField(input.goal, 'goal');

  if (!goal) {
    return createDefinitionValidationError('validation.required.field', 'goal');
  }

  return goal;
};

const readRequiredStringArrayField = (
  input: Record<string, unknown>,
  field: DefinitionArrayField,
): string[] => {
  const value = input[field];

  if (!Array.isArray(value) || value.length === 0) {
    createDefinitionValidationError('validation.stringArray', field);
  }

  const normalizedItems = (value as unknown[]).map((item: unknown) => {
    const normalizedItem = readOptionalStringField(item, field);
    return normalizedItem;
  });

  if (normalizedItems.some((item: string | undefined) => !item)) {
    createDefinitionValidationError('validation.stringArray', field);
  }

  return normalizedItems as string[];
};

const readFollowupQuestionsStrategy = (
  input: Record<string, unknown>,
): SkillFollowupStrategy => {
  const strategy = readOptionalStringField(
    input.followupQuestionsStrategy,
    'followupQuestionsStrategy',
  );

  if (
    strategy &&
    (SKILL_FOLLOWUP_STRATEGIES as readonly string[]).includes(strategy)
  ) {
    return strategy as SkillFollowupStrategy;
  }

  return createDefinitionValidationError(
    'validation.skills.followupQuestionsStrategy.invalid',
    'followupQuestionsStrategy',
  );
};

export const validateSkillDefinitionInput = (
  input: unknown,
): SkillDefinitionFields => {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    createDefinitionValidationError(
      'validation.object',
      'definition',
    );
  }

  const normalizedInput = input as Record<string, unknown>;

  return {
    goal: readRequiredGoal(normalizedInput),
    triggerScenarios: readRequiredStringArrayField(
      normalizedInput,
      'triggerScenarios',
    ),
    requiredContext: readRequiredStringArrayField(
      normalizedInput,
      'requiredContext',
    ),
    workflow: readRequiredStringArrayField(normalizedInput, 'workflow'),
    outputContract: readRequiredStringArrayField(
      normalizedInput,
      'outputContract',
    ),
    guardrails: readRequiredStringArrayField(normalizedInput, 'guardrails'),
    artifacts: readRequiredStringArrayField(normalizedInput, 'artifacts'),
    projectBindingNotes: readRequiredStringArrayField(
      normalizedInput,
      'projectBindingNotes',
    ),
    followupQuestionsStrategy: readFollowupQuestionsStrategy(normalizedInput),
  };
};
