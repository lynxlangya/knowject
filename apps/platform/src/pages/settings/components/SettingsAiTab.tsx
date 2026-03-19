import type { Dispatch, SetStateAction } from 'react';
import { ApiOutlined, WarningOutlined } from '@ant-design/icons';
import { Alert, Button, Col, Flex, Input, Row, Select, Space, Tag, Typography } from 'antd';
import type {
  SettingsEmbeddingProvider,
  SettingsLlmProvider,
  SettingsResponse,
} from '@api/settings';
import {
  EMBEDDING_PROVIDER_OPTIONS,
  EMBEDDING_PROVIDER_PRESETS,
  getAiKeyPlaceholder,
  getAiKeyStatusTag,
  getAiTestHint,
  hasAiDefinitionChanged,
  hasAiServiceTargetChanged,
  LLM_PROVIDER_OPTIONS,
  type AiDraft,
  type SaveSection,
  type SettingsConnectionFeedbackState,
  type TestSection,
} from '../constants';
import { SectionBlock, SettingField } from './SettingsPageParts';

const { Password } = Input;
const { Text } = Typography;

interface SettingsAiTabProps {
  settings: SettingsResponse;
  embeddingDraft: AiDraft<SettingsEmbeddingProvider>;
  setEmbeddingDraft: Dispatch<SetStateAction<AiDraft<SettingsEmbeddingProvider>>>;
  llmDraft: AiDraft<SettingsLlmProvider>;
  setLlmDraft: Dispatch<SetStateAction<AiDraft<SettingsLlmProvider>>>;
  embeddingRebuildPending: boolean;
  setEmbeddingRebuildPending: Dispatch<SetStateAction<boolean>>;
  connectionFeedback: SettingsConnectionFeedbackState;
  savingSection: SaveSection;
  testingSection: TestSection;
  onResetConnectionFeedback: (section: 'embedding' | 'llm') => void;
  onEmbeddingProviderChange: (provider: SettingsEmbeddingProvider) => void;
  onLlmProviderChange: (provider: SettingsLlmProvider) => void;
  onTestEmbedding: () => Promise<void>;
  onSaveEmbedding: () => Promise<void>;
  onTestLlm: () => Promise<void>;
  onSaveLlm: () => Promise<void>;
  onOpenKnowledge: () => void;
}

export const SettingsAiTab = ({
  settings,
  embeddingDraft,
  setEmbeddingDraft,
  llmDraft,
  setLlmDraft,
  embeddingRebuildPending,
  setEmbeddingRebuildPending,
  connectionFeedback,
  savingSection,
  testingSection,
  onResetConnectionFeedback,
  onEmbeddingProviderChange,
  onLlmProviderChange,
  onTestEmbedding,
  onSaveEmbedding,
  onTestLlm,
  onSaveLlm,
  onOpenKnowledge,
}: SettingsAiTabProps) => {
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
    llmServiceTargetChanged && connectionFeedback.llm === null;

  return (
    <Space orientation="vertical" size={20} style={{ width: '100%' }}>
      <SectionBlock
        title="向量模型（Embedding）"
        description="用于知识库索引与检索。修改 provider 或 model 后，已有知识库需要重建索引才能使用新的向量语义。"
        extra={
          <Space size={8} wrap>
            <Tag color={settings.embedding.source === 'database' ? 'blue' : 'gold'}>
              {settings.embedding.source === 'database' ? '数据库配置' : '环境变量回退'}
            </Tag>
            <Tag color={embeddingKeyTag.color}>{embeddingKeyTag.label}</Tag>
          </Space>
        }
      >
        <Space orientation="vertical" size={16} style={{ width: '100%' }}>
          {settings.embedding.source === 'environment' && !embeddingServiceTargetChanged ? (
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
                  <Button type="link" style={{ paddingInline: 0 }} onClick={onOpenKnowledge}>
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
              type={connectionFeedback.embedding.status === 'success' ? 'success' : 'error'}
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
                  onChange={onEmbeddingProviderChange}
                  style={{ width: '100%' }}
                />
              </SettingField>
            </Col>
            <Col xs={24} lg={10}>
              <SettingField label="Base URL">
                <Input
                  value={embeddingDraft.baseUrl}
                  placeholder="https://api.openai.com/v1"
                  onChange={(event) => {
                    onResetConnectionFeedback('embedding');
                    setEmbeddingDraft((current) => ({
                      ...current,
                      baseUrl: event.target.value,
                    }));
                  }}
                />
              </SettingField>
            </Col>
            <Col xs={24} lg={8}>
              <SettingField label="模型名称">
                <Input
                  value={embeddingDraft.model}
                  placeholder={EMBEDDING_PROVIDER_PRESETS.openai.model}
                  onChange={(event) => {
                    onResetConnectionFeedback('embedding');
                    setEmbeddingDraft((current) => ({
                      ...current,
                      model: event.target.value,
                    }));
                  }}
                />
              </SettingField>
            </Col>
            <Col xs={24}>
              <SettingField label="API Key" hint={embeddingTestHint}>
                <Password
                  value={embeddingDraft.apiKey}
                  placeholder={getAiKeyPlaceholder(embeddingDraft, settings.embedding)}
                  autoComplete="new-password"
                  onChange={(event) => {
                    onResetConnectionFeedback('embedding');
                    setEmbeddingDraft((current) => ({
                      ...current,
                      apiKey: event.target.value,
                    }));
                  }}
                />
              </SettingField>
            </Col>
          </Row>

          <Flex justify="space-between" align="center" gap={12} wrap>
            <Text type="secondary">当前保存后只会写入数据库，不会回填明文 Key。</Text>
            <Space>
              <Button
                icon={<ApiOutlined />}
                loading={testingSection === 'embedding'}
                onClick={() => void onTestEmbedding()}
              >
                测试连接
              </Button>
              <Button
                type="primary"
                loading={savingSection === 'embedding'}
                onClick={() => void onSaveEmbedding()}
              >
                保存向量模型
              </Button>
            </Space>
          </Flex>
        </Space>
      </SectionBlock>

      <SectionBlock
        title="对话模型（LLM）"
        description="当前设置会直接驱动项目对话 MVP。当前仅保留已验证的 `/chat/completions` 兼容 Provider，先确保设置页、在线测试与项目对话运行时语义一致。"
        extra={
          <Space size={8} wrap>
            <Tag color={settings.llm.source === 'database' ? 'blue' : 'gold'}>
              {settings.llm.source === 'database' ? '数据库配置' : '环境变量回退'}
            </Tag>
            <Tag color={llmKeyTag.color}>{llmKeyTag.label}</Tag>
          </Space>
        }
      >
        <Space orientation="vertical" size={16} style={{ width: '100%' }}>
          <Alert
            type="info"
            showIcon
            title="当前 LLM 设置会直接影响项目对话"
            description="保存并测试通过后，项目页会直接使用当前配置生成 assistant 回复。本期不引入额外对话组件或独立 runtime。"
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
              type={connectionFeedback.llm.status === 'success' ? 'success' : 'error'}
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
                  onChange={onLlmProviderChange}
                  style={{ width: '100%' }}
                />
              </SettingField>
            </Col>
            <Col xs={24} lg={10}>
              <SettingField label="Base URL">
                <Input
                  value={llmDraft.baseUrl}
                  placeholder="https://api.openai.com/v1"
                  onChange={(event) => {
                    onResetConnectionFeedback('llm');
                    setLlmDraft((current) => ({
                      ...current,
                      baseUrl: event.target.value,
                    }));
                  }}
                />
              </SettingField>
            </Col>
            <Col xs={24} lg={8}>
              <SettingField label="模型名称">
                <Input
                  value={llmDraft.model}
                  placeholder="gpt-5.4"
                  onChange={(event) => {
                    onResetConnectionFeedback('llm');
                    setLlmDraft((current) => ({
                      ...current,
                      model: event.target.value,
                    }));
                  }}
                />
              </SettingField>
            </Col>
            <Col xs={24}>
              <SettingField label="API Key" hint={llmTestHint}>
                <Password
                  value={llmDraft.apiKey}
                  placeholder={getAiKeyPlaceholder(llmDraft, settings.llm)}
                  autoComplete="new-password"
                  onChange={(event) => {
                    onResetConnectionFeedback('llm');
                    setLlmDraft((current) => ({
                      ...current,
                      apiKey: event.target.value,
                    }));
                  }}
                />
              </SettingField>
            </Col>
          </Row>

          <Flex justify="space-between" align="center" gap={12} wrap>
            <Text type="secondary">
              在线测试与项目对话当前统一走兼容 `/chat/completions` 协议；若服务商提供多个入口，请填写兼容端点的 Base URL。
            </Text>
            <Space>
              <Button
                icon={<ApiOutlined />}
                loading={testingSection === 'llm'}
                onClick={() => void onTestLlm()}
              >
                测试连接
              </Button>
              <Button
                type="primary"
                loading={savingSection === 'llm'}
                onClick={() => void onSaveLlm()}
              >
                保存对话模型
              </Button>
            </Space>
          </Flex>
        </Space>
      </SectionBlock>
    </Space>
  );
};
