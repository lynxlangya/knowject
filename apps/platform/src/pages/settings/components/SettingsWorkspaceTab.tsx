import type { Dispatch, SetStateAction } from 'react';
import { Button, Card, Flex, Input, Space, Typography } from 'antd';
import type { WorkspaceDraft, SaveSection } from '../constants';
import { SectionBlock, SettingField } from './SettingsPageParts';

const { TextArea } = Input;
const { Paragraph, Text } = Typography;

interface SettingsWorkspaceTabProps {
  workspaceDraft: WorkspaceDraft;
  setWorkspaceDraft: Dispatch<SetStateAction<WorkspaceDraft>>;
  savingSection: SaveSection;
  onSaveWorkspace: () => Promise<void>;
}

export const SettingsWorkspaceTab = ({
  workspaceDraft,
  setWorkspaceDraft,
  savingSection,
  onSaveWorkspace,
}: SettingsWorkspaceTabProps) => {
  return (
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
            onClick={() => void onSaveWorkspace()}
          >
            保存工作区信息
          </Button>
        </Flex>
      </Space>
    </SectionBlock>
  );
};
