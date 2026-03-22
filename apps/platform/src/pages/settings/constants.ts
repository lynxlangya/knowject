import type { ReactNode } from 'react';
import i18n from '../../i18n';
import type {
  SettingsAiConfigResponse,
  SettingsConnectionTestResponse,
  SettingsEmbeddingProvider,
  SettingsIndexingConnectionTestResponse,
  SettingsLlmProvider,
  SettingsResponse,
  SettingsSource,
  SettingsSupportedType,
} from '@api/settings';
import type { GlobalAssetSummaryItem } from '@pages/assets/components/GlobalAssetLayout';

export type SettingsTabKey = 'ai' | 'indexing' | 'workspace' | 'permissions';
export type SaveSection = 'embedding' | 'llm' | 'indexing' | 'workspace' | null;
export type TestSection = 'embedding' | 'llm' | 'indexing' | null;
export type TestableSection = Exclude<TestSection, null>;

export interface AiDraft<TProvider extends string> {
  provider: TProvider;
  baseUrl: string;
  model: string;
  apiKey: string;
}

export interface IndexingDraft {
  chunkSize: number;
  chunkOverlap: number;
  supportedTypes: SettingsSupportedType[];
  indexerTimeoutMs: number;
}

export interface WorkspaceDraft {
  name: string;
  description: string;
}

export interface ConnectionFeedback {
  status: 'success' | 'error';
  message: string;
  detail: string;
}

export interface SettingsConnectionFeedbackState {
  embedding: ConnectionFeedback | null;
  indexing: ConnectionFeedback | null;
  llm: ConnectionFeedback | null;
}

const tp = (key: string, options?: Record<string, unknown>): string => {
  return i18n.t(key, {
    ns: 'pages',
    ...options,
  });
};

export const EMBEDDING_PROVIDER_PRESETS: Record<
  SettingsEmbeddingProvider,
  { label: string; labelKey?: string; baseUrl: string; model: string }
> = {
  openai: {
    label: 'OpenAI',
    baseUrl: 'https://api.openai.com/v1',
    model: 'text-embedding-3-small',
  },
  aliyun: {
    label: 'aliyun',
    labelKey: 'settings.providers.aliyun',
    baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    model: 'text-embedding-v3',
  },
  zhipu: {
    label: 'zhipu',
    labelKey: 'settings.providers.zhipu',
    baseUrl: 'https://open.bigmodel.cn/api/paas/v4',
    model: 'embedding-3',
  },
  voyage: {
    label: 'Voyage AI',
    baseUrl: 'https://api.voyageai.com/v1',
    model: 'voyage-3-large',
  },
  custom: {
    label: 'custom',
    labelKey: 'settings.providers.custom',
    baseUrl: '',
    model: '',
  },
};

export const LLM_PROVIDER_PRESETS: Record<
  SettingsLlmProvider,
  { label: string; labelKey?: string; baseUrl: string; model: string }
> = {
  openai: {
    label: 'OpenAI',
    baseUrl: 'https://api.openai.com/v1',
    model: 'gpt-5.4',
  },
  gemini: {
    label: 'Gemini',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai/',
    model: 'gemini-2.5-flash',
  },
  aliyun: {
    label: 'aliyun',
    labelKey: 'settings.providers.aliyun',
    baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    model: 'qwen3.5-plus',
  },
  deepseek: {
    label: 'DeepSeek',
    baseUrl: 'https://api.deepseek.com',
    model: 'deepseek-chat',
  },
  moonshot: {
    label: 'Kimi',
    baseUrl: 'https://api.moonshot.cn/v1',
    model: 'kimi-k2-turbo-preview',
  },
  zhipu: {
    label: 'zhipu-glm',
    labelKey: 'settings.providers.zhipuGlm',
    baseUrl: 'https://open.bigmodel.cn/api/paas/v4/',
    model: 'glm-5',
  },
  custom: {
    label: 'custom',
    labelKey: 'settings.providers.custom',
    baseUrl: '',
    model: '',
  },
};

const resolvePresetLabel = (preset: { label: string; labelKey?: string }): string => {
  return preset.labelKey ? tp(preset.labelKey) : preset.label;
};

export const getEmbeddingProviderOptions = (): Array<{
  value: SettingsEmbeddingProvider;
  label: string;
}> => {
  return (Object.keys(EMBEDDING_PROVIDER_PRESETS) as SettingsEmbeddingProvider[]).map(
    (provider) => ({
      value: provider,
      label: resolvePresetLabel(EMBEDDING_PROVIDER_PRESETS[provider]),
    }),
  );
};

export const getLlmProviderOptions = (): Array<{
  value: SettingsLlmProvider;
  label: string;
}> => {
  return (Object.keys(LLM_PROVIDER_PRESETS) as SettingsLlmProvider[]).map(
    (provider) => ({
      value: provider,
      label: resolvePresetLabel(LLM_PROVIDER_PRESETS[provider]),
    }),
  );
};

export const SOURCE_META: Record<
  SettingsSource,
  { labelKey: string; color: 'gold' | 'blue' }
> = {
  database: {
    labelKey: 'settings.sources.database',
    color: 'blue',
  },
  environment: {
    labelKey: 'settings.sources.environment',
    color: 'gold',
  },
};

const dateTimeFormatter = new Intl.DateTimeFormat('zh-CN', {
  dateStyle: 'medium',
  timeStyle: 'short',
});

export const getInitialEmbeddingDraft = (
  settings: SettingsResponse | null,
): AiDraft<SettingsEmbeddingProvider> => {
  return {
    provider: settings?.embedding.provider ?? 'openai',
    baseUrl: settings?.embedding.baseUrl ?? EMBEDDING_PROVIDER_PRESETS.openai.baseUrl,
    model: settings?.embedding.model ?? EMBEDDING_PROVIDER_PRESETS.openai.model,
    apiKey: '',
  };
};

export const getInitialLlmDraft = (
  settings: SettingsResponse | null,
): AiDraft<SettingsLlmProvider> => {
  return {
    provider: settings?.llm.provider ?? 'openai',
    baseUrl: settings?.llm.baseUrl ?? LLM_PROVIDER_PRESETS.openai.baseUrl,
    model: settings?.llm.model ?? LLM_PROVIDER_PRESETS.openai.model,
    apiKey: '',
  };
};

export const getInitialIndexingDraft = (
  settings: SettingsResponse | null,
): IndexingDraft => {
  return {
    chunkSize: settings?.indexing.chunkSize ?? 1000,
    chunkOverlap: settings?.indexing.chunkOverlap ?? 200,
    supportedTypes:
      (settings?.indexing.supportedTypes as SettingsSupportedType[] | undefined) ?? [
        'md',
        'txt',
        'pdf',
        'docx',
        'xlsx',
      ],
    indexerTimeoutMs: settings?.indexing.indexerTimeoutMs ?? 30000,
  };
};

export const getInitialWorkspaceDraft = (
  settings: SettingsResponse | null,
): WorkspaceDraft => {
  return {
    name: settings?.workspace.name ?? tp('settings.workspace.placeholderName'),
    description: settings?.workspace.description ?? '',
  };
};

const formatDateTime = (value: string | null): string => {
  if (!value) {
    return tp('settings.keyStatus.statusUnknown');
  }

  return dateTimeFormatter.format(new Date(value));
};

export const buildConnectionFeedback = (
  result: SettingsConnectionTestResponse,
): ConnectionFeedback => {
  if (result.success) {
    return {
      status: 'success',
      message: tp('settings.feedback.success'),
      detail:
        result.latencyMs !== undefined
          ? tp('settings.feedback.successWithLatency', {
              latencyMs: result.latencyMs,
            })
          : tp('settings.feedback.successNoLatency'),
    };
  }

  return {
    status: 'error',
    message: tp('settings.feedback.failed'),
    detail: result.error || tp('settings.feedback.remoteFailed'),
  };
};

export const buildIndexingConnectionFeedback = (
  result: SettingsIndexingConnectionTestResponse,
): ConnectionFeedback => {
  const summaryParts = [
    result.service
      ? tp('settings.feedback.serviceLabel', {
          service: result.service,
        })
      : null,
    result.chromaReachable === true
      ? tp('settings.feedback.chromaReachable')
      : result.chromaReachable === false
        ? tp('settings.feedback.chromaUnreachable')
        : null,
    result.supportedFormats.length > 0
      ? tp('settings.feedback.supportsFormats', {
          formats: result.supportedFormats.join(' / '),
        })
      : null,
    result.chunkSize !== null && result.chunkOverlap !== null
      ? tp('settings.feedback.runtimeChunk', {
          chunkSize: result.chunkSize,
          chunkOverlap: result.chunkOverlap,
        })
      : null,
    result.embeddingProvider
      ? tp('settings.feedback.embeddingProvider', {
          provider: result.embeddingProvider,
        })
      : null,
  ].filter((item): item is string => Boolean(item));

  if (result.success) {
    return {
      status: 'success',
      message: tp('settings.feedback.indexingSuccess'),
      detail: [
        result.latencyMs !== undefined
          ? tp('settings.feedback.indexingLatency', {
              latencyMs: result.latencyMs,
            })
          : null,
        ...summaryParts,
      ]
        .filter((item): item is string => Boolean(item))
        .join('，'),
    };
  }

  const statusLabel =
    result.indexerStatus === 'degraded'
      ? tp('settings.feedback.indexerDegraded')
      : tp('settings.feedback.indexerUnavailable');

  return {
    status: 'error',
    message: tp('settings.feedback.indexingFailed'),
    detail: [
      statusLabel,
      ...summaryParts,
      result.error || tp('settings.feedback.indexingRemoteFailed'),
    ]
      .filter((item): item is string => Boolean(item))
      .join('，'),
  };
};

const normalizeDraftValue = (value: string): string => value.trim();

export const hasAiServiceTargetChanged = <TProvider extends string>(
  draft: AiDraft<TProvider>,
  current: SettingsAiConfigResponse<TProvider>,
): boolean => {
  return (
    draft.provider !== current.provider ||
    normalizeDraftValue(draft.baseUrl) !== current.baseUrl
  );
};

export const hasAiDefinitionChanged = <TProvider extends string>(
  draft: AiDraft<TProvider>,
  current: SettingsAiConfigResponse<TProvider>,
): boolean => {
  return (
    draft.provider !== current.provider ||
    normalizeDraftValue(draft.model) !== current.model
  );
};

const hasAiUnsavedChanges = <TProvider extends string>(
  draft: AiDraft<TProvider>,
  current: SettingsAiConfigResponse<TProvider>,
): boolean => {
  return (
    hasAiServiceTargetChanged(draft, current) ||
    normalizeDraftValue(draft.model) !== current.model ||
    draft.apiKey.trim().length > 0
  );
};

export const requiresFreshApiKey = <TProvider extends string>(
  draft: AiDraft<TProvider>,
  current: SettingsAiConfigResponse<TProvider>,
): boolean => {
  return current.source === 'environment' || !current.hasKey || hasAiServiceTargetChanged(draft, current);
};

export const getAiKeyPlaceholder = <TProvider extends string>(
  draft: AiDraft<TProvider>,
  current: SettingsAiConfigResponse<TProvider>,
): string => {
  if (requiresFreshApiKey(draft, current)) {
    return tp('settings.keyStatus.enterNewApiKey');
  }

  return current.hasKey
    ? tp('settings.keyStatus.configuredMask', {
        hint: current.apiKeyHint || '****',
      })
    : tp('settings.keyStatus.enterNewApiKey');
};

export const getAiKeyStatusTag = <TProvider extends string>({
  draft,
  current,
  feedback,
}: {
  draft: AiDraft<TProvider>;
  current: SettingsAiConfigResponse<TProvider>;
  feedback: ConnectionFeedback | null;
}): { color: 'default' | 'gold' | 'green'; label: string } => {
  if (hasAiServiceTargetChanged(draft, current)) {
    if (!draft.apiKey.trim()) {
      return {
        color: 'gold',
        label: tp('settings.keyStatus.newKeyRequired'),
      };
    }

    if (feedback?.status === 'success') {
      return {
        color: 'green',
        label: tp('settings.keyStatus.newKeyTested'),
      };
    }

    return {
      color: 'gold',
      label: tp('settings.keyStatus.newKeyPending'),
    };
  }

  if (current.hasKey) {
    return {
      color: 'green',
      label: tp('settings.keyStatus.configuredKey', {
        hint: current.apiKeyHint || '',
      }).trim(),
    };
  }

  return {
    color: 'default',
    label: tp('settings.keyStatus.unsavedKey'),
  };
};

export const getAiTestHint = <TProvider extends string>({
  draft,
  current,
  feedback,
}: {
  draft: AiDraft<TProvider>;
  current: SettingsAiConfigResponse<TProvider>;
  feedback: ConnectionFeedback | null;
}): ReactNode => {
  if (feedback?.status === 'success') {
    return tp('settings.keyStatus.currentDraftPassed');
  }

  if (feedback?.status === 'error') {
    return tp('settings.keyStatus.currentDraftFailed');
  }

  if (hasAiUnsavedChanges(draft, current)) {
    return tp('settings.keyStatus.currentDraftPending');
  }

  return tp('settings.keyStatus.lastTested', {
    time: formatDateTime(current.testedAt),
    status:
      current.testStatus === 'ok'
        ? tp('settings.keyStatus.statusOk')
        : current.testStatus === 'failed'
          ? tp('settings.keyStatus.statusFailed')
          : tp('settings.keyStatus.statusUnknown'),
  });
};

export const buildAiSummary = (settings: SettingsResponse): GlobalAssetSummaryItem[] => {
  return [
    {
      label: tp('settings.summary.embeddingModel'),
      value:
        resolvePresetLabel(EMBEDDING_PROVIDER_PRESETS[settings.embedding.provider]) ??
        settings.embedding.provider,
      hint:
        settings.embedding.source === 'database'
          ? tp('settings.summary.embeddingManaged')
          : tp('settings.summary.embeddingEnvironment'),
    },
    {
      label: tp('settings.summary.chatModel'),
      value:
        resolvePresetLabel(LLM_PROVIDER_PRESETS[settings.llm.provider]) ??
        settings.llm.provider,
      hint:
        settings.llm.source === 'database'
          ? tp('settings.summary.chatManaged')
          : tp('settings.summary.chatEnvironment'),
    },
    {
      label: tp('settings.summary.chunkStrategy'),
      value: `${settings.indexing.chunkSize} / ${settings.indexing.chunkOverlap}`,
      hint: tp('settings.summary.chunkHint'),
    },
    {
      label: tp('settings.summary.accessStage'),
      value: tp('settings.summary.signedInAccess'),
      hint: tp('settings.summary.accessHint'),
    },
  ];
};
