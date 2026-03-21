import {
  getDefaultWorkspaceSettings,
} from "@config/ai-config.js";
import { encryptApiKey, maskApiKey } from "@lib/crypto.js";
import { getFallbackMessage } from "@lib/locale.messages.js";
import { createValidationAppError } from "@lib/validation.js";
import type {
  SettingsAiConfigResponse,
  SettingsEmbeddingProvider,
  SettingsIndexingResponse,
  SettingsLlmProvider,
  WorkspaceAiConfigDocument,
  WorkspaceIndexingConfigDocument,
  WorkspaceInfoDocument,
} from "./settings.types.js";
import {
  normalizeEmbeddingUpdateInput,
  normalizeIndexingUpdateInput,
  normalizeLlmUpdateInput,
  normalizeWorkspaceUpdateInput,
} from "./settings.service.validation.js";

export const buildEmbeddingSection = ({
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
  const nextApiKey = input.apiKey ?? "";
  const apiKeyEncrypted = apiKeyUpdated
    ? encryptApiKey(nextApiKey)
    : (current?.apiKeyEncrypted ?? "");
  const apiKeyHint = apiKeyUpdated
    ? maskApiKey(nextApiKey)
    : (current?.apiKeyHint ?? "");
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
    testedAt: configChanged ? null : (current?.testedAt ?? null),
    testStatus: configChanged ? null : (current?.testStatus ?? null),
  };
};

export const buildLlmSection = ({
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
  const nextApiKey = input.apiKey ?? "";
  const apiKeyEncrypted = apiKeyUpdated
    ? encryptApiKey(nextApiKey)
    : (current?.apiKeyEncrypted ?? "");
  const apiKeyHint = apiKeyUpdated
    ? maskApiKey(nextApiKey)
    : (current?.apiKeyHint ?? "");
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
    testedAt: configChanged ? null : (current?.testedAt ?? null),
    testStatus: configChanged ? null : (current?.testStatus ?? null),
  };
};

export const buildIndexingSection = ({
  current,
  fallback,
  input,
}: {
  current: WorkspaceIndexingConfigDocument | undefined;
  fallback: SettingsIndexingResponse;
  input: ReturnType<typeof normalizeIndexingUpdateInput>;
}): WorkspaceIndexingConfigDocument => {
  const chunkSize = input.chunkSize ?? current?.chunkSize ?? fallback.chunkSize;
  const chunkOverlap =
    input.chunkOverlap ?? current?.chunkOverlap ?? fallback.chunkOverlap;

  if (chunkOverlap >= chunkSize) {
    throw createValidationAppError(
      getFallbackMessage("validation.chunkOverlap.lessThanChunkSize"),
      {
        chunkOverlap: getFallbackMessage(
          "validation.chunkOverlap.lessThanChunkSize",
        ),
      },
      "validation.chunkOverlap.lessThanChunkSize",
    );
  }

  return {
    chunkSize,
    chunkOverlap,
    supportedTypes: [
      ...(input.supportedTypes ??
        current?.supportedTypes ??
        fallback.supportedTypes),
    ],
    indexerTimeoutMs:
      input.indexerTimeoutMs ??
      current?.indexerTimeoutMs ??
      fallback.indexerTimeoutMs,
  };
};

export const buildWorkspaceSection = ({
  current,
  input,
}: {
  current: WorkspaceInfoDocument | undefined;
  input: ReturnType<typeof normalizeWorkspaceUpdateInput>;
}): WorkspaceInfoDocument => {
  const fallback = getDefaultWorkspaceSettings();

  return {
    name: input.name ?? current?.name ?? fallback.name,
    description:
      input.description ?? current?.description ?? fallback.description,
  };
};

export const hasConnectionTargetChanged = <TProvider extends string>({
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
