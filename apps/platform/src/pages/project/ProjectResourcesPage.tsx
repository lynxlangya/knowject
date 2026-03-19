import { MoreOutlined } from "@ant-design/icons";
import { extractApiErrorMessage } from "@api/error";
import type { KnowledgeDocumentResponse } from "@api/knowledge";
import { App, Alert, Button, Dropdown, Typography } from "antd";
import type { MenuProps } from "antd";
import { useNavigate, useSearchParams } from "react-router-dom";
import { PATHS } from "@app/navigation/paths";
import type {
  ProjectResourceFocus,
  ProjectResourceItem,
} from "@app/project/project.types";
import { KnowledgeSourcePickerModal } from "@pages/knowledge/components/KnowledgeSourcePickerModal";
import { KnowledgeTextInputModal } from "@pages/knowledge/components/KnowledgeTextInputModal";
import { DOCUMENT_UPLOAD_ACCEPT } from "@pages/knowledge/knowledgeUpload.shared";
import { useKnowledgeDocumentActions } from "@pages/knowledge/useKnowledgeDocumentActions";
import { ProjectKnowledgeAccessModal } from "./components/ProjectKnowledgeAccessModal";
import { ProjectKnowledgeDetailDrawer } from "./components/ProjectKnowledgeDetailDrawer";
import { ProjectKnowledgeMetadataModal } from "./components/ProjectKnowledgeMetadataModal";
import { ProjectResourceGroup } from "./components/ProjectResourceGroup";
import { ProjectResourcesSummary } from "./components/ProjectResourcesSummary";
import {
  buildProjectResourceSummaryItems,
  getProjectResourceCountByGroup,
} from "./adapters/projectResourceSummary.adapter";
import { GLOBAL_PATH_BY_FOCUS } from "./constants/projectResources.constants";
import { useProjectKnowledgeDetailController } from "./hooks/useProjectKnowledgeDetailController";
import { useProjectKnowledgeMutations } from "./hooks/useProjectKnowledgeMutations";
import { useProjectKnowledgeUploadFlow } from "./hooks/useProjectKnowledgeUploadFlow";
import { useProjectResourceFocus } from "./hooks/useProjectResourceFocus";
import { useProjectPageContext } from "./projectPageContext";
import { getProjectResourceGroups } from "./projectResourceMappers";
import type { ProjectKnowledgeCardActionKey } from "./types/projectResources.types";

export const ProjectResourcesPage = () => {
  const { message, modal } = App.useApp();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { activeProject, globalAssetCatalogs, projectKnowledge } =
    useProjectPageContext();
  const knowledgeCatalog = globalAssetCatalogs.knowledge.items;
  const knowledgeCatalogLoading = globalAssetCatalogs.knowledge.loading;
  const knowledgeCatalogError = globalAssetCatalogs.knowledge.error;
  const projectKnowledgeCatalog = projectKnowledge.items;
  const projectKnowledgeError = projectKnowledge.error;
  const refreshProjectKnowledge = projectKnowledge.refresh;
  const agentsCatalog = globalAssetCatalogs.agents.items;
  const agentsCatalogError = globalAssetCatalogs.agents.error;
  const skillsCatalog = globalAssetCatalogs.skills.items;
  const skillsCatalogError = globalAssetCatalogs.skills.error;
  const groups = getProjectResourceGroups(activeProject, {
    knowledgeCatalog,
    projectKnowledgeCatalog,
    agentsCatalog,
    skillsCatalog,
  });
  const knowledgeGroup =
    groups.find((group) => group.key === "knowledge") ?? null;
  const knowledgeItems = knowledgeGroup?.items ?? [];
  const resourceCountByGroup = getProjectResourceCountByGroup(groups);
  const summaryItems = buildProjectResourceSummaryItems({
    resourceCountByGroup,
    globalKnowledgeCount: activeProject.knowledgeBaseIds.length,
    projectKnowledgeCount: projectKnowledgeCatalog.length,
  });
  const rawFocus = searchParams.get("focus");
  const { focus, knowledgeRef, skillsRef, agentsRef } = useProjectResourceFocus(
    {
      activeProjectId: activeProject.id,
      navigate,
      rawFocus,
    },
  );
  const {
    activeKnowledgeId,
    setActiveKnowledgeId,
    activeKnowledgeItem,
    activeKnowledgeDetail,
    activeKnowledgeDetailLoading,
    activeKnowledgeDetailError,
    activeDiagnostics,
    activeDiagnosticsLoading,
    activeDiagnosticsError,
    refreshKnowledgeState,
    refreshProjectKnowledgeState,
    refreshActiveKnowledge,
    queueActiveKnowledgeDocument,
    queueActiveKnowledge,
    removeActiveKnowledgeDocument,
  } = useProjectKnowledgeDetailController({
    knowledgeItems,
    refreshProjectKnowledge,
  });
  const {
    fileInputRef,
    uploadFlowStep,
    uploadTargetKnowledgeId,
    uploadTargetKnowledge,
    uploadingKnowledgeId,
    textUploadSubmitting,
    openProjectKnowledgeUpload,
    closeUploadFlow,
    openTextInput,
    backToSourcePicker,
    handleSelectedFiles,
    handleFileChange,
    submitTextSource,
    triggerDocumentUpload,
    handleCancelTextInput,
  } = useProjectKnowledgeUploadFlow({
    activeProjectId: activeProject.id,
    message,
    projectKnowledgeCatalog,
    refreshProjectKnowledgeState,
  });
  const {
    knowledgeAccessModalOpen,
    knowledgeAccessInitialMode,
    knowledgeAccessSubmittingMode,
    metadataModalOpen,
    metadataSubmitting,
    deletingKnowledgeId,
    updatingGlobalBindingId,
    editForm,
    closeKnowledgeAccessModal,
    openKnowledgeAccessModal,
    closeMetadataModal,
    openKnowledgeItemEditor,
    handleBindGlobalKnowledge,
    handleCreateProjectKnowledge,
    handleSubmitKnowledgeMetadata,
    confirmUnbindGlobalKnowledge,
    confirmDeleteKnowledge,
  } = useProjectKnowledgeMutations({
    activeProject,
    activeKnowledgeId,
    setActiveKnowledgeId,
    message,
    modal,
    refreshProjectKnowledge,
    refreshKnowledgeState,
    openProjectKnowledgeUpload,
    uploadTargetKnowledgeId,
    closeUploadFlow,
  });
  const {
    rebuildingKnowledgeId,
    isDocumentBusy,
    retryDocument: handleRetryDocument,
    rebuildDocument: handleRebuildDocument,
    rebuildKnowledgeDocuments,
    deleteDocument: handleDeleteDocument,
  } = useKnowledgeDocumentActions({
    message,
    extractErrorMessage: extractApiErrorMessage,
    onRefreshKnowledgeState: refreshProjectKnowledgeState,
    onRetryQueued: queueActiveKnowledgeDocument,
    onRebuildDocumentQueued: queueActiveKnowledgeDocument,
    onRebuildKnowledgeQueued: queueActiveKnowledge,
    onDocumentDeleted: (knowledgeId, document) => {
      removeActiveKnowledgeDocument(knowledgeId, document.id);
    },
    messages: {
      retryError: () => "重试项目知识文档失败，请稍后重试",
      rebuildDocumentSuccess: () => "文档已提交重建",
      rebuildDocumentError: () => "重建项目知识文档失败，请稍后重试",
      rebuildKnowledgeSuccess: () => "已提交全部文档重建任务",
      rebuildKnowledgeError: () => "重建项目知识库失败，请稍后重试",
      deleteDocumentError: () => "删除项目知识文档失败，请稍后重试",
    },
  });

  const handleRebuildKnowledge = async (item: ProjectResourceItem) => {
    await rebuildKnowledgeDocuments(item.id);
  };

  const confirmDeleteDocument = (document: KnowledgeDocumentResponse) => {
    modal.confirm({
      title: "删除文档",
      content:
        document.status === "pending" || document.status === "processing"
          ? "会删除文档记录与原始文件；若后台索引任务刚好完成，系统会继续尝试清理对应向量。"
          : "会删除文档记录、原始文件，并清理对应向量记录。",
      okText: "删除",
      cancelText: "取消",
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
    if (item.type !== "knowledge") {
      return;
    }

    setActiveKnowledgeId(item.id);
  };

  const handleKnowledgeCardMenuAction = (
    item: ProjectResourceItem,
    key: string,
  ) => {
    const actionKey = key as ProjectKnowledgeCardActionKey;

    if (item.source === "global") {
      if (actionKey === "open-global") {
        void navigate(PATHS.knowledge);
        return;
      }

      if (actionKey === "unbind") {
        confirmUnbindGlobalKnowledge(item);
      }

      return;
    }

    if (actionKey === "upload") {
      openProjectKnowledgeUpload(item.id);
      return;
    }

    if (actionKey === "edit") {
      openKnowledgeItemEditor(item);
      return;
    }

    if (actionKey === "rebuild") {
      void handleRebuildKnowledge(item);
      return;
    }

    if (actionKey === "delete") {
      confirmDeleteKnowledge(item);
    }
  };

  const buildKnowledgeMenuItems = (
    item: ProjectResourceItem,
  ): NonNullable<MenuProps["items"]> => {
    if (item.source === "global") {
      return [
        {
          key: "open-global",
          label: "前往全局治理",
        },
        {
          type: "divider",
        },
        {
          key: "unbind",
          label: "解除项目绑定",
          danger: true,
          disabled: updatingGlobalBindingId === item.id,
        },
      ];
    }

    return [
      {
        key: "upload",
        label: "上传文档",
      },
      {
        key: "edit",
        label: "编辑知识库",
      },
      {
        key: "rebuild",
        label: "重建全部文档",
        disabled: rebuildingKnowledgeId === item.id || item.documentCount === 0,
      },
      {
        type: "divider",
      },
      {
        key: "delete",
        label: "删除知识库",
        danger: true,
        disabled: deletingKnowledgeId === item.id,
      },
    ];
  };

  const renderKnowledgeItemActions = (item: ProjectResourceItem) => {
    if (item.type !== "knowledge") {
      return null;
    }

    const itemBusy =
      updatingGlobalBindingId === item.id ||
      deletingKnowledgeId === item.id ||
      rebuildingKnowledgeId === item.id;

    return (
      <Dropdown
        trigger={["click"]}
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

  const handleAddProjectResource = (
    groupKey: ProjectResourceFocus,
    groupTitle: string,
  ) => {
    if (groupKey === "knowledge") {
      openKnowledgeAccessModal("global");
      return;
    }

    message.info(`下一步会在这里接入“为当前项目新增${groupTitle}”的流程。`);
  };

  return (
    <section className="flex min-h-full flex-col gap-4">
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-surface">
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

          <ProjectResourcesSummary items={summaryItems} />
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
            ref={
              group.key === "knowledge"
                ? knowledgeRef
                : group.key === "skills"
                  ? skillsRef
                  : agentsRef
            }
          >
            <ProjectResourceGroup
              group={group}
              highlighted={focus === group.key}
              addButtonLabel={group.key === "knowledge" ? "接入知识库" : "新增"}
              onAddProjectResource={() =>
                handleAddProjectResource(group.key, group.title)
              }
              onOpenGlobal={() => navigate(GLOBAL_PATH_BY_FOCUS[group.key])}
              onItemClick={
                group.key === "knowledge" ? handleOpenKnowledgeItem : undefined
              }
              renderItemActions={
                group.key === "knowledge"
                  ? renderKnowledgeItemActions
                  : undefined
              }
              renderEmptyActions={
                group.key === "knowledge"
                  ? () => (
                      <div className="mt-3 flex flex-wrap justify-center gap-2">
                        <Button
                          type="primary"
                          onClick={() => openKnowledgeAccessModal("global")}
                        >
                          引入全局知识库
                        </Button>
                        <Button
                          onClick={() => openKnowledgeAccessModal("project")}
                        >
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
        binding={knowledgeAccessSubmittingMode === "global"}
        creating={knowledgeAccessSubmittingMode === "project"}
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
        loading={activeKnowledgeDetailLoading}
        error={activeKnowledgeDetailError}
        diagnostics={activeDiagnostics}
        diagnosticsLoading={activeDiagnosticsLoading}
        diagnosticsError={activeDiagnosticsError}
        uploading={
          activeKnowledgeItem?.source === "project" &&
          uploadingKnowledgeId === activeKnowledgeItem.id
        }
        unbindingGlobal={
          activeKnowledgeItem?.source === "global" &&
          updatingGlobalBindingId === activeKnowledgeItem.id
        }
        deletingKnowledge={
          activeKnowledgeItem?.source === "project" &&
          deletingKnowledgeId === activeKnowledgeItem.id
        }
        rebuildingKnowledge={
          activeKnowledgeItem?.source === "project" &&
          rebuildingKnowledgeId === activeKnowledgeItem.id
        }
        isDocumentBusy={isDocumentBusy}
        onClose={() => setActiveKnowledgeId(null)}
        onRefresh={refreshActiveKnowledge}
        onUploadDocument={() => {
          if (activeKnowledgeItem?.source === "project") {
            openProjectKnowledgeUpload(activeKnowledgeItem.id);
          }
        }}
        onEditKnowledge={() => {
          if (activeKnowledgeItem?.source === "project") {
            openKnowledgeItemEditor(activeKnowledgeItem);
          }
        }}
        onDeleteKnowledge={() => {
          if (activeKnowledgeItem?.source === "project") {
            confirmDeleteKnowledge(activeKnowledgeItem);
          }
        }}
        onRebuildKnowledge={() => {
          if (activeKnowledgeItem?.source === "project") {
            void handleRebuildKnowledge(activeKnowledgeItem);
          }
        }}
        onUnbindGlobalKnowledge={() => {
          if (activeKnowledgeItem?.source === "global") {
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
        open={uploadFlowStep === "picker"}
        onCancel={closeUploadFlow}
        onUploadClick={triggerDocumentUpload}
        onTextInputClick={openTextInput}
        onDropFiles={(files) => {
          void handleSelectedFiles(files);
        }}
      />

      <KnowledgeTextInputModal
        open={uploadFlowStep === "text"}
        submitting={textUploadSubmitting}
        onBack={backToSourcePicker}
        onCancel={handleCancelTextInput}
        onSubmit={(values) => {
          void submitTextSource(values);
        }}
      />

      <ProjectKnowledgeMetadataModal
        open={metadataModalOpen}
        form={editForm}
        submitting={metadataSubmitting}
        onCancel={closeMetadataModal}
        onSubmit={(values) => {
          void handleSubmitKnowledgeMetadata(values);
        }}
      />

      {uploadTargetKnowledge ? (
        <div className="sr-only" aria-live="polite">
          当前准备上传到 {uploadTargetKnowledge.name}
        </div>
      ) : null}
    </section>
  );
};
