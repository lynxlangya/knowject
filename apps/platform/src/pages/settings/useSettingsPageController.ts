import { App } from 'antd';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation('pages');
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
      console.error('[SettingsPage] settings loading failed:', currentError);
      setError(extractApiErrorMessage(currentError, t('settings.reload')));
    } finally {
      setLoading(false);
    }
  }, [syncDrafts, t]);

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
      message.error(t('settings.validation.completeEmbedding'));
      return;
    }

    const serviceTargetChanged = hasAiServiceTargetChanged(embeddingDraft, settings.embedding);
    const definitionChanged = hasAiDefinitionChanged(embeddingDraft, settings.embedding);

    if (requiresFreshApiKey(embeddingDraft, settings.embedding) && !embeddingDraft.apiKey.trim()) {
      message.error(
        serviceTargetChanged
          ? t('settings.validation.newServiceApiKey')
          : t('settings.validation.envApiKey'),
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
          ? t('settings.validation.embeddingSavedRebuild')
          : t('settings.validation.embeddingSaved'),
      );
    } catch (currentError) {
      message.error(
        extractApiErrorMessage(currentError, t('settings.validation.embeddingSaveFailed')),
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
      message.error(t('settings.validation.completeLlm'));
      return;
    }

    const serviceTargetChanged = hasAiServiceTargetChanged(llmDraft, settings.llm);

    if (requiresFreshApiKey(llmDraft, settings.llm) && !llmDraft.apiKey.trim()) {
      message.error(
        serviceTargetChanged
          ? t('settings.validation.newServiceApiKey')
          : t('settings.validation.envApiKey'),
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
      message.success(t('settings.validation.llmSaved'));
    } catch (currentError) {
      message.error(
        extractApiErrorMessage(currentError, t('settings.validation.llmSaveFailed')),
      );
    } finally {
      setSavingSection(null);
    }
  };

  const handleSaveIndexing = async () => {
    if (indexingDraft.chunkOverlap >= indexingDraft.chunkSize) {
      message.error(t('settings.validation.chunkOverlap'));
      return;
    }

    if (indexingDraft.supportedTypes.length === 0) {
      message.error(t('settings.validation.supportedTypes'));
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
      message.success(t('settings.validation.indexingSaved'));
    } catch (currentError) {
      message.error(
        extractApiErrorMessage(currentError, t('settings.validation.indexingSaveFailed')),
      );
    } finally {
      setSavingSection(null);
    }
  };

  const handleSaveWorkspace = async () => {
    if (!workspaceDraft.name.trim()) {
      message.error(t('settings.validation.workspaceName'));
      return;
    }

    if (workspaceDraft.description.trim().length > 200) {
      message.error(t('settings.validation.workspaceDescription'));
      return;
    }

    setSavingSection('workspace');

    try {
      const nextSettings = await updateWorkspaceSettings({
        name: workspaceDraft.name.trim(),
        description: workspaceDraft.description.trim(),
      });

      syncDrafts(nextSettings);
      message.success(t('settings.validation.workspaceSaved'));
    } catch (currentError) {
      message.error(
        extractApiErrorMessage(currentError, t('settings.validation.workspaceSaveFailed')),
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
      message.error(t('settings.validation.completeEmbedding'));
      return;
    }

    if (requiresFreshApiKey(embeddingDraft, settings.embedding) && !embeddingDraft.apiKey.trim()) {
      message.error(
        hasAiServiceTargetChanged(embeddingDraft, settings.embedding)
          ? t('settings.validation.testApiKeyNewService')
          : t('settings.validation.testApiKey'),
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
          message: t('settings.feedback.failed'),
          detail: extractApiErrorMessage(currentError, t('settings.validation.embeddingTestFailed')),
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
      message.error(t('settings.validation.completeLlm'));
      return;
    }

    if (requiresFreshApiKey(llmDraft, settings.llm) && !llmDraft.apiKey.trim()) {
      message.error(
        hasAiServiceTargetChanged(llmDraft, settings.llm)
          ? t('settings.validation.testApiKeyNewService')
          : t('settings.validation.testApiKey'),
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
          message: t('settings.feedback.failed'),
          detail: extractApiErrorMessage(currentError, t('settings.validation.llmTestFailed')),
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
          message: t('settings.feedback.indexingFailed'),
          detail: extractApiErrorMessage(currentError, t('settings.validation.indexingTestFailed')),
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
