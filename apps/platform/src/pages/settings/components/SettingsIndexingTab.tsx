import type { Dispatch, SetStateAction } from 'react';
import { ApiOutlined, WarningOutlined } from '@ant-design/icons';
import { Alert, Button, Checkbox, Flex, InputNumber, Slider, Space, Tag, Typography } from 'antd';
import { useTranslation } from 'react-i18next';
import type { SettingsResponse } from '@api/settings';
import type {
  IndexingDraft,
  SaveSection,
  SettingsConnectionFeedbackState,
  TestSection,
} from '../constants';
import { SectionBlock, SettingField } from './SettingsPageParts';

const { Paragraph, Text } = Typography;

interface SettingsIndexingTabProps {
  settings: SettingsResponse;
  compactTabs: boolean;
  indexingDraft: IndexingDraft;
  setIndexingDraft: Dispatch<SetStateAction<IndexingDraft>>;
  connectionFeedback: SettingsConnectionFeedbackState;
  savingSection: SaveSection;
  testingSection: TestSection;
  indexingNeedsRebuild: boolean;
  onResetConnectionFeedback: (section: 'indexing') => void;
  onTestIndexing: () => Promise<void>;
  onSaveIndexing: () => Promise<void>;
  onOpenKnowledge: () => void;
}

export const SettingsIndexingTab = ({
  settings,
  compactTabs,
  indexingDraft,
  setIndexingDraft,
  connectionFeedback,
  savingSection,
  testingSection,
  indexingNeedsRebuild,
  onResetConnectionFeedback,
  onTestIndexing,
  onSaveIndexing,
  onOpenKnowledge,
}: SettingsIndexingTabProps) => {
  const { t } = useTranslation('pages');

  return (
    <SectionBlock
      title={t('settings.tabs.indexing')}
      description={t('settings.alerts.indexerTimeoutHint')}
      extra={
        <Tag color={settings.indexing.source === 'database' ? 'blue' : 'gold'}>
          {settings.indexing.source === 'database'
            ? t('settings.sources.database')
            : t('settings.sources.environment')}
        </Tag>
      }
    >
      <Space orientation="vertical" size={20} style={{ width: '100%' }}>
        {settings.indexing.source === 'environment' ? (
          <Alert
            type="info"
            showIcon
            title={t('settings.alerts.envConfig')}
            description={t('settings.alerts.indexingEnvDescription')}
          />
        ) : null}

        {indexingNeedsRebuild ? (
          <Alert
            type="warning"
            showIcon
            icon={<WarningOutlined />}
            title={t('settings.alerts.indexingRebuildTitle')}
            description={
              <Space size={8} wrap>
                <span>{t('settings.alerts.indexingRebuildDescription')}</span>
                <Button type="link" style={{ paddingInline: 0 }} onClick={onOpenKnowledge}>
                  {t('settings.actions.openKnowledge')}
                </Button>
              </Space>
            }
          />
        ) : null}

        <div>
          <Text strong>{t('settings.fields.chunkSize')}</Text>
          <Flex align="center" gap={16} style={{ marginTop: 12 }}>
            <Slider
              min={200}
              max={2000}
              step={100}
              value={indexingDraft.chunkSize}
              onChange={(value) => {
                onResetConnectionFeedback('indexing');
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
                onResetConnectionFeedback('indexing');
                setIndexingDraft((current) => ({
                  ...current,
                  chunkSize: typeof value === 'number' ? value : current.chunkSize,
                }));
              }}
            />
          </Flex>
        </div>

        <div>
          <Text strong>{t('settings.fields.chunkOverlap')}</Text>
          <Paragraph type="secondary" style={{ marginTop: 8, marginBottom: 12 }}>
            {t('settings.alerts.chunkOverlapHint')}
          </Paragraph>
          <Flex align="center" gap={16}>
            <Slider
              min={0}
              max={500}
              step={50}
              value={indexingDraft.chunkOverlap}
              onChange={(value) => {
                onResetConnectionFeedback('indexing');
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
                onResetConnectionFeedback('indexing');
                setIndexingDraft((current) => ({
                  ...current,
                  chunkOverlap: typeof value === 'number' ? value : current.chunkOverlap,
                }));
              }}
            />
          </Flex>
        </div>

        <SettingField
          label={t('settings.fields.indexerTimeout')}
          hint={t('settings.alerts.indexerTimeoutHint')}
        >
          <InputNumber
            min={1}
            step={1000}
            value={indexingDraft.indexerTimeoutMs}
            onChange={(value) => {
              onResetConnectionFeedback('indexing');
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
          <Text strong>{t('settings.fields.supportedTypes')}</Text>
          <Space
            orientation={compactTabs ? 'vertical' : 'horizontal'}
            size={16}
            wrap
            style={{ marginTop: 12 }}
          >
            <Checkbox.Group
              value={indexingDraft.supportedTypes}
              onChange={(value) => {
                onResetConnectionFeedback('indexing');
                setIndexingDraft((current) => ({
                  ...current,
                  supportedTypes: value as IndexingDraft['supportedTypes'],
                }));
              }}
              options={[
                { label: 'Markdown (.md)', value: 'md' },
                { label: 'Text (.txt)', value: 'txt' },
                { label: 'PDF (.pdf)', value: 'pdf' },
                { label: 'Word (.docx)', value: 'docx' },
                { label: 'Excel (.xlsx)', value: 'xlsx' },
              ]}
            />
          </Space>
          <Text type="secondary" style={{ display: 'block', marginTop: 10 }}>
            {t('settings.alerts.markdownAlias')}
          </Text>
        </div>

        {connectionFeedback.indexing ? (
          <Alert
            type={connectionFeedback.indexing.status === 'success' ? 'success' : 'error'}
            showIcon
            title={connectionFeedback.indexing.message}
            description={connectionFeedback.indexing.detail}
          />
        ) : null}

        <Flex justify="space-between" align="center" gap={12} wrap>
          <Text type="secondary">
            {t('settings.alerts.indexingTestHint')}
          </Text>
          <Space>
            <Button
              icon={<ApiOutlined />}
              loading={testingSection === 'indexing'}
              onClick={() => void onTestIndexing()}
              >
                {t('settings.actions.testIndexing')}
              </Button>
            <Button
              type="primary"
              loading={savingSection === 'indexing'}
              onClick={() => void onSaveIndexing()}
              >
                {t('settings.actions.saveIndexing')}
              </Button>
            </Space>
          </Flex>
      </Space>
    </SectionBlock>
  );
};
