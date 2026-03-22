import { Alert, Input, Modal, Select, Spin, Tabs, Typography } from 'antd';
import type { SkillDetailResponse, SkillLifecycleStatus } from '@api/skills';
import { useTranslation } from 'react-i18next';
import { editorTabs, lifecycleOptions } from '../constants/skillsManagement.constants';
import type { EditorMode } from '../types/skillsManagement.types';
import type { ParsedSkillMarkdownPreview } from '../skillsMarkdown';
import { SkillMarkdownPreview } from './SkillMarkdownPreview';

interface SkillEditorModalProps {
  editorMode: EditorMode;
  editorTabKey: 'editor' | 'preview';
  onEditorTabKeyChange: (key: 'editor' | 'preview') => void;
  editingSkill: SkillDetailResponse | null;
  editorMarkdown: string;
  onEditorMarkdownChange: (value: string) => void;
  editorLifecycleStatus: SkillLifecycleStatus;
  onEditorLifecycleStatusChange: (status: SkillLifecycleStatus) => void;
  editorLoading: boolean;
  editorSubmitting: boolean;
  editorValidation: ParsedSkillMarkdownPreview;
  onCancel: () => void;
  onSubmit: () => void;
}

export const SkillEditorModal = ({
  editorMode,
  editorTabKey,
  onEditorTabKeyChange,
  editingSkill,
  editorMarkdown,
  onEditorMarkdownChange,
  editorLifecycleStatus,
  onEditorLifecycleStatusChange,
  editorLoading,
  editorSubmitting,
  editorValidation,
  onCancel,
  onSubmit,
}: SkillEditorModalProps) => {
  const { t } = useTranslation('pages');

  return (
    <Modal
      title={
        editorMode === 'create'
          ? t('skills.editor.createTitle')
          : t('skills.editor.editTitle')
      }
      open={editorMode !== null}
      onCancel={onCancel}
      onOk={onSubmit}
      confirmLoading={editorSubmitting}
      destroyOnHidden
      width={880}
      okText={
        editorMode === 'create'
          ? t('skills.editor.createDraft')
          : t('skills.editor.save')
      }
      cancelText={t('skills.editor.cancel')}
    >
      {editorLoading ? (
        <div className="flex min-h-80 items-center justify-center">
          <Spin />
        </div>
      ) : (
        <div className="space-y-4">
          <Alert
            type="info"
            showIcon
            message={t('skills.editor.intro')}
          />

          {editorMode === 'edit' && editingSkill?.source !== 'system' ? (
            <div className="flex items-center gap-3">
              <Typography.Text className="text-sm text-slate-500">
                {t('skills.lifecycle.title')}
              </Typography.Text>
              <Select
                value={editorLifecycleStatus}
                className="w-52"
                options={lifecycleOptions}
                onChange={(value) => onEditorLifecycleStatusChange(value)}
              />
            </div>
          ) : null}

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
                  <div className="space-y-3">
                    {editorValidation.errors.length > 0 ? (
                      <Alert
                        type="warning"
                        showIcon
                        message={t('skills.editor.invalid')}
                        description={
                          <div className="space-y-1">
                            {editorValidation.errors.map((currentError) => (
                              <div key={currentError}>{currentError}</div>
                            ))}
                          </div>
                        }
                      />
                    ) : (
                      <Alert
                        type="success"
                        showIcon
                        message={t('skills.editor.valid')}
                      />
                    )}
                    <Input.TextArea
                      value={editorMarkdown}
                      autoSize={{ minRows: 18, maxRows: 22 }}
                      className="font-mono"
                      placeholder={t('skills.editor.placeholder')}
                      onChange={(event) => {
                        onEditorMarkdownChange(event.target.value);
                      }}
                    />
                  </div>
                ) : (
                  <SkillMarkdownPreview markdown={editorMarkdown} />
                ),
            }))}
          />
        </div>
      )}
    </Modal>
  );
};
