import type { Dispatch, SetStateAction } from 'react';
import { Button, Card, Flex, Input, Space, Typography } from 'antd';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation('pages');

  return (
    <SectionBlock
      title={t('settings.tabs.workspace')}
      description={t('settings.alerts.workspaceDescription')}
    >
      <Space orientation="vertical" size={20} style={{ width: '100%' }}>
        <SettingField label={t('settings.fields.workspaceName')}>
          <Input
            value={workspaceDraft.name}
            placeholder={t('settings.workspace.placeholderName')}
            onChange={(event) =>
              setWorkspaceDraft((current) => ({
                ...current,
                name: event.target.value,
              }))
            }
          />
        </SettingField>

        <SettingField label={t('settings.fields.workspaceDescription')}>
          <TextArea
            rows={4}
            maxLength={200}
            showCount
            value={workspaceDraft.description}
            placeholder={t('settings.workspace.placeholderDescription')}
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
              <Text strong>{t('settings.fields.logoUpload')}</Text>
              <Paragraph type="secondary" style={{ marginTop: 8, marginBottom: 0 }}>
                {t('settings.alerts.workspaceLogoDescription')}
              </Paragraph>
            </div>
            <Button disabled>{t('settings.actions.comingSoon')}</Button>
          </Flex>
        </Card>

        <Flex justify="flex-end">
          <Button
            type="primary"
            loading={savingSection === 'workspace'}
            onClick={() => void onSaveWorkspace()}
          >
            {t('settings.actions.saveWorkspace')}
          </Button>
        </Flex>
      </Space>
    </SectionBlock>
  );
};
