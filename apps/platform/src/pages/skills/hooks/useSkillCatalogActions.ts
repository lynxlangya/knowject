import { extractApiErrorMessage } from '@api/error';
import {
  deleteSkill,
  updateSkill,
  type SkillSummaryResponse,
} from '@api/skills';

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
      message.success(`“${skill.name}”已发布，可用于绑定`);
      onReload();
    } catch (currentError) {
      console.error('[SkillsManagementPage] 发布 Skill 失败:', currentError);
      message.error(
        extractApiErrorMessage(currentError, '发布 Skill 失败，请稍后重试'),
      );
    }
  };

  const handleDeleteSkill = (skill: SkillSummaryResponse) => {
    modal.confirm({
      title: `删除「${skill.name}」`,
      content: '删除后该 Skill 会从全局资产目录移除，且不会自动回源同步。',
      okText: '确认删除',
      okButtonProps: {
        danger: true,
      },
      cancelText: '取消',
      onOk: async () => {
        await deleteSkill(skill.id);
        message.success(`“${skill.name}”已删除`);
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
