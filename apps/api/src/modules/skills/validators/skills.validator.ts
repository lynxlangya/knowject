import { getFallbackMessage } from "@lib/locale.messages.js";
import { readMutationInput } from "@lib/mutation-input.js";
import {
  createValidationAppError,
  readOptionalStringField,
} from "@lib/validation.js";
import {
  buildSkillMarkdownFromDefinition,
  SKILL_CATEGORIES,
  SKILL_STATUSES,
  validateSkillDefinitionInput,
  type SkillCategory,
  type SkillStatus,
} from "../skills.definition.js";
import type {
  CreateSkillInput,
  UpdateSkillInput,
} from "../skills.types.js";
import type {
  CurrentSkillUpdateState,
  NormalizedSkillMutationInput,
  NormalizedSkillUpdateInput,
} from "../types/skills.service.types.js";

export const readRequiredSkillId = (skillId: string): string => {
  return skillId.trim();
};

const createRequiredFieldError = (field: string): never => {
  const message = getFallbackMessage("validation.required.field", { field });

  throw createValidationAppError(
    message,
    {
      [field]: message,
    },
    "validation.required.field",
    {
      field,
    },
  );
};

const readRequiredString = (value: unknown, field: string): string => {
  const normalizedValue = readOptionalStringField(value, field);

  if (!normalizedValue) {
    return createRequiredFieldError(field);
  }

  return normalizedValue;
};

const readOptionalNonEmptyString = (
  value: unknown,
  field: string,
): string | undefined => {
  const normalizedValue = readOptionalStringField(value, field);

  if (normalizedValue === undefined) {
    return undefined;
  }

  if (!normalizedValue) {
    return createRequiredFieldError(field);
  }

  return normalizedValue;
};

const createInvalidCategoryError = (): never => {
  const message = getFallbackMessage("validation.skills.category.invalid");

  throw createValidationAppError(
    message,
    {
      category: message,
    },
    "validation.skills.category.invalid",
  );
};

const createInvalidStatusError = (): never => {
  const message = getFallbackMessage("validation.skills.status.invalid");

  throw createValidationAppError(
    message,
    {
      status: message,
    },
    "validation.skills.status.invalid",
  );
};

const isSkillCategory = (value: string): value is SkillCategory => {
  return (SKILL_CATEGORIES as readonly string[]).includes(value);
};

const isSkillStatus = (value: string): value is SkillStatus => {
  return (SKILL_STATUSES as readonly string[]).includes(value);
};

const readOptionalCategory = (value: unknown): SkillCategory | undefined => {
  const normalizedValue = readOptionalStringField(value, "category");

  if (normalizedValue === undefined) {
    return undefined;
  }

  if (!normalizedValue || !isSkillCategory(normalizedValue)) {
    return createInvalidCategoryError();
  }

  return normalizedValue;
};

const readOptionalStatus = (value: unknown): SkillStatus | undefined => {
  const normalizedValue = readOptionalStringField(value, "status");

  if (normalizedValue === undefined) {
    return undefined;
  }

  if (!normalizedValue || !isSkillStatus(normalizedValue)) {
    return createInvalidStatusError();
  }

  return normalizedValue;
};

const buildNormalizedSkillMutationInput = ({
  name,
  description,
  category,
  owner,
  definition,
  status,
}: Omit<NormalizedSkillMutationInput, "skillMarkdown">): NormalizedSkillMutationInput => {
  return {
    name,
    description,
    category,
    owner,
    definition,
    status,
    skillMarkdown: buildSkillMarkdownFromDefinition({
      name,
      description,
      definition,
    }),
  };
};

const FRONTMATTER_BOUNDARY = "---";

const stringifyFrontmatterString = (value: string): string => {
  return /[:#]/.test(value) || value.trim() !== value
    ? JSON.stringify(value)
    : value;
};

const mergeLegacySkillMarkdownMetadata = ({
  sourceMarkdown,
  name,
  description,
}: {
  sourceMarkdown: string;
  name: string;
  description: string;
}): string => {
  const normalizedSource = sourceMarkdown
    .replace(/^\uFEFF/u, "")
    .replace(/\r\n/g, "\n")
    .trimEnd();
  const lines = normalizedSource.split("\n");

  if (lines[0]?.trim() !== FRONTMATTER_BOUNDARY) {
    return [
      FRONTMATTER_BOUNDARY,
      `name: ${stringifyFrontmatterString(name)}`,
      `description: ${stringifyFrontmatterString(description)}`,
      FRONTMATTER_BOUNDARY,
      "",
      normalizedSource,
    ]
      .join("\n")
      .trimEnd()
      .concat("\n");
  }

  const closingIndex = lines.findIndex(
    (line, index) => index > 0 && line.trim() === FRONTMATTER_BOUNDARY,
  );

  if (closingIndex <= 0) {
    return normalizedSource.concat("\n");
  }

  const nextFrontmatter: string[] = [];
  let hasName = false;
  let hasDescription = false;

  for (const line of lines.slice(1, closingIndex)) {
    if (/^name:\s*/u.test(line)) {
      nextFrontmatter.push(`name: ${stringifyFrontmatterString(name)}`);
      hasName = true;
      continue;
    }

    if (/^description:\s*/u.test(line)) {
      nextFrontmatter.push(
        `description: ${stringifyFrontmatterString(description)}`,
      );
      hasDescription = true;
      continue;
    }

    nextFrontmatter.push(line);
  }

  if (!hasName) {
    nextFrontmatter.unshift(`name: ${stringifyFrontmatterString(name)}`);
  }

  if (!hasDescription) {
    nextFrontmatter.splice(
      hasName ? 1 : 0,
      0,
      `description: ${stringifyFrontmatterString(description)}`,
    );
  }

  return [
    FRONTMATTER_BOUNDARY,
    ...nextFrontmatter,
    FRONTMATTER_BOUNDARY,
    ...lines.slice(closingIndex + 1),
  ]
    .join("\n")
    .trimEnd()
    .concat("\n");
};

export const validateCreateSkillInput = (
  input: CreateSkillInput,
): NormalizedSkillMutationInput => {
  const normalizedInput = readMutationInput(input);
  const category = readOptionalCategory(normalizedInput.category);

  return buildNormalizedSkillMutationInput({
    name: readRequiredString(normalizedInput.name, "name"),
    description: readRequiredString(normalizedInput.description, "description"),
    category: category ?? createRequiredFieldError("category"),
    owner: readRequiredString(normalizedInput.owner, "owner"),
    definition: validateSkillDefinitionInput(normalizedInput.definition),
    status: "draft",
  });
};

export const validateUpdateSkillInput = (
  input: UpdateSkillInput,
  currentSkill: CurrentSkillUpdateState,
): NormalizedSkillUpdateInput => {
  const normalizedInput = readMutationInput(input);
  const nextName = readOptionalNonEmptyString(normalizedInput.name, "name");
  const nextDescription = readOptionalNonEmptyString(
    normalizedInput.description,
    "description",
  );
  const nextCategory = readOptionalCategory(normalizedInput.category);
  const nextOwner = readOptionalNonEmptyString(normalizedInput.owner, "owner");
  const nextStatus = readOptionalStatus(normalizedInput.status);
  const nextDefinition =
    normalizedInput.definition === undefined
      ? undefined
      : validateSkillDefinitionInput(normalizedInput.definition);

  if (
    nextName === undefined &&
    nextDescription === undefined &&
    nextCategory === undefined &&
    nextOwner === undefined &&
    nextDefinition === undefined &&
    nextStatus === undefined
  ) {
    const message = getFallbackMessage("validation.atLeastOneField");

    throw createValidationAppError(
      message,
      {
        name: message,
        description: message,
        category: message,
        owner: message,
        definition: message,
        status: message,
      },
      "validation.atLeastOneField",
    );
  }

  const name = nextName ?? currentSkill.name;
  const description = nextDescription ?? currentSkill.description;
  const category = nextCategory ?? currentSkill.category;
  const owner = nextOwner ?? currentSkill.owner;
  const definition = nextDefinition ?? currentSkill.definition;
  const status = nextStatus ?? currentSkill.status;
  const persistDefinition =
    currentSkill.hasStoredDefinition || nextDefinition !== undefined;

  return {
    normalizedSkill: {
      name,
      description,
      category,
      owner,
      definition,
      status,
      skillMarkdown: persistDefinition
        ? buildSkillMarkdownFromDefinition({
            name,
            description,
            definition,
          })
        : mergeLegacySkillMarkdownMetadata({
            sourceMarkdown: currentSkill.skillMarkdown,
            name,
            description,
          }),
    },
    persistCategory:
      currentSkill.hasStoredCategory || nextCategory !== undefined,
    persistOwner: currentSkill.hasStoredOwner || nextOwner !== undefined,
    persistDefinition,
  };
};
