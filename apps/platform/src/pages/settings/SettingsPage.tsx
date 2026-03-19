import {
  CheckCircleOutlined,
  DatabaseOutlined,
  ReloadOutlined,
  RobotOutlined,
  TeamOutlined,
  ToolOutlined,
} from '@ant-design/icons';
import { Button, Card, Empty, Skeleton, Space, Tabs, Tag, Typography } from 'antd';
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
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={error || '设置数据暂时不可用'}>
          <Button type="primary" icon={<ReloadOutlined />} onClick={() => void loadSettings()}>
            重新加载
          </Button>
        </Empty>
      </Card>
    );
  }

  return (
    <Space orientation="vertical" size={24} style={{ width: '100%' }}>
      <GlobalAssetPageHeader
        title="设置中心"
        subtitle="在这里统一接管向量模型、对话模型、索引参数和工作区基本信息。本期设置接口先对所有已登录用户开放，后续如引入工作区管理员权限，再收紧到更严格的访问模型。"
        summaryItems={buildAiSummary(settings)}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => navigate(PATHS.knowledge)}>前往知识库管理</Button>
            <Button type="primary" icon={<ReloadOutlined />} onClick={() => void loadSettings()}>
              刷新配置
            </Button>
          </div>
        }
      />

      <Card style={{ borderRadius: 28, boxShadow: '0 18px 40px rgba(15, 23, 42, 0.06)' }}>
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
                  AI 模型
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
                  索引配置
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
                  工作区
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
