import type { Dispatch, SetStateAction } from 'react';
import { ApiOutlined, WarningOutlined } from '@ant-design/icons';
import { Alert, Button, Checkbox, Flex, InputNumber, Slider, Space, Tag, Typography } from 'antd';
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
  return (
    <SectionBlock
      title="知识索引与分块策略"
      description="这里控制 chunk 切分、支持的稳定文件类型，以及 Node 调用 Python indexer 的请求超时。不会把这个超时误导成 Chroma 或 embedding 的全链路超时。"
      extra={
        <Tag color={settings.indexing.source === 'database' ? 'blue' : 'gold'}>
          {settings.indexing.source === 'database' ? '数据库配置' : '环境变量回退'}
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
                <Button type="link" style={{ paddingInline: 0 }} onClick={onOpenKnowledge}>
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
          label="Indexer 超时（毫秒）"
          hint="这里只影响 Node 调用 Python indexer 的请求等待时间，不代表整个向量链路的统一全局超时。"
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
                onResetConnectionFeedback('indexing');
                setIndexingDraft((current) => ({
                  ...current,
                  supportedTypes: value as IndexingDraft['supportedTypes'],
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
            type={connectionFeedback.indexing.status === 'success' ? 'success' : 'error'}
            showIcon
            title={connectionFeedback.indexing.message}
            description={connectionFeedback.indexing.detail}
          />
        ) : null}

        <Flex justify="space-between" align="center" gap={12} wrap>
          <Text type="secondary">
            测试会校验当前 Node 到 Python indexer 与 Chroma 的连通性，不会验证未保存的 chunk 草稿已经被运行中的 Python 服务采纳。
          </Text>
          <Space>
            <Button
              icon={<ApiOutlined />}
              loading={testingSection === 'indexing'}
              onClick={() => void onTestIndexing()}
            >
              测试索引链路
            </Button>
            <Button
              type="primary"
              loading={savingSection === 'indexing'}
              onClick={() => void onSaveIndexing()}
            >
              保存索引参数
            </Button>
          </Space>
        </Flex>
      </Space>
    </SectionBlock>
  );
};
