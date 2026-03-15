import { CloudUploadOutlined } from '@ant-design/icons';
import { extractApiErrorMessage } from '@api/error';
import {
  createProjectKnowledge,
  uploadProjectKnowledgeDocument,
} from '@api/knowledge';
import { Alert, App, Button, Form, Input, Modal, Typography } from 'antd';
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
import { KnowledgeSourcePickerModal } from '@pages/knowledge/components/KnowledgeSourcePickerModal';
import {
  KnowledgeTextInputModal,
  type KnowledgeTextInputValues,
} from '@pages/knowledge/components/KnowledgeTextInputModal';
import {
  createTextSourceFile,
  DOCUMENT_UPLOAD_ACCEPT,
  shouldWarnLargeKnowledgeSourceFile,
  validateKnowledgeSourceFile,
} from '@pages/knowledge/knowledgeUpload.shared';
import { ProjectResourceGroup } from './components/ProjectResourceGroup';
import { useProjectPageContext } from './projectPageContext';
import { getProjectResourceGroups } from './project.mock';

interface ProjectKnowledgeFormValues {
  name: string;
  description?: string;
}

type UploadFlowStep = 'picker' | 'text';

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
  const { message } = App.useApp();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [uploadFlowStep, setUploadFlowStep] = useState<UploadFlowStep | null>(null);
  const [uploadTargetKnowledgeId, setUploadTargetKnowledgeId] = useState<string | null>(
    null,
  );
  const [uploadingKnowledgeId, setUploadingKnowledgeId] = useState<string | null>(
    null,
  );
  const [form] = Form.useForm<ProjectKnowledgeFormValues>();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const {
    activeProject,
    knowledgeCatalog,
    knowledgeCatalogError,
    projectKnowledgeCatalog,
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
  const rawFocus = searchParams.get('focus');
  const focus = isProjectResourceFocus(rawFocus) ? rawFocus : null;
  const knowledgeRef = useRef<HTMLDivElement>(null);
  const skillsRef = useRef<HTMLDivElement>(null);
  const agentsRef = useRef<HTMLDivElement>(null);
  const uploadTargetKnowledge = projectKnowledgeCatalog.find(
    (knowledge) => knowledge.id === uploadTargetKnowledgeId,
  );
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

  const openCreateProjectKnowledge = () => {
    form.setFieldsValue({
      name: '',
      description: '',
    });
    setCreateModalOpen(true);
  };

  const closeCreateModal = () => {
    setCreateModalOpen(false);
    form.resetFields();
  };

  const closeUploadFlow = () => {
    setUploadFlowStep(null);
    setUploadTargetKnowledgeId(null);
  };

  const openProjectKnowledgeUpload = (knowledgeId: string) => {
    setUploadTargetKnowledgeId(knowledgeId);
    setUploadFlowStep('picker');
  };

  const triggerDocumentUpload = () => {
    fileInputRef.current?.click();
  };

  const uploadProjectKnowledgeSource = async (
    knowledgeId: string,
    file: File,
  ): Promise<boolean> => {
    const validationError = validateKnowledgeSourceFile(file);

    if (validationError) {
      message.error(validationError);
      return false;
    }

    if (shouldWarnLargeKnowledgeSourceFile(file)) {
      message.warning('文件超过 20 MB，建议按主题拆分上传，索引更快也更稳');
    }

    setUploadingKnowledgeId(knowledgeId);

    try {
      await uploadProjectKnowledgeDocument(activeProject.id, knowledgeId, file);
      message.success('文档已上传，正在进入项目索引队列');
      refreshProjectKnowledge();
      return true;
    } catch (currentError) {
      console.error('[ProjectResources] 上传项目知识文档失败:', currentError);
      message.error(
        extractApiErrorMessage(currentError, '上传项目知识文档失败，请稍后重试'),
      );
      return false;
    } finally {
      setUploadingKnowledgeId(null);
    }
  };

  const handleSelectedFiles = async (files: File[]) => {
    if (files.length === 0 || !uploadTargetKnowledgeId) {
      return;
    }

    const knowledgeId = uploadTargetKnowledgeId;
    closeUploadFlow();

    if (files.length > 1) {
      message.info('当前一次仅支持上传 1 个文件');
    }

    await uploadProjectKnowledgeSource(knowledgeId, files[0]);
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

    if (uploadSucceeded) {
      closeUploadFlow();
    }
  };

  const handleCancelTextInput = () => {
    if (textUploadSubmitting) {
      return;
    }

    closeUploadFlow();
  };

  const handleSubmitProjectKnowledge = async (
    values: ProjectKnowledgeFormValues,
  ) => {
    setCreateSubmitting(true);

    try {
      const result = await createProjectKnowledge(activeProject.id, {
        name: values.name,
        description: values.description,
        sourceType: 'global_docs',
      });

      message.success('项目知识库已创建');
      closeCreateModal();
      refreshProjectKnowledge();
      openProjectKnowledgeUpload(result.knowledge.id);
    } catch (currentError) {
      console.error('[ProjectResources] 创建项目知识库失败:', currentError);
      message.error(
        extractApiErrorMessage(currentError, '创建项目知识库失败，请稍后重试'),
      );
    } finally {
      setCreateSubmitting(false);
    }
  };

  const handleAddProjectResource = (groupKey: ProjectResourceFocus, groupTitle: string) => {
    if (groupKey === 'knowledge') {
      openCreateProjectKnowledge();
      return;
    }

    message.info(`下一步会在这里接入“为当前项目新增${groupTitle}”的流程。`);
  };

  const renderKnowledgeItemActions = (item: ProjectResourceItem) => {
    if (item.type !== 'knowledge' || item.source !== 'project') {
      return null;
    }

    return (
      <Button
        size="small"
        icon={<CloudUploadOutlined />}
        loading={uploadingKnowledgeId === item.id}
        onClick={() => openProjectKnowledgeUpload(item.id)}
      >
        上传文档
      </Button>
    );
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
              onAddProjectResource={() =>
                handleAddProjectResource(group.key, group.title)
              }
              onOpenGlobal={() => navigate(GLOBAL_PATH_BY_FOCUS[group.key])}
              renderItemActions={
                group.key === 'knowledge' ? renderKnowledgeItemActions : undefined
              }
            />
          </div>
        ))}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept={DOCUMENT_UPLOAD_ACCEPT}
        className="hidden"
        onChange={(event) => void handleFileChange(event)}
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
        title="新建项目知识库"
        open={createModalOpen}
        onCancel={closeCreateModal}
        onOk={() => form.submit()}
        confirmLoading={createSubmitting}
        destroyOnHidden
      >
        <div className="space-y-4">
          <Typography.Paragraph className="mb-0! text-sm! leading-6! text-slate-500!">
            新建后会直接归属当前项目，并写入项目私有文档 collection；当前阶段仅支持文档型知识导入。
          </Typography.Paragraph>

          <Form<ProjectKnowledgeFormValues>
            form={form}
            layout="vertical"
            onFinish={(values) => void handleSubmitProjectKnowledge(values)}
            initialValues={{
              name: '',
              description: '',
            }}
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
                autoSize={{ minRows: 3, maxRows: 5 }}
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
