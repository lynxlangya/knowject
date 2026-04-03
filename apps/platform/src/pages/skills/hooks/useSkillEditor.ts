import { useMemo, useState } from 'react';
import { extractApiErrorMessage } from '@api/error';
import {
  createSkill,
  getSkillDetail,
  type SkillAuthoringStructuredDraft,
  updateSkill,
  type SkillDetailResponse,
  type SkillSummaryResponse,
} from '@api/skills';
import type { EditorMode } from '../types/skillsManagement.types';
import { tp } from '../skills.i18n';
import { AUTHORING_SCOPE_TARGET_ALLOWLIST } from '../constants/skillsManagement.constants';
import {
  buildSkillMarkdownPreview,
  createEmptySkillEditorDraft,
  createSkillEditorDraftFromDetail,
  normalizeSkillDefinition,
  type SkillEditorDraft,
  validateSkillEditorDraft,
} from '../skillDefinition';
import { useSkillAuthoringSession } from './useSkillAuthoringSession';

interface SkillEditorMessageApi {
  success: (content: string) => void;
  warning: (content: string) => void;
  error: (content: string) => void;
}

interface UseSkillEditorOptions {
  message: SkillEditorMessageApi;
  onSaved: () => void;
}

const sanitizeAuthoringTargets = (targets: string[]): string[] => {
  return Array.from(new Set(targets)).filter((target) =>
    AUTHORING_SCOPE_TARGET_ALLOWLIST.includes(
      target as (typeof AUTHORING_SCOPE_TARGET_ALLOWLIST)[number],
    ),
  );
};

const hasRecoverableAuthoringProgress = ({
  scenario,
  targets,
  messagesLength,
  questionCount,
  currentSummary,
  structuredDraft,
  pendingAnswer,
}: {
  scenario: SkillEditorDraft['category'] | null;
  targets: string[];
  messagesLength: number;
  questionCount: number;
  currentSummary: string;
  structuredDraft: SkillAuthoringStructuredDraft | null;
  pendingAnswer: string;
}) => {
  return Boolean(
    scenario ||
      targets.length > 0 ||
      messagesLength > 1 ||
      questionCount > 0 ||
      currentSummary.trim() ||
      structuredDraft ||
      pendingAnswer.trim(),
  );
};

export const useSkillEditor = ({ message, onSaved }: UseSkillEditorOptions) => {
  const authoringSession = useSkillAuthoringSession();
  const [editorMode, setEditorMode] = useState<EditorMode>(null);
  const [editorTabKey, setEditorTabKey] = useState<
    'conversation' | 'editor' | 'preview'
  >('conversation');
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
    setEditorTabKey('conversation');
    setEditingSkill(null);
    setEditorDraft(createEmptySkillEditorDraft());
    setEditorLoading(false);
    setEditorSubmitting(false);
  };

  const hydrateEditorDraftFromAuthoring = (
    draft: SkillAuthoringStructuredDraft,
  ) => {
    setEditorDraft(
      createSkillEditorDraftFromDetail({
        name: draft.name,
        description: draft.description,
        category: draft.category,
        owner: draft.owner,
        status: 'draft',
        definition: draft.definition,
      }),
    );
    setEditorTabKey('editor');
  };

  const handleOpenCreateModal = () => {
    setEditorMode('create');
    setEditorTabKey('conversation');
    setEditingSkill(null);
    const sanitizedTargets = sanitizeAuthoringTargets(
      authoringSession.session.scope.targets,
    );
    const hasRecoverableSession = hasRecoverableAuthoringProgress({
      scenario: authoringSession.session.scope.scenario,
      targets: sanitizedTargets,
      messagesLength: authoringSession.session.messages.length,
      questionCount: authoringSession.session.questionCount,
      currentSummary: authoringSession.session.currentSummary,
      structuredDraft: authoringSession.session.structuredDraft,
      pendingAnswer: authoringSession.session.pendingAnswer,
    });

    if (hasRecoverableSession) {
      if (sanitizedTargets.length !== authoringSession.session.scope.targets.length) {
        authoringSession.setSession((current) => ({
          ...current,
          scope: {
            ...current.scope,
            targets: sanitizeAuthoringTargets(current.scope.targets),
          },
        }));
      }
      authoringSession.resumeExistingSession();
      if (authoringSession.session.structuredDraft) {
        hydrateEditorDraftFromAuthoring(authoringSession.session.structuredDraft);
      }
      return;
    }
    setEditorDraft(createEmptySkillEditorDraft());
  };

  const handleOpenEditModal = async (skill: SkillSummaryResponse) => {
    setEditorMode('edit');
    setEditorTabKey('editor');
    authoringSession.startFreshSession();
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
        authoringSession.startFreshSession();
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

  const handleAuthoringScenarioChange = (scenario: SkillEditorDraft['category']) => {
    authoringSession.setSession((current) => ({
      ...current,
      scope: {
        ...current.scope,
        scenario,
      },
    }));
  };

  const handleAuthoringTargetsChange = (targets: string[]) => {
    authoringSession.setSession((current) => ({
      ...current,
      scope: {
        ...current.scope,
        targets: sanitizeAuthoringTargets(targets),
      },
    }));
  };

  const handleConfirmAuthoringScope = () => {
    authoringSession.setSession((current) => {
      const sanitizedTargets = sanitizeAuthoringTargets(current.scope.targets);

      if (!current.scope.scenario || sanitizedTargets.length === 0) {
        return current;
      }

      if (current.stage !== 'scope_selecting') {
        return current;
      }

      return {
        ...current,
        scope: {
          ...current.scope,
          targets: sanitizedTargets,
        },
        stage: 'interviewing',
      };
    });
  };

  const handleAuthoringAnswerChange = (answer: string) => {
    authoringSession.setSession((current) => ({
      ...current,
      pendingAnswer: answer,
    }));
  };

  const handleSubmitAuthoringAnswer = async () => {
    const answer = authoringSession.session.pendingAnswer.trim();
    const sanitizedTargets = sanitizeAuthoringTargets(
      authoringSession.session.scope.targets,
    );

    if (!answer) {
      return;
    }

    if (authoringSession.session.stage === 'scope_selecting') {
      return;
    }

    if (sanitizedTargets.length !== authoringSession.session.scope.targets.length) {
      authoringSession.setSession((current) => ({
        ...current,
        scope: {
          ...current.scope,
          targets: sanitizeAuthoringTargets(current.scope.targets),
        },
      }));
      return;
    }

    if (sanitizedTargets.length === 0) {
      return;
    }

    try {
      await authoringSession.submitAnswer(answer);
    } catch (currentError) {
      console.error('[SkillsManagementPage] 提交 Skill 对话回答失败:', currentError);
      message.error(
        extractApiErrorMessage(currentError, tp('feedback.authoringTurnFailed')),
      );
    }
  };

  const handleConfirmAuthoringDraft = () => {
    const draft = authoringSession.session.structuredDraft;

    if (!draft) {
      return;
    }

    authoringSession.applyStructuredDraft(draft);
    hydrateEditorDraftFromAuthoring(draft);
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
    authoringSession: authoringSession.session,
    authoringSubmitting: authoringSession.session.stage === 'synthesizing',
    handleAuthoringScenarioChange,
    handleAuthoringTargetsChange,
    handleConfirmAuthoringScope,
    handleAuthoringAnswerChange,
    handleSubmitAuthoringAnswer,
    handleConfirmAuthoringDraft,
  };
};
