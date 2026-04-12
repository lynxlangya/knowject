import { useMemo, useState } from "react";
import { extractApiErrorMessage } from "@api/error";
import {
  createSkill,
  type SkillAuthoringHumanOverrides,
  type SkillAuthoringInference,
  getSkillDetail,
  type SkillAuthoringStructuredDraft,
  updateSkill,
  type SkillDetailResponse,
  type SkillSummaryResponse,
} from "@api/skills";
import type { EditorMode } from "../types/skillsManagement.types";
import { tp } from "../skills.i18n";
import { AUTHORING_SCOPE_TARGET_ALLOWLIST } from "../constants/skillsManagement.constants";
import {
  buildSkillMarkdownPreview,
  createEmptySkillEditorDraft,
  createSkillEditorDraftFromDetail,
  normalizeSkillDefinition,
  type SkillEditorDraft,
  validateSkillEditorDraft,
} from "../skillDefinition";
import {
  useSkillAuthoringSession,
  hasRealProgress,
  resolveAuthoringResumeStage,
} from "./useSkillAuthoringSession";

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

const buildAuthoringInference = ({
  scenario,
  targets,
}: {
  scenario: SkillEditorDraft["category"] | null;
  targets: string[];
}): SkillAuthoringInference | null => {
  if (!scenario && targets.length === 0) {
    return null;
  }

  return {
    category: scenario,
    contextTargets: targets,
  };
};

const sanitizeAuthoringInference = (
  inference: SkillAuthoringInference | null,
): SkillAuthoringInference | null => {
  if (!inference) {
    return null;
  }

  return {
    ...inference,
    contextTargets: sanitizeAuthoringTargets(inference.contextTargets),
  };
};

const buildAuthoringHumanOverrides = ({
  scenario,
  targets,
}: {
  scenario: SkillEditorDraft["category"] | null;
  targets: string[];
}): SkillAuthoringHumanOverrides | null => {
  const overrides: SkillAuthoringHumanOverrides = {};

  if (scenario !== null) {
    overrides.category = scenario;
  }

  if (targets.length > 0) {
    overrides.contextTargets = targets;
  }

  return Object.keys(overrides).length > 0 ? overrides : null;
};

const sanitizeAuthoringHumanOverrides = (
  overrides: SkillAuthoringHumanOverrides | null,
): SkillAuthoringHumanOverrides | null => {
  if (!overrides) {
    return null;
  }

  const sanitizedOverrides: SkillAuthoringHumanOverrides = {
    ...(overrides.category !== undefined
      ? { category: overrides.category }
      : {}),
    ...(overrides.contextTargets !== undefined
      ? {
          contextTargets: sanitizeAuthoringTargets(overrides.contextTargets),
        }
      : {}),
  };

  return Object.keys(sanitizedOverrides).length > 0 ? sanitizedOverrides : null;
};

export const useSkillEditor = ({ message, onSaved }: UseSkillEditorOptions) => {
  const authoringSession = useSkillAuthoringSession();
  const [editorMode, setEditorMode] = useState<EditorMode>(null);
  const [editorTabKey, setEditorTabKey] = useState<
    "conversation" | "editor" | "preview"
  >("conversation");
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
    authoringSession.cancelActiveTurn();
    setEditorMode(null);
    setEditorTabKey("conversation");
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
        status: "draft",
        definition: draft.definition,
      }),
    );
    setEditorTabKey("editor");
  };

  const handleOpenCreateModal = () => {
    setEditorMode("create");
    setEditorTabKey("conversation");
    setEditingSkill(null);

    if (!hasRealProgress(authoringSession.session)) {
      setEditorDraft(createEmptySkillEditorDraft());
      return;
    }

    const { structuredDraft } = authoringSession.session;
    authoringSession.setSession((current) => {
      const sanitizedTargets = sanitizeAuthoringTargets(current.scope.targets);
      const currentInference =
        sanitizeAuthoringInference(current.currentInference) ??
        buildAuthoringInference({
          scenario: current.scope.scenario,
          targets: sanitizedTargets,
        });
      const humanOverrides =
        sanitizeAuthoringHumanOverrides(current.humanOverrides) ??
        buildAuthoringHumanOverrides({
          scenario: current.scope.scenario,
          targets: sanitizedTargets,
        });

      return {
        ...current,
        scope: {
          ...current.scope,
          targets: sanitizedTargets,
        },
        currentInference,
        humanOverrides,
        stage: resolveAuthoringResumeStage(current),
      };
    });

    if (structuredDraft) {
      hydrateEditorDraftFromAuthoring(structuredDraft);
    }
  };

  const handleOpenEditModal = async (skill: SkillSummaryResponse) => {
    setEditorMode("edit");
    setEditorTabKey("editor");
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
      console.error(
        "[SkillsManagementPage] 加载 Skill 详情失败:",
        currentError,
      );
      message.error(
        extractApiErrorMessage(currentError, tp("feedback.detailLoadFailed")),
      );
      resetEditorState();
    } finally {
      setEditorLoading(false);
    }
  };

  const handleSubmitEditor = async () => {
    if (!editorValidation.valid) {
      message.warning(tp("feedback.definitionInvalid"));
      setEditorTabKey("editor");
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

      if (editorMode === "create") {
        await createSkill(payload);
        authoringSession.startFreshSession();
        message.success(tp("feedback.createdDraft"));
      }

      if (editorMode === "edit" && editingSkill) {
        await updateSkill(editingSkill.id, {
          ...payload,
          status: editorDraft.status,
        });
        message.success(tp("feedback.saved"));
      }

      resetEditorState();
      onSaved();
    } catch (currentError) {
      console.error("[SkillsManagementPage] 保存 Skill 失败:", currentError);
      message.error(
        extractApiErrorMessage(currentError, tp("feedback.saveFailed")),
      );
    } finally {
      setEditorSubmitting(false);
    }
  };

  const handleAuthoringAnswerChange = (answer: string) => {
    authoringSession.setSession((current) => ({
      ...current,
      pendingAnswer: answer,
    }));
  };

  const handleSubmitAuthoringAnswer = async () => {
    const answer = authoringSession.session.pendingAnswer.trim();

    if (!answer) {
      return;
    }

    try {
      await authoringSession.submitAnswer(answer);
    } catch (currentError) {
      console.error(
        "[SkillsManagementPage] 提交 Skill 对话回答失败:",
        currentError,
      );
      message.error(
        extractApiErrorMessage(
          currentError,
          tp("feedback.authoringTurnFailed"),
        ),
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

  const handleResetCreateAuthoring = () => {
    if (editorMode !== "create") {
      return;
    }

    authoringSession.startFreshSession();
    setEditorTabKey("conversation");
    setEditingSkill(null);
    setEditorDraft(createEmptySkillEditorDraft());
    setEditorLoading(false);
    setEditorSubmitting(false);
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
    handleAuthoringAnswerChange,
    handleSubmitAuthoringAnswer,
    handleConfirmAuthoringDraft,
    handleResetCreateAuthoring,
  };
};
