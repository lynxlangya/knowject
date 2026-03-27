import {
  CheckCircleOutlined,
  DatabaseOutlined,
  ReloadOutlined,
  RobotOutlined,
  TeamOutlined,
  ToolOutlined,
} from '@ant-design/icons';
import { Button, Card, Empty, Skeleton, Space, Tabs, Tag, Typography } from 'antd';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { PATHS } from '@app/navigation/paths';
import { GlobalAssetPageHeader } from '@pages/assets/components/GlobalAssetLayout';
import { buildAiSummary } from './constants';
import { SettingsAiTab } from './components/SettingsAiTab';
import { SettingsIndexingTab } from './components/SettingsIndexingTab';
import { SettingsWorkspaceTab } from './components/SettingsWorkspaceTab';
import { useSettingsPageController } from './useSettingsPageController';

const { Paragraph, Title } = Typography;

export const SettingsPage = () => {
  const { t } = useTranslation('pages');
  const navigate = useNavigate();
  const {
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
  } = useSettingsPageController();

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
          description={error || t('settings.unavailable')}
        >
          <Button type="primary" icon={<ReloadOutlined />} onClick={() => void loadSettings()}>
            {t('settings.reload')}
          </Button>
        </Empty>
      </Card>
    );
  }

  return (
    <Space orientation="vertical" size={24} style={{ width: '100%' }}>
      <GlobalAssetPageHeader
        title={t('settings.title')}
        subtitle={t('settings.subtitle')}
        summaryItems={buildAiSummary(settings)}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => navigate(PATHS.knowledge)}>{t('settings.openKnowledge')}</Button>
            <Button type="primary" icon={<ReloadOutlined />} onClick={() => void loadSettings()}>
              {t('settings.refresh')}
            </Button>
          </div>
        }
      />

      <Card style={{ borderRadius: 28, border: '1px solid #C2EDE6', boxShadow: '0 18px 40px rgba(15, 23, 42, 0.06)' }}>
        <Tabs
          activeKey={activeTab}
          onChange={(key) => setActiveTab(key as typeof activeTab)}
          tabPlacement={compactTabs ? 'top' : 'start'}
          items={[
            {
              key: 'ai',
              label: (
                <Space size={8}>
                  <RobotOutlined />
                  {t('settings.tabs.ai')}
                </Space>
              ),
              children: (
                <SettingsAiTab
                  settings={settings}
                  embeddingDraft={embeddingDraft}
                  setEmbeddingDraft={setEmbeddingDraft}
                  llmDraft={llmDraft}
                  setLlmDraft={setLlmDraft}
                  embeddingRebuildPending={embeddingRebuildPending}
                  setEmbeddingRebuildPending={setEmbeddingRebuildPending}
                  connectionFeedback={connectionFeedback}
                  savingSection={savingSection}
                  testingSection={testingSection}
                  onResetConnectionFeedback={resetConnectionFeedback}
                  onEmbeddingProviderChange={handleEmbeddingProviderChange}
                  onLlmProviderChange={handleLlmProviderChange}
                  onTestEmbedding={handleTestEmbedding}
                  onSaveEmbedding={handleSaveEmbedding}
                  onTestLlm={handleTestLlm}
                  onSaveLlm={handleSaveLlm}
                  onOpenKnowledge={() => navigate(PATHS.knowledge)}
                />
              ),
            },
            {
              key: 'indexing',
              label: (
                <Space size={8}>
                  <ToolOutlined />
                  {t('settings.tabs.indexing')}
                </Space>
              ),
              children: (
                <SettingsIndexingTab
                  settings={settings}
                  compactTabs={compactTabs}
                  indexingDraft={indexingDraft}
                  setIndexingDraft={setIndexingDraft}
                  connectionFeedback={connectionFeedback}
                  savingSection={savingSection}
                  testingSection={testingSection}
                  indexingNeedsRebuild={indexingNeedsRebuild}
                  onResetConnectionFeedback={resetConnectionFeedback}
                  onTestIndexing={handleTestIndexing}
                  onSaveIndexing={handleSaveIndexing}
                  onOpenKnowledge={() => navigate(PATHS.knowledge)}
                />
              ),
            },
            {
              key: 'workspace',
              label: (
                <Space size={8}>
                  <DatabaseOutlined />
                  {t('settings.tabs.workspace')}
                </Space>
              ),
              children: (
                <SettingsWorkspaceTab
                  workspaceDraft={workspaceDraft}
                  setWorkspaceDraft={setWorkspaceDraft}
                  savingSection={savingSection}
                  onSaveWorkspace={handleSaveWorkspace}
                />
              ),
            },
            {
              key: 'permissions',
              label: (
                <Space size={8}>
                  <TeamOutlined />
                  {t('settings.tabs.permissions')}
                  <Tag color="default" style={{ marginInlineStart: 0 }}>
                    {t('settings.tabs.soon')}
                  </Tag>
                </Space>
              ),
              children: (
                <Card
                  style={{
                    borderRadius: 20,
                    minHeight: 360,
                    border: '1px solid #C2EDE6',
                    background: '#F2FDFB',
                  }}
                >
                  <div
                    style={{
                      display: 'grid',
                      placeItems: 'center',
                      minHeight: 300,
                      borderRadius: 18,
                      border: '1px dashed #C2EDE6',
                      background: 'rgba(255,255,255,0.8)',
                    }}
                  >
                    <Space orientation="vertical" size={16} align="center">
                      <CheckCircleOutlined style={{ fontSize: 28, color: '#94a3b8' }} />
                      <Title level={5} style={{ margin: 0, color: '#0f172a' }}>
                        {t('settings.permissions.title')}
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
                        {t('settings.permissions.description')}
                      </Paragraph>
                      <Button type="primary" onClick={() => navigate(PATHS.members)}>
                        {t('settings.permissions.openMembers')}
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
