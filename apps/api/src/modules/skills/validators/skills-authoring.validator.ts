import { getFallbackMessage } from '@lib/locale.messages.js';
import { readMutationInput } from '@lib/mutation-input.js';
import { createValidationAppError, readOptionalStringField } from '@lib/validation.js';
import type { SkillAuthoringMessage, SkillAuthoringStructuredDraft, SkillAuthoringTurnInput } from '../skills.authoring.js';
import { SKILL_CATEGORIES, validateSkillDefinitionInput, type SkillCategory } from '../skills.definition.js';
import type { NormalizedSkillAuthoringTurnInput } from '../services/skills-authoring.service.js';

const isSkillCategory = (value: string): value is SkillCategory => {
  return (SKILL_CATEGORIES as readonly string[]).includes(value);
};

const throwFieldValidationError = ({
  field,
  messageKey,
}: {
  field: string;
  messageKey: 'validation.required.field' | 'validation.string.field' | 'validation.integer' | 'validation.range' | 'validation.skills.category.invalid' | 'validation.skills.authoring.scopeTarget.invalid' | 'validation.skills.authoring.messageRole.invalid';
}): never => {
  const baseMessage =
    messageKey === 'validation.required.field'
      ? getFallbackMessage(messageKey, { field })
      : messageKey === 'validation.string.field'
        ? getFallbackMessage(messageKey, { field })
        : getFallbackMessage(messageKey);
  const message =
    messageKey === 'validation.required.field' || messageKey === 'validation.string.field'
      ? baseMessage
      : `${field}: ${baseMessage}`;

  throw createValidationAppError(
    message,
    {
      [field]: message,
    },
    messageKey,
    messageKey === 'validation.required.field' || messageKey === 'validation.string.field'
      ? { field }
      : undefined,
  );
};

const readRequiredString = (value: unknown, field: string): string => {
  const normalizedValue = readOptionalStringField(value, field);

  if (!normalizedValue) {
    return throwFieldValidationError({
      field,
      messageKey: 'validation.required.field',
    });
  }

  return normalizedValue;
};

const validateScopeTarget = (target: string): string => {
  if (
    target.startsWith('/') ||
    target.startsWith('./') ||
    target.includes('://') ||
    target.includes('\\') ||
    target.split('/').some((segment) => segment === '..') ||
    !/^[A-Za-z0-9._/-]+$/u.test(target) ||
    !target.includes('/')
  ) {
    return throwFieldValidationError({
      field: 'scope.targets',
      messageKey: 'validation.skills.authoring.scopeTarget.invalid',
    });
  }

  return target;
};

const readRequiredScopeTargets = (value: unknown): string[] => {
  if (!Array.isArray(value) || value.length === 0) {
    return throwFieldValidationError({
      field: 'scope.targets',
      messageKey: 'validation.required.field',
    });
  }

  return value.map((item) => validateScopeTarget(readRequiredString(item, 'scope.targets')));
};

const readRequiredScenario = (value: unknown): SkillCategory => {
  const normalizedScenario = readRequiredString(value, 'scope.scenario');

  if (!isSkillCategory(normalizedScenario)) {
    return throwFieldValidationError({
      field: 'scope.scenario',
      messageKey: 'validation.skills.category.invalid',
    });
  }

  return normalizedScenario;
};

const readRequiredAuthoringMessages = (value: unknown): SkillAuthoringMessage[] => {
  if (!Array.isArray(value)) {
    return throwFieldValidationError({
      field: 'messages',
      messageKey: 'validation.required.field',
    });
  }

  return value.map((message, index) => {
    if (!message || typeof message !== 'object' || Array.isArray(message)) {
      return throwFieldValidationError({
        field: `messages[${index}]`,
        messageKey: 'validation.required.field',
      });
    }

    const role = readRequiredString(
      (message as { role?: unknown }).role,
      `messages[${index}].role`,
    );

    if (role !== 'assistant' && role !== 'user') {
      return throwFieldValidationError({
        field: `messages[${index}].role`,
        messageKey: 'validation.skills.authoring.messageRole.invalid',
      });
    }

    return {
      role,
      content: readRequiredString(
        (message as { content?: unknown }).content,
        `messages[${index}].content`,
      ),
    };
  });
};

const readQuestionCount = (value: unknown): number => {
  if (typeof value !== 'number' || !Number.isInteger(value)) {
    return throwFieldValidationError({
      field: 'questionCount',
      messageKey: 'validation.integer',
    });
  }

  if (value < 0) {
    return throwFieldValidationError({
      field: 'questionCount',
      messageKey: 'validation.range',
    });
  }

  return value;
};

const readOptionalStructuredDraft = (
  value: unknown,
): SkillAuthoringStructuredDraft | null => {
  if (value === undefined || value === null) {
    return null;
  }

  if (typeof value !== 'object' || Array.isArray(value)) {
    return throwFieldValidationError({
      field: 'currentStructuredDraft',
      messageKey: 'validation.required.field',
    });
  }

  const normalizedValue = value as Record<string, unknown>;
  const category = readRequiredString(
    normalizedValue.category,
    'currentStructuredDraft.category',
  );

  if (!isSkillCategory(category)) {
    return throwFieldValidationError({
      field: 'currentStructuredDraft.category',
      messageKey: 'validation.skills.category.invalid',
    });
  }

  return {
    name: readRequiredString(normalizedValue.name, 'currentStructuredDraft.name'),
    description: readRequiredString(
      normalizedValue.description,
      'currentStructuredDraft.description',
    ),
    category,
    owner: readRequiredString(normalizedValue.owner, 'currentStructuredDraft.owner'),
    definition: validateSkillDefinitionInput(normalizedValue.definition),
  };
};

export const validateSkillAuthoringTurnInput = (
  input: SkillAuthoringTurnInput,
): NormalizedSkillAuthoringTurnInput => {
  const normalizedInput = readMutationInput(input);
  const normalizedScope = readMutationInput(
    normalizedInput.scope as Record<string, unknown> | undefined,
  );

  return {
    scope: {
      scenario: readRequiredScenario(normalizedScope.scenario),
      targets: readRequiredScopeTargets(normalizedScope.targets),
    },
    messages: readRequiredAuthoringMessages(normalizedInput.messages),
    questionCount: readQuestionCount(normalizedInput.questionCount),
    currentSummary:
      readOptionalStringField(normalizedInput.currentSummary, 'currentSummary') ?? '',
    currentStructuredDraft: readOptionalStructuredDraft(
      normalizedInput.currentStructuredDraft,
    ),
  };
};
