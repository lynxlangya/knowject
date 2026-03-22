import { extractApiErrorMessage } from '@api/error';
import {
  deleteSkill,
  updateSkill,
  type SkillSummaryResponse,
} from '@api/skills';
import { tp } from '../skills.i18n';

interface SkillActionMessageApi {
  success: (content: string) => void;
  error: (content: string) => void;
}

interface SkillActionModalApi {
  confirm: (config: {
    title: string;
    content: string;
    okText: string;
    okButtonProps: { danger: boolean };
    cancelText: string;
    onOk: () => Promise<void>;
  }) => void;
}

interface UseSkillCatalogActionsOptions {
  message: SkillActionMessageApi;
  modal: SkillActionModalApi;
  onReload: () => void;
  onOpenEdit: (skill: SkillSummaryResponse) => Promise<void>;
}

export const useSkillCatalogActions = ({
  message,
  modal,
  onReload,
  onOpenEdit,
}: UseSkillCatalogActionsOptions) => {
  const handlePublishSkill = async (skill: SkillSummaryResponse) => {
    try {
      await updateSkill(skill.id, {
        lifecycleStatus: 'published',
      });
      message.success(tp('feedback.published', { name: skill.name }));
      onReload();
    } catch (currentError) {
      console.error('[SkillsManagementPage] 发布 Skill 失败:', currentError);
      message.error(
        extractApiErrorMessage(currentError, tp('feedback.publishFailed')),
      );
    }
  };

  const handleDeleteSkill = (skill: SkillSummaryResponse) => {
    modal.confirm({
      title: tp('feedback.deleteTitle', { name: skill.name }),
      content: tp('feedback.deleteDescription'),
      okText: tp('feedback.deleteConfirm'),
      okButtonProps: {
        danger: true,
      },
      cancelText: tp('editor.cancel'),
      onOk: async () => {
        await deleteSkill(skill.id);
        message.success(tp('feedback.deleted', { name: skill.name }));
        onReload();
      },
    });
  };

  const handleSkillMenuAction = (
    skill: SkillSummaryResponse,
    actionKey: string,
  ) => {
    if (actionKey === 'edit') {
      void onOpenEdit(skill);
      return;
    }

    if (actionKey === 'publish') {
      void handlePublishSkill(skill);
      return;
    }

    if (actionKey === 'delete') {
      handleDeleteSkill(skill);
    }
  };

  return {
    handleSkillMenuAction,
  };
};
