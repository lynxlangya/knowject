import type { SettingsLlmProvider } from "@modules/settings/settings.types.js";

export interface ProjectConversationProviderCapabilities {
  chatSupported: boolean;
  streamingSupported: boolean;
  testSupported: boolean;
}

const DEFAULT_PROJECT_CONVERSATION_PROVIDER_CAPABILITIES: ProjectConversationProviderCapabilities =
  {
    chatSupported: false,
    streamingSupported: false,
    testSupported: false,
  };

const PROJECT_CONVERSATION_PROVIDER_CAPABILITY_MAP: Record<
  SettingsLlmProvider,
  ProjectConversationProviderCapabilities
> = {
  openai: {
    chatSupported: true,
    streamingSupported: true,
    testSupported: true,
  },
  gemini: {
    chatSupported: true,
    streamingSupported: true,
    testSupported: true,
  },
  aliyun: {
    chatSupported: true,
    streamingSupported: true,
    testSupported: true,
  },
  deepseek: {
    chatSupported: true,
    streamingSupported: true,
    testSupported: true,
  },
  moonshot: {
    chatSupported: true,
    streamingSupported: true,
    testSupported: true,
  },
  zhipu: {
    chatSupported: true,
    streamingSupported: true,
    testSupported: true,
  },
  custom: {
    chatSupported: true,
    streamingSupported: true,
    testSupported: true,
  },
};

export const getProjectConversationProviderCapabilities = (
  provider: string,
): ProjectConversationProviderCapabilities => {
  return (
    PROJECT_CONVERSATION_PROVIDER_CAPABILITY_MAP[
      provider as SettingsLlmProvider
    ] ?? DEFAULT_PROJECT_CONVERSATION_PROVIDER_CAPABILITIES
  );
};

export const isProjectConversationChatSupported = (provider: string): boolean => {
  return getProjectConversationProviderCapabilities(provider).chatSupported;
};

export const isProjectConversationStreamingSupported = (
  provider: string,
): boolean => {
  return getProjectConversationProviderCapabilities(provider).streamingSupported;
};

