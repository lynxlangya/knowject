import { getFallbackMessage } from "@lib/locale.messages.js";
import { readMutationInput } from "@lib/mutation-input.js";
import {
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

  throw createValidationAppError(
    getFallbackMessage("validation.skills.lifecycleStatus.invalid"),
    {
      lifecycleStatus: getFallbackMessage(
        "validation.skills.lifecycleStatus.invalid",
      ),
    },
    "validation.skills.lifecycleStatus.invalid",
  );
};

const readOptionalSkillMarkdown = (value: unknown): string | undefined => {
  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== "string") {
    throw createValidationAppError(
      getFallbackMessage("validation.skillMarkdown.string"),
      {
        skillMarkdown: getFallbackMessage("validation.skillMarkdown.string"),
      },
      "validation.skillMarkdown.string",
    );
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
    throw createValidationAppError(
      getFallbackMessage("validation.required.skillMarkdown"),
      {
        skillMarkdown: getFallbackMessage("validation.required.skillMarkdown"),
      },
      "validation.required.skillMarkdown",
    );
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
    throw createValidationAppError(
      getFallbackMessage("validation.atLeastOneField"),
      {
        skillMarkdown: getFallbackMessage("validation.atLeastOneField"),
        name: getFallbackMessage("validation.atLeastOneField"),
        description: getFallbackMessage("validation.atLeastOneField"),
        lifecycleStatus: getFallbackMessage("validation.atLeastOneField"),
      },
      "validation.atLeastOneField",
    );
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
