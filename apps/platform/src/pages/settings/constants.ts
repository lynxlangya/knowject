import type { ReactNode } from 'react';
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

export const EMBEDDING_PROVIDER_PRESETS: Record<
  SettingsEmbeddingProvider,
  { label: string; baseUrl: string; model: string }
> = {
  openai: {
    label: 'OpenAI',
    baseUrl: 'https://api.openai.com/v1',
    model: 'text-embedding-3-small',
  },
  aliyun: {
    label: '阿里云百炼',
    baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    model: 'text-embedding-v3',
  },
  zhipu: {
    label: '智谱',
    baseUrl: 'https://open.bigmodel.cn/api/paas/v4',
    model: 'embedding-3',
  },
  voyage: {
    label: 'Voyage AI',
    baseUrl: 'https://api.voyageai.com/v1',
    model: 'voyage-3-large',
  },
  custom: {
    label: '自定义',
    baseUrl: '',
    model: '',
  },
};

export const LLM_PROVIDER_PRESETS: Record<
  SettingsLlmProvider,
  { label: string; baseUrl: string; model: string }
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
    label: '阿里云百炼',
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
    label: '智谱 GLM',
    baseUrl: 'https://open.bigmodel.cn/api/paas/v4/',
    model: 'glm-5',
  },
  custom: {
    label: '自定义',
    baseUrl: '',
    model: '',
  },
};

export const SOURCE_META: Record<
  SettingsSource,
  { label: string; color: 'gold' | 'blue' }
> = {
  database: {
    label: '数据库配置',
    color: 'blue',
  },
  environment: {
    label: '环境变量回退',
    color: 'gold',
  },
};

const buildProviderOptions = <TProvider extends string>(
  presets: Record<TProvider, { label: string }>,
): Array<{ value: TProvider; label: string }> => {
  return (Object.entries(presets) as Array<[TProvider, { label: string }]>).map(
    ([value, preset]) => ({
      value,
      label: preset.label,
    }),
  );
};

export const EMBEDDING_PROVIDER_OPTIONS = buildProviderOptions(EMBEDDING_PROVIDER_PRESETS);
export const LLM_PROVIDER_OPTIONS = (
  Object.keys(LLM_PROVIDER_PRESETS) as SettingsLlmProvider[]
).map((provider) => ({
  value: provider,
  label: LLM_PROVIDER_PRESETS[provider].label,
}));

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
    name: settings?.workspace.name ?? '知项 · Knowject',
    description: settings?.workspace.description ?? '',
  };
};

const formatDateTime = (value: string | null): string => {
  if (!value) {
    return '尚未记录';
  }

  return dateTimeFormatter.format(new Date(value));
};

export const buildConnectionFeedback = (
  result: SettingsConnectionTestResponse,
): ConnectionFeedback => {
  if (result.success) {
    return {
      status: 'success',
      message: '连接测试通过',
      detail:
        result.latencyMs !== undefined
          ? `服务响应正常，往返延迟约 ${result.latencyMs}ms。`
          : '服务响应正常。',
    };
  }

  return {
    status: 'error',
    message: '连接测试失败',
    detail: result.error || '远端服务返回了失败结果。',
  };
};

export const buildIndexingConnectionFeedback = (
  result: SettingsIndexingConnectionTestResponse,
): ConnectionFeedback => {
  const summaryParts = [
    result.service ? `服务 ${result.service}` : null,
    result.chromaReachable === true
      ? 'Chroma 可达'
      : result.chromaReachable === false
        ? 'Chroma 不可达'
        : null,
    result.supportedFormats.length > 0
      ? `支持 ${result.supportedFormats.join(' / ')}`
      : null,
    result.chunkSize !== null && result.chunkOverlap !== null
      ? `runtime chunk ${result.chunkSize} / ${result.chunkOverlap}`
      : null,
    result.embeddingProvider ? `embedding ${result.embeddingProvider}` : null,
  ].filter((item): item is string => Boolean(item));

  if (result.success) {
    return {
      status: 'success',
      message: '索引链路测试通过',
      detail: [
        result.latencyMs !== undefined ? `Node 到 indexer 往返约 ${result.latencyMs}ms` : null,
        ...summaryParts,
      ]
        .filter((item): item is string => Boolean(item))
        .join('，'),
    };
  }

  const statusLabel =
    result.indexerStatus === 'degraded'
      ? 'Python indexer 可达，但链路处于降级状态'
      : '当前无法完成 Python indexer diagnostics';

  return {
    status: 'error',
    message: '索引链路测试失败',
    detail: [statusLabel, ...summaryParts, result.error || '索引链路返回失败结果']
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
    return '请输入新的 API Key';
  }

  return current.hasKey ? `已配置（${current.apiKeyHint || '****'}）` : '请输入新的 API Key';
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
        label: '需重新输入 Key',
      };
    }

    if (feedback?.status === 'success') {
      return {
        color: 'green',
        label: '新 Key 已测试',
      };
    }

    return {
      color: 'gold',
      label: '新 Key 待测试',
    };
  }

  if (current.hasKey) {
    return {
      color: 'green',
      label: `已配置 Key ${current.apiKeyHint || ''}`.trim(),
    };
  }

  return {
    color: 'default',
    label: '未保存 Key',
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
    return '当前草稿测试通过';
  }

  if (feedback?.status === 'error') {
    return '当前草稿测试失败，请检查 Key、Base URL 与模型名称。';
  }

  if (hasAiUnsavedChanges(draft, current)) {
    return '当前草稿尚未测试';
  }

  return `最近测试：${formatDateTime(current.testedAt)}，状态 ${
    current.testStatus === 'ok'
      ? '通过'
      : current.testStatus === 'failed'
        ? '失败'
        : '未记录'
  }`;
};

export const buildAiSummary = (settings: SettingsResponse): GlobalAssetSummaryItem[] => {
  return [
    {
      label: '向量模型',
      value: EMBEDDING_PROVIDER_PRESETS[settings.embedding.provider]?.label ?? settings.embedding.provider,
      hint:
        settings.embedding.source === 'database'
          ? '当前由工作区设置接管'
          : '当前仍使用环境变量回退',
    },
    {
      label: '对话模型',
      value: LLM_PROVIDER_PRESETS[settings.llm.provider]?.label ?? settings.llm.provider,
      hint:
        settings.llm.source === 'database'
          ? '配置已进入数据库'
          : '当前仍使用环境变量回退',
    },
    {
      label: '分块策略',
      value: `${settings.indexing.chunkSize} / ${settings.indexing.chunkOverlap}`,
      hint: 'Chunk Size / Chunk Overlap',
    },
    {
      label: '访问阶段',
      value: '登录即可访问',
      hint: '后续再补工作区权限模型',
    },
  ];
};
