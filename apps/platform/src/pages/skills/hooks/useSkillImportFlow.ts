import { useState } from 'react';
import { extractApiErrorMessage } from '@api/error';
import { importSkill, type SkillImportPreview } from '@api/skills';
import type { ImportMode } from '../types/skillsManagement.types';

interface SkillImportMessageApi {
  success: (content: string) => void;
  error: (content: string) => void;
}

interface UseSkillImportFlowOptions {
  message: SkillImportMessageApi;
  onImported: () => void;
}

export const useSkillImportFlow = ({
  message,
  onImported,
}: UseSkillImportFlowOptions) => {
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importMode, setImportMode] = useState<ImportMode>('github');
  const [importGitHubUrl, setImportGitHubUrl] = useState('');
  const [importRepository, setImportRepository] = useState('');
  const [importPath, setImportPath] = useState('');
  const [importRef, setImportRef] = useState('');
  const [importUrl, setImportUrl] = useState('');
  const [importPreview, setImportPreview] = useState<SkillImportPreview | null>(
    null,
  );
  const [importSubmitting, setImportSubmitting] = useState(false);
  const [importPreviewLoading, setImportPreviewLoading] = useState(false);

  const openImportModal = () => {
    setImportModalOpen(true);
  };

  const closeImportModal = () => {
    setImportModalOpen(false);
    setImportMode('github');
    setImportGitHubUrl('');
    setImportRepository('');
    setImportPath('');
    setImportRef('');
    setImportUrl('');
    setImportPreview(null);
    setImportPreviewLoading(false);
    setImportSubmitting(false);
  };

  const setImportModeValue = (mode: ImportMode) => {
    setImportMode(mode);
    setImportPreview(null);
  };

  const setImportGitHubUrlValue = (value: string) => {
    setImportGitHubUrl(value);
    setImportPreview(null);
  };

  const setImportRepositoryValue = (value: string) => {
    setImportRepository(value);
    setImportPreview(null);
  };

  const setImportPathValue = (value: string) => {
    setImportPath(value);
    setImportPreview(null);
  };

  const setImportRefValue = (value: string) => {
    setImportRef(value);
    setImportPreview(null);
  };

  const setImportUrlValue = (value: string) => {
    setImportUrl(value);
    setImportPreview(null);
  };

  const buildImportPayload = (mode: ImportMode, dryRun: boolean) => {
    if (mode === 'github') {
      return {
        mode,
        dryRun,
        ...(importGitHubUrl.trim()
          ? {
              githubUrl: importGitHubUrl.trim(),
            }
          : {
              repository: importRepository.trim(),
              path: importPath.trim() || undefined,
              ref: importRef.trim() || undefined,
            }),
      } as const;
    }

    return {
      mode,
      dryRun,
      url: importUrl.trim(),
    } as const;
  };

  const handlePreviewImport = async () => {
    setImportPreviewLoading(true);

    try {
      const result = await importSkill(buildImportPayload(importMode, true));

      if (!('preview' in result)) {
        throw new Error('import preview response missing');
      }

      setImportPreview(result.preview);
    } catch (currentError) {
      console.error('[SkillsManagementPage] 解析导入预览失败:', currentError);
      setImportPreview(null);
      message.error(
        extractApiErrorMessage(currentError, '解析导入预览失败，请检查来源信息'),
      );
    } finally {
      setImportPreviewLoading(false);
    }
  };

  const handleImportSkill = async () => {
    setImportSubmitting(true);

    try {
      const result = await importSkill(buildImportPayload(importMode, false));

      if (!('skill' in result)) {
        throw new Error('persisted skill response missing');
      }

      message.success('Skill 导入成功，已纳入你的全局资产目录');
      closeImportModal();
      onImported();
    } catch (currentError) {
      console.error('[SkillsManagementPage] 导入 Skill 失败:', currentError);
      message.error(
        extractApiErrorMessage(currentError, '导入 Skill 失败，请稍后重试'),
      );
    } finally {
      setImportSubmitting(false);
    }
  };

  return {
    importModalOpen,
    openImportModal,
    closeImportModal,
    importMode,
    setImportModeValue,
    importGitHubUrl,
    setImportGitHubUrlValue,
    importRepository,
    setImportRepositoryValue,
    importPath,
    setImportPathValue,
    importRef,
    setImportRefValue,
    importUrl,
    setImportUrlValue,
    importPreview,
    importSubmitting,
    importPreviewLoading,
    handlePreviewImport,
    handleImportSkill,
  };
};
