import { Alert, Input, Modal, Select, Spin, Tabs, Typography } from 'antd';
import type { SkillDetailResponse, SkillLifecycleStatus } from '@api/skills';
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
  return (
    <Modal
      title={editorMode === 'create' ? '新建 Skill' : '编辑 Skill'}
      open={editorMode !== null}
      onCancel={onCancel}
      onOk={onSubmit}
      confirmLoading={editorSubmitting}
      destroyOnHidden
      width={880}
      okText={editorMode === 'create' ? '创建草稿' : '保存修改'}
      cancelText="取消"
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
            message="Skill 以原生 SKILL.md 作为事实源。创建后默认进入草稿，发布后才可被 Agent 或项目绑定。"
          />

          {editorMode === 'edit' && editingSkill?.source !== 'system' ? (
            <div className="flex items-center gap-3">
              <Typography.Text className="text-sm text-slate-500">
                发布状态
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
                        message="当前还不能保存"
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
                        message="frontmatter 校验通过"
                      />
                    )}
                    <Input.TextArea
                      value={editorMarkdown}
                      autoSize={{ minRows: 18, maxRows: 22 }}
                      className="font-mono"
                      placeholder="请填写原生 SKILL.md"
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
