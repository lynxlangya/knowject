import { useState } from 'react';
import { extractApiErrorMessage } from '@api/error';
import {
  getSkillDetail,
  type SkillDetailResponse,
  type SkillSummaryResponse,
} from '@api/skills';
import { tp } from '../skills.i18n';

interface SkillViewerMessageApi {
  error: (content: string) => void;
}

interface UseSkillViewerOptions {
  message: SkillViewerMessageApi;
}

export const useSkillViewer = ({ message }: UseSkillViewerOptions) => {
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerLoading, setViewerLoading] = useState(false);
  const [viewingSkill, setViewingSkill] = useState<SkillDetailResponse | null>(
    null,
  );

  const resetViewerState = () => {
    setViewerOpen(false);
    setViewerLoading(false);
    setViewingSkill(null);
  };

  const handleOpenViewModal = async (skill: SkillSummaryResponse) => {
    setViewerOpen(true);
    setViewerLoading(true);
    setViewingSkill(null);

    try {
      const result = await getSkillDetail(skill.id);
      setViewingSkill(result.skill);
    } catch (currentError) {
      console.error('[SkillsManagementPage] 加载 Skill 详情失败:', currentError);
      message.error(
        extractApiErrorMessage(currentError, tp('feedback.detailLoadFailed')),
      );
      resetViewerState();
    } finally {
      setViewerLoading(false);
    }
  };

  return {
    viewerOpen,
    viewerLoading,
    viewingSkill,
    resetViewerState,
    handleOpenViewModal,
  };
};
