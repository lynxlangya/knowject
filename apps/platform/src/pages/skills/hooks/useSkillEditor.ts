import { useMemo, useState } from 'react';
import { extractApiErrorMessage } from '@api/error';
import {
  createSkill,
  getSkillDetail,
  updateSkill,
  type SkillDetailResponse,
  type SkillLifecycleStatus,
  type SkillSummaryResponse,
} from '@api/skills';
import type { EditorMode } from '../types/skillsManagement.types';
import {
  buildSkillMarkdownTemplate,
  parseSkillMarkdownPreview,
} from '../skillsMarkdown';

interface SkillEditorMessageApi {
  success: (content: string) => void;
  warning: (content: string) => void;
  error: (content: string) => void;
}

interface UseSkillEditorOptions {
  message: SkillEditorMessageApi;
  onSaved: () => void;
}

export const useSkillEditor = ({ message, onSaved }: UseSkillEditorOptions) => {
  const [editorMode, setEditorMode] = useState<EditorMode>(null);
  const [editorTabKey, setEditorTabKey] = useState<'editor' | 'preview'>(
    'editor',
  );
  const [editingSkill, setEditingSkill] = useState<SkillDetailResponse | null>(
    null,
  );
  const [editorMarkdown, setEditorMarkdown] = useState('');
  const [editorLifecycleStatus, setEditorLifecycleStatus] =
    useState<SkillLifecycleStatus>('draft');
  const [editorLoading, setEditorLoading] = useState(false);
  const [editorSubmitting, setEditorSubmitting] = useState(false);

  const editorValidation = useMemo(() => {
    return parseSkillMarkdownPreview(editorMarkdown);
  }, [editorMarkdown]);

  const resetEditorState = () => {
    setEditorMode(null);
    setEditorTabKey('editor');
    setEditingSkill(null);
    setEditorMarkdown('');
    setEditorLifecycleStatus('draft');
    setEditorLoading(false);
    setEditorSubmitting(false);
  };

  const handleOpenCreateModal = () => {
    setEditorMode('create');
    setEditorTabKey('editor');
    setEditingSkill(null);
    setEditorMarkdown(buildSkillMarkdownTemplate());
    setEditorLifecycleStatus('draft');
  };

  const handleOpenEditModal = async (skill: SkillSummaryResponse) => {
    setEditorMode('edit');
    setEditorTabKey('editor');
    setEditorLoading(true);

    try {
      const result = await getSkillDetail(skill.id);
      setEditingSkill(result.skill);
      setEditorMarkdown(result.skill.skillMarkdown);
      setEditorLifecycleStatus(result.skill.lifecycleStatus);
    } catch (currentError) {
      console.error('[SkillsManagementPage] 加载 Skill 详情失败:', currentError);
      message.error(
        extractApiErrorMessage(currentError, '加载 Skill 详情失败，请稍后重试'),
      );
      resetEditorState();
    } finally {
      setEditorLoading(false);
    }
  };

  const handleSubmitEditor = async () => {
    if (!editorValidation.valid) {
      message.warning('请先修正 SKILL.md frontmatter 校验问题');
      setEditorTabKey('editor');
      return;
    }

    setEditorSubmitting(true);

    try {
      if (editorMode === 'create') {
        await createSkill({
          skillMarkdown: editorMarkdown,
        });
        message.success('Skill 已创建为草稿');
      }

      if (editorMode === 'edit' && editingSkill) {
        await updateSkill(editingSkill.id, {
          skillMarkdown: editorMarkdown,
          lifecycleStatus: editorLifecycleStatus,
        });
        message.success('Skill 已保存');
      }

      resetEditorState();
      onSaved();
    } catch (currentError) {
      console.error('[SkillsManagementPage] 保存 Skill 失败:', currentError);
      message.error(
        extractApiErrorMessage(currentError, '保存 Skill 失败，请稍后重试'),
      );
    } finally {
      setEditorSubmitting(false);
    }
  };

  return {
    editorMode,
    editorTabKey,
    setEditorTabKey,
    editingSkill,
    editorMarkdown,
    setEditorMarkdown,
    editorLifecycleStatus,
    setEditorLifecycleStatus,
    editorLoading,
    editorSubmitting,
    editorValidation,
    resetEditorState,
    handleOpenCreateModal,
    handleOpenEditModal,
    handleSubmitEditor,
  };
};
