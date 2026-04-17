import { getFallbackMessage } from "@lib/locale.messages.js";
import { readMutationInput } from "@lib/mutation-input.js";
import {
  createValidationAppError,
  readOptionalStringField,
} from "@lib/validation.js";
import type { SkillAuthoringInference } from "../skills.authoring.js";
import {
  SKILL_CREATION_TEMPLATE_HINTS,
  type SkillCreationDraftGenerateInput,
  type SkillCreationDraftRefineInput,
  type SkillCreationDraftSaveInput,
  type SkillCreationTemplateHint,
} from "../skills.creation.js";
import { SKILL_CATEGORIES, type SkillCategory } from "../skills.definition.js";
import type {
  NormalizedSkillCreationDraftGenerateInput,
  NormalizedSkillCreationDraftRefineInput,
} from "../services/skills-creation-draft.service.js";
import { CONTROLLED_SCOPE_TARGETS } from "./skills-authoring.validator.js";

export interface NormalizedSkillCreationDraftSaveInput {
  markdownDraft: string;
  currentInference: SkillAuthoringInference | null;
}

const isSkillCategory = (value: string): value is SkillCategory => {
  return (SKILL_CATEGORIES as readonly string[]).includes(value);
};

const createFieldValidationError = ({
  field,
  messageKey,
}: {
  field: string;
  messageKey:
    | "validation.required.field"
    | "validation.string.field"
    | "validation.skills.category.invalid"
    | "validation.skills.authoring.scopeTarget.invalid";
}): never => {
  const message =
    messageKey === "validation.required.field" ||
    messageKey === "validation.string.field"
      ? getFallbackMessage(messageKey, { field })
      : `${field}: ${getFallbackMessage(messageKey)}`;

  throw createValidationAppError(
    message,
    {
      [field]: message,
    },
    messageKey,
    messageKey === "validation.required.field" ||
      messageKey === "validation.string.field"
      ? { field }
      : undefined,
  );
};

const readRequiredString = (value: unknown, field: string): string => {
  const normalizedValue = readOptionalStringField(value, field);

  if (!normalizedValue) {
    return createFieldValidationError({
      field,
      messageKey: "validation.required.field",
    });
  }

  return normalizedValue;
};

const readOptionalTemplateHint = (
  value: unknown,
): SkillCreationTemplateHint | null => {
  const normalizedValue = readOptionalStringField(value, "templateHint");

  if (normalizedValue === undefined) {
    return null;
  }

  if (
    !(SKILL_CREATION_TEMPLATE_HINTS as readonly string[]).includes(
      normalizedValue,
    )
  ) {
    return createFieldValidationError({
      field: "templateHint",
      messageKey: "validation.string.field",
    });
  }

  return normalizedValue as SkillCreationTemplateHint;
};

const validateScopeTarget = ({
  target,
  field,
}: {
  target: string;
  field: string;
}): string => {
  if (
    target.startsWith("/") ||
    target.startsWith("./") ||
    target.includes("://") ||
    target.includes("\\") ||
    target.split("/").some((segment) => segment === "..") ||
    !/^[A-Za-z0-9._/-]+$/u.test(target) ||
    !target.includes("/") ||
    !CONTROLLED_SCOPE_TARGETS.has(target)
  ) {
    return createFieldValidationError({
      field,
      messageKey: "validation.skills.authoring.scopeTarget.invalid",
    });
  }

  return target;
};

const readOptionalInference = (
  value: unknown,
  field: string,
): SkillAuthoringInference | null => {
  if (value === undefined || value === null) {
    return null;
  }

  if (typeof value !== "object" || Array.isArray(value)) {
    return createFieldValidationError({
      field,
      messageKey: "validation.required.field",
    });
  }

  const normalizedValue = readMutationInput(value as Record<string, unknown>);
  const category = readOptionalStringField(
    normalizedValue.category,
    `${field}.category`,
  );
  const contextTargetsValue = normalizedValue.contextTargets;

  if (category && !isSkillCategory(category)) {
    return createFieldValidationError({
      field: `${field}.category`,
      messageKey: "validation.skills.category.invalid",
    });
  }

  if (
    contextTargetsValue !== undefined &&
    !Array.isArray(contextTargetsValue)
  ) {
    return createFieldValidationError({
      field: `${field}.contextTargets`,
      messageKey: "validation.required.field",
    });
  }

  const contextTargets = Array.isArray(contextTargetsValue)
    ? contextTargetsValue.map((item) =>
        validateScopeTarget({
          target: readRequiredString(item, `${field}.contextTargets`),
          field: `${field}.contextTargets`,
        }),
      )
    : [];

  return {
    category: (category ?? null) as SkillCategory | null,
    contextTargets,
    ...(readOptionalStringField(
      normalizedValue.rationale,
      `${field}.rationale`,
    )
      ? {
          rationale:
            readOptionalStringField(
              normalizedValue.rationale,
              `${field}.rationale`,
            ) ?? undefined,
        }
      : {}),
  };
};

export const validateSkillCreationDraftGenerateInput = (
  input: SkillCreationDraftGenerateInput,
): NormalizedSkillCreationDraftGenerateInput => {
  const normalizedInput = readMutationInput(input);

  return {
    name: readRequiredString(normalizedInput.name, "name"),
    description: readRequiredString(normalizedInput.description, "description"),
    taskIntent: readRequiredString(normalizedInput.taskIntent, "taskIntent"),
    templateHint: readOptionalTemplateHint(normalizedInput.templateHint),
  };
};

export const validateSkillCreationDraftRefineInput = (
  input: SkillCreationDraftRefineInput,
): NormalizedSkillCreationDraftRefineInput => {
  const normalizedInput = readMutationInput(input);

  return {
    name: readRequiredString(normalizedInput.name, "name"),
    description: readRequiredString(normalizedInput.description, "description"),
    markdownDraft: readRequiredString(normalizedInput.markdownDraft, "markdownDraft"),
    optimizationInstruction:
      readOptionalStringField(
        normalizedInput.optimizationInstruction,
        "optimizationInstruction",
      ) ?? "",
    currentInference: readOptionalInference(
      normalizedInput.currentInference,
      "currentInference",
    ),
  };
};

export const validateSkillCreationDraftSaveInput = (
  input: SkillCreationDraftSaveInput,
): NormalizedSkillCreationDraftSaveInput => {
  const normalizedInput = readMutationInput(input);

  return {
    markdownDraft: readRequiredString(normalizedInput.markdownDraft, "markdownDraft"),
    currentInference: readOptionalInference(
      normalizedInput.currentInference,
      "currentInference",
    ),
  };
};
