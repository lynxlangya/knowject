import { extractApiErrorMessage } from "@api/error";
import {
  deleteSkill,
  updateSkill,
  type SkillStatus,
  type SkillSummaryResponse,
} from "@api/skills";
import { tp } from "../skills.i18n";

interface SkillActionMessageApi {
  success: (content: string) => void;
  error: (content: string) => void;
}

interface SkillActionModalApi {
  confirm: (config: {
    title: string;
    content: string;
    okText: string;
    okButtonProps?: { danger?: boolean };
    cancelText: string;
    onOk: () => Promise<void>;
  }) => void;
}

interface UseSkillCatalogActionsOptions {
  message: SkillActionMessageApi;
  modal: SkillActionModalApi;
  onReload: () => void;
}

const updateSkillStatus = async (
  skill: SkillSummaryResponse,
  status: SkillStatus,
) => {
  await updateSkill(skill.id, { status });
};

export const useSkillCatalogActions = ({
  message,
  modal,
  onReload,
}: UseSkillCatalogActionsOptions) => {
  const handleStatusChange = async (
    skill: SkillSummaryResponse,
    status: SkillStatus,
  ) => {
    try {
      await updateSkillStatus(skill, status);
      message.success(
        tp("feedback.statusUpdated", {
          name: skill.name,
          status: tp(`status.option.${status}`),
        }),
      );
      onReload();
    } catch (currentError) {
      console.error(
        "[SkillsManagementPage] 更新 Skill 状态失败:",
        currentError,
      );
      message.error(
        extractApiErrorMessage(currentError, tp("feedback.statusUpdateFailed")),
      );
    }
  };

  const handleDeleteSkill = (skill: SkillSummaryResponse) => {
    modal.confirm({
      title: tp("feedback.deleteTitle", { name: skill.name }),
      content: tp("feedback.deleteDescription"),
      okText: tp("feedback.deleteConfirm"),
      okButtonProps: {
        danger: true,
      },
      cancelText: tp("editor.cancel"),
      onOk: async () => {
        await deleteSkill(skill.id);
        message.success(tp("feedback.deleted", { name: skill.name }));
        onReload();
      },
    });
  };

  const handleSkillMenuAction = (
    skill: SkillSummaryResponse,
    actionKey: string,
  ) => {
    if (actionKey === "activate") {
      void handleStatusChange(skill, "active");
      return;
    }

    if (actionKey === "deprecate") {
      void handleStatusChange(skill, "deprecated");
      return;
    }

    if (actionKey === "archive") {
      void handleStatusChange(skill, "archived");
      return;
    }

    if (actionKey === "draft") {
      void handleStatusChange(skill, "draft");
      return;
    }

    if (actionKey === "delete") {
      handleDeleteSkill(skill);
    }
  };

  return {
    handleSkillMenuAction,
  };
};
