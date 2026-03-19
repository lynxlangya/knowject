import type { AppEnv } from "@config/env.js";
import {
  getEffectiveIndexingConfig,
  getEnvironmentEmbeddingSettings,
  getEnvironmentIndexingSettings,
  getEnvironmentLlmSettings,
  getSettingsResponseFromDocument,
} from "@config/ai-config.js";
import { decryptApiKey } from "@lib/crypto.js";
import type { SettingsRepository } from "./settings.repository.js";
import {
  type SettingsCommandContext,
  type SettingsConnectionTestResponse,
  type SettingsEmbeddingProvider,
  type SettingsIndexingConnectionTestResponse,
  type SettingsLlmProvider,
  type SettingsResponse,
  type TestIndexingConnectionInput,
  type TestSettingsConnectionInput,
  type UpdateEmbeddingSettingsInput,
  type UpdateIndexingSettingsInput,
  type UpdateLlmSettingsInput,
  type UpdateWorkspaceSettingsInput,
} from "./settings.types.js";
import {
  shouldPersistTestStatus,
  testIndexingRequest,
  testOpenAiCompatibleRequest,
} from "./settings.service.connection-test.js";
import {
  buildEmbeddingSection,
  buildIndexingSection,
  buildLlmSection,
  buildWorkspaceSection,
  hasConnectionTargetChanged,
} from "./settings.service.sections.js";
import {
  CHAT_COMPLETIONS_COMPATIBLE_LLM_PROVIDERS,
  createApiKeyReentryRequiredError,
  createMissingApiKeyError,
  createUnsupportedLlmProviderError,
  normalizeConnectionTestInput,
  normalizeEmbeddingUpdateInput,
  normalizeIndexingConnectionTestInput,
  normalizeIndexingUpdateInput,
  normalizeLlmUpdateInput,
  normalizeWorkspaceUpdateInput,
} from "./settings.service.validation.js";

const OPENAI_GPT_5_MODEL_PATTERN = /^gpt-5(?:$|[-.])/i;

const buildLlmConnectionTestPayload = ({
  provider,
  model,
}: {
  provider: SettingsLlmProvider;
  model: string;
}) => {
  const basePayload = {
    model,
    messages: [
      {
        role: "user" as const,
        content: "test",
      },
    ],
  };

  if (
    provider === "openai" &&
    OPENAI_GPT_5_MODEL_PATTERN.test(model.trim())
  ) {
    return {
      ...basePayload,
      max_completion_tokens: 8,
    };
  }

  return {
    ...basePayload,
    max_tokens: 8,
  };
};

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
        normalizedInput.provider ??
        currentEmbedding?.provider ??
        fallbackEmbedding.provider;
      const nextBaseUrl =
        normalizedInput.baseUrl ??
        currentEmbedding?.baseUrl ??
        fallbackEmbedding.baseUrl;

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
        normalizedInput.provider ??
        currentLlm?.provider ??
        fallbackLlm.provider;
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
      const baseUrl =
        normalizedInput.baseUrl ?? currentSection?.baseUrl ?? fallback.baseUrl;
      const model =
        normalizedInput.model ?? currentSection?.model ?? fallback.model;

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
        path: "/embeddings",
        payload: {
          model,
          input: ["test"],
        },
        timeoutMs: env.openai.requestTimeoutMs,
      });

      if (
        shouldPersistTestStatus(currentSection, normalizedInput.hasOverrides)
      ) {
        await repository.upsertSettings({
          embedding: {
            provider,
            baseUrl,
            model,
            apiKeyEncrypted: currentSection?.apiKeyEncrypted ?? "",
            apiKeyHint: currentSection?.apiKeyHint ?? "",
            testedAt: result.success
              ? new Date()
              : (currentSection?.testedAt ?? null),
            testStatus: result.success ? "ok" : "failed",
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
          normalizedInput.indexerTimeoutMs ??
          effectiveIndexingConfig.indexerTimeoutMs,
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

      const baseUrl =
        normalizedInput.baseUrl ?? currentSection?.baseUrl ?? fallback.baseUrl;
      const model =
        normalizedInput.model ?? currentSection?.model ?? fallback.model;

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
        path: "/chat/completions",
        payload: buildLlmConnectionTestPayload({
          provider,
          model,
        }),
        timeoutMs: env.openai.requestTimeoutMs,
      });

      if (
        shouldPersistTestStatus(currentSection, normalizedInput.hasOverrides)
      ) {
        await repository.upsertSettings({
          llm: {
            provider,
            baseUrl,
            model,
            apiKeyEncrypted: currentSection?.apiKeyEncrypted ?? "",
            apiKeyHint: currentSection?.apiKeyHint ?? "",
            testedAt: result.success
              ? new Date()
              : (currentSection?.testedAt ?? null),
            testStatus: result.success ? "ok" : "failed",
          },
          updatedAt: new Date(),
          updatedBy: actor.id,
        });
      }

      return result;
    },
  };
};
