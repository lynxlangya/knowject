import { MoreOutlined } from '@ant-design/icons';
import { extractApiErrorMessage } from '@api/error';
import {
  createProjectKnowledge,
  deleteKnowledge,
  deleteKnowledgeDocument,
  getKnowledgeDetail,
  getKnowledgeDiagnostics,
  rebuildKnowledge,
  rebuildKnowledgeDocument,
  retryKnowledgeDocument,
  updateKnowledge,
  uploadProjectKnowledgeDocument,
  type KnowledgeDetailResponse,
  type KnowledgeDiagnosticsResponse,
  type KnowledgeDocumentResponse,
} from '@api/knowledge';
import { App, Alert, Button, Dropdown, Form, Input, Modal, Typography } from 'antd';
import type { MenuProps } from 'antd';
import type { ChangeEvent } from 'react';
import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  PATHS,
  buildProjectSectionPath,
} from '@app/navigation/paths';
import type {
  ProjectResourceFocus,
  ProjectResourceItem,
} from '@app/project/project.types';
import { useProjectContext } from '@app/project/useProjectContext';
import { KnowledgeSourcePickerModal } from '@pages/knowledge/components/KnowledgeSourcePickerModal';
import {
  KnowledgeTextInputModal,
  type KnowledgeTextInputValues,
} from '@pages/knowledge/components/KnowledgeTextInputModal';
import {
  createTextSourceFile,
  DOCUMENT_UPLOAD_ACCEPT,
  formatKnowledgeSourceFileIssues,
  formatKnowledgeSourceLargeFileWarning,
  formatKnowledgeSourceOverflowMessage,
  prepareKnowledgeSourceFiles,
  shouldWarnLargeKnowledgeSourceFile,
  validateKnowledgeSourceFile,
} from '@pages/knowledge/knowledgeUpload.shared';
import {
  ProjectKnowledgeAccessModal,
  type ProjectKnowledgeAccessMode,
  type ProjectKnowledgeFormValues,
} from './components/ProjectKnowledgeAccessModal';
import { ProjectKnowledgeDetailDrawer } from './components/ProjectKnowledgeDetailDrawer';
import { ProjectResourceGroup } from './components/ProjectResourceGroup';
import { useProjectPageContext } from './projectPageContext';
import { getProjectResourceGroups } from './project.mock';

interface EditKnowledgeFormValues {
  name: string;
  description?: string;
}

type UploadFlowStep = 'picker' | 'text';

interface UploadProjectKnowledgeSourceOptions {
  manageLoading?: boolean;
  notifySuccess?: boolean;
  notifyError?: boolean;
  refreshAfterUpload?: boolean;
  showLargeFileWarning?: boolean;
}

interface UploadProjectKnowledgeSourceResult {
  success: boolean;
  reason?: string;
}

const PROJECT_KNOWLEDGE_BATCH_UPLOAD_MESSAGE_KEY = 'project-knowledge-batch-upload';

const formatProjectKnowledgeBatchUploadProgress = (
  current: number,
  total: number,
): string => {
  return `正在上传项目文档 ${current}/${total}`;
};

const formatProjectKnowledgeBatchUploadSuccessMessage = (
  successCount: number,
  totalCount: number,
): string => {
  if (successCount === totalCount) {
    return `已上传 ${successCount} 个文件，正在进入项目索引队列`;
  }

  return `已上传 ${successCount}/${totalCount} 个文件，正在进入项目索引队列`;
};

const GLOBAL_PATH_BY_FOCUS: Record<ProjectResourceFocus, string> = {
  knowledge: PATHS.knowledge,
  skills: PATHS.skills,
  agents: PATHS.agents,
};

const RESOURCE_FOCUS_KEYS = ['knowledge', 'skills', 'agents'] as const;

const isProjectResourceFocus = (value: string | null): value is ProjectResourceFocus => {
  return RESOURCE_FOCUS_KEYS.includes(value as ProjectResourceFocus);
};

export const ProjectResourcesPage = () => {
  const { message, modal } = App.useApp();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { updateProject } = useProjectContext();
  const [knowledgeAccessModalOpen, setKnowledgeAccessModalOpen] = useState(false);
  const [knowledgeAccessInitialMode, setKnowledgeAccessInitialMode] =
    useState<ProjectKnowledgeAccessMode>('global');
  const [knowledgeAccessSubmittingMode, setKnowledgeAccessSubmittingMode] =
    useState<ProjectKnowledgeAccessMode | null>(null);
  const [metadataModalOpen, setMetadataModalOpen] = useState(false);
  const [metadataSubmitting, setMetadataSubmitting] = useState(false);
  const [editingKnowledgeItem, setEditingKnowledgeItem] =
    useState<ProjectResourceItem | null>(null);
  const [uploadFlowStep, setUploadFlowStep] = useState<UploadFlowStep | null>(null);
  const [uploadTargetKnowledgeId, setUploadTargetKnowledgeId] = useState<string | null>(
    null,
  );
  const [uploadingKnowledgeId, setUploadingKnowledgeId] = useState<string | null>(
    null,
  );
  const [activeKnowledgeId, setActiveKnowledgeId] = useState<string | null>(null);
  const [activeKnowledgeReloadToken, setActiveKnowledgeReloadToken] = useState(0);
  const [activeKnowledgeDetail, setActiveKnowledgeDetail] =
    useState<KnowledgeDetailResponse | null>(null);
  const [activeKnowledgeDetailLoading, setActiveKnowledgeDetailLoading] = useState(false);
  const [activeKnowledgeDetailError, setActiveKnowledgeDetailError] = useState<string | null>(
    null,
  );
  const [activeDiagnostics, setActiveDiagnostics] =
    useState<KnowledgeDiagnosticsResponse | null>(null);
  const [activeDiagnosticsLoading, setActiveDiagnosticsLoading] = useState(false);
  const [activeDiagnosticsError, setActiveDiagnosticsError] = useState<string | null>(
    null,
  );
  const [retryingDocumentId, setRetryingDocumentId] = useState<string | null>(null);
  const [rebuildingDocumentId, setRebuildingDocumentId] = useState<string | null>(null);
  const [deletingDocumentId, setDeletingDocumentId] = useState<string | null>(null);
  const [rebuildingKnowledgeId, setRebuildingKnowledgeId] = useState<string | null>(
    null,
  );
  const [deletingKnowledgeId, setDeletingKnowledgeId] = useState<string | null>(null);
  const [updatingGlobalBindingId, setUpdatingGlobalBindingId] = useState<string | null>(
    null,
  );
  const [editForm] = Form.useForm<EditKnowledgeFormValues>();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const {
    activeProject,
    knowledgeCatalog,
    knowledgeCatalogLoading,
    knowledgeCatalogError,
    projectKnowledgeCatalog,
    projectKnowledgeLoading,
    projectKnowledgeError,
    refreshProjectKnowledge,
    agentsCatalog,
    agentsCatalogError,
    skillsCatalog,
    skillsCatalogError,
  } = useProjectPageContext();
  const groups = getProjectResourceGroups(activeProject, {
    knowledgeCatalog,
    projectKnowledgeCatalog,
    agentsCatalog,
    skillsCatalog,
  });
  const knowledgeGroup = groups.find((group) => group.key === 'knowledge') ?? null;
  const knowledgeItems = knowledgeGroup?.items ?? [];
  const rawFocus = searchParams.get('focus');
  const focus = isProjectResourceFocus(rawFocus) ? rawFocus : null;
  const knowledgeRef = useRef<HTMLDivElement>(null);
  const skillsRef = useRef<HTMLDivElement>(null);
  const agentsRef = useRef<HTMLDivElement>(null);
  const uploadTargetKnowledge = projectKnowledgeCatalog.find(
    (knowledge) => knowledge.id === uploadTargetKnowledgeId,
  );
  const activeKnowledgeItem = activeKnowledgeId
    ? knowledgeItems.find((item) => item.id === activeKnowledgeId) ?? null
    : null;
  const activeKnowledgeSource = activeKnowledgeItem?.source ?? null;
  const textUploadSubmitting =
    uploadFlowStep === 'text' &&
    uploadTargetKnowledgeId !== null &&
    uploadingKnowledgeId === uploadTargetKnowledgeId;

  useEffect(() => {
    if (!focus) {
      if (rawFocus) {
        navigate(buildProjectSectionPath(activeProject.id, 'resources'), {
          replace: true,
        });
      }
      return;
    }

    const focusRef =
      focus === 'knowledge' ? knowledgeRef : focus === 'skills' ? skillsRef : agentsRef;

    focusRef.current?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    });

    navigate(buildProjectSectionPath(activeProject.id, 'resources'), {
      replace: true,
    });
  }, [activeProject.id, agentsRef, focus, knowledgeRef, navigate, rawFocus, skillsRef]);

  useEffect(() => {
    if (!metadataModalOpen || !editingKnowledgeItem) {
      return;
    }

    editForm.setFieldsValue({
      name: editingKnowledgeItem.name,
      description: editingKnowledgeItem.description,
    });
  }, [editForm, editingKnowledgeItem, metadataModalOpen]);

  useEffect(() => {
    if (!activeKnowledgeId) {
      return;
    }

    if (activeKnowledgeItem) {
      return;
    }

    setActiveKnowledgeId(null);
    setActiveKnowledgeDetail(null);
    setActiveKnowledgeDetailError(null);
    setActiveDiagnostics(null);
    setActiveDiagnosticsError(null);
  }, [activeKnowledgeId, activeKnowledgeItem]);

  useEffect(() => {
    if (!activeKnowledgeId || !activeKnowledgeSource) {
      setActiveKnowledgeDetail(null);
      setActiveKnowledgeDetailError(null);
      setActiveKnowledgeDetailLoading(false);
      setActiveDiagnostics(null);
      setActiveDiagnosticsError(null);
      setActiveDiagnosticsLoading(false);
      return;
    }

    let isMounted = true;

    const loadKnowledgeState = async () => {
      setActiveKnowledgeDetailLoading(true);
      setActiveKnowledgeDetailError(null);

      if (activeKnowledgeSource === 'project') {
        setActiveDiagnosticsLoading(true);
        setActiveDiagnosticsError(null);
      } else {
        setActiveDiagnostics(null);
        setActiveDiagnosticsError(null);
        setActiveDiagnosticsLoading(false);
      }

      const [detailResult, diagnosticsResult] = await Promise.allSettled([
        getKnowledgeDetail(activeKnowledgeId),
        activeKnowledgeSource === 'project'
          ? getKnowledgeDiagnostics(activeKnowledgeId)
          : Promise.resolve(null),
      ]);

      if (!isMounted) {
        return;
      }

      if (detailResult.status === 'fulfilled') {
        setActiveKnowledgeDetail(detailResult.value.knowledge);
        setActiveKnowledgeDetailError(null);
      } else {
        console.error('[ProjectResources] 加载知识库详情失败:', detailResult.reason);
        setActiveKnowledgeDetail(null);
        setActiveKnowledgeDetailError(
          extractApiErrorMessage(detailResult.reason, '加载知识库详情失败，请稍后重试'),
        );
      }

      setActiveKnowledgeDetailLoading(false);

      if (activeKnowledgeSource !== 'project') {
        return;
      }

      if (diagnosticsResult.status === 'fulfilled') {
        setActiveDiagnostics(diagnosticsResult.value);
        setActiveDiagnosticsError(null);
      } else {
        console.error('[ProjectResources] 加载知识库诊断失败:', diagnosticsResult.reason);
        setActiveDiagnostics(null);
        setActiveDiagnosticsError(
          extractApiErrorMessage(diagnosticsResult.reason, '加载知识库诊断失败，请稍后重试'),
        );
      }

      setActiveDiagnosticsLoading(false);
    };

    void loadKnowledgeState();

    return () => {
      isMounted = false;
    };
  }, [activeKnowledgeId, activeKnowledgeReloadToken, activeKnowledgeSource]);

  const resourceCountByGroup = groups.reduce<Record<ProjectResourceFocus, number>>(
    (result, group) => {
      result[group.key] = group.items.length;
      return result;
    },
    {
      knowledge: 0,
      skills: 0,
      agents: 0,
    },
  );

  const summaryItems = [
    {
      label: '知识库',
      value: `${resourceCountByGroup.knowledge} 个`,
      hint: `${activeProject.knowledgeBaseIds.length} 个全局绑定 + ${projectKnowledgeCatalog.length} 个项目私有`,
    },
    {
      label: '技能',
      value: `${resourceCountByGroup.skills} 个`,
      hint: '当前项目可直接复用的工作流能力',
    },
    {
      label: '智能体',
      value: `${resourceCountByGroup.agents} 个`,
      hint: '当前项目已绑定的协作智能体',
    },
    {
      label: '资源分层',
      value: '2 层',
      hint: '全局资产治理，项目资源编排与消费',
    },
  ];

  const isDocumentBusy = (documentId: string) => {
    return (
      retryingDocumentId === documentId ||
      rebuildingDocumentId === documentId ||
      deletingDocumentId === documentId
    );
  };

  const refreshActiveKnowledge = () => {
    if (activeKnowledgeItem?.source === 'project') {
      refreshProjectKnowledge();
    }

    setActiveKnowledgeReloadToken((value) => value + 1);
  };

  const closeKnowledgeAccessModal = () => {
    setKnowledgeAccessModalOpen(false);
  };

  const openKnowledgeAccessModal = (initialMode: ProjectKnowledgeAccessMode) => {
    setKnowledgeAccessInitialMode(initialMode);
    setKnowledgeAccessModalOpen(true);
  };

  const openProjectKnowledgeUpload = (knowledgeId: string) => {
    setUploadTargetKnowledgeId(knowledgeId);
    setUploadFlowStep('picker');
  };

  const closeUploadFlow = () => {
    setUploadFlowStep(null);
    setUploadTargetKnowledgeId(null);
  };

  const triggerDocumentUpload = () => {
    fileInputRef.current?.click();
  };

  const commitProjectKnowledgeBindings = async (
    knowledgeBaseIds: string[],
  ): Promise<boolean> => {
    const result = await updateProject({
      projectId: activeProject.id,
      name: activeProject.name,
      description: activeProject.description,
      knowledgeBaseIds,
      agentIds: activeProject.agentIds,
      skillIds: activeProject.skillIds,
    });

    if (result === 'updated') {
      return true;
    }

    if (result === 'not_found') {
      message.error('项目不存在或已被删除');
      return false;
    }

    message.error('当前无法更新项目资源绑定，请稍后重试');
    return false;
  };

  const uploadProjectKnowledgeSource = async (
    knowledgeId: string,
    file: File,
    options?: UploadProjectKnowledgeSourceOptions,
  ): Promise<UploadProjectKnowledgeSourceResult> => {
    const notifyError = options?.notifyError !== false;
    const validationError = validateKnowledgeSourceFile(file);

    if (validationError) {
      if (notifyError) {
        message.error(validationError);
      }

      return {
        success: false,
        reason: validationError,
      };
    }

    if (
      options?.showLargeFileWarning !== false &&
      shouldWarnLargeKnowledgeSourceFile(file)
    ) {
      message.warning('文件超过 20 MB，建议按主题拆分上传，索引更快也更稳');
    }

    const manageLoading = options?.manageLoading !== false;

    if (manageLoading) {
      setUploadingKnowledgeId(knowledgeId);
    }

    try {
      await uploadProjectKnowledgeDocument(activeProject.id, knowledgeId, file);

      if (options?.notifySuccess !== false) {
        message.success('文档已上传，正在进入项目索引队列');
      }

      if (options?.refreshAfterUpload !== false) {
        refreshProjectKnowledge();
        setActiveKnowledgeId(knowledgeId);
        setActiveKnowledgeReloadToken((value) => value + 1);
      }

      return {
        success: true,
      };
    } catch (currentError) {
      const errorMessage = extractApiErrorMessage(
        currentError,
        '上传项目知识文档失败，请稍后重试',
      );

      console.error('[ProjectResources] 上传项目知识文档失败:', currentError);

      if (notifyError) {
        message.error(errorMessage);
      }

      return {
        success: false,
        reason: errorMessage,
      };
    } finally {
      if (manageLoading) {
        setUploadingKnowledgeId(null);
      }
    }
  };

  const handleSelectedFiles = async (files: File[]) => {
    if (files.length === 0 || !uploadTargetKnowledgeId) {
      return;
    }

    const {
      acceptedFiles,
      fileIssues,
      overflowCount,
      largeFileCount,
    } = prepareKnowledgeSourceFiles(files);

    if (overflowCount > 0) {
      message.warning(formatKnowledgeSourceOverflowMessage(overflowCount));
    }

    if (fileIssues.length > 0) {
      message.warning(`已跳过 ${fileIssues.length} 个文件：${formatKnowledgeSourceFileIssues(fileIssues)}`);
    }

    if (acceptedFiles.length === 0) {
      return;
    }

    if (largeFileCount > 0) {
      message.warning(formatKnowledgeSourceLargeFileWarning(largeFileCount));
    }

    const knowledgeId = uploadTargetKnowledgeId;
    closeUploadFlow();

    if (acceptedFiles.length === 1) {
      await uploadProjectKnowledgeSource(knowledgeId, acceptedFiles[0], {
        showLargeFileWarning: false,
      });
      return;
    }

    const failedFiles: Array<{ fileName: string; reason: string }> = [];
    let successCount = 0;

    setUploadingKnowledgeId(knowledgeId);

    try {
      for (const [index, file] of acceptedFiles.entries()) {
        message.open({
          key: PROJECT_KNOWLEDGE_BATCH_UPLOAD_MESSAGE_KEY,
          type: 'loading',
          content: formatProjectKnowledgeBatchUploadProgress(
            index + 1,
            acceptedFiles.length,
          ),
          duration: 0,
        });

        const result = await uploadProjectKnowledgeSource(knowledgeId, file, {
          manageLoading: false,
          notifySuccess: false,
          notifyError: false,
          refreshAfterUpload: false,
          showLargeFileWarning: false,
        });

        if (result.success) {
          successCount += 1;
          continue;
        }

        failedFiles.push({
          fileName: file.name,
          reason: result.reason ?? '上传项目知识文档失败，请稍后重试',
        });
      }
    } finally {
      setUploadingKnowledgeId(null);
    }

    if (successCount > 0) {
      refreshProjectKnowledge();
      setActiveKnowledgeId(knowledgeId);
      setActiveKnowledgeReloadToken((value) => value + 1);
    }

    if (successCount > 0) {
      message.open({
        key: PROJECT_KNOWLEDGE_BATCH_UPLOAD_MESSAGE_KEY,
        type: failedFiles.length === 0 ? 'success' : 'warning',
        content: formatProjectKnowledgeBatchUploadSuccessMessage(
          successCount,
          acceptedFiles.length,
        ),
        duration: 4,
      });
    } else {
      message.open({
        key: PROJECT_KNOWLEDGE_BATCH_UPLOAD_MESSAGE_KEY,
        type: 'error',
        content: '所选文件上传失败，请稍后重试',
        duration: 4,
      });
    }

    if (failedFiles.length > 0) {
      message.error(`上传失败的文件：${formatKnowledgeSourceFileIssues(failedFiles)}`);
    }
  };

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    event.target.value = '';

    if (files.length === 0) {
      return;
    }

    await handleSelectedFiles(files);
  };

  const handleOpenTextInput = () => {
    setUploadFlowStep('text');
  };

  const handleBackToSourcePicker = () => {
    setUploadFlowStep('picker');
  };

  const handleSubmitTextSource = async (values: KnowledgeTextInputValues) => {
    if (!uploadTargetKnowledgeId) {
      return;
    }

    const knowledgeId = uploadTargetKnowledgeId;
    const uploadSucceeded = await uploadProjectKnowledgeSource(
      knowledgeId,
      createTextSourceFile(values),
    );

    if (uploadSucceeded.success) {
      closeUploadFlow();
    }
  };

  const handleCancelTextInput = () => {
    if (textUploadSubmitting) {
      return;
    }

    closeUploadFlow();
  };

  const handleBindGlobalKnowledge = async (knowledgeIds: string[]) => {
    if (knowledgeIds.length === 0) {
      return;
    }

    setKnowledgeAccessSubmittingMode('global');

    try {
      const updated = await commitProjectKnowledgeBindings(
        Array.from(new Set([...activeProject.knowledgeBaseIds, ...knowledgeIds])),
      );

      if (!updated) {
        return;
      }

      message.success(`已为项目引入 ${knowledgeIds.length} 个全局知识库`);
      closeKnowledgeAccessModal();
    } catch (currentError) {
      console.error('[ProjectResources] 绑定全局知识失败:', currentError);
      message.error(
        extractApiErrorMessage(currentError, '绑定全局知识失败，请稍后重试'),
      );
    } finally {
      setKnowledgeAccessSubmittingMode(null);
    }
  };

  const handleCreateProjectKnowledge = async (
    values: ProjectKnowledgeFormValues,
  ) => {
    setKnowledgeAccessSubmittingMode('project');

    try {
      const result = await createProjectKnowledge(activeProject.id, {
        name: values.name,
        description: values.description,
        sourceType: 'global_docs',
      });

      message.success('项目知识库已创建');
      closeKnowledgeAccessModal();
      refreshProjectKnowledge();
      setActiveKnowledgeId(result.knowledge.id);
      openProjectKnowledgeUpload(result.knowledge.id);
    } catch (currentError) {
      console.error('[ProjectResources] 创建项目知识库失败:', currentError);
      message.error(
        extractApiErrorMessage(currentError, '创建项目知识库失败，请稍后重试'),
      );
    } finally {
      setKnowledgeAccessSubmittingMode(null);
    }
  };

  const handleSubmitKnowledgeMetadata = async (
    values: EditKnowledgeFormValues,
  ) => {
    if (!editingKnowledgeItem) {
      return;
    }

    setMetadataSubmitting(true);

    try {
      await updateKnowledge(editingKnowledgeItem.id, {
        name: values.name,
        description: values.description,
      });

      message.success('项目知识库已更新');
      setMetadataModalOpen(false);
      setEditingKnowledgeItem(null);
      refreshProjectKnowledge();
      setActiveKnowledgeReloadToken((value) => value + 1);
    } catch (currentError) {
      console.error('[ProjectResources] 更新项目知识库失败:', currentError);
      message.error(
        extractApiErrorMessage(currentError, '更新项目知识库失败，请稍后重试'),
      );
    } finally {
      setMetadataSubmitting(false);
    }
  };

  const confirmUnbindGlobalKnowledge = (item: ProjectResourceItem) => {
    modal.confirm({
      title: '解除全局知识库绑定',
      content: `解除后，知识库“${item.name}”不会再参与当前项目上下文消费，但不会影响它在全局中的原始内容。`,
      okText: '解除绑定',
      cancelText: '取消',
      okButtonProps: {
        danger: true,
      },
      centered: true,
      onOk: async () => {
        setUpdatingGlobalBindingId(item.id);

        try {
          const updated = await commitProjectKnowledgeBindings(
            activeProject.knowledgeBaseIds.filter((knowledgeId) => knowledgeId !== item.id),
          );

          if (!updated) {
            return;
          }

          message.success(`已解除“${item.name}”的项目绑定`);

          if (activeKnowledgeId === item.id) {
            setActiveKnowledgeId(null);
          }
        } catch (currentError) {
          console.error('[ProjectResources] 解除全局知识绑定失败:', currentError);
          message.error(
            extractApiErrorMessage(currentError, '解除全局知识绑定失败，请稍后重试'),
          );
        } finally {
          setUpdatingGlobalBindingId(null);
        }
      },
    });
  };

  const confirmDeleteKnowledge = (item: ProjectResourceItem) => {
    modal.confirm({
      title: '删除项目知识库',
      content: `删除后会清理知识库元数据、原始文件和对应向量，且不可撤销。确定删除“${item.name}”吗？`,
      okText: '删除',
      cancelText: '取消',
      okButtonProps: {
        danger: true,
      },
      centered: true,
      onOk: async () => {
        setDeletingKnowledgeId(item.id);

        try {
          await deleteKnowledge(item.id);
          message.success('项目知识库已删除');
          refreshProjectKnowledge();

          if (activeKnowledgeId === item.id) {
            setActiveKnowledgeId(null);
          }

          if (uploadTargetKnowledgeId === item.id) {
            closeUploadFlow();
          }
        } catch (currentError) {
          console.error('[ProjectResources] 删除项目知识库失败:', currentError);
          message.error(
            extractApiErrorMessage(currentError, '删除项目知识库失败，请稍后重试'),
          );
        } finally {
          setDeletingKnowledgeId(null);
        }
      },
    });
  };

  const handleRebuildKnowledge = async (item: ProjectResourceItem) => {
    setRebuildingKnowledgeId(item.id);

    try {
      await rebuildKnowledge(item.id);
      message.success('已提交全部文档重建任务');
      refreshProjectKnowledge();
      setActiveKnowledgeReloadToken((value) => value + 1);
    } catch (currentError) {
      console.error('[ProjectResources] 重建项目知识库失败:', currentError);
      message.error(
        extractApiErrorMessage(currentError, '重建项目知识库失败，请稍后重试'),
      );
    } finally {
      setRebuildingKnowledgeId(null);
    }
  };

  const handleRetryDocument = async (document: KnowledgeDocumentResponse) => {
    setRetryingDocumentId(document.id);

    try {
      await retryKnowledgeDocument(document.knowledgeId, document.id);
      message.success('文档已重新进入索引队列');
      refreshProjectKnowledge();
      setActiveKnowledgeReloadToken((value) => value + 1);
    } catch (currentError) {
      console.error('[ProjectResources] 重试项目知识文档失败:', currentError);
      message.error(
        extractApiErrorMessage(currentError, '重试项目知识文档失败，请稍后重试'),
      );
    } finally {
      setRetryingDocumentId(null);
    }
  };

  const handleRebuildDocument = async (document: KnowledgeDocumentResponse) => {
    setRebuildingDocumentId(document.id);

    try {
      await rebuildKnowledgeDocument(document.knowledgeId, document.id);
      message.success('文档已提交重建');
      refreshProjectKnowledge();
      setActiveKnowledgeReloadToken((value) => value + 1);
    } catch (currentError) {
      console.error('[ProjectResources] 重建项目知识文档失败:', currentError);
      message.error(
        extractApiErrorMessage(currentError, '重建项目知识文档失败，请稍后重试'),
      );
    } finally {
      setRebuildingDocumentId(null);
    }
  };

  const handleDeleteDocument = async (document: KnowledgeDocumentResponse) => {
    setDeletingDocumentId(document.id);

    try {
      await deleteKnowledgeDocument(document.knowledgeId, document.id);
      message.success('文档已删除');
      refreshProjectKnowledge();
      setActiveKnowledgeReloadToken((value) => value + 1);
    } catch (currentError) {
      console.error('[ProjectResources] 删除项目知识文档失败:', currentError);
      message.error(
        extractApiErrorMessage(currentError, '删除项目知识文档失败，请稍后重试'),
      );
    } finally {
      setDeletingDocumentId(null);
    }
  };

  const confirmDeleteDocument = (document: KnowledgeDocumentResponse) => {
    modal.confirm({
      title: '删除文档',
      content:
        document.status === 'pending' || document.status === 'processing'
          ? '会删除文档记录与原始文件；若后台索引任务刚好完成，系统会继续尝试清理对应向量。'
          : '会删除文档记录、原始文件，并清理对应向量记录。',
      okText: '删除',
      cancelText: '取消',
      okButtonProps: {
        danger: true,
      },
      centered: true,
      onOk: async () => {
        await handleDeleteDocument(document);
      },
    });
  };

  const handleOpenKnowledgeItem = (item: ProjectResourceItem) => {
    if (item.type !== 'knowledge') {
      return;
    }

    setActiveKnowledgeId(item.id);
  };

  const handleOpenKnowledgeItemEditor = (item: ProjectResourceItem) => {
    setEditingKnowledgeItem(item);
    setMetadataModalOpen(true);
  };

  const handleKnowledgeCardMenuAction = (
    item: ProjectResourceItem,
    key: string,
  ) => {
    if (item.source === 'global') {
      if (key === 'open-global') {
        navigate(PATHS.knowledge);
        return;
      }

      if (key === 'unbind') {
        confirmUnbindGlobalKnowledge(item);
      }

      return;
    }

    if (key === 'upload') {
      openProjectKnowledgeUpload(item.id);
      return;
    }

    if (key === 'edit') {
      handleOpenKnowledgeItemEditor(item);
      return;
    }

    if (key === 'rebuild') {
      void handleRebuildKnowledge(item);
      return;
    }

    if (key === 'delete') {
      confirmDeleteKnowledge(item);
    }
  };

  const buildKnowledgeMenuItems = (
    item: ProjectResourceItem,
  ): NonNullable<MenuProps['items']> => {
    if (item.source === 'global') {
      return [
        {
          key: 'open-global',
          label: '前往全局治理',
        },
        {
          type: 'divider',
        },
        {
          key: 'unbind',
          label: '解除项目绑定',
          danger: true,
          disabled: updatingGlobalBindingId === item.id,
        },
      ];
    }

    return [
      {
        key: 'upload',
        label: '上传文档',
      },
      {
        key: 'edit',
        label: '编辑知识库',
      },
      {
        key: 'rebuild',
        label: '重建全部文档',
        disabled:
          rebuildingKnowledgeId === item.id || item.documentCount === 0,
      },
      {
        type: 'divider',
      },
      {
        key: 'delete',
        label: '删除知识库',
        danger: true,
        disabled: deletingKnowledgeId === item.id,
      },
    ];
  };

  const renderKnowledgeItemActions = (item: ProjectResourceItem) => {
    if (item.type !== 'knowledge') {
      return null;
    }

    const itemBusy =
      updatingGlobalBindingId === item.id ||
      deletingKnowledgeId === item.id ||
      rebuildingKnowledgeId === item.id;

    return (
      <Dropdown
        trigger={['click']}
        placement="bottomRight"
        menu={{
          items: buildKnowledgeMenuItems(item),
          onClick: ({ key }) => handleKnowledgeCardMenuAction(item, key),
        }}
      >
        <Button
          type="text"
          size="small"
          icon={<MoreOutlined />}
          loading={itemBusy}
          aria-label={`更多操作：${item.name}`}
        />
      </Dropdown>
    );
  };

  const handleAddProjectResource = (groupKey: ProjectResourceFocus, groupTitle: string) => {
    if (groupKey === 'knowledge') {
      openKnowledgeAccessModal('global');
      return;
    }

    message.info(`下一步会在这里接入“为当前项目新增${groupTitle}”的流程。`);
  };

  return (
    <section className="flex min-h-full flex-col gap-4">
      <div className="rounded-[24px] border border-slate-200 bg-white p-6 shadow-[0_8px_24px_rgba(15,23,42,0.035)]">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl">
            <Typography.Text className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
              项目资源
            </Typography.Text>
            <Typography.Title level={3} className="mb-1! mt-2 text-slate-800!">
              当前项目知识、技能与智能体
            </Typography.Title>
            <Typography.Paragraph className="mb-0! max-w-2xl text-sm! text-slate-600!">
              这里展示的是当前项目内已经启用的知识库、技能和智能体。知识库分成“绑定的全局知识”和“项目私有知识”两层，前者继续走全局治理，后者可直接在当前页创建并上传文档。
            </Typography.Paragraph>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:min-w-[620px] xl:grid-cols-4">
            {summaryItems.map((item) => (
              <div
                key={item.label}
                className="rounded-[20px] border border-slate-200 bg-slate-50/70 px-4 py-4"
              >
                <Typography.Text className="text-xs font-medium uppercase tracking-[0.14em] text-slate-400">
                  {item.label}
                </Typography.Text>
                <Typography.Title level={4} className="mb-0! mt-2 text-slate-800!">
                  {item.value}
                </Typography.Title>
                <Typography.Paragraph className="mb-0! mt-2 text-xs! leading-5! text-slate-500!">
                  {item.hint}
                </Typography.Paragraph>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-4">
        {knowledgeCatalogError ? (
          <Alert
            type="warning"
            showIcon
            message="全局知识库元数据加载失败"
            description={knowledgeCatalogError}
          />
        ) : null}

        {projectKnowledgeError ? (
          <Alert
            type="warning"
            showIcon
            message="项目私有知识加载失败"
            description={projectKnowledgeError}
          />
        ) : null}

        {skillsCatalogError ? (
          <Alert
            type="warning"
            showIcon
            message="Skill 元数据加载失败"
            description={skillsCatalogError}
          />
        ) : null}

        {agentsCatalogError ? (
          <Alert
            type="warning"
            showIcon
            message="Agent 元数据加载失败"
            description={agentsCatalogError}
          />
        ) : null}

        {groups.map((group) => (
          <div
            key={group.key}
            ref={group.key === 'knowledge' ? knowledgeRef : group.key === 'skills' ? skillsRef : agentsRef}
          >
            <ProjectResourceGroup
              group={group}
              highlighted={focus === group.key}
              addButtonLabel={group.key === 'knowledge' ? '接入知识库' : '新增'}
              onAddProjectResource={() =>
                handleAddProjectResource(group.key, group.title)
              }
              onOpenGlobal={() => navigate(GLOBAL_PATH_BY_FOCUS[group.key])}
              onItemClick={
                group.key === 'knowledge' ? handleOpenKnowledgeItem : undefined
              }
              renderItemActions={
                group.key === 'knowledge' ? renderKnowledgeItemActions : undefined
              }
              renderEmptyActions={
                group.key === 'knowledge'
                  ? () => (
                      <div className="mt-3 flex flex-wrap justify-center gap-2">
                        <Button type="primary" onClick={() => openKnowledgeAccessModal('global')}>
                          引入全局知识库
                        </Button>
                        <Button onClick={() => openKnowledgeAccessModal('project')}>
                          新建项目知识库
                        </Button>
                      </div>
                    )
                  : undefined
              }
            />
          </div>
        ))}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept={DOCUMENT_UPLOAD_ACCEPT}
        multiple
        className="hidden"
        onChange={(event) => void handleFileChange(event)}
      />

      <ProjectKnowledgeAccessModal
        open={knowledgeAccessModalOpen}
        initialMode={knowledgeAccessInitialMode}
        knowledgeCatalog={knowledgeCatalog}
        knowledgeCatalogLoading={knowledgeCatalogLoading}
        boundKnowledgeIds={activeProject.knowledgeBaseIds}
        binding={knowledgeAccessSubmittingMode === 'global'}
        creating={knowledgeAccessSubmittingMode === 'project'}
        onCancel={closeKnowledgeAccessModal}
        onBindGlobalKnowledge={(knowledgeIds) => {
          void handleBindGlobalKnowledge(knowledgeIds);
        }}
        onCreateProjectKnowledge={(values) => {
          void handleCreateProjectKnowledge(values);
        }}
        onOpenGlobalManagement={() => navigate(PATHS.knowledge)}
      />

      <ProjectKnowledgeDetailDrawer
        open={activeKnowledgeItem !== null}
        knowledgeItem={activeKnowledgeItem}
        knowledge={activeKnowledgeDetail}
        loading={activeKnowledgeDetailLoading || projectKnowledgeLoading}
        error={activeKnowledgeDetailError}
        diagnostics={activeDiagnostics}
        diagnosticsLoading={activeDiagnosticsLoading}
        diagnosticsError={activeDiagnosticsError}
        uploading={
          activeKnowledgeItem?.source === 'project' &&
          uploadingKnowledgeId === activeKnowledgeItem.id
        }
        unbindingGlobal={
          activeKnowledgeItem?.source === 'global' &&
          updatingGlobalBindingId === activeKnowledgeItem.id
        }
        deletingKnowledge={
          activeKnowledgeItem?.source === 'project' &&
          deletingKnowledgeId === activeKnowledgeItem.id
        }
        rebuildingKnowledge={
          activeKnowledgeItem?.source === 'project' &&
          rebuildingKnowledgeId === activeKnowledgeItem.id
        }
        isDocumentBusy={isDocumentBusy}
        onClose={() => setActiveKnowledgeId(null)}
        onRefresh={refreshActiveKnowledge}
        onUploadDocument={() => {
          if (activeKnowledgeItem?.source === 'project') {
            openProjectKnowledgeUpload(activeKnowledgeItem.id);
          }
        }}
        onEditKnowledge={() => {
          if (activeKnowledgeItem?.source === 'project') {
            handleOpenKnowledgeItemEditor(activeKnowledgeItem);
          }
        }}
        onDeleteKnowledge={() => {
          if (activeKnowledgeItem?.source === 'project') {
            confirmDeleteKnowledge(activeKnowledgeItem);
          }
        }}
        onRebuildKnowledge={() => {
          if (activeKnowledgeItem?.source === 'project') {
            void handleRebuildKnowledge(activeKnowledgeItem);
          }
        }}
        onUnbindGlobalKnowledge={() => {
          if (activeKnowledgeItem?.source === 'global') {
            confirmUnbindGlobalKnowledge(activeKnowledgeItem);
          }
        }}
        onOpenGlobalManagement={() => navigate(PATHS.knowledge)}
        onRefreshDiagnostics={refreshActiveKnowledge}
        onRetryDocument={(document) => {
          void handleRetryDocument(document);
        }}
        onRebuildDocument={(document) => {
          void handleRebuildDocument(document);
        }}
        onDeleteDocument={(document) => {
          confirmDeleteDocument(document);
        }}
      />

      <KnowledgeSourcePickerModal
        open={uploadFlowStep === 'picker'}
        onCancel={closeUploadFlow}
        onUploadClick={triggerDocumentUpload}
        onTextInputClick={handleOpenTextInput}
        onDropFiles={(files) => {
          void handleSelectedFiles(files);
        }}
      />

      <KnowledgeTextInputModal
        open={uploadFlowStep === 'text'}
        submitting={textUploadSubmitting}
        onBack={handleBackToSourcePicker}
        onCancel={handleCancelTextInput}
        onSubmit={(values) => {
          void handleSubmitTextSource(values);
        }}
      />

      <Modal
        title="编辑项目知识库"
        open={metadataModalOpen}
        onCancel={() => {
          setMetadataModalOpen(false);
          setEditingKnowledgeItem(null);
          editForm.resetFields();
        }}
        onOk={() => editForm.submit()}
        confirmLoading={metadataSubmitting}
        destroyOnHidden
      >
        <div className="space-y-4">
          <Typography.Paragraph className="mb-0! text-sm! leading-6! text-slate-500!">
            修改当前项目私有知识库的名称和描述，不会影响全局知识资产。
          </Typography.Paragraph>

          <Form<EditKnowledgeFormValues>
            form={editForm}
            layout="vertical"
            onFinish={(values) => void handleSubmitKnowledgeMetadata(values)}
          >
            <Form.Item
              name="name"
              label="知识库名称"
              rules={[
                {
                  required: true,
                  message: '请输入知识库名称',
                },
              ]}
            >
              <Input maxLength={80} placeholder="例如：项目执行手册" />
            </Form.Item>

            <Form.Item name="description" label="描述">
              <Input.TextArea
                autoSize={{ minRows: 4, maxRows: 6 }}
                maxLength={240}
                placeholder="描述这份项目私有知识的内容边界、维护职责和使用场景。"
              />
            </Form.Item>
          </Form>
        </div>
      </Modal>

      {uploadTargetKnowledge ? (
        <div className="sr-only" aria-live="polite">
          当前准备上传到 {uploadTargetKnowledge.name}
        </div>
      ) : null}
    </section>
  );
};
