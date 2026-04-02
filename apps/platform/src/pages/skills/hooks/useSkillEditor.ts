import { useMemo, useState } from 'react';
import { extractApiErrorMessage } from '@api/error';
import {
  createSkill,
  getSkillDetail,
  updateSkill,
  type SkillDetailResponse,
  type SkillSummaryResponse,
} from '@api/skills';
import type { EditorMode } from '../types/skillsManagement.types';
import { tp } from '../skills.i18n';
import {
  buildSkillMarkdownPreview,
  createEmptySkillEditorDraft,
  createSkillEditorDraftFromDetail,
  normalizeSkillDefinition,
  type SkillEditorDraft,
  validateSkillEditorDraft,
} from '../skillDefinition';

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
  const [editorDraft, setEditorDraft] = useState<SkillEditorDraft>(
    createEmptySkillEditorDraft(),
  );
  const [editorLoading, setEditorLoading] = useState(false);
  const [editorSubmitting, setEditorSubmitting] = useState(false);

  const editorValidation = useMemo(() => {
    return validateSkillEditorDraft(editorDraft);
  }, [editorDraft]);

  const editorMarkdownPreview = useMemo(() => {
    return buildSkillMarkdownPreview({
      name: editorDraft.name,
      description: editorDraft.description,
      definition: editorDraft.definition,
    });
  }, [editorDraft]);

  const resetEditorState = () => {
    setEditorMode(null);
    setEditorTabKey('editor');
    setEditingSkill(null);
    setEditorDraft(createEmptySkillEditorDraft());
    setEditorLoading(false);
    setEditorSubmitting(false);
  };

  const handleOpenCreateModal = () => {
    setEditorMode('create');
    setEditorTabKey('editor');
    setEditingSkill(null);
    setEditorDraft(createEmptySkillEditorDraft());
  };

  const handleOpenEditModal = async (skill: SkillSummaryResponse) => {
    setEditorMode('edit');
    setEditorTabKey('editor');
    setEditorLoading(true);

    try {
      const result = await getSkillDetail(skill.id);
      setEditingSkill(result.skill);
      setEditorDraft(
        createSkillEditorDraftFromDetail({
          name: result.skill.name,
          description: result.skill.description,
          category: result.skill.category,
          owner: result.skill.owner,
          status: result.skill.status,
          definition: result.skill.definition,
        }),
      );
    } catch (currentError) {
      console.error('[SkillsManagementPage] 加载 Skill 详情失败:', currentError);
      message.error(
        extractApiErrorMessage(currentError, tp('feedback.detailLoadFailed')),
      );
      resetEditorState();
    } finally {
      setEditorLoading(false);
    }
  };

  const handleSubmitEditor = async () => {
    if (!editorValidation.valid) {
      message.warning(tp('feedback.definitionInvalid'));
      setEditorTabKey('editor');
      return;
    }

    setEditorSubmitting(true);

    try {
      const payload = {
        name: editorDraft.name.trim(),
        description: editorDraft.description.trim(),
        category: editorDraft.category,
        owner: editorDraft.owner.trim(),
        definition: normalizeSkillDefinition(editorDraft.definition),
      };

      if (editorMode === 'create') {
        await createSkill(payload);
        message.success(tp('feedback.createdDraft'));
      }

      if (editorMode === 'edit' && editingSkill) {
        await updateSkill(editingSkill.id, {
          ...payload,
          status: editorDraft.status,
        });
        message.success(tp('feedback.saved'));
      }

      resetEditorState();
      onSaved();
    } catch (currentError) {
      console.error('[SkillsManagementPage] 保存 Skill 失败:', currentError);
      message.error(
        extractApiErrorMessage(currentError, tp('feedback.saveFailed')),
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
    editorDraft,
    setEditorDraft,
    editorLoading,
    editorSubmitting,
    editorValidation,
    editorMarkdownPreview,
    resetEditorState,
    handleOpenCreateModal,
    handleOpenEditModal,
    handleSubmitEditor,
  };
};
