import { AppError } from '@lib/app-error.js';
import { encryptApiKey, maskApiKey, decryptApiKey } from '@lib/crypto.js';
import {
  createValidationAppError,
  readOptionalStringField,
} from '@lib/validation.js';
import type { AppEnv } from '@config/env.js';
import {
  getDefaultWorkspaceSettings,
  getEffectiveIndexingConfig,
  getEnvironmentEmbeddingSettings,
  getEnvironmentIndexingSettings,
  getEnvironmentLlmSettings,
  getSettingsResponseFromDocument,
} from '@config/ai-config.js';
import type { SettingsRepository } from './settings.repository.js';
import {
  SETTINGS_EMBEDDING_PROVIDERS,
  SETTINGS_INDEXING_SUPPORTED_TYPES,
  SETTINGS_LLM_PROVIDERS,
  type SettingsAiConfigResponse,
  type SettingsCommandContext,
  type SettingsConnectionTestResponse,
  type SettingsEmbeddingProvider,
  type SettingsIndexingConnectionTestResponse,
  type SettingsIndexingResponse,
  type SettingsLlmProvider,
  type SettingsResponse,
  type TestIndexingConnectionInput,
  type TestSettingsConnectionInput,
  type UpdateEmbeddingSettingsInput,
  type UpdateIndexingSettingsInput,
  type UpdateLlmSettingsInput,
  type UpdateWorkspaceSettingsInput,
  type WorkspaceAiConfigDocument,
  type WorkspaceIndexingConfigDocument,
  type WorkspaceInfoDocument,
} from './settings.types.js';

const CHAT_COMPLETIONS_COMPATIBLE_LLM_PROVIDERS = new Set<SettingsLlmProvider>([
  'openai',
  'anthropic',
  'gemini',
  'aliyun',
  'deepseek',
  'moonshot',
  'zhipu',
  'custom',
]);

const INDEXING_CHUNK_SIZE_MIN = 200;
const INDEXING_CHUNK_SIZE_MAX = 2000;
const INDEXING_CHUNK_OVERLAP_MIN = 0;
const INDEXING_CHUNK_OVERLAP_MAX = 500;
const WORKSPACE_DESCRIPTION_MAX_LENGTH = 200;

export interface SettingsService {
  getSettings(context: SettingsCommandContext): Promise<SettingsResponse>;
  updateEmbedding(
    context: SettingsCommandContext,
    input: UpdateEmbeddingSettingsInput,
  ): Promise<SettingsResponse>;
  updateLlm(
    context: SettingsCommandContext,
    input: UpdateLlmSettingsInput,
  ): Promise<SettingsResponse>;
  updateIndexing(
    context: SettingsCommandContext,
    input: UpdateIndexingSettingsInput,
  ): Promise<SettingsResponse>;
  updateWorkspace(
    context: SettingsCommandContext,
    input: UpdateWorkspaceSettingsInput,
  ): Promise<SettingsResponse>;
  testEmbedding(
    context: SettingsCommandContext,
    input: TestSettingsConnectionInput,
  ): Promise<SettingsConnectionTestResponse>;
  testIndexing(
    context: SettingsCommandContext,
    input: TestIndexingConnectionInput,
  ): Promise<SettingsIndexingConnectionTestResponse>;
  testLlm(
    context: SettingsCommandContext,
    input: TestSettingsConnectionInput,
  ): Promise<SettingsConnectionTestResponse>;
}

const buildApiUrl = (baseUrl: string, path: string): string => {
  const normalizedBaseUrl = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
  return new URL(path.replace(/^\//, ''), normalizedBaseUrl).toString();
};

const createUnsupportedLlmProviderError = (): AppError => {
  return new AppError({
    statusCode: 400,
    code: 'SETTINGS_LLM_TEST_PROVIDER_UNSUPPORTED',
    message: '当前 provider 暂不支持在线测试',
  });
};

const createMissingApiKeyError = (): AppError => {
  return new AppError({
    statusCode: 400,
    code: 'SETTINGS_API_KEY_REQUIRED',
    message: 'API Key 未配置，请先输入或保存后再测试',
  });
};

const createApiKeyReentryRequiredError = (): AppError => {
  return new AppError({
    statusCode: 400,
    code: 'SETTINGS_API_KEY_REENTRY_REQUIRED',
    message: '切换 Provider 或 Base URL 后，请重新输入新的 API Key',
  });
};

const createSettingsMutationInput = <T>(input: T): T & Record<string, unknown> => {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw createValidationAppError('请求体必须为对象', {
      body: '请求体必须为对象',
    });
  }

  return input as T & Record<string, unknown>;
};

const readOptionalProvider = <TProvider extends string>(
  value: unknown,
  field: 'provider',
  allowedValues: readonly TProvider[],
): TProvider | undefined => {
  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== 'string') {
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
  field: 'baseUrl' | 'model' | 'name',
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

  if (typeof value !== 'string') {
    throw createValidationAppError('apiKey 必须为字符串', {
      apiKey: 'apiKey 必须为字符串',
    });
  }

  const trimmedValue = value.trim();
  return trimmedValue || undefined;
};

const readRequiredIntegerInRange = (
  value: unknown,
  field: 'chunkSize' | 'chunkOverlap' | 'indexerTimeoutMs',
  range: {
    min: number;
    max?: number;
  },
): number | undefined => {
  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== 'number' || !Number.isInteger(value)) {
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
    throw createValidationAppError('supportedTypes 必须为字符串数组', {
      supportedTypes: 'supportedTypes 必须为字符串数组',
    });
  }

  const normalizedValues = value
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim())
    .filter(Boolean);

  if (normalizedValues.length !== value.length) {
    throw createValidationAppError('supportedTypes 必须为字符串数组', {
      supportedTypes: 'supportedTypes 必须为字符串数组',
    });
  }

  const deduplicatedValues = Array.from(new Set(normalizedValues));

  if (deduplicatedValues.length === 0) {
    throw createValidationAppError('supportedTypes 至少需要保留一种文件类型', {
      supportedTypes: 'supportedTypes 至少需要保留一种文件类型',
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
    throw createValidationAppError('supportedTypes 只支持 md、txt', {
      supportedTypes: 'supportedTypes 只支持 md、txt',
    });
  }

  return deduplicatedValues;
};

const readOptionalWorkspaceDescription = (value: unknown): string | undefined => {
  const normalizedValue = readOptionalStringField(value, 'description');

  if (
    normalizedValue !== undefined &&
    normalizedValue.length > WORKSPACE_DESCRIPTION_MAX_LENGTH
  ) {
    throw createValidationAppError('description 长度不能超过 200', {
      description: 'description 长度不能超过 200',
    });
  }

  return normalizedValue;
};

const normalizeEmbeddingUpdateInput = (input: UpdateEmbeddingSettingsInput) => {
  const normalizedInput = createSettingsMutationInput(input);

  return {
    provider: readOptionalProvider(
      normalizedInput.provider,
      'provider',
      SETTINGS_EMBEDDING_PROVIDERS,
    ),
    baseUrl: readOptionalNonEmptyString(normalizedInput.baseUrl, 'baseUrl'),
    model: readOptionalNonEmptyString(normalizedInput.model, 'model'),
    apiKey: readOptionalApiKey(normalizedInput.apiKey),
  };
};

const normalizeLlmUpdateInput = (input: UpdateLlmSettingsInput) => {
  const normalizedInput = createSettingsMutationInput(input);

  return {
    provider: readOptionalProvider(
      normalizedInput.provider,
      'provider',
      SETTINGS_LLM_PROVIDERS,
    ),
    baseUrl: readOptionalNonEmptyString(normalizedInput.baseUrl, 'baseUrl'),
    model: readOptionalNonEmptyString(normalizedInput.model, 'model'),
    apiKey: readOptionalApiKey(normalizedInput.apiKey),
  };
};

const normalizeIndexingUpdateInput = (input: UpdateIndexingSettingsInput) => {
  const normalizedInput = createSettingsMutationInput(input);
  const chunkSize = readRequiredIntegerInRange(normalizedInput.chunkSize, 'chunkSize', {
    min: INDEXING_CHUNK_SIZE_MIN,
    max: INDEXING_CHUNK_SIZE_MAX,
  });
  const chunkOverlap = readRequiredIntegerInRange(
    normalizedInput.chunkOverlap,
    'chunkOverlap',
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
    throw createValidationAppError('chunkOverlap 必须小于 chunkSize', {
      chunkOverlap: 'chunkOverlap 必须小于 chunkSize',
    });
  }

  return {
    chunkSize,
    chunkOverlap,
    supportedTypes: readOptionalSupportedTypes(normalizedInput.supportedTypes),
    indexerTimeoutMs: readRequiredIntegerInRange(
      normalizedInput.indexerTimeoutMs,
      'indexerTimeoutMs',
      {
        min: 1,
      },
    ),
  };
};

const normalizeWorkspaceUpdateInput = (input: UpdateWorkspaceSettingsInput) => {
  const normalizedInput = createSettingsMutationInput(input);
  const name = readOptionalNonEmptyString(normalizedInput.name, 'name');
  const description = readOptionalWorkspaceDescription(normalizedInput.description);

  if (name === undefined && description === undefined) {
    throw createValidationAppError('至少需要提供一个可更新字段', {
      name: '至少需要提供一个可更新字段',
      description: '至少需要提供一个可更新字段',
    });
  }

  return {
    name,
    description,
  };
};

const normalizeConnectionTestInput = (input: TestSettingsConnectionInput) => {
  const normalizedInput = createSettingsMutationInput(input);

  return {
    provider:
      typeof normalizedInput.provider === 'string'
        ? normalizedInput.provider.trim()
        : undefined,
    baseUrl: readOptionalNonEmptyString(normalizedInput.baseUrl, 'baseUrl'),
    model: readOptionalNonEmptyString(normalizedInput.model, 'model'),
    apiKey: readOptionalApiKey(normalizedInput.apiKey),
    hasOverrides:
      normalizedInput.provider !== undefined ||
      normalizedInput.baseUrl !== undefined ||
      normalizedInput.model !== undefined ||
      normalizedInput.apiKey !== undefined,
  };
};

const normalizeIndexingConnectionTestInput = (input: TestIndexingConnectionInput) => {
  const normalizedInput = createSettingsMutationInput(input);

  return {
    indexerTimeoutMs: readRequiredIntegerInRange(
      normalizedInput.indexerTimeoutMs,
      'indexerTimeoutMs',
      {
        min: 1,
      },
    ),
  };
};

const buildEmbeddingSection = ({
  current,
  fallback,
  input,
}: {
  current: WorkspaceAiConfigDocument<SettingsEmbeddingProvider> | undefined;
  fallback: SettingsAiConfigResponse<SettingsEmbeddingProvider>;
  input: ReturnType<typeof normalizeEmbeddingUpdateInput>;
}): WorkspaceAiConfigDocument<SettingsEmbeddingProvider> => {
  const provider = input.provider ?? current?.provider ?? fallback.provider;
  const baseUrl = input.baseUrl ?? current?.baseUrl ?? fallback.baseUrl;
  const model = input.model ?? current?.model ?? fallback.model;
  const apiKeyUpdated = input.apiKey !== undefined;
  const nextApiKey = input.apiKey ?? '';
  const apiKeyEncrypted = apiKeyUpdated
    ? encryptApiKey(nextApiKey)
    : current?.apiKeyEncrypted ?? '';
  const apiKeyHint = apiKeyUpdated ? maskApiKey(nextApiKey) : current?.apiKeyHint ?? '';
  const configChanged =
    apiKeyUpdated ||
    provider !== current?.provider ||
    baseUrl !== current?.baseUrl ||
    model !== current?.model;

  return {
    provider,
    baseUrl,
    model,
    apiKeyEncrypted,
    apiKeyHint,
    testedAt: configChanged ? null : current?.testedAt ?? null,
    testStatus: configChanged ? null : current?.testStatus ?? null,
  };
};

const buildLlmSection = ({
  current,
  fallback,
  input,
}: {
  current: WorkspaceAiConfigDocument<SettingsLlmProvider> | undefined;
  fallback: SettingsAiConfigResponse<SettingsLlmProvider>;
  input: ReturnType<typeof normalizeLlmUpdateInput>;
}): WorkspaceAiConfigDocument<SettingsLlmProvider> => {
  const provider = input.provider ?? current?.provider ?? fallback.provider;
  const baseUrl = input.baseUrl ?? current?.baseUrl ?? fallback.baseUrl;
  const model = input.model ?? current?.model ?? fallback.model;
  const apiKeyUpdated = input.apiKey !== undefined;
  const nextApiKey = input.apiKey ?? '';
  const apiKeyEncrypted = apiKeyUpdated
    ? encryptApiKey(nextApiKey)
    : current?.apiKeyEncrypted ?? '';
  const apiKeyHint = apiKeyUpdated ? maskApiKey(nextApiKey) : current?.apiKeyHint ?? '';
  const configChanged =
    apiKeyUpdated ||
    provider !== current?.provider ||
    baseUrl !== current?.baseUrl ||
    model !== current?.model;

  return {
    provider,
    baseUrl,
    model,
    apiKeyEncrypted,
    apiKeyHint,
    testedAt: configChanged ? null : current?.testedAt ?? null,
    testStatus: configChanged ? null : current?.testStatus ?? null,
  };
};

const buildIndexingSection = ({
  current,
  fallback,
  input,
}: {
  current: WorkspaceIndexingConfigDocument | undefined;
  fallback: SettingsIndexingResponse;
  input: ReturnType<typeof normalizeIndexingUpdateInput>;
}): WorkspaceIndexingConfigDocument => {
  const chunkSize = input.chunkSize ?? current?.chunkSize ?? fallback.chunkSize;
  const chunkOverlap = input.chunkOverlap ?? current?.chunkOverlap ?? fallback.chunkOverlap;

  if (chunkOverlap >= chunkSize) {
    throw createValidationAppError('chunkOverlap 必须小于 chunkSize', {
      chunkOverlap: 'chunkOverlap 必须小于 chunkSize',
    });
  }

  return {
    chunkSize,
    chunkOverlap,
    supportedTypes: [...(input.supportedTypes ?? current?.supportedTypes ?? fallback.supportedTypes)],
    indexerTimeoutMs:
      input.indexerTimeoutMs ?? current?.indexerTimeoutMs ?? fallback.indexerTimeoutMs,
  };
};

const buildWorkspaceSection = ({
  current,
  input,
}: {
  current: WorkspaceInfoDocument | undefined;
  input: ReturnType<typeof normalizeWorkspaceUpdateInput>;
}): WorkspaceInfoDocument => {
  const fallback = getDefaultWorkspaceSettings();

  return {
    name: input.name ?? current?.name ?? fallback.name,
    description: input.description ?? current?.description ?? fallback.description,
  };
};

const normalizeOpenAiCompatibleErrorMessage = (
  responseBody: unknown,
  fallbackMessage: string,
): string => {
  if (
    responseBody &&
    typeof responseBody === 'object' &&
    'error' in responseBody &&
    responseBody.error &&
    typeof responseBody.error === 'object' &&
    'message' in responseBody.error &&
    typeof responseBody.error.message === 'string'
  ) {
    return responseBody.error.message;
  }

  if (
    responseBody &&
    typeof responseBody === 'object' &&
    'message' in responseBody &&
    typeof responseBody.message === 'string'
  ) {
    return responseBody.message;
  }

  return fallbackMessage;
};

const parseResponseBody = async (response: Response): Promise<unknown> => {
  const rawBody = await response.text();

  if (!rawBody) {
    return null;
  }

  try {
    return JSON.parse(rawBody);
  } catch {
    return rawBody;
  }
};

const normalizeIndexerErrorMessage = (
  responseBody: unknown,
  fallbackMessage: string,
): string => {
  if (
    responseBody &&
    typeof responseBody === 'object' &&
    'errorMessage' in responseBody &&
    typeof responseBody.errorMessage === 'string'
  ) {
    return responseBody.errorMessage;
  }

  if (
    responseBody &&
    typeof responseBody === 'object' &&
    'message' in responseBody &&
    typeof responseBody.message === 'string'
  ) {
    return responseBody.message;
  }

  return fallbackMessage;
};

interface IndexerDiagnosticsResponseBody {
  status: 'ok' | 'degraded';
  service: string;
  chunkSize: number;
  chunkOverlap: number;
  supportedFormats: string[];
  embeddingProvider: string;
  chromaReachable: boolean;
  errorMessage: string | null;
}

const isIndexerDiagnosticsResponseBody = (
  value: unknown,
): value is IndexerDiagnosticsResponseBody => {
  if (value === null || typeof value !== 'object') {
    return false;
  }

  return (
    'status' in value &&
    (value.status === 'ok' || value.status === 'degraded') &&
    'service' in value &&
    typeof value.service === 'string' &&
    'chunkSize' in value &&
    typeof value.chunkSize === 'number' &&
    'chunkOverlap' in value &&
    typeof value.chunkOverlap === 'number' &&
    'supportedFormats' in value &&
    Array.isArray(value.supportedFormats) &&
    value.supportedFormats.every((item) => typeof item === 'string') &&
    'embeddingProvider' in value &&
    typeof value.embeddingProvider === 'string' &&
    'chromaReachable' in value &&
    typeof value.chromaReachable === 'boolean' &&
    'errorMessage' in value &&
    (value.errorMessage === null || typeof value.errorMessage === 'string')
  );
};

const createUnreachableIndexingTestResponse = (
  error: string,
): SettingsIndexingConnectionTestResponse => {
  return {
    success: false,
    indexerStatus: 'unreachable',
    error,
    service: null,
    supportedFormats: [],
    chunkSize: null,
    chunkOverlap: null,
    embeddingProvider: null,
    chromaReachable: null,
  };
};

const testOpenAiCompatibleRequest = async ({
  baseUrl,
  apiKey,
  path,
  payload,
  timeoutMs,
}: {
  baseUrl: string;
  apiKey: string;
  path: string;
  payload: Record<string, unknown>;
  timeoutMs: number;
}): Promise<SettingsConnectionTestResponse> => {
  const startedAt = Date.now();

  try {
    const response = await fetch(buildApiUrl(baseUrl, path), {
      method: 'POST',
      headers: {
        accept: 'application/json',
        authorization: `Bearer ${apiKey}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(timeoutMs),
    });
    const responseBody = await parseResponseBody(response);

    if (!response.ok) {
      return {
        success: false,
        error: normalizeOpenAiCompatibleErrorMessage(
          responseBody,
          `连接测试失败（HTTP ${response.status}）`,
        ),
      };
    }

    return {
      success: true,
      latencyMs: Date.now() - startedAt,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : '连接测试失败',
    };
  }
};

const testIndexingRequest = async ({
  env,
  timeoutMs,
}: {
  env: AppEnv;
  timeoutMs: number;
}): Promise<SettingsIndexingConnectionTestResponse> => {
  const startedAt = Date.now();

  try {
    const response = await fetch(
      buildApiUrl(env.knowledge.indexerUrl, '/internal/v1/index/diagnostics'),
      {
        method: 'GET',
        headers: {
          accept: 'application/json',
        },
        signal: AbortSignal.timeout(timeoutMs),
      },
    );
    const responseBody = await parseResponseBody(response);

    if (!response.ok) {
      if (response.status === 404) {
        return createUnreachableIndexingTestResponse(
          '当前 Python indexer 不支持 diagnostics 接口，请先升级服务',
        );
      }

      return createUnreachableIndexingTestResponse(
        normalizeIndexerErrorMessage(
          responseBody,
          `索引链路测试失败（HTTP ${response.status}）`,
        ),
      );
    }

    if (!isIndexerDiagnosticsResponseBody(responseBody)) {
      return createUnreachableIndexingTestResponse(
        'Python indexer diagnostics 响应不合法',
      );
    }

    const success =
      responseBody.status === 'ok' && responseBody.chromaReachable === true;

    return {
      success,
      indexerStatus: responseBody.status,
      latencyMs: Date.now() - startedAt,
      ...(success
        ? {}
        : {
            error:
              responseBody.errorMessage ??
              (responseBody.chromaReachable
                ? 'Python indexer 当前处于降级状态'
                : 'Python indexer 可达，但 Chroma 不可达'),
          }),
      service: responseBody.service,
      supportedFormats: [...responseBody.supportedFormats],
      chunkSize: responseBody.chunkSize,
      chunkOverlap: responseBody.chunkOverlap,
      embeddingProvider: responseBody.embeddingProvider,
      chromaReachable: responseBody.chromaReachable,
    };
  } catch (error) {
    return createUnreachableIndexingTestResponse(
      error instanceof Error ? error.message : '索引链路测试失败',
    );
  }
};

const shouldPersistTestStatus = (
  currentSection:
    | WorkspaceAiConfigDocument<SettingsEmbeddingProvider>
    | WorkspaceAiConfigDocument<SettingsLlmProvider>
    | undefined,
  hasOverrides: boolean,
): boolean => {
  return Boolean(currentSection && !hasOverrides);
};

const hasConnectionTargetChanged = <TProvider extends string>({
  current,
  fallback,
  provider,
  baseUrl,
}: {
  current: WorkspaceAiConfigDocument<TProvider> | undefined;
  fallback: SettingsAiConfigResponse<TProvider>;
  provider: TProvider;
  baseUrl: string;
}): boolean => {
  const currentProvider = current?.provider ?? fallback.provider;
  const currentBaseUrl = current?.baseUrl ?? fallback.baseUrl;

  return provider !== currentProvider || baseUrl !== currentBaseUrl;
};

export const createSettingsService = ({
  env,
  repository,
}: {
  env: AppEnv;
  repository: SettingsRepository;
}): SettingsService => {
  return {
    getSettings: async (_context) => {
      const settings = await repository.getSettings();
      return getSettingsResponseFromDocument(env, settings);
    },

    updateEmbedding: async ({ actor }, input) => {
      const normalizedInput = normalizeEmbeddingUpdateInput(input);
      const currentSettings = await repository.getSettings();
      const currentEmbedding = currentSettings?.embedding;
      const fallbackEmbedding = getEnvironmentEmbeddingSettings(env);
      const nextProvider =
        normalizedInput.provider ?? currentEmbedding?.provider ?? fallbackEmbedding.provider;
      const nextBaseUrl =
        normalizedInput.baseUrl ?? currentEmbedding?.baseUrl ?? fallbackEmbedding.baseUrl;

      if (normalizedInput.apiKey === undefined) {
        if (!currentEmbedding?.apiKeyEncrypted) {
          throw createMissingApiKeyError();
        }

        if (
          hasConnectionTargetChanged({
            current: currentEmbedding,
            fallback: fallbackEmbedding,
            provider: nextProvider,
            baseUrl: nextBaseUrl,
          })
        ) {
          throw createApiKeyReentryRequiredError();
        }
      }

      const nextEmbeddingSection = buildEmbeddingSection({
        current: currentEmbedding,
        fallback: fallbackEmbedding,
        input: normalizedInput,
      });

      const settings = await repository.upsertSettings({
        embedding: nextEmbeddingSection,
        updatedAt: new Date(),
        updatedBy: actor.id,
      });

      return getSettingsResponseFromDocument(env, settings);
    },

    updateLlm: async ({ actor }, input) => {
      const normalizedInput = normalizeLlmUpdateInput(input);
      const currentSettings = await repository.getSettings();
      const currentLlm = currentSettings?.llm;
      const fallbackLlm = getEnvironmentLlmSettings(env);
      const nextProvider =
        normalizedInput.provider ?? currentLlm?.provider ?? fallbackLlm.provider;
      const nextBaseUrl =
        normalizedInput.baseUrl ?? currentLlm?.baseUrl ?? fallbackLlm.baseUrl;

      if (normalizedInput.apiKey === undefined) {
        if (!currentLlm?.apiKeyEncrypted) {
          throw createMissingApiKeyError();
        }

        if (
          hasConnectionTargetChanged({
            current: currentLlm,
            fallback: fallbackLlm,
            provider: nextProvider,
            baseUrl: nextBaseUrl,
          })
        ) {
          throw createApiKeyReentryRequiredError();
        }
      }

      const nextLlmSection = buildLlmSection({
        current: currentLlm,
        fallback: fallbackLlm,
        input: normalizedInput,
      });

      const settings = await repository.upsertSettings({
        llm: nextLlmSection,
        updatedAt: new Date(),
        updatedBy: actor.id,
      });

      return getSettingsResponseFromDocument(env, settings);
    },

    updateIndexing: async ({ actor }, input) => {
      const normalizedInput = normalizeIndexingUpdateInput(input);
      const currentSettings = await repository.getSettings();
      const nextIndexingSection = buildIndexingSection({
        current: currentSettings?.indexing,
        fallback: getEnvironmentIndexingSettings(env),
        input: normalizedInput,
      });

      const settings = await repository.upsertSettings({
        indexing: nextIndexingSection,
        updatedAt: new Date(),
        updatedBy: actor.id,
      });

      return getSettingsResponseFromDocument(env, settings);
    },

    updateWorkspace: async ({ actor }, input) => {
      const normalizedInput = normalizeWorkspaceUpdateInput(input);
      const currentSettings = await repository.getSettings();
      const nextWorkspaceSection = buildWorkspaceSection({
        current: currentSettings?.workspace,
        input: normalizedInput,
      });

      const settings = await repository.upsertSettings({
        workspace: nextWorkspaceSection,
        updatedAt: new Date(),
        updatedBy: actor.id,
      });

      return getSettingsResponseFromDocument(env, settings);
    },

    testEmbedding: async ({ actor }, input) => {
      const normalizedInput = normalizeConnectionTestInput(input);
      const currentSettings = await repository.getSettings();
      const currentSection = currentSettings?.embedding;
      const fallback = getEnvironmentEmbeddingSettings(env);
      const provider =
        (normalizedInput.provider as SettingsEmbeddingProvider | undefined) ??
        currentSection?.provider ??
        fallback.provider;
      const baseUrl = normalizedInput.baseUrl ?? currentSection?.baseUrl ?? fallback.baseUrl;
      const model = normalizedInput.model ?? currentSection?.model ?? fallback.model;

      if (
        normalizedInput.apiKey === undefined &&
        currentSection?.apiKeyEncrypted &&
        hasConnectionTargetChanged({
          current: currentSection,
          fallback,
          provider,
          baseUrl,
        })
      ) {
        throw createApiKeyReentryRequiredError();
      }

      const apiKey =
        normalizedInput.apiKey ??
        (currentSection?.apiKeyEncrypted
          ? decryptApiKey(currentSection.apiKeyEncrypted)
          : env.openai.apiKey);

      if (!apiKey) {
        throw createMissingApiKeyError();
      }

      const result = await testOpenAiCompatibleRequest({
        baseUrl,
        apiKey,
        path: '/embeddings',
        payload: {
          model,
          input: ['test'],
        },
        timeoutMs: env.openai.requestTimeoutMs,
      });

      if (shouldPersistTestStatus(currentSection, normalizedInput.hasOverrides)) {
        await repository.upsertSettings({
          embedding: {
            provider,
            baseUrl,
            model,
            apiKeyEncrypted: currentSection?.apiKeyEncrypted ?? '',
            apiKeyHint: currentSection?.apiKeyHint ?? '',
            testedAt: result.success ? new Date() : currentSection?.testedAt ?? null,
            testStatus: result.success ? 'ok' : 'failed',
          },
          updatedAt: new Date(),
          updatedBy: actor.id,
        });
      }

      return result;
    },

    testIndexing: async (_context, input) => {
      const normalizedInput = normalizeIndexingConnectionTestInput(input);
      const effectiveIndexingConfig = await getEffectiveIndexingConfig({
        env,
        repository,
      });

      return testIndexingRequest({
        env,
        timeoutMs:
          normalizedInput.indexerTimeoutMs ?? effectiveIndexingConfig.indexerTimeoutMs,
      });
    },

    testLlm: async ({ actor }, input) => {
      const normalizedInput = normalizeConnectionTestInput(input);
      const currentSettings = await repository.getSettings();
      const currentSection = currentSettings?.llm;
      const fallback = getEnvironmentLlmSettings(env);
      const provider =
        (normalizedInput.provider as SettingsLlmProvider | undefined) ??
        currentSection?.provider ??
        fallback.provider;

      if (!CHAT_COMPLETIONS_COMPATIBLE_LLM_PROVIDERS.has(provider)) {
        throw createUnsupportedLlmProviderError();
      }

      const baseUrl = normalizedInput.baseUrl ?? currentSection?.baseUrl ?? fallback.baseUrl;
      const model = normalizedInput.model ?? currentSection?.model ?? fallback.model;

      if (
        normalizedInput.apiKey === undefined &&
        currentSection?.apiKeyEncrypted &&
        hasConnectionTargetChanged({
          current: currentSection,
          fallback,
          provider,
          baseUrl,
        })
      ) {
        throw createApiKeyReentryRequiredError();
      }

      const apiKey =
        normalizedInput.apiKey ??
        (currentSection?.apiKeyEncrypted
          ? decryptApiKey(currentSection.apiKeyEncrypted)
          : env.openai.apiKey);

      if (!apiKey) {
        throw createMissingApiKeyError();
      }

      const result = await testOpenAiCompatibleRequest({
        baseUrl,
        apiKey,
        path: '/chat/completions',
        payload: {
          model,
          messages: [
            {
              role: 'user',
              content: 'test',
            },
          ],
          max_tokens: 1,
        },
        timeoutMs: env.openai.requestTimeoutMs,
      });

      if (shouldPersistTestStatus(currentSection, normalizedInput.hasOverrides)) {
        await repository.upsertSettings({
          llm: {
            provider,
            baseUrl,
            model,
            apiKeyEncrypted: currentSection?.apiKeyEncrypted ?? '',
            apiKeyHint: currentSection?.apiKeyHint ?? '',
            testedAt: result.success ? new Date() : currentSection?.testedAt ?? null,
            testStatus: result.success ? 'ok' : 'failed',
          },
          updatedAt: new Date(),
          updatedBy: actor.id,
        });
      }

      return result;
    },
  };
};
