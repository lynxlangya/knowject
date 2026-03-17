import {
  ApiOutlined,
  CheckCircleOutlined,
  DatabaseOutlined,
  ReloadOutlined,
  RobotOutlined,
  TeamOutlined,
  ToolOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import {
  Alert,
  App,
  Button,
  Card,
  Checkbox,
  Col,
  Empty,
  Flex,
  Input,
  InputNumber,
  Row,
  Skeleton,
  Select,
  Slider,
  Space,
  Tabs,
  Tag,
  Typography,
} from 'antd';
import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { extractApiErrorMessage } from '@api/error';
import {
  getSettings,
  testEmbeddingSettings,
  testIndexingSettings,
  testLlmSettings,
  updateEmbeddingSettings,
  updateIndexingSettings,
  updateLlmSettings,
  updateWorkspaceSettings,
  type SettingsAiConfigResponse,
  type SettingsConnectionTestResponse,
  type SettingsEmbeddingProvider,
  type SettingsIndexingConnectionTestResponse,
  type SettingsLlmProvider,
  type SettingsResponse,
  type SettingsSource,
  type SettingsSupportedType,
} from '@api/settings';
import { PATHS } from '@app/navigation/paths';
import {
  GlobalAssetPageHeader,
  type GlobalAssetSummaryItem,
} from '@pages/assets/components/GlobalAssetLayout';

type SettingsTabKey = 'ai' | 'indexing' | 'workspace' | 'permissions';
type SaveSection = 'embedding' | 'llm' | 'indexing' | 'workspace' | null;
type TestSection = 'embedding' | 'llm' | 'indexing' | null;
type TestableSection = Exclude<TestSection, null>;

interface AiDraft<TProvider extends string> {
  provider: TProvider;
  baseUrl: string;
  model: string;
  apiKey: string;
}

interface IndexingDraft {
  chunkSize: number;
  chunkOverlap: number;
  supportedTypes: SettingsSupportedType[];
  indexerTimeoutMs: number;
}

interface WorkspaceDraft {
  name: string;
  description: string;
}

interface ConnectionFeedback {
  status: 'success' | 'error';
  message: string;
  detail: string;
}

const { Title, Paragraph, Text } = Typography;
const { TextArea, Password } = Input;

const EMBEDDING_PROVIDER_PRESETS: Record<
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

const LLM_PROVIDER_PRESETS: Record<
  SettingsLlmProvider,
  { label: string; baseUrl: string; model: string }
> = {
  openai: {
    label: 'OpenAI',
    baseUrl: 'https://api.openai.com/v1',
    model: 'gpt-5.4',
  },
  aliyun: {
    label: '阿里云百炼',
    baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    model: 'qwen-max',
  },
  anthropic: {
    label: 'Anthropic',
    baseUrl: 'https://api.anthropic.com',
    model: 'claude-sonnet-4-6',
  },
  custom: {
    label: '自定义',
    baseUrl: '',
    model: '',
  },
};

const SOURCE_META: Record<
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

const EMBEDDING_PROVIDER_OPTIONS = buildProviderOptions(EMBEDDING_PROVIDER_PRESETS);
const LLM_PROVIDER_OPTIONS = buildProviderOptions(LLM_PROVIDER_PRESETS);

const dateTimeFormatter = new Intl.DateTimeFormat('zh-CN', {
  dateStyle: 'medium',
  timeStyle: 'short',
});

const getInitialEmbeddingDraft = (
  settings: SettingsResponse | null,
): AiDraft<SettingsEmbeddingProvider> => {
  return {
    provider: settings?.embedding.provider ?? 'openai',
    baseUrl: settings?.embedding.baseUrl ?? EMBEDDING_PROVIDER_PRESETS.openai.baseUrl,
    model: settings?.embedding.model ?? EMBEDDING_PROVIDER_PRESETS.openai.model,
    apiKey: '',
  };
};

const getInitialLlmDraft = (
  settings: SettingsResponse | null,
): AiDraft<SettingsLlmProvider> => {
  return {
    provider: settings?.llm.provider ?? 'openai',
    baseUrl: settings?.llm.baseUrl ?? LLM_PROVIDER_PRESETS.openai.baseUrl,
    model: settings?.llm.model ?? LLM_PROVIDER_PRESETS.openai.model,
    apiKey: '',
  };
};

const getInitialIndexingDraft = (
  settings: SettingsResponse | null,
): IndexingDraft => {
  return {
    chunkSize: settings?.indexing.chunkSize ?? 1000,
    chunkOverlap: settings?.indexing.chunkOverlap ?? 200,
    supportedTypes:
      (settings?.indexing.supportedTypes as SettingsSupportedType[] | undefined) ?? ['md', 'txt'],
    indexerTimeoutMs: settings?.indexing.indexerTimeoutMs ?? 30000,
  };
};

const getInitialWorkspaceDraft = (
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

const buildConnectionFeedback = (
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

const buildIndexingConnectionFeedback = (
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

const hasAiServiceTargetChanged = <TProvider extends string>(
  draft: AiDraft<TProvider>,
  current: SettingsAiConfigResponse<TProvider>,
): boolean => {
  return (
    draft.provider !== current.provider ||
    normalizeDraftValue(draft.baseUrl) !== current.baseUrl
  );
};

const hasAiDefinitionChanged = <TProvider extends string>(
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

const requiresFreshApiKey = <TProvider extends string>(
  draft: AiDraft<TProvider>,
  current: SettingsAiConfigResponse<TProvider>,
): boolean => {
  return current.source === 'environment' || !current.hasKey || hasAiServiceTargetChanged(draft, current);
};

const getAiKeyPlaceholder = <TProvider extends string>(
  draft: AiDraft<TProvider>,
  current: SettingsAiConfigResponse<TProvider>,
): string => {
  if (requiresFreshApiKey(draft, current)) {
    return '请输入新的 API Key';
  }

  return current.hasKey ? `已配置（${current.apiKeyHint || '****'}）` : '请输入新的 API Key';
};

const getAiKeyStatusTag = <TProvider extends string>({
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

const getAiTestHint = <TProvider extends string>({
  draft,
  current,
  feedback,
}: {
  draft: AiDraft<TProvider>;
  current: SettingsAiConfigResponse<TProvider>;
  feedback: ConnectionFeedback | null;
}): React.ReactNode => {
  if (feedback?.status === 'success') {
    return '当前草稿测试通过';
  }

  if (feedback?.status === 'error') {
    return '当前草稿测试失败，请检查 Key、Base URL 与模型名称。';
  }

  if (hasAiUnsavedChanges(draft, current)) {
    return '当前草稿尚未测试';
  }

  return (
    <>
      最近测试：{formatDateTime(current.testedAt)}，状态{' '}
      {current.testStatus === 'ok'
        ? '通过'
        : current.testStatus === 'failed'
          ? '失败'
          : '未记录'}
    </>
  );
};

const buildAiSummary = (settings: SettingsResponse): GlobalAssetSummaryItem[] => {
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

const SectionBlock = ({
  title,
  description,
  extra,
  children,
}: {
  title: string;
  description: string;
  extra?: React.ReactNode;
  children: React.ReactNode;
}) => {
  return (
    <Card
      style={{
        borderRadius: 20,
        boxShadow: '0 14px 32px rgba(15, 23, 42, 0.06)',
      }}
    >
      <Flex justify="space-between" align="flex-start" gap={16} wrap>
        <div style={{ maxWidth: 640 }}>
          <Title level={5} style={{ margin: 0, color: '#0f172a' }}>
            {title}
          </Title>
          <Paragraph
            type="secondary"
            style={{
              marginTop: 6,
              marginBottom: 0,
              fontSize: 14,
              lineHeight: 1.7,
              color: 'rgba(100, 116, 139, 0.94)',
            }}
          >
            {description}
          </Paragraph>
        </div>
        {extra}
      </Flex>

      <div style={{ marginTop: 20 }}>{children}</div>
    </Card>
  );
};

const SettingField = ({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: React.ReactNode;
  children: React.ReactNode;
}) => {
  return (
    <Space orientation="vertical" size={8} style={{ width: '100%' }}>
      <Text strong style={{ color: '#0f172a' }}>
        {label}
      </Text>
      {children}
      {hint ? (
        <Text type="secondary" style={{ display: 'block' }}>
          {hint}
        </Text>
      ) : null}
    </Space>
  );
};

export const SettingsPage = () => {
  const navigate = useNavigate();
  const { message } = App.useApp();
  const [activeTab, setActiveTab] = useState<SettingsTabKey>('ai');
  const [settings, setSettings] = useState<SettingsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [compactTabs, setCompactTabs] = useState<boolean>(
    () => typeof window !== 'undefined' && window.innerWidth < 1040,
  );
  const [savingSection, setSavingSection] = useState<SaveSection>(null);
  const [testingSection, setTestingSection] = useState<TestSection>(null);
  const [embeddingDraft, setEmbeddingDraft] = useState<AiDraft<SettingsEmbeddingProvider>>(
    getInitialEmbeddingDraft(null),
  );
  const [llmDraft, setLlmDraft] = useState<AiDraft<SettingsLlmProvider>>(
    getInitialLlmDraft(null),
  );
  const [indexingDraft, setIndexingDraft] = useState<IndexingDraft>(
    getInitialIndexingDraft(null),
  );
  const [workspaceDraft, setWorkspaceDraft] = useState<WorkspaceDraft>(
    getInitialWorkspaceDraft(null),
  );
  const [embeddingRebuildPending, setEmbeddingRebuildPending] = useState(false);
  const [connectionFeedback, setConnectionFeedback] = useState<{
    embedding: ConnectionFeedback | null;
    indexing: ConnectionFeedback | null;
    llm: ConnectionFeedback | null;
  }>({
    embedding: null,
    indexing: null,
    llm: null,
  });

  const syncDrafts = useCallback((nextSettings: SettingsResponse) => {
    setSettings(nextSettings);
    setEmbeddingDraft(getInitialEmbeddingDraft(nextSettings));
    setLlmDraft(getInitialLlmDraft(nextSettings));
    setIndexingDraft(getInitialIndexingDraft(nextSettings));
    setWorkspaceDraft(getInitialWorkspaceDraft(nextSettings));
    setConnectionFeedback({
      embedding: null,
      indexing: null,
      llm: null,
    });
  }, []);

  const loadSettings = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await getSettings();
      syncDrafts(response);
    } catch (currentError) {
      console.error('[SettingsPage] 加载设置失败:', currentError);
      setError(extractApiErrorMessage(currentError, '加载设置失败，请稍后重试'));
    } finally {
      setLoading(false);
    }
  }, [syncDrafts]);

  useEffect(() => {
    void loadSettings();
  }, [loadSettings]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }

    const mediaQuery = window.matchMedia('(max-width: 1040px)');
    const handleChange = () => {
      setCompactTabs(mediaQuery.matches);
    };

    handleChange();
    mediaQuery.addEventListener('change', handleChange);

    return () => {
      mediaQuery.removeEventListener('change', handleChange);
    };
  }, []);

  const resetConnectionFeedback = useCallback((section: TestableSection) => {
    setConnectionFeedback((current) => ({
      ...current,
      [section]: null,
    }));
  }, []);

  const indexingNeedsRebuild = Boolean(
    settings &&
      (indexingDraft.chunkSize !== settings.indexing.chunkSize ||
        indexingDraft.chunkOverlap !== settings.indexing.chunkOverlap),
  );

  const handleEmbeddingProviderChange = (provider: SettingsEmbeddingProvider) => {
    const preset = EMBEDDING_PROVIDER_PRESETS[provider];
    resetConnectionFeedback('embedding');
    setEmbeddingDraft((current) => ({
      ...current,
      provider,
      baseUrl: preset.baseUrl,
      model: preset.model,
      apiKey: '',
    }));
  };

  const handleLlmProviderChange = (provider: SettingsLlmProvider) => {
    const preset = LLM_PROVIDER_PRESETS[provider];
    resetConnectionFeedback('llm');
    setLlmDraft((current) => ({
      ...current,
      provider,
      baseUrl: preset.baseUrl,
      model: preset.model,
      apiKey: '',
    }));
  };

  const handleSaveEmbedding = async () => {
    if (!settings) {
      return;
    }

    if (!embeddingDraft.baseUrl.trim() || !embeddingDraft.model.trim()) {
      message.error('请先完善向量模型的 Base URL 和模型名称');
      return;
    }

    const serviceTargetChanged = hasAiServiceTargetChanged(embeddingDraft, settings.embedding);
    const definitionChanged = hasAiDefinitionChanged(embeddingDraft, settings.embedding);

    if (requiresFreshApiKey(embeddingDraft, settings.embedding) && !embeddingDraft.apiKey.trim()) {
      message.error(
        serviceTargetChanged
          ? '你已切换到新的模型服务，请重新输入新的 API Key'
          : '当前仍使用环境变量 Key，如需保存为工作区配置，请重新输入新的 API Key',
      );
      return;
    }

    setSavingSection('embedding');

    try {
      const nextSettings = await updateEmbeddingSettings({
        provider: embeddingDraft.provider,
        baseUrl: embeddingDraft.baseUrl.trim(),
        model: embeddingDraft.model.trim(),
        ...(embeddingDraft.apiKey.trim()
          ? {
              apiKey: embeddingDraft.apiKey.trim(),
            }
          : {}),
      });

      syncDrafts(nextSettings);
      setEmbeddingRebuildPending((current) => current || definitionChanged);
      message.success(
        definitionChanged
          ? '向量模型配置已保存，已有知识库需要重建索引'
          : '向量模型配置已保存',
      );
    } catch (currentError) {
      message.error(
        extractApiErrorMessage(currentError, '保存向量模型配置失败，请稍后重试'),
      );
    } finally {
      setSavingSection(null);
    }
  };

  const handleSaveLlm = async () => {
    if (!settings) {
      return;
    }

    if (!llmDraft.baseUrl.trim() || !llmDraft.model.trim()) {
      message.error('请先完善对话模型的 Base URL 和模型名称');
      return;
    }

    const serviceTargetChanged = hasAiServiceTargetChanged(llmDraft, settings.llm);

    if (requiresFreshApiKey(llmDraft, settings.llm) && !llmDraft.apiKey.trim()) {
      message.error(
        serviceTargetChanged
          ? '你已切换到新的模型服务，请重新输入新的 API Key'
          : '当前仍使用环境变量 Key，如需保存为工作区配置，请重新输入新的 API Key',
      );
      return;
    }

    setSavingSection('llm');

    try {
      const nextSettings = await updateLlmSettings({
        provider: llmDraft.provider,
        baseUrl: llmDraft.baseUrl.trim(),
        model: llmDraft.model.trim(),
        ...(llmDraft.apiKey.trim()
          ? {
              apiKey: llmDraft.apiKey.trim(),
            }
          : {}),
      });

      syncDrafts(nextSettings);
      message.success('对话模型配置已保存');
    } catch (currentError) {
      message.error(
        extractApiErrorMessage(currentError, '保存对话模型配置失败，请稍后重试'),
      );
    } finally {
      setSavingSection(null);
    }
  };

  const handleSaveIndexing = async () => {
    if (indexingDraft.chunkOverlap >= indexingDraft.chunkSize) {
      message.error('Chunk 重叠必须小于 Chunk 大小');
      return;
    }

    if (indexingDraft.supportedTypes.length === 0) {
      message.error('至少需要保留一种可索引文件类型');
      return;
    }

    setSavingSection('indexing');

    try {
      const nextSettings = await updateIndexingSettings({
        chunkSize: indexingDraft.chunkSize,
        chunkOverlap: indexingDraft.chunkOverlap,
        supportedTypes: indexingDraft.supportedTypes,
        indexerTimeoutMs: indexingDraft.indexerTimeoutMs,
      });

      syncDrafts(nextSettings);
      message.success('索引参数已保存');
    } catch (currentError) {
      message.error(
        extractApiErrorMessage(currentError, '保存索引参数失败，请稍后重试'),
      );
    } finally {
      setSavingSection(null);
    }
  };

  const handleSaveWorkspace = async () => {
    if (!workspaceDraft.name.trim()) {
      message.error('请输入工作区名称');
      return;
    }

    if (workspaceDraft.description.trim().length > 200) {
      message.error('工作区描述不能超过 200 个字符');
      return;
    }

    setSavingSection('workspace');

    try {
      const nextSettings = await updateWorkspaceSettings({
        name: workspaceDraft.name.trim(),
        description: workspaceDraft.description.trim(),
      });

      syncDrafts(nextSettings);
      message.success('工作区信息已保存');
    } catch (currentError) {
      message.error(
        extractApiErrorMessage(currentError, '保存工作区信息失败，请稍后重试'),
      );
    } finally {
      setSavingSection(null);
    }
  };

  const handleTestEmbedding = async () => {
    if (!settings) {
      return;
    }

    if (!embeddingDraft.baseUrl.trim() || !embeddingDraft.model.trim()) {
      message.error('请先完善向量模型的 Base URL 和模型名称');
      return;
    }

    if (requiresFreshApiKey(embeddingDraft, settings.embedding) && !embeddingDraft.apiKey.trim()) {
      message.error(
        hasAiServiceTargetChanged(embeddingDraft, settings.embedding)
          ? '你已切换到新的模型服务，请先输入新的 API Key 再测试连接'
          : '请先输入新的 API Key 再测试连接',
      );
      return;
    }

    setTestingSection('embedding');
    resetConnectionFeedback('embedding');

    try {
      const result = await testEmbeddingSettings({
        provider: embeddingDraft.provider,
        baseUrl: embeddingDraft.baseUrl.trim(),
        model: embeddingDraft.model.trim(),
        ...(embeddingDraft.apiKey.trim()
          ? {
              apiKey: embeddingDraft.apiKey.trim(),
            }
          : {}),
      });

      setConnectionFeedback((current) => ({
        ...current,
        embedding: buildConnectionFeedback(result),
      }));
    } catch (currentError) {
      setConnectionFeedback((current) => ({
        ...current,
        embedding: {
          status: 'error',
          message: '连接测试失败',
          detail: extractApiErrorMessage(currentError, '向量模型连接测试失败'),
        },
      }));
    } finally {
      setTestingSection(null);
    }
  };

  const handleTestLlm = async () => {
    if (!settings) {
      return;
    }

    if (!llmDraft.baseUrl.trim() || !llmDraft.model.trim()) {
      message.error('请先完善对话模型的 Base URL 和模型名称');
      return;
    }

    if (requiresFreshApiKey(llmDraft, settings.llm) && !llmDraft.apiKey.trim()) {
      message.error(
        hasAiServiceTargetChanged(llmDraft, settings.llm)
          ? '你已切换到新的模型服务，请先输入新的 API Key 再测试连接'
          : '请先输入新的 API Key 再测试连接',
      );
      return;
    }

    setTestingSection('llm');
    resetConnectionFeedback('llm');

    try {
      const result = await testLlmSettings({
        provider: llmDraft.provider,
        baseUrl: llmDraft.baseUrl.trim(),
        model: llmDraft.model.trim(),
        ...(llmDraft.apiKey.trim()
          ? {
              apiKey: llmDraft.apiKey.trim(),
            }
          : {}),
      });

      setConnectionFeedback((current) => ({
        ...current,
        llm: buildConnectionFeedback(result),
      }));
    } catch (currentError) {
      setConnectionFeedback((current) => ({
        ...current,
        llm: {
          status: 'error',
          message: '连接测试失败',
          detail: extractApiErrorMessage(currentError, '对话模型连接测试失败'),
        },
      }));
    } finally {
      setTestingSection(null);
    }
  };

  const handleTestIndexing = async () => {
    setTestingSection('indexing');
    resetConnectionFeedback('indexing');

    try {
      const result = await testIndexingSettings({
        indexerTimeoutMs: indexingDraft.indexerTimeoutMs,
      });

      setConnectionFeedback((current) => ({
        ...current,
        indexing: buildIndexingConnectionFeedback(result),
      }));
    } catch (currentError) {
      setConnectionFeedback((current) => ({
        ...current,
        indexing: {
          status: 'error',
          message: '索引链路测试失败',
          detail: extractApiErrorMessage(currentError, '索引链路测试失败'),
        },
      }));
    } finally {
      setTestingSection(null);
    }
  };

  if (loading) {
    return (
      <Space orientation="vertical" size={24} style={{ width: '100%' }}>
        <Card
          style={{
            borderRadius: 24,
            background:
              'linear-gradient(135deg, rgba(246, 247, 239, 0.96), rgba(255, 255, 255, 0.98) 50%, rgba(236, 244, 255, 0.98))',
          }}
        >
          <Skeleton active paragraph={{ rows: 3 }} />
        </Card>
        <Card style={{ borderRadius: 24 }}>
          <Skeleton active paragraph={{ rows: 10 }} />
        </Card>
      </Space>
    );
  }

  if (error || !settings) {
    return (
      <Card style={{ borderRadius: 24 }}>
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={error || '设置数据暂时不可用'}
        >
          <Button type="primary" icon={<ReloadOutlined />} onClick={() => void loadSettings()}>
            重新加载
          </Button>
        </Empty>
      </Card>
    );
  }

  const embeddingServiceTargetChanged = hasAiServiceTargetChanged(
    embeddingDraft,
    settings.embedding,
  );
  const embeddingDefinitionChanged = hasAiDefinitionChanged(
    embeddingDraft,
    settings.embedding,
  );
  const embeddingDraftTestPassed = connectionFeedback.embedding?.status === 'success';
  const embeddingKeyTag = getAiKeyStatusTag({
    draft: embeddingDraft,
    current: settings.embedding,
    feedback: connectionFeedback.embedding,
  });
  const embeddingTestHint = getAiTestHint({
    draft: embeddingDraft,
    current: settings.embedding,
    feedback: connectionFeedback.embedding,
  });
  const showEmbeddingServiceChangeNotice =
    embeddingServiceTargetChanged &&
    connectionFeedback.embedding === null &&
    !embeddingDraftTestPassed;
  const showEmbeddingPreSaveRebuildNotice =
    embeddingDefinitionChanged && embeddingDraftTestPassed;

  const llmServiceTargetChanged = hasAiServiceTargetChanged(llmDraft, settings.llm);
  const llmKeyTag = getAiKeyStatusTag({
    draft: llmDraft,
    current: settings.llm,
    feedback: connectionFeedback.llm,
  });
  const llmTestHint = getAiTestHint({
    draft: llmDraft,
    current: settings.llm,
    feedback: connectionFeedback.llm,
  });
  const showLlmServiceChangeNotice =
    llmServiceTargetChanged &&
    connectionFeedback.llm === null;

  const summaryItems = buildAiSummary(settings);

  return (
    <Space orientation="vertical" size={24} style={{ width: '100%' }}>
      <GlobalAssetPageHeader
        title="设置中心"
        subtitle="在这里统一接管向量模型、对话模型、索引参数和工作区基本信息。本期设置接口先对所有已登录用户开放，后续如引入工作区管理员权限，再收紧到更严格的访问模型。"
        summaryItems={summaryItems}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => navigate(PATHS.knowledge)}>
              前往知识库管理
            </Button>
            <Button
              type="primary"
              icon={<ReloadOutlined />}
              onClick={() => void loadSettings()}
            >
              刷新配置
            </Button>
          </div>
        }
      />

      <Card style={{ borderRadius: 28, boxShadow: '0 18px 40px rgba(15, 23, 42, 0.06)' }}>
        <Tabs
          activeKey={activeTab}
          onChange={(key) => setActiveTab(key as SettingsTabKey)}
          tabPlacement={compactTabs ? 'top' : 'start'}
          items={[
            {
              key: 'ai',
              label: (
                <Space size={8}>
                  <RobotOutlined />
                  AI 模型
                </Space>
              ),
              children: (
                <Space orientation="vertical" size={20} style={{ width: '100%' }}>
                  <SectionBlock
                    title="向量模型（Embedding）"
                    description="用于知识库索引与检索。修改 provider 或 model 后，已有知识库需要重建索引才能使用新的向量语义。"
                    extra={
                      <Space size={8} wrap>
                        <Tag color={SOURCE_META[settings.embedding.source].color}>
                          {SOURCE_META[settings.embedding.source].label}
                        </Tag>
                        <Tag color={embeddingKeyTag.color}>
                          {embeddingKeyTag.label}
                        </Tag>
                      </Space>
                    }
                  >
                    <Space orientation="vertical" size={16} style={{ width: '100%' }}>
                      {settings.embedding.source === 'environment' &&
                      !embeddingServiceTargetChanged ? (
                        <Alert
                          type="info"
                          showIcon
                          title="当前使用环境变量配置"
                          description="如果你要把向量模型正式保存为工作区配置，请重新输入新的 API Key。环境变量中的 Key 不会被自动迁移入库。"
                        />
                      ) : null}

                      {embeddingRebuildPending ? (
                        <Alert
                          type="warning"
                          showIcon
                          icon={<WarningOutlined />}
                          title="向量模型已变更，已有知识库需重建索引"
                          description={
                            <Space size={8} wrap>
                              <span>新的 provider / model 只会影响后续索引任务。</span>
                              <Button
                                type="link"
                                style={{ paddingInline: 0 }}
                                onClick={() => navigate(PATHS.knowledge)}
                              >
                                前往知识库管理
                              </Button>
                            </Space>
                          }
                          closable
                          onClose={() => setEmbeddingRebuildPending(false)}
                        />
                      ) : null}

                      {showEmbeddingServiceChangeNotice ? (
                        <Alert
                          type="info"
                          showIcon
                          title={
                            embeddingDraft.apiKey.trim()
                              ? '新的模型服务待验证'
                              : '已切换到新的模型服务，请重新输入 API Key'
                          }
                          description={
                            embeddingDraft.apiKey.trim()
                              ? '请先测试连接，确认新配置可用后再保存。'
                              : '切换 Provider 或 Base URL 后，不会继续沿用之前保存的 Key。'
                          }
                        />
                      ) : null}

                      {showEmbeddingPreSaveRebuildNotice ? (
                        <Alert
                          type="info"
                          showIcon
                          title="新配置测试通过，保存后已有知识库需要重建索引"
                          description="只有在保存之后，新的 provider / model 才会成为实际生效配置。"
                        />
                      ) : null}

                      {connectionFeedback.embedding ? (
                        <Alert
                          type={
                            connectionFeedback.embedding.status === 'success'
                              ? 'success'
                              : 'error'
                          }
                          showIcon
                          title={connectionFeedback.embedding.message}
                          description={connectionFeedback.embedding.detail}
                        />
                      ) : null}

                      <Row gutter={[16, 16]}>
                        <Col xs={24} lg={6}>
                          <SettingField label="Provider">
                            <Select
                              value={embeddingDraft.provider}
                              options={EMBEDDING_PROVIDER_OPTIONS}
                              onChange={handleEmbeddingProviderChange}
                              style={{ width: '100%' }}
                            />
                          </SettingField>
                        </Col>
                        <Col xs={24} lg={10}>
                          <SettingField label="Base URL">
                            <Input
                              value={embeddingDraft.baseUrl}
                              placeholder="https://api.openai.com/v1"
                              onChange={(event) =>
                                {
                                  resetConnectionFeedback('embedding');
                                  setEmbeddingDraft((current) => ({
                                    ...current,
                                    baseUrl: event.target.value,
                                  }));
                                }
                              }
                            />
                          </SettingField>
                        </Col>
                        <Col xs={24} lg={8}>
                          <SettingField label="模型名称">
                            <Input
                              value={embeddingDraft.model}
                              placeholder="text-embedding-3-small"
                              onChange={(event) =>
                                {
                                  resetConnectionFeedback('embedding');
                                  setEmbeddingDraft((current) => ({
                                    ...current,
                                    model: event.target.value,
                                  }));
                                }
                              }
                            />
                          </SettingField>
                        </Col>
                        <Col xs={24}>
                          <SettingField
                            label="API Key"
                            hint={embeddingTestHint}
                          >
                            <Password
                              value={embeddingDraft.apiKey}
                              placeholder={getAiKeyPlaceholder(embeddingDraft, settings.embedding)}
                              autoComplete="new-password"
                              onChange={(event) =>
                                {
                                  resetConnectionFeedback('embedding');
                                  setEmbeddingDraft((current) => ({
                                    ...current,
                                    apiKey: event.target.value,
                                  }));
                                }
                              }
                            />
                          </SettingField>
                        </Col>
                      </Row>

                      <Flex justify="space-between" align="center" gap={12} wrap>
                        <Text type="secondary">
                          当前保存后只会写入数据库，不会回填明文 Key。
                        </Text>
                        <Space>
                          <Button
                            icon={<ApiOutlined />}
                            loading={testingSection === 'embedding'}
                            onClick={() => void handleTestEmbedding()}
                          >
                            测试连接
                          </Button>
                          <Button
                            type="primary"
                            loading={savingSection === 'embedding'}
                            onClick={() => void handleSaveEmbedding()}
                          >
                            保存向量模型
                          </Button>
                        </Space>
                      </Flex>
                    </Space>
                  </SectionBlock>

                  <SectionBlock
                    title="对话模型（LLM）"
                    description="当前只落库存储与在线测试能力；真正的对话链路将在后续版本接入。Anthropic 本期允许保存，但在线测试会返回“不支持”。"
                    extra={
                      <Space size={8} wrap>
                        <Tag color={SOURCE_META[settings.llm.source].color}>
                          {SOURCE_META[settings.llm.source].label}
                        </Tag>
                        <Tag color={llmKeyTag.color}>
                          {llmKeyTag.label}
                        </Tag>
                      </Space>
                    }
                  >
                    <Space orientation="vertical" size={16} style={{ width: '100%' }}>
                      <Alert
                        type="warning"
                        showIcon
                        title="对话链路仍在开发中"
                        description="当前保存的 LLM 配置已经会驱动后端项目对话生成；但项目聊天页前端发送交互仍在接线中，现阶段主要用于运行时配置与在线连通性校验。"
                      />

                      {settings.llm.source === 'environment' && !llmServiceTargetChanged ? (
                        <Alert
                          type="info"
                          showIcon
                          title="当前使用环境变量配置"
                          description="如果你要把 LLM 配置正式保存为工作区配置，请重新输入新的 API Key。环境变量中的 Key 不会被自动迁移入库。"
                        />
                      ) : null}

                      {showLlmServiceChangeNotice ? (
                        <Alert
                          type="info"
                          showIcon
                          title={
                            llmDraft.apiKey.trim()
                              ? '新的模型服务待验证'
                              : '已切换到新的模型服务，请重新输入 API Key'
                          }
                          description={
                            llmDraft.apiKey.trim()
                              ? '请先测试连接，确认新配置可用后再保存。'
                              : '切换 Provider 或 Base URL 后，不会继续沿用之前保存的 Key。'
                          }
                        />
                      ) : null}

                      {connectionFeedback.llm ? (
                        <Alert
                          type={
                            connectionFeedback.llm.status === 'success'
                              ? 'success'
                              : 'error'
                          }
                          showIcon
                          title={connectionFeedback.llm.message}
                          description={connectionFeedback.llm.detail}
                        />
                      ) : null}

                      <Row gutter={[16, 16]}>
                        <Col xs={24} lg={6}>
                          <SettingField label="Provider">
                            <Select
                              value={llmDraft.provider}
                              options={LLM_PROVIDER_OPTIONS}
                              onChange={handleLlmProviderChange}
                              style={{ width: '100%' }}
                            />
                          </SettingField>
                        </Col>
                        <Col xs={24} lg={10}>
                          <SettingField label="Base URL">
                            <Input
                              value={llmDraft.baseUrl}
                              placeholder="https://api.openai.com/v1"
                              onChange={(event) =>
                                {
                                  resetConnectionFeedback('llm');
                                  setLlmDraft((current) => ({
                                    ...current,
                                    baseUrl: event.target.value,
                                  }));
                                }
                              }
                            />
                          </SettingField>
                        </Col>
                        <Col xs={24} lg={8}>
                          <SettingField label="模型名称">
                            <Input
                              value={llmDraft.model}
                              placeholder="gpt-5.4"
                              onChange={(event) =>
                                {
                                  resetConnectionFeedback('llm');
                                  setLlmDraft((current) => ({
                                    ...current,
                                    model: event.target.value,
                                  }));
                                }
                              }
                            />
                          </SettingField>
                        </Col>
                        <Col xs={24}>
                          <SettingField
                            label="API Key"
                            hint={llmTestHint}
                          >
                            <Password
                              value={llmDraft.apiKey}
                              placeholder={getAiKeyPlaceholder(llmDraft, settings.llm)}
                              autoComplete="new-password"
                              onChange={(event) =>
                                {
                                  resetConnectionFeedback('llm');
                                  setLlmDraft((current) => ({
                                    ...current,
                                    apiKey: event.target.value,
                                  }));
                                }
                              }
                            />
                          </SettingField>
                        </Col>
                      </Row>

                      <Flex justify="space-between" align="center" gap={12} wrap>
                        <Text type="secondary">
                          Anthropic 可保存，但当前在线测试仅支持 OpenAI-compatible provider。
                        </Text>
                        <Space>
                          <Button
                            icon={<ApiOutlined />}
                            loading={testingSection === 'llm'}
                            onClick={() => void handleTestLlm()}
                          >
                            测试连接
                          </Button>
                          <Button
                            type="primary"
                            loading={savingSection === 'llm'}
                            onClick={() => void handleSaveLlm()}
                          >
                            保存对话模型
                          </Button>
                        </Space>
                      </Flex>
                    </Space>
                  </SectionBlock>
                </Space>
              ),
            },
            {
              key: 'indexing',
              label: (
                <Space size={8}>
                  <ToolOutlined />
                  索引配置
                </Space>
              ),
              children: (
                <SectionBlock
                  title="知识索引与分块策略"
                  description="这里控制 chunk 切分、支持的稳定文件类型，以及 Node 调用 Python indexer 的请求超时。不会把这个超时误导成 Chroma 或 embedding 的全链路超时。"
                  extra={
                    <Tag color={SOURCE_META[settings.indexing.source].color}>
                      {SOURCE_META[settings.indexing.source].label}
                    </Tag>
                  }
                >
                  <Space orientation="vertical" size={20} style={{ width: '100%' }}>
                    {settings.indexing.source === 'environment' ? (
                      <Alert
                        type="info"
                        showIcon
                        title="当前使用环境变量配置"
                        description="只要还没有在设置页保存过索引参数，知识链路会继续读取环境变量作为默认值。"
                      />
                    ) : null}

                    {indexingNeedsRebuild ? (
                      <Alert
                        type="warning"
                        showIcon
                        icon={<WarningOutlined />}
                        title="Chunk 策略已变更，已有知识库需重建索引"
                        description={
                          <Space size={8} wrap>
                            <span>新的分块参数只会作用于后续索引任务。</span>
                            <Button
                              type="link"
                              style={{ paddingInline: 0 }}
                              onClick={() => navigate(PATHS.knowledge)}
                            >
                              前往知识库管理
                            </Button>
                          </Space>
                        }
                      />
                    ) : null}

                    <div>
                      <Text strong>Chunk 大小</Text>
                      <Flex align="center" gap={16} style={{ marginTop: 12 }}>
                        <Slider
                          min={200}
                          max={2000}
                          step={100}
                          value={indexingDraft.chunkSize}
                          onChange={(value) => {
                            resetConnectionFeedback('indexing');
                            setIndexingDraft((current) => ({
                              ...current,
                              chunkSize: Array.isArray(value) ? value[0] ?? current.chunkSize : value,
                            }));
                          }}
                          style={{ flex: 1 }}
                        />
                        <InputNumber
                          min={200}
                          max={2000}
                          step={100}
                          value={indexingDraft.chunkSize}
                          onChange={(value) => {
                            resetConnectionFeedback('indexing');
                            setIndexingDraft((current) => ({
                              ...current,
                              chunkSize: typeof value === 'number' ? value : current.chunkSize,
                            }));
                          }}
                        />
                      </Flex>
                    </div>

                    <div>
                      <Text strong>Chunk 重叠</Text>
                      <Paragraph type="secondary" style={{ marginTop: 8, marginBottom: 12 }}>
                        重叠越大，跨 chunk 的语义连续性越好，但索引体积也会增加。
                      </Paragraph>
                      <Flex align="center" gap={16}>
                        <Slider
                          min={0}
                          max={500}
                          step={50}
                          value={indexingDraft.chunkOverlap}
                          onChange={(value) => {
                            resetConnectionFeedback('indexing');
                            setIndexingDraft((current) => ({
                              ...current,
                              chunkOverlap: Array.isArray(value)
                                ? value[0] ?? current.chunkOverlap
                                : value,
                            }));
                          }}
                          style={{ flex: 1 }}
                        />
                        <InputNumber
                          min={0}
                          max={500}
                          step={50}
                          value={indexingDraft.chunkOverlap}
                          onChange={(value) => {
                            resetConnectionFeedback('indexing');
                            setIndexingDraft((current) => ({
                              ...current,
                              chunkOverlap:
                                typeof value === 'number' ? value : current.chunkOverlap,
                            }));
                          }}
                        />
                      </Flex>
                    </div>

                    <SettingField
                      label="Indexer 超时（毫秒）"
                      hint="这里只影响 Node 调用 Python indexer 的请求等待时间，不代表整个向量链路的统一全局超时。"
                    >
                      <InputNumber
                        min={1}
                        step={1000}
                        value={indexingDraft.indexerTimeoutMs}
                        onChange={(value) => {
                          resetConnectionFeedback('indexing');
                          setIndexingDraft((current) => ({
                            ...current,
                            indexerTimeoutMs:
                              typeof value === 'number' ? value : current.indexerTimeoutMs,
                          }));
                        }}
                        style={{ width: compactTabs ? '100%' : 240 }}
                      />
                    </SettingField>

                    <div>
                      <Text strong>支持的文件类型</Text>
                      <Space
                        orientation={compactTabs ? 'vertical' : 'horizontal'}
                        size={16}
                        wrap
                        style={{ marginTop: 12 }}
                      >
                        <Checkbox.Group
                          value={indexingDraft.supportedTypes}
                          onChange={(value) => {
                            resetConnectionFeedback('indexing');
                            setIndexingDraft((current) => ({
                              ...current,
                              supportedTypes: value as SettingsSupportedType[],
                            }));
                          }}
                          options={[
                            { label: 'Markdown (.md)', value: 'md' },
                            { label: '纯文本 (.txt)', value: 'txt' },
                          ]}
                        />
                        <Checkbox disabled>PDF (.pdf) 即将支持</Checkbox>
                        <Checkbox disabled>Word (.docx) 即将支持</Checkbox>
                      </Space>
                      <Text type="secondary" style={{ display: 'block', marginTop: 10 }}>
                        `.markdown` 会继续作为 Markdown 的解析别名，不单独暴露成设置项。
                      </Text>
                    </div>

                    {connectionFeedback.indexing ? (
                      <Alert
                        type={
                          connectionFeedback.indexing.status === 'success'
                            ? 'success'
                            : 'error'
                        }
                        showIcon
                        title={connectionFeedback.indexing.message}
                        description={connectionFeedback.indexing.detail}
                      />
                    ) : null}

                    <Flex justify="space-between" align="center" gap={12} wrap>
                      <Text type="secondary">
                        测试会校验当前 Node 到 Python indexer 与 Chroma 的连通性，不会验证未保存的
                        chunk 草稿已经被运行中的 Python 服务采纳。
                      </Text>
                      <Space>
                        <Button
                          icon={<ApiOutlined />}
                          loading={testingSection === 'indexing'}
                          onClick={() => void handleTestIndexing()}
                        >
                          测试索引链路
                        </Button>
                        <Button
                          type="primary"
                          loading={savingSection === 'indexing'}
                          onClick={() => void handleSaveIndexing()}
                        >
                          保存索引参数
                        </Button>
                      </Space>
                    </Flex>
                  </Space>
                </SectionBlock>
              ),
            },
            {
              key: 'workspace',
              label: (
                <Space size={8}>
                  <DatabaseOutlined />
                  工作区
                </Space>
              ),
              children: (
                <SectionBlock
                  title="工作区基本信息"
                  description="工作区文案会直接影响品牌呈现和后续设置页说明；Logo 上传本期仍是占位能力。"
                >
                  <Space orientation="vertical" size={20} style={{ width: '100%' }}>
                    <SettingField label="工作区名称">
                      <Input
                        value={workspaceDraft.name}
                        placeholder="知项 · Knowject"
                        onChange={(event) =>
                          setWorkspaceDraft((current) => ({
                            ...current,
                            name: event.target.value,
                          }))
                        }
                      />
                    </SettingField>

                    <SettingField label="工作区描述">
                      <TextArea
                        rows={4}
                        maxLength={200}
                        showCount
                        value={workspaceDraft.description}
                        placeholder="让项目知识，真正为团队所用。"
                        onChange={(event) =>
                          setWorkspaceDraft((current) => ({
                            ...current,
                            description: event.target.value,
                          }))
                        }
                      />
                    </SettingField>

                    <Card
                      size="small"
                      style={{
                        borderRadius: 18,
                        borderStyle: 'dashed',
                        background: 'rgba(248, 250, 252, 0.82)',
                      }}
                    >
                      <Flex justify="space-between" align="center" gap={16} wrap>
                        <div>
                          <Text strong>Logo 上传</Text>
                          <Paragraph type="secondary" style={{ marginTop: 8, marginBottom: 0 }}>
                            本期只保留占位，后续再接入真实文件存储与裁剪流程。
                          </Paragraph>
                        </div>
                        <Button disabled>即将支持</Button>
                      </Flex>
                    </Card>

                    <Flex justify="flex-end">
                      <Button
                        type="primary"
                        loading={savingSection === 'workspace'}
                        onClick={() => void handleSaveWorkspace()}
                      >
                        保存工作区信息
                      </Button>
                    </Flex>
                  </Space>
                </SectionBlock>
              ),
            },
            {
              key: 'permissions',
              label: (
                <Space size={8}>
                  <TeamOutlined />
                  成员与权限
                  <Tag color="default" style={{ marginInlineStart: 0 }}>
                    即将开放
                  </Tag>
                </Space>
              ),
              children: (
                <Card
                  style={{
                    borderRadius: 20,
                    minHeight: 360,
                    background:
                      'linear-gradient(135deg, rgba(248, 250, 252, 0.96), rgba(255, 255, 255, 0.98))',
                    borderColor: 'rgba(203, 213, 225, 0.72)',
                  }}
                >
                  <div
                    style={{
                      display: 'grid',
                      placeItems: 'center',
                      minHeight: 300,
                      borderRadius: 18,
                      border: '1px dashed rgba(148, 163, 184, 0.78)',
                      background: 'rgba(248, 250, 252, 0.76)',
                    }}
                  >
                    <Space orientation="vertical" size={16} align="center">
                      <CheckCircleOutlined style={{ fontSize: 28, color: '#94a3b8' }} />
                      <Title level={5} style={{ margin: 0, color: '#0f172a' }}>
                        成员权限配置即将开放
                      </Title>
                      <Paragraph
                        type="secondary"
                        style={{
                          marginBottom: 0,
                          maxWidth: 520,
                          textAlign: 'center',
                          fontSize: 14,
                          lineHeight: 1.7,
                        }}
                      >
                        当前成员管理请前往成员页。本期设置接口先按“登录即可访问”处理，后续若引入工作区管理员模型，再把权限收紧到更细的角色控制。
                      </Paragraph>
                      <Button type="primary" onClick={() => navigate(PATHS.members)}>
                        前往成员页
                      </Button>
                    </Space>
                  </div>
                </Card>
              ),
            },
          ]}
        />
      </Card>
    </Space>
  );
};
