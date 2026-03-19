import { App } from 'antd';
import { useCallback, useEffect, useState } from 'react';
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
  type SettingsEmbeddingProvider,
  type SettingsLlmProvider,
  type SettingsResponse,
} from '@api/settings';
import {
  buildConnectionFeedback,
  buildIndexingConnectionFeedback,
  EMBEDDING_PROVIDER_PRESETS,
  getInitialEmbeddingDraft,
  getInitialIndexingDraft,
  getInitialLlmDraft,
  getInitialWorkspaceDraft,
  hasAiDefinitionChanged,
  hasAiServiceTargetChanged,
  type IndexingDraft,
  LLM_PROVIDER_PRESETS,
  requiresFreshApiKey,
  type AiDraft,
  type SaveSection,
  type SettingsConnectionFeedbackState,
  type SettingsTabKey,
  type TestSection,
  type TestableSection,
  type WorkspaceDraft,
} from './constants';

export const useSettingsPageController = () => {
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
  const [connectionFeedback, setConnectionFeedback] = useState<SettingsConnectionFeedbackState>({
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

  const indexingNeedsRebuild = Boolean(
    settings &&
      (indexingDraft.chunkSize !== settings.indexing.chunkSize ||
        indexingDraft.chunkOverlap !== settings.indexing.chunkOverlap),
  );

  return {
    activeTab,
    setActiveTab,
    settings,
    loading,
    error,
    compactTabs,
    savingSection,
    testingSection,
    embeddingDraft,
    setEmbeddingDraft,
    llmDraft,
    setLlmDraft,
    indexingDraft,
    setIndexingDraft,
    workspaceDraft,
    setWorkspaceDraft,
    embeddingRebuildPending,
    setEmbeddingRebuildPending,
    connectionFeedback,
    resetConnectionFeedback,
    loadSettings,
    handleEmbeddingProviderChange,
    handleLlmProviderChange,
    handleSaveEmbedding,
    handleSaveLlm,
    handleSaveIndexing,
    handleSaveWorkspace,
    handleTestEmbedding,
    handleTestLlm,
    handleTestIndexing,
    indexingNeedsRebuild,
  };
};
