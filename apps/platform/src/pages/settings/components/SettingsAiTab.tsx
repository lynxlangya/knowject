import type { Dispatch, SetStateAction } from 'react';
import { ApiOutlined, WarningOutlined } from '@ant-design/icons';
import { Alert, Button, Col, Flex, Input, Row, Select, Space, Typography } from 'antd';
import { useTranslation } from 'react-i18next';
import type {
  SettingsEmbeddingProvider,
  SettingsLlmProvider,
  SettingsResponse,
} from '@api/settings';
import {
  EMBEDDING_PROVIDER_PRESETS,
  getEmbeddingProviderOptions,
  getAiKeyPlaceholder,
  getAiKeyStatusTag,
  getAiTestHint,
  hasAiDefinitionChanged,
  hasAiServiceTargetChanged,
  getLlmProviderOptions,
  type AiDraft,
  type SaveSection,
  type SettingsConnectionFeedbackState,
  type TestSection,
} from '../constants';
import { KeyStatusTag, SectionBlock, SettingField, SourceTag } from './SettingsPageParts';

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
  const { t } = useTranslation('pages');
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
        title={t('settings.summary.embeddingModel')}
        description={t('settings.alerts.embeddingRebuild')}
        extra={
          <Space size={8} wrap>
            <SourceTag
              source={settings.embedding.source}
              label={settings.embedding.source === 'database'
                ? t('settings.sources.database')
                : t('settings.sources.environment')}
            />
            <KeyStatusTag color={embeddingKeyTag.color}>
              {embeddingKeyTag.label}
            </KeyStatusTag>
          </Space>
        }
      >
        <Space orientation="vertical" size={16} style={{ width: '100%' }}>
        {settings.embedding.source === 'environment' && !embeddingServiceTargetChanged ? (
          <Alert
            type="info"
            showIcon
            title={t('settings.alerts.envConfig')}
            description={t('settings.alerts.envEmbeddingDescription')}
          />
        ) : null}

          {embeddingRebuildPending ? (
            <Alert
            type="warning"
            showIcon
            icon={<WarningOutlined />}
            title={t('settings.alerts.embeddingRebuild')}
            description={
              <Space size={8} wrap>
                <span>{t('settings.alerts.embeddingRebuildDraft')}</span>
                <Button type="link" style={{ paddingInline: 0 }} onClick={onOpenKnowledge}>
                  {t('settings.actions.openKnowledge')}
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
                  ? t('settings.alerts.embeddingServicePending')
                  : t('settings.alerts.embeddingServiceKeyRequired')
              }
              description={
                embeddingDraft.apiKey.trim()
                  ? t('settings.alerts.embeddingServicePendingDescription')
                  : t('settings.alerts.embeddingServiceKeyRequiredDescription')
              }
            />
          ) : null}

          {showEmbeddingPreSaveRebuildNotice ? (
            <Alert
              type="info"
              showIcon
              title={t('settings.alerts.embeddingPreSaveRebuild')}
              description={t('settings.alerts.embeddingPreSaveRebuildDescription')}
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
                  options={getEmbeddingProviderOptions()}
                  onChange={onEmbeddingProviderChange}
                  style={{ width: '100%' }}
                />
              </SettingField>
            </Col>
            <Col xs={24} lg={10}>
              <SettingField label={t('settings.fields.baseUrl')}>
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
              <SettingField label={t('settings.fields.model')}>
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
              <SettingField label={t('settings.fields.apiKey')} hint={embeddingTestHint}>
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
            <Text type="secondary">{t('settings.alerts.saveKeyHint')}</Text>
            <Space>
              <Button
                icon={<ApiOutlined />}
                loading={testingSection === 'embedding'}
                onClick={() => void onTestEmbedding()}
              >
                {t('settings.actions.testConnection')}
              </Button>
              <Button
                type="primary"
                loading={savingSection === 'embedding'}
                onClick={() => void onSaveEmbedding()}
              >
                {t('settings.actions.saveEmbedding')}
              </Button>
            </Space>
          </Flex>
        </Space>
      </SectionBlock>

      <SectionBlock
        title={t('settings.summary.chatModel')}
        description={t('settings.alerts.llmRuntimeDescription')}
        extra={
          <Space size={8} wrap>
            <SourceTag
              source={settings.llm.source}
              label={settings.llm.source === 'database'
                ? t('settings.sources.database')
                : t('settings.sources.environment')}
            />
            <KeyStatusTag color={llmKeyTag.color}>
              {llmKeyTag.label}
            </KeyStatusTag>
          </Space>
        }
      >
        <Space orientation="vertical" size={16} style={{ width: '100%' }}>
          <Alert
            type="info"
            showIcon
            title={t('settings.alerts.llmRuntimeTitle')}
            description={t('settings.alerts.llmRuntimeDescription')}
          />

          {settings.llm.source === 'environment' && !llmServiceTargetChanged ? (
            <Alert
              type="info"
              showIcon
              title={t('settings.alerts.envConfig')}
              description={t('settings.alerts.envLlmDescription')}
            />
          ) : null}

          {showLlmServiceChangeNotice ? (
            <Alert
              type="info"
              showIcon
            title={
                llmDraft.apiKey.trim()
                  ? t('settings.alerts.llmServicePending')
                  : t('settings.alerts.llmServiceKeyRequired')
              }
              description={
                llmDraft.apiKey.trim()
                  ? t('settings.alerts.llmServicePendingDescription')
                  : t('settings.alerts.llmServiceKeyRequiredDescription')
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
                  options={getLlmProviderOptions()}
                  onChange={onLlmProviderChange}
                  style={{ width: '100%' }}
                />
              </SettingField>
            </Col>
            <Col xs={24} lg={10}>
              <SettingField label={t('settings.fields.baseUrl')}>
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
              <SettingField label={t('settings.fields.model')}>
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
              <SettingField label={t('settings.fields.apiKey')} hint={llmTestHint}>
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
              {t('settings.alerts.llmProtocolHint')}
            </Text>
            <Space>
              <Button
                icon={<ApiOutlined />}
                loading={testingSection === 'llm'}
                onClick={() => void onTestLlm()}
              >
                {t('settings.actions.testConnection')}
              </Button>
              <Button
                type="primary"
                loading={savingSection === 'llm'}
                onClick={() => void onSaveLlm()}
              >
                {t('settings.actions.saveLlm')}
              </Button>
            </Space>
          </Flex>
        </Space>
      </SectionBlock>
    </Space>
  );
};
