import { Alert, Button, Drawer, Input, Select, Space, Spin, Tabs, Typography } from 'antd';
import type { SkillDetailResponse } from '@api/skills';
import type { Dispatch, SetStateAction } from 'react';
import { useTranslation } from 'react-i18next';
import {
  getCategoryOptions,
  getEditorTabs,
  getStatusOptions,
} from '../constants/skillsManagement.constants';
import {
  getSkillDefinitionGoalSection,
  getSkillDefinitionListSections,
  getSkillFollowupStrategyOptions,
  type SkillEditorDraft,
} from '../skillDefinition';
import type { EditorMode } from '../types/skillsManagement.types';
import { SkillDefinitionListField } from './SkillDefinitionListField';
import { SkillMarkdownPreview } from './SkillMarkdownPreview';

interface SkillEditorModalProps {
  editorMode: EditorMode;
  editorTabKey: 'editor' | 'preview';
  onEditorTabKeyChange: (key: 'editor' | 'preview') => void;
  editingSkill: SkillDetailResponse | null;
  editorDraft: SkillEditorDraft;
  onEditorDraftChange: Dispatch<SetStateAction<SkillEditorDraft>>;
  editorMarkdownPreview: string;
  editorLoading: boolean;
  editorSubmitting: boolean;
  onCancel: () => void;
  onSubmit: () => void;
}

export const SkillEditorModal = ({
  editorMode,
  editorTabKey,
  onEditorTabKeyChange,
  editingSkill,
  editorDraft,
  onEditorDraftChange,
  editorMarkdownPreview,
  editorLoading,
  editorSubmitting,
  onCancel,
  onSubmit,
}: SkillEditorModalProps) => {
  const { t } = useTranslation('pages');
  const editorTabs = getEditorTabs();
  const categoryOptions = getCategoryOptions();
  const statusOptions = getStatusOptions();
  const skillDefinitionGoalSection = getSkillDefinitionGoalSection();
  const skillDefinitionListSections = getSkillDefinitionListSections();
  const skillFollowupStrategyOptions = getSkillFollowupStrategyOptions();

  return (
    <Drawer
      title={
        editorMode === 'create'
          ? t('skills.editor.createTitle')
          : t('skills.editor.editTitle')
      }
      open={editorMode !== null}
      placement="right"
      size={720}
      onClose={onCancel}
      destroyOnHidden
      footer={
        <div className="flex flex-wrap items-center justify-end gap-3">
          <Space wrap>
            <Button onClick={onCancel} disabled={editorSubmitting}>
              {t('skills.editor.cancel')}
            </Button>
            <Button type="primary" loading={editorSubmitting} onClick={onSubmit}>
              {editorMode === 'create'
                ? t('skills.editor.createDraft')
                : t('skills.editor.save')}
            </Button>
          </Space>
        </div>
      }
    >
      {editorLoading ? (
        <div className="flex min-h-80 items-center justify-center">
          <Spin />
        </div>
      ) : (
        <div className="space-y-4">
          <Alert type="info" showIcon message={t('skills.editor.intro')} />

          <Tabs
            activeKey={editorTabKey}
            onChange={(activeKey) => {
              onEditorTabKeyChange(activeKey as 'editor' | 'preview');
            }}
            items={editorTabs.map((tab) => ({
              key: tab.key,
              label: tab.label,
              children:
                tab.key === 'editor' ? (
                  <div className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Typography.Text className="text-sm font-medium text-slate-700">
                          {t('skills.editor.fields.name')}
                        </Typography.Text>
                        <Input
                          value={editorDraft.name}
                          placeholder={t('skills.editor.placeholders.name')}
                          onChange={(event) => {
                            onEditorDraftChange((current) => ({
                              ...current,
                              name: event.target.value,
                            }));
                          }}
                        />
                      </div>

                      <div className="space-y-2">
                        <Typography.Text className="text-sm font-medium text-slate-700">
                          {t('skills.editor.fields.owner')}
                        </Typography.Text>
                        <Input
                          value={editorDraft.owner}
                          placeholder={t('skills.editor.placeholders.owner')}
                          onChange={(event) => {
                            onEditorDraftChange((current) => ({
                              ...current,
                              owner: event.target.value,
                            }));
                          }}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Typography.Text className="text-sm font-medium text-slate-700">
                        {t('skills.editor.fields.description')}
                      </Typography.Text>
                      <Input.TextArea
                        value={editorDraft.description}
                        autoSize={{ minRows: 3, maxRows: 5 }}
                        placeholder={t('skills.editor.placeholders.description')}
                        onChange={(event) => {
                          onEditorDraftChange((current) => ({
                            ...current,
                            description: event.target.value,
                          }));
                        }}
                      />
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Typography.Text className="text-sm font-medium text-slate-700">
                          {t('skills.editor.fields.category')}
                        </Typography.Text>
                        <Select
                          value={editorDraft.category}
                          options={categoryOptions}
                          onChange={(value) => {
                            onEditorDraftChange((current) => ({
                              ...current,
                              category: value,
                            }));
                          }}
                        />
                      </div>

                      {editorMode === 'edit' && editingSkill?.source === 'team' ? (
                        <div className="space-y-2">
                          <Typography.Text className="text-sm font-medium text-slate-700">
                            {t('skills.status.title')}
                          </Typography.Text>
                          <Select
                            value={editorDraft.status}
                            options={statusOptions}
                            onChange={(value) => {
                              onEditorDraftChange((current) => ({
                                ...current,
                                status: value,
                              }));
                            }}
                          />
                        </div>
                      ) : null}
                    </div>

                    <div className="space-y-2">
                      <Typography.Text className="text-sm font-medium text-slate-700">
                        {skillDefinitionGoalSection.label}
                      </Typography.Text>
                      <Input.TextArea
                        value={editorDraft.definition.goal}
                        autoSize={{ minRows: 3, maxRows: 5 }}
                        placeholder={skillDefinitionGoalSection.placeholder}
                        onChange={(event) => {
                          onEditorDraftChange((current) => ({
                            ...current,
                            definition: {
                              ...current.definition,
                              goal: event.target.value,
                            },
                          }));
                        }}
                      />
                    </div>

                    <div className="grid gap-4 xl:grid-cols-2">
                      {skillDefinitionListSections.map((section) => (
                        <SkillDefinitionListField
                          key={section.key}
                          label={section.label}
                          addLabel={section.addLabel}
                          placeholder={section.placeholder}
                          value={editorDraft.definition[section.key]}
                          onChange={(value) => {
                            onEditorDraftChange((current) => ({
                              ...current,
                              definition: {
                                ...current.definition,
                                [section.key]: value,
                              },
                            }));
                          }}
                        />
                      ))}
                    </div>

                    <div className="space-y-2">
                      <Typography.Text className="text-sm font-medium text-slate-700">
                        {t('skills.definition.followupQuestionsStrategy.label')}
                      </Typography.Text>
                      <Select
                        value={editorDraft.definition.followupQuestionsStrategy}
                        options={skillFollowupStrategyOptions}
                        onChange={(value) => {
                          onEditorDraftChange((current) => ({
                            ...current,
                            definition: {
                              ...current.definition,
                              followupQuestionsStrategy: value,
                            },
                          }));
                        }}
                      />
                    </div>
                  </div>
                ) : (
                  <SkillMarkdownPreview markdown={editorMarkdownPreview} />
                ),
            }))}
          />
        </div>
      )}
    </Drawer>
  );
};
