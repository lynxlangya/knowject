import { maskApiKey, decryptApiKey } from '@lib/crypto.js';
import type { SettingsRepository } from '@modules/settings/settings.repository.js';
import type {
  EffectiveEmbeddingConfig,
  EffectiveIndexingConfig,
  EffectiveLlmConfig,
  SettingsAiConfigResponse,
  SettingsEmbeddingProvider,
  SettingsIndexingResponse,
  SettingsLlmProvider,
  SettingsWorkspaceResponse,
  WorkspaceAiConfigDocument,
  WorkspaceSettingsDocument,
} from '@modules/settings/settings.types.js';
import type { AppEnv } from './env.js';

export const DEFAULT_EMBEDDING_PROVIDER: SettingsEmbeddingProvider = 'openai';
export const DEFAULT_LLM_PROVIDER: SettingsLlmProvider = 'openai';
export const DEFAULT_EMBEDDING_MODEL = 'text-embedding-3-small';
export const DEFAULT_LLM_MODEL = 'gpt-5.4';
export const DEFAULT_LLM_BASE_URL = 'https://api.openai.com/v1';
export const DEFAULT_INDEXING_CHUNK_SIZE = 1000;
export const DEFAULT_INDEXING_CHUNK_OVERLAP = 200;
export const DEFAULT_INDEXING_SUPPORTED_TYPES = ['md', 'txt'];
export const DEFAULT_INDEXING_TIMEOUT_MS = 30000;
export const DEFAULT_WORKSPACE_NAME = '知项 · Knowject';
export const DEFAULT_WORKSPACE_DESCRIPTION = '让项目知识，真正为团队所用。';

const readOptionalEnvironmentPositiveInteger = (
  name: string,
  fallback: number,
): number => {
  const rawValue = process.env[name]?.trim();

  if (!rawValue) {
    return fallback;
  }

  const parsedValue = Number.parseInt(rawValue, 10);

  if (!Number.isInteger(parsedValue) || parsedValue <= 0) {
    return fallback;
  }

  return parsedValue;
};

const getEnvironmentEmbeddingBaseUrl = (env: AppEnv): string => {
  return env.openai.baseUrl;
};

const getEnvironmentEmbeddingModel = (env: AppEnv): string => {
  return env.openai.embeddingModel;
};

const getEnvironmentLlmBaseUrl = (env: AppEnv): string => {
  return env.openai.baseUrl;
};

const getEnvironmentLlmModel = (): string => {
  return process.env.OPENAI_LLM_MODEL?.trim() || DEFAULT_LLM_MODEL;
};

export const getEnvironmentEmbeddingSettings = (
  env: AppEnv,
): SettingsAiConfigResponse<SettingsEmbeddingProvider> => {
  return {
    provider: DEFAULT_EMBEDDING_PROVIDER,
    baseUrl: getEnvironmentEmbeddingBaseUrl(env),
    model: getEnvironmentEmbeddingModel(env),
    apiKeyHint: env.openai.apiKey ? maskApiKey(env.openai.apiKey) : '',
    hasKey: Boolean(env.openai.apiKey),
    source: 'environment',
    testedAt: null,
    testStatus: null,
  };
};

export const getEnvironmentLlmSettings = (
  env: AppEnv,
): SettingsAiConfigResponse<SettingsLlmProvider> => {
  return {
    provider: DEFAULT_LLM_PROVIDER,
    baseUrl: getEnvironmentLlmBaseUrl(env),
    model: getEnvironmentLlmModel(),
    apiKeyHint: env.openai.apiKey ? maskApiKey(env.openai.apiKey) : '',
    hasKey: Boolean(env.openai.apiKey),
    source: 'environment',
    testedAt: null,
    testStatus: null,
  };
};

export const getEnvironmentIndexingSettings = (env: AppEnv): SettingsIndexingResponse => {
  return {
    chunkSize: readOptionalEnvironmentPositiveInteger(
      'KNOWLEDGE_CHUNK_SIZE',
      DEFAULT_INDEXING_CHUNK_SIZE,
    ),
    chunkOverlap: readOptionalEnvironmentPositiveInteger(
      'KNOWLEDGE_CHUNK_OVERLAP',
      DEFAULT_INDEXING_CHUNK_OVERLAP,
    ),
    supportedTypes: [...DEFAULT_INDEXING_SUPPORTED_TYPES],
    source: 'environment',
    indexerTimeoutMs: env.knowledge.indexerRequestTimeoutMs,
  };
};

export const getDefaultWorkspaceSettings = (): SettingsWorkspaceResponse => {
  return {
    name: DEFAULT_WORKSPACE_NAME,
    description: DEFAULT_WORKSPACE_DESCRIPTION,
  };
};

export const toStoredAiSettingsResponse = <TProvider extends string>(
  config: WorkspaceAiConfigDocument<TProvider>,
): SettingsAiConfigResponse<TProvider> => {
  return {
    provider: config.provider,
    baseUrl: config.baseUrl,
    model: config.model,
    apiKeyHint: config.apiKeyHint,
    hasKey: Boolean(config.apiKeyEncrypted),
    source: 'database',
    testedAt: config.testedAt?.toISOString() ?? null,
    testStatus: config.testStatus ?? null,
  };
};

const getStoredWorkspaceSection = (
  settings: WorkspaceSettingsDocument | null,
): SettingsWorkspaceResponse => {
  return {
    name: settings?.workspace?.name || DEFAULT_WORKSPACE_NAME,
    description:
      settings?.workspace?.description ?? DEFAULT_WORKSPACE_DESCRIPTION,
  };
};

export const getSettingsResponseFromDocument = (
  env: AppEnv,
  settings: WorkspaceSettingsDocument | null,
) => {
  return {
    embedding: settings?.embedding?.apiKeyEncrypted
      ? toStoredAiSettingsResponse(settings.embedding)
      : getEnvironmentEmbeddingSettings(env),
    llm: settings?.llm?.apiKeyEncrypted
      ? toStoredAiSettingsResponse(settings.llm)
      : getEnvironmentLlmSettings(env),
    indexing: settings?.indexing
      ? {
          ...settings.indexing,
          source: 'database' as const,
        }
      : getEnvironmentIndexingSettings(env),
    workspace: getStoredWorkspaceSection(settings),
  };
};

export const getEffectiveEmbeddingConfig = async ({
  env,
  repository,
}: {
  env: AppEnv;
  repository: SettingsRepository;
}): Promise<EffectiveEmbeddingConfig> => {
  try {
    const settings = await repository.getSettings();
    const storedEmbedding = settings?.embedding;

    if (storedEmbedding?.apiKeyEncrypted) {
      return {
        source: 'database',
        provider: storedEmbedding.provider,
        apiKey: decryptApiKey(storedEmbedding.apiKeyEncrypted),
        baseUrl: storedEmbedding.baseUrl,
        model: storedEmbedding.model,
        requestTimeoutMs: env.openai.requestTimeoutMs,
      };
    }
  } catch (error) {
    console.warn(
      `[ai-config] failed to read embedding settings from database, fallback to environment: ${
        error instanceof Error ? error.message : 'unknown error'
      }`,
    );
  }

  if (env.nodeEnv === 'development' && !env.openai.apiKey) {
    return {
      source: 'environment',
      provider: 'local_dev',
      apiKey: null,
      baseUrl: getEnvironmentEmbeddingBaseUrl(env),
      model: 'hash-1536-dev',
      requestTimeoutMs: env.openai.requestTimeoutMs,
    };
  }

  return {
    source: 'environment',
    provider: DEFAULT_EMBEDDING_PROVIDER,
    apiKey: env.openai.apiKey,
    baseUrl: getEnvironmentEmbeddingBaseUrl(env),
    model: getEnvironmentEmbeddingModel(env),
    requestTimeoutMs: env.openai.requestTimeoutMs,
  };
};

export const getEffectiveLlmConfig = async ({
  env,
  repository,
}: {
  env: AppEnv;
  repository: SettingsRepository;
}): Promise<EffectiveLlmConfig> => {
  try {
    const settings = await repository.getSettings();
    const storedLlm = settings?.llm;

    if (storedLlm?.apiKeyEncrypted) {
      return {
        source: 'database',
        provider: storedLlm.provider,
        apiKey: decryptApiKey(storedLlm.apiKeyEncrypted),
        baseUrl: storedLlm.baseUrl,
        model: storedLlm.model,
        requestTimeoutMs: env.openai.requestTimeoutMs,
      };
    }
  } catch (error) {
    console.warn(
      `[ai-config] failed to read llm settings from database, fallback to environment: ${
        error instanceof Error ? error.message : 'unknown error'
      }`,
    );
  }

  return {
    source: 'environment',
    provider: DEFAULT_LLM_PROVIDER,
    apiKey: env.openai.apiKey,
    baseUrl: getEnvironmentLlmBaseUrl(env),
    model: getEnvironmentLlmModel(),
    requestTimeoutMs: env.openai.requestTimeoutMs,
  };
};

export const getEffectiveIndexingConfig = async ({
  env,
  repository,
}: {
  env: AppEnv;
  repository: SettingsRepository;
}): Promise<EffectiveIndexingConfig> => {
  try {
    const settings = await repository.getSettings();

    if (settings?.indexing) {
      return {
        source: 'database',
        chunkSize: settings.indexing.chunkSize,
        chunkOverlap: settings.indexing.chunkOverlap,
        supportedTypes: [...settings.indexing.supportedTypes],
        indexerTimeoutMs: settings.indexing.indexerTimeoutMs,
      };
    }
  } catch (error) {
    console.warn(
      `[ai-config] failed to read indexing settings from database, fallback to environment: ${
        error instanceof Error ? error.message : 'unknown error'
      }`,
    );
  }

  const environmentFallback = getEnvironmentIndexingSettings(env);

  return {
    source: environmentFallback.source,
    chunkSize: environmentFallback.chunkSize,
    chunkOverlap: environmentFallback.chunkOverlap,
    supportedTypes: [...environmentFallback.supportedTypes],
    indexerTimeoutMs: environmentFallback.indexerTimeoutMs,
  };
};
