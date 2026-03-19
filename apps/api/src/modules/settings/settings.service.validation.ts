import { AppError } from "@lib/app-error.js";
import { readMutationInput } from "@lib/mutation-input.js";
import {
  createValidationAppError,
  readOptionalStringField,
} from "@lib/validation.js";
import {
  SETTINGS_EMBEDDING_PROVIDERS,
  SETTINGS_INDEXING_SUPPORTED_TYPES,
  SETTINGS_LLM_PROVIDERS,
  type SettingsLlmProvider,
  type TestIndexingConnectionInput,
  type TestSettingsConnectionInput,
  type UpdateEmbeddingSettingsInput,
  type UpdateIndexingSettingsInput,
  type UpdateLlmSettingsInput,
  type UpdateWorkspaceSettingsInput,
} from "./settings.types.js";

const INDEXING_CHUNK_SIZE_MIN = 200;
const INDEXING_CHUNK_SIZE_MAX = 2000;
const INDEXING_CHUNK_OVERLAP_MIN = 0;
const INDEXING_CHUNK_OVERLAP_MAX = 500;
const WORKSPACE_DESCRIPTION_MAX_LENGTH = 200;

export const CHAT_COMPLETIONS_COMPATIBLE_LLM_PROVIDERS =
  new Set<SettingsLlmProvider>([
    "openai",
    "gemini",
    "aliyun",
    "deepseek",
    "moonshot",
    "zhipu",
    "custom",
  ]);

export const createUnsupportedLlmProviderError = (): AppError => {
  return new AppError({
    statusCode: 400,
    code: "SETTINGS_LLM_TEST_PROVIDER_UNSUPPORTED",
    message: "当前 provider 暂不支持在线测试",
  });
};

export const createMissingApiKeyError = (): AppError => {
  return new AppError({
    statusCode: 400,
    code: "SETTINGS_API_KEY_REQUIRED",
    message: "API Key 未配置，请先输入或保存后再测试",
  });
};

export const createApiKeyReentryRequiredError = (): AppError => {
  return new AppError({
    statusCode: 400,
    code: "SETTINGS_API_KEY_REENTRY_REQUIRED",
    message: "切换 Provider 或 Base URL 后，请重新输入新的 API Key",
  });
};

const readOptionalProvider = <TProvider extends string>(
  value: unknown,
  field: "provider",
  allowedValues: readonly TProvider[],
): TProvider | undefined => {
  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== "string") {
    throw createValidationAppError(`${field} 不合法`, {
      [field]: `${field} 不合法`,
    });
  }

  const normalizedValue = value.trim() as TProvider;

  if (!allowedValues.includes(normalizedValue)) {
    throw createValidationAppError(`${field} 不合法`, {
      [field]: `${field} 不合法`,
    });
  }

  return normalizedValue;
};

const readOptionalNonEmptyString = (
  value: unknown,
  field: "baseUrl" | "model" | "name",
): string | undefined => {
  const normalizedValue = readOptionalStringField(value, field);

  if (value !== undefined && !normalizedValue) {
    throw createValidationAppError(`${field} 不能为空`, {
      [field]: `${field} 不能为空`,
    });
  }

  return normalizedValue;
};

const readOptionalApiKey = (value: unknown): string | undefined => {
  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== "string") {
    throw createValidationAppError("apiKey 必须为字符串", {
      apiKey: "apiKey 必须为字符串",
    });
  }

  const trimmedValue = value.trim();
  return trimmedValue || undefined;
};

const readRequiredIntegerInRange = (
  value: unknown,
  field: "chunkSize" | "chunkOverlap" | "indexerTimeoutMs",
  range: {
    min: number;
    max?: number;
  },
): number | undefined => {
  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== "number" || !Number.isInteger(value)) {
    throw createValidationAppError(`${field} 必须为整数`, {
      [field]: `${field} 必须为整数`,
    });
  }

  if (value < range.min || (range.max !== undefined && value > range.max)) {
    throw createValidationAppError(`${field} 超出允许范围`, {
      [field]: `${field} 超出允许范围`,
    });
  }

  return value;
};

const readOptionalSupportedTypes = (value: unknown): string[] | undefined => {
  if (value === undefined) {
    return undefined;
  }

  if (!Array.isArray(value)) {
    throw createValidationAppError("supportedTypes 必须为字符串数组", {
      supportedTypes: "supportedTypes 必须为字符串数组",
    });
  }

  const normalizedValues = value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean);

  if (normalizedValues.length !== value.length) {
    throw createValidationAppError("supportedTypes 必须为字符串数组", {
      supportedTypes: "supportedTypes 必须为字符串数组",
    });
  }

  const deduplicatedValues = Array.from(new Set(normalizedValues));

  if (deduplicatedValues.length === 0) {
    throw createValidationAppError("supportedTypes 至少需要保留一种文件类型", {
      supportedTypes: "supportedTypes 至少需要保留一种文件类型",
    });
  }

  if (
    deduplicatedValues.some(
      (item) =>
        !SETTINGS_INDEXING_SUPPORTED_TYPES.includes(
          item as (typeof SETTINGS_INDEXING_SUPPORTED_TYPES)[number],
        ),
    )
  ) {
    throw createValidationAppError("supportedTypes 只支持 md、txt", {
      supportedTypes: "supportedTypes 只支持 md、txt",
    });
  }

  return deduplicatedValues;
};

const readOptionalWorkspaceDescription = (
  value: unknown,
): string | undefined => {
  const normalizedValue = readOptionalStringField(value, "description");

  if (
    normalizedValue !== undefined &&
    normalizedValue.length > WORKSPACE_DESCRIPTION_MAX_LENGTH
  ) {
    throw createValidationAppError("description 长度不能超过 200", {
      description: "description 长度不能超过 200",
    });
  }

  return normalizedValue;
};

export const normalizeEmbeddingUpdateInput = (
  input: UpdateEmbeddingSettingsInput,
) => {
  const normalizedInput = readMutationInput(input);

  return {
    provider: readOptionalProvider(
      normalizedInput.provider,
      "provider",
      SETTINGS_EMBEDDING_PROVIDERS,
    ),
    baseUrl: readOptionalNonEmptyString(normalizedInput.baseUrl, "baseUrl"),
    model: readOptionalNonEmptyString(normalizedInput.model, "model"),
    apiKey: readOptionalApiKey(normalizedInput.apiKey),
  };
};

export const normalizeLlmUpdateInput = (input: UpdateLlmSettingsInput) => {
  const normalizedInput = readMutationInput(input);

  return {
    provider: readOptionalProvider(
      normalizedInput.provider,
      "provider",
      SETTINGS_LLM_PROVIDERS,
    ),
    baseUrl: readOptionalNonEmptyString(normalizedInput.baseUrl, "baseUrl"),
    model: readOptionalNonEmptyString(normalizedInput.model, "model"),
    apiKey: readOptionalApiKey(normalizedInput.apiKey),
  };
};

export const normalizeIndexingUpdateInput = (
  input: UpdateIndexingSettingsInput,
) => {
  const normalizedInput = readMutationInput(input);
  const chunkSize = readRequiredIntegerInRange(
    normalizedInput.chunkSize,
    "chunkSize",
    {
      min: INDEXING_CHUNK_SIZE_MIN,
      max: INDEXING_CHUNK_SIZE_MAX,
    },
  );
  const chunkOverlap = readRequiredIntegerInRange(
    normalizedInput.chunkOverlap,
    "chunkOverlap",
    {
      min: INDEXING_CHUNK_OVERLAP_MIN,
      max: INDEXING_CHUNK_OVERLAP_MAX,
    },
  );

  if (
    chunkSize !== undefined &&
    chunkOverlap !== undefined &&
    chunkOverlap >= chunkSize
  ) {
    throw createValidationAppError("chunkOverlap 必须小于 chunkSize", {
      chunkOverlap: "chunkOverlap 必须小于 chunkSize",
    });
  }

  return {
    chunkSize,
    chunkOverlap,
    supportedTypes: readOptionalSupportedTypes(normalizedInput.supportedTypes),
    indexerTimeoutMs: readRequiredIntegerInRange(
      normalizedInput.indexerTimeoutMs,
      "indexerTimeoutMs",
      {
        min: 1,
      },
    ),
  };
};

export const normalizeWorkspaceUpdateInput = (
  input: UpdateWorkspaceSettingsInput,
) => {
  const normalizedInput = readMutationInput(input);
  const name = readOptionalNonEmptyString(normalizedInput.name, "name");
  const description = readOptionalWorkspaceDescription(
    normalizedInput.description,
  );

  if (name === undefined && description === undefined) {
    throw createValidationAppError("至少需要提供一个可更新字段", {
      name: "至少需要提供一个可更新字段",
      description: "至少需要提供一个可更新字段",
    });
  }

  return {
    name,
    description,
  };
};

export const normalizeConnectionTestInput = (
  input: TestSettingsConnectionInput,
) => {
  const normalizedInput = readMutationInput(input);

  return {
    provider:
      typeof normalizedInput.provider === "string"
        ? normalizedInput.provider.trim()
        : undefined,
    baseUrl: readOptionalNonEmptyString(normalizedInput.baseUrl, "baseUrl"),
    model: readOptionalNonEmptyString(normalizedInput.model, "model"),
    apiKey: readOptionalApiKey(normalizedInput.apiKey),
    hasOverrides:
      normalizedInput.provider !== undefined ||
      normalizedInput.baseUrl !== undefined ||
      normalizedInput.model !== undefined ||
      normalizedInput.apiKey !== undefined,
  };
};

export const normalizeIndexingConnectionTestInput = (
  input: TestIndexingConnectionInput,
) => {
  const normalizedInput = readMutationInput(input);

  return {
    indexerTimeoutMs: readRequiredIntegerInRange(
      normalizedInput.indexerTimeoutMs,
      "indexerTimeoutMs",
      {
        min: 1,
      },
    ),
  };
};
