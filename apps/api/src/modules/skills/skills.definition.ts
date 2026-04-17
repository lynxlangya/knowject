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

type DraftSectionField =
  | 'goal'
  | 'triggerScenarios'
  | 'requiredContext'
  | 'workflow'
  | 'outputContract'
  | 'guardrails'
  | 'artifacts'
  | 'projectBindingNotes';

export interface ParsedSkillCreationDraft {
  name: string;
  description: string;
  definition: SkillDefinitionFields;
}

const CREATION_DRAFT_SECTION_ALIASES: Record<string, DraftSectionField> = {
  '作用': 'goal',
  goal: 'goal',
  '触发场景': 'triggerScenarios',
  'trigger scenarios': 'triggerScenarios',
  '所需上下文': 'requiredContext',
  'required context': 'requiredContext',
  '工作流': 'workflow',
  workflow: 'workflow',
  '输出': 'outputContract',
  'output contract': 'outputContract',
  '注意事项': 'guardrails',
  guardrails: 'guardrails',
  '产物': 'artifacts',
  artifacts: 'artifacts',
  '项目注记': 'projectBindingNotes',
  'project binding notes': 'projectBindingNotes',
};

const stringifyFrontmatterString = (value: string): string => {
  return /[:#]/.test(value) || value.trim() !== value
    ? JSON.stringify(value)
    : value;
};

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

export const buildSkillCreationMarkdownDraft = ({
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
  const orderedWorkflow = definition.workflow
    .map((item, index) => `${index + 1}. ${item}`)
    .join('\n');

  return [
    '---',
    `name: ${stringifyFrontmatterString(normalizedName)}`,
    `description: ${stringifyFrontmatterString(normalizedDescription)}`,
    '---',
    '',
    '# 作用',
    '',
    definition.goal.trim(),
    '',
    '# 触发场景',
    '',
    stringifyList(definition.triggerScenarios),
    '',
    '# 所需上下文',
    '',
    stringifyList(definition.requiredContext),
    '',
    '# 工作流',
    '',
    orderedWorkflow,
    '',
    '# 输出',
    '',
    stringifyList(definition.outputContract),
    '',
    '# 注意事项',
    '',
    stringifyList(definition.guardrails),
    '',
    ...(definition.artifacts.length > 0
      ? ['# 产物', '', stringifyList(definition.artifacts), '']
      : []),
    ...(definition.projectBindingNotes.length > 0
      ? [
          '# 项目注记',
          '',
          stringifyList(definition.projectBindingNotes),
          '',
        ]
      : []),
  ]
    .join('\n')
    .trimEnd()
    .concat('\n');
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

const normalizeCreationDraftMarkdown = (markdownDraft: string): string => {
  return markdownDraft.replace(/^\uFEFF/u, '').replace(/\r\n/g, '\n');
};

const parseFrontmatterValue = (value: string): string => {
  const trimmedValue = value.trim();

  if (
    (trimmedValue.startsWith('"') && trimmedValue.endsWith('"')) ||
    (trimmedValue.startsWith("'") && trimmedValue.endsWith("'"))
  ) {
    if (trimmedValue.startsWith("'") && trimmedValue.endsWith("'")) {
      return trimmedValue.slice(1, -1).trim();
    }

    try {
      return JSON.parse(trimmedValue).trim();
    } catch {
      return trimmedValue.slice(1, -1).trim();
    }
  }

  return trimmedValue;
};

const createCreationDraftValidationError = (
  field: string,
  messageKey: Parameters<typeof getFallbackMessage>[0],
  messageParams?: Record<string, string>,
): never => {
  const message =
    messageParams === undefined
      ? getFallbackMessage(messageKey)
      : getFallbackMessage(messageKey, messageParams);

  throw createValidationAppError(
    message,
    {
      [field]: message,
    },
    messageKey,
    messageParams,
  );
};

const readCreationDraftRequiredList = (
  sections: Partial<Record<DraftSectionField, string>>,
  field: DraftSectionField,
  heading: string,
): string[] => {
  const rawBody = sections[field]?.trim() ?? '';

  if (!rawBody) {
    return createCreationDraftValidationError(
      `markdownDraft.${heading}`,
      'validation.required.field',
      {
        field: `markdownDraft.${heading}`,
      },
    );
  }

  const items = rawBody
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.replace(/^[-*]\s+/u, '').replace(/^\d+\.\s+/u, '').trim())
    .filter(Boolean);

  if (items.length === 0) {
    return createCreationDraftValidationError(
      `markdownDraft.${heading}`,
      'validation.stringArray',
    );
  }

  return items;
};

const inferDraftFollowupStrategy = (guardrails: string[]): SkillFollowupStrategy => {
  return guardrails.some((item) =>
    /信息不足时必须追问|缺上下文时先提问|信息不足先提问|缺少上下文先提问/u.test(
      item,
    ),
  )
    ? 'required'
    : 'optional';
};

export const parseSkillCreationMarkdownDraft = (
  markdownDraft: string,
): ParsedSkillCreationDraft => {
  const normalizedMarkdown = normalizeCreationDraftMarkdown(markdownDraft).trim();
  const lines = normalizedMarkdown.split('\n');

  if (lines[0]?.trim() !== '---') {
    return createCreationDraftValidationError(
      'markdownDraft.frontmatter',
      'validation.required.field',
      {
        field: 'markdownDraft.frontmatter',
      },
    );
  }

  const closingIndex = lines.findIndex(
    (line, index) => index > 0 && line.trim() === '---',
  );

  if (closingIndex <= 0) {
    return createCreationDraftValidationError(
      'markdownDraft.frontmatter',
      'validation.required.field',
      {
        field: 'markdownDraft.frontmatter',
      },
    );
  }

  const frontmatter = new Map<string, string>();
  for (const line of lines.slice(1, closingIndex)) {
    const separatorIndex = line.indexOf(':');
    if (separatorIndex <= 0) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    const value = line.slice(separatorIndex + 1);
    if (key) {
      frontmatter.set(key, parseFrontmatterValue(value));
    }
  }

  const name = frontmatter.get('name')?.trim() ?? '';
  const description = frontmatter.get('description')?.trim() ?? '';

  if (!name) {
    return createCreationDraftValidationError(
      'name',
      'validation.required.field',
      { field: 'name' },
    );
  }

  if (!description) {
    return createCreationDraftValidationError(
      'description',
      'validation.required.field',
      { field: 'description' },
    );
  }

  const sections = new Map<DraftSectionField, string[]>();
  let currentField: DraftSectionField | null = null;

  for (const line of lines.slice(closingIndex + 1)) {
    const headingMatch = line.match(/^#{1,2}\s+(.+?)\s*$/u);
    if (headingMatch?.[1]) {
      const alias = headingMatch[1].trim().toLowerCase();
      currentField = CREATION_DRAFT_SECTION_ALIASES[alias] ?? null;
      if (currentField && !sections.has(currentField)) {
        sections.set(currentField, []);
      }
      continue;
    }

    if (!currentField) {
      continue;
    }

    sections.get(currentField)?.push(line);
  }

  const sectionBodies = Object.fromEntries(
    [...sections.entries()].map(([field, linesForField]) => [
      field,
      linesForField.join('\n').trim(),
    ]),
  ) as Partial<Record<DraftSectionField, string>>;

  const goal = sectionBodies.goal?.trim();
  if (!goal) {
    return createCreationDraftValidationError(
      'markdownDraft.作用',
      'validation.required.field',
      { field: 'markdownDraft.作用' },
    );
  }

  const triggerScenarios = readCreationDraftRequiredList(
    sectionBodies,
    'triggerScenarios',
    '触发场景',
  );
  const requiredContext = readCreationDraftRequiredList(
    sectionBodies,
    'requiredContext',
    '所需上下文',
  );
  const workflow = readCreationDraftRequiredList(
    sectionBodies,
    'workflow',
    '工作流',
  );
  const outputContract = readCreationDraftRequiredList(
    sectionBodies,
    'outputContract',
    '输出',
  );
  const guardrails = readCreationDraftRequiredList(
    sectionBodies,
    'guardrails',
    '注意事项',
  );
  const artifacts =
    sectionBodies.artifacts?.trim()
      ? readCreationDraftRequiredList(sectionBodies, 'artifacts', '产物')
      : [];
  const projectBindingNotes =
    sectionBodies.projectBindingNotes?.trim()
      ? readCreationDraftRequiredList(
          sectionBodies,
          'projectBindingNotes',
          '项目注记',
        )
      : [];

  return {
    name,
    description,
    definition: validateSkillDefinitionInput({
      goal,
      triggerScenarios,
      requiredContext,
      workflow,
      outputContract,
      guardrails,
      artifacts,
      projectBindingNotes,
      followupQuestionsStrategy: inferDraftFollowupStrategy(guardrails),
    }),
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
  options: {
    allowEmpty?: boolean;
  } = {},
): string[] => {
  const value = input[field];

  if (!Array.isArray(value)) {
    createDefinitionValidationError('validation.stringArray', field);
  }

  const normalizedValue = value as unknown[];

  if (normalizedValue.length === 0) {
    if (options.allowEmpty) {
      return [];
    }

    createDefinitionValidationError('validation.stringArray', field);
  }

  const normalizedItems = normalizedValue.map((item: unknown) => {
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
    artifacts: readRequiredStringArrayField(normalizedInput, 'artifacts', {
      allowEmpty: true,
    }),
    projectBindingNotes: readRequiredStringArrayField(
      normalizedInput,
      'projectBindingNotes',
      {
        allowEmpty: true,
      },
    ),
    followupQuestionsStrategy: readFollowupQuestionsStrategy(normalizedInput),
  };
};
