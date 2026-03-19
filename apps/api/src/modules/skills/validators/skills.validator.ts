import { AppError } from "@lib/app-error.js";
import { readMutationInput } from "@lib/mutation-input.js";
import {
  createRequiredFieldError,
  createValidationAppError,
  readOptionalStringField,
} from "@lib/validation.js";
import {
  mergeSkillMarkdownMetadata,
  parseSkillMarkdown,
  type ParsedSkillMarkdown,
} from "../skills.markdown.js";
import type {
  CreateSkillInput,
  SkillLifecycleStatus,
  UpdateSkillInput,
} from "../skills.types.js";

export const readRequiredSkillId = (skillId: string): string => {
  return skillId.trim();
};

const readOptionalLifecycleStatus = (
  value: unknown,
): SkillLifecycleStatus | undefined => {
  if (value === undefined) {
    return undefined;
  }

  if (value === "draft" || value === "published") {
    return value;
  }

  throw createValidationAppError("lifecycleStatus 不合法", {
    lifecycleStatus: "lifecycleStatus 只能为 draft 或 published",
  });
};

const readOptionalSkillMarkdown = (value: unknown): string | undefined => {
  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== "string") {
    throw createValidationAppError("skillMarkdown 必须为字符串", {
      skillMarkdown: "skillMarkdown 必须为字符串",
    });
  }

  return value;
};

const prepareSkillMarkdown = ({
  baseMarkdown,
  nextMarkdown,
  name,
  description,
}: {
  baseMarkdown?: string;
  nextMarkdown?: string;
  name?: string;
  description?: string;
}): ParsedSkillMarkdown => {
  const sourceMarkdown = nextMarkdown ?? baseMarkdown;

  if (!sourceMarkdown) {
    throw new AppError(createRequiredFieldError("skillMarkdown"));
  }

  if (name === undefined && description === undefined) {
    return parseSkillMarkdown(sourceMarkdown);
  }

  return mergeSkillMarkdownMetadata(sourceMarkdown, {
    ...(name !== undefined ? { name } : {}),
    ...(description !== undefined ? { description } : {}),
  });
};

export const validateCreateSkillInput = (
  input: CreateSkillInput,
): ParsedSkillMarkdown => {
  const normalizedInput = readMutationInput(input);
  const skillMarkdown = readOptionalSkillMarkdown(
    normalizedInput.skillMarkdown,
  );
  const name = readOptionalStringField(normalizedInput.name, "name");
  const description = readOptionalStringField(
    normalizedInput.description,
    "description",
  );

  return prepareSkillMarkdown({
    nextMarkdown: skillMarkdown,
    name,
    description,
  });
};

export const validateUpdateSkillInput = (
  input: UpdateSkillInput,
  currentSkillMarkdown: string,
): {
  lifecycleStatus?: SkillLifecycleStatus;
  parsedSkill: ParsedSkillMarkdown;
} => {
  const normalizedInput = readMutationInput(input);
  const skillMarkdown = readOptionalSkillMarkdown(
    normalizedInput.skillMarkdown,
  );
  const name = readOptionalStringField(normalizedInput.name, "name");
  const description = readOptionalStringField(
    normalizedInput.description,
    "description",
  );
  const lifecycleStatus = readOptionalLifecycleStatus(
    normalizedInput.lifecycleStatus,
  );

  if (
    skillMarkdown === undefined &&
    name === undefined &&
    description === undefined &&
    lifecycleStatus === undefined
  ) {
    throw createValidationAppError("至少需要提供一个可更新字段", {
      skillMarkdown: "至少需要提供一个可更新字段",
      name: "至少需要提供一个可更新字段",
      description: "至少需要提供一个可更新字段",
      lifecycleStatus: "至少需要提供一个可更新字段",
    });
  }

  const parsedSkill = prepareSkillMarkdown({
    baseMarkdown: currentSkillMarkdown,
    nextMarkdown: skillMarkdown,
    name,
    description,
  });

  return {
    lifecycleStatus,
    parsedSkill,
  };
};
