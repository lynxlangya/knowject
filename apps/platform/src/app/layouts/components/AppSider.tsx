import { useState } from "react";
import { isApiError } from "@knowject/request";
import { App, Layout, Menu } from "antd";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate } from "react-router-dom";
import { updateAuthPreferences } from "@api/auth";
import { KNOWJECT_BRAND } from "@styles/brand";
import { getMenuItems, getMenuPath } from "@app/navigation/menu";
import {
  PATHS,
  buildProjectOverviewPath,
  getProjectIdFromPathname,
} from "@app/navigation/paths";
import { getAuthUser } from "@app/auth/user";
import { useLocale } from "@app/providers/locale.context";
import type { SupportedLocale } from "@app/providers/locale.storage";
import type { ProjectSummary } from "@app/project/project.types";
import { useProjectContext } from "@app/project/useProjectContext";
import { SIDER_WIDTH } from "@app/layouts/layout.constants";
import { AppSiderAccountPanel } from "./AppSiderAccountPanel";
import { AppSiderProjectPanel } from "./AppSiderProjectPanel";
import {
  ProjectFormModal,
  type ProjectFormValues,
} from "./ProjectFormModal";

const { Sider } = Layout;

export interface AppSiderProps {
  selectedKey: string | null;
  onNavigate: (path: string) => void;
  onLogout: () => void;
}

export const AppSider = ({
  selectedKey,
  onNavigate,
  onLogout,
}: AppSiderProps) => {
  const { message, modal } = App.useApp();
  const { t } = useTranslation("navigation");
  const { locale, setLocale } = useLocale();
  const navigate = useNavigate();
  const location = useLocation();
  const {
    projects,
    loading,
    error,
    addProject,
    updateProject,
    toggleProjectPin,
    deleteProject,
    refreshProjects,
  } = useProjectContext();
  const [projectModalOpen, setProjectModalOpen] = useState(false);
  const [projectSubmitting, setProjectSubmitting] = useState(false);
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const activeProjectId = getProjectIdFromPathname(location.pathname);
  const authUser = getAuthUser();
  const editingProject = editingProjectId
    ? (projects.find((project) => project.id === editingProjectId) ?? null)
    : null;
  const menuItems = getMenuItems(t);

  const handleOpenProject = (projectId: string) => {
    void navigate(buildProjectOverviewPath(projectId));
  };

  const handleOpenProjectModal = () => {
    setEditingProjectId(null);
    setProjectModalOpen(true);
  };

  const handleOpenEditProject = (project: ProjectSummary) => {
    setEditingProjectId(project.id);
    setProjectModalOpen(true);
  };

  const handleCloseProjectModal = () => {
    setProjectModalOpen(false);
    setEditingProjectId(null);
  };

  const handleSubmitProject = async (values: ProjectFormValues) => {
    const nextValues = {
      name: values.name,
      description: values.description?.trim() ?? "",
      knowledgeBaseIds: values.knowledgeBaseIds ?? [],
      agentIds: values.agentIds ?? [],
      skillIds: values.skillIds ?? [],
    };

    setProjectSubmitting(true);

    try {
      if (editingProjectId) {
        const result = await updateProject({
          projectId: editingProjectId,
          ...nextValues,
        });

        if (result === "empty") {
          message.warning(t("messages.projectNameRequired"));
          return;
        }

        if (result === "duplicate") {
          message.warning(t("messages.projectNameDuplicate"));
          return;
        }

        if (result === "not_found") {
          message.warning(t("messages.projectMissing"));
          handleCloseProjectModal();
          return;
        }

        message.success(t("messages.projectUpdated"));
        handleCloseProjectModal();
        return;
      }

      const result = await addProject(nextValues);
      if (result === "empty") {
        message.warning(t("messages.projectNameRequired"));
        return;
      }

      if (result === "duplicate") {
        message.warning(t("messages.projectNameDuplicate"));
        return;
      }

      message.success(t("messages.projectAdded"));
      handleCloseProjectModal();
    } catch (submitError) {
      console.error(submitError);
      message.error(
        isApiError(submitError)
          ? submitError.message
          : t("messages.projectSaveFailed"),
      );
    } finally {
      setProjectSubmitting(false);
    }
  };

  const handleToggleProjectPin = (project: ProjectSummary) => {
    const result = toggleProjectPin(project.id);

    if (result === "not_found") {
      message.warning(t("messages.projectMissing"));
      return;
    }

    if (result === "pinned") {
      message.success(t("messages.projectPinned", { name: project.name }));
      return;
    }

    message.success(t("messages.projectUnpinned", { name: project.name }));
  };

  const handleDeleteProject = (project: ProjectSummary) => {
    const remainingProjects = projects.filter((item) => item.id !== project.id);

    modal.confirm({
      title: t("dialogs.deleteProjectTitle"),
      content: t("dialogs.deleteProjectContent", { name: project.name }),
      okText: t("dialogs.deleteConfirm"),
      okButtonProps: { danger: true },
      cancelText: t("dialogs.cancel"),
      onOk: () => {
        return (async () => {
          try {
            const result = await deleteProject(project.id);

            if (result === "not_found") {
              message.warning(t("messages.projectMissing"));
              return;
            }

            message.success(t("messages.projectDeleted", { name: project.name }));

            if (project.id !== activeProjectId) {
              return;
            }

            if (remainingProjects[0]) {
              void navigate(buildProjectOverviewPath(remainingProjects[0].id));
              return;
            }

            void navigate(PATHS.home);
          } catch (deleteError) {
            console.error(deleteError);
            message.error(
              isApiError(deleteError)
                ? deleteError.message
                : t("messages.projectDeleteFailed"),
            );
            throw deleteError;
          }
        })();
      },
    });
  };

  const handleLocaleChange = async (nextLocale: SupportedLocale) => {
    if (nextLocale === locale) {
      return;
    }

    await setLocale(nextLocale, "account");

    try {
      await updateAuthPreferences({ locale: nextLocale });
    } catch (error) {
      console.error(error);
      message.error(
        isApiError(error)
          ? error.message
          : t("account.languageSaveFailed"),
      );
    }
  };

  return (
    <Sider
      width={SIDER_WIDTH}
      trigger={null}
      style={{
        background: KNOWJECT_BRAND.shellBg,
        borderRight: `1px solid ${KNOWJECT_BRAND.shellBorder}`,
      }}
      className="h-full"
    >
      <div className="flex h-full flex-col px-4 py-4">
        <div
          className="rounded-shell border px-4 py-5 shadow-[0_10px_24px_rgba(15,23,42,0.035)]"
          style={{
            borderColor: "rgba(255,255,255,0.72)",
            background: KNOWJECT_BRAND.shellSurfaceStrong,
          }}
        >
          <div className="flex justify-center">
            <img
              src="/brand/knowject-wordmark.svg"
              alt="Knowject"
              className="mx-auto h-12 w-auto object-contain"
            />
          </div>
        </div>

        {/* Brand accent line */}
        <div
          className="mx-1 mt-4 h-px"
          style={{
            background: `linear-gradient(90deg, transparent 0%, ${KNOWJECT_BRAND.primary}40 30%, ${KNOWJECT_BRAND.primary}60 50%, ${KNOWJECT_BRAND.primary}40 70%, transparent 100%)`,
          }}
        />

        {/* Nav — direct on Sider bg, no extra glass layer */}
        <div className="mt-3">
          <Menu
            mode="inline"
            theme="light"
            selectedKeys={selectedKey ? [selectedKey] : []}
            items={menuItems}
            onClick={({ key }) => onNavigate(getMenuPath(String(key)))}
            style={{
              borderInlineEnd: "none",
              background: "transparent",
              paddingInline: 0,
            }}
            className={[
              "app-sider-nav",
              "[&_.ant-menu-item]:mx-0",
              "[&_.ant-menu-item]:my-1",
              "[&_.ant-menu-item]:rounded-[var(--radius-sidebar-item)]",
              "[&_.ant-menu-item]:px-3",
              "[&_.ant-menu-item]:py-2",
              "[&_.ant-menu-item]:text-sm",
              "[&_.ant-menu-item]:font-medium",
              "[&_.ant-menu-item_.ant-menu-title-content]:tracking-[0.01em]",
              "[&_.ant-menu-item_.anticon]:text-body",
            ].join(" ")}
          />
        </div>

        <AppSiderProjectPanel
          projects={projects}
          loading={loading}
          error={error}
          activeProjectId={activeProjectId}
          onRefreshProjects={refreshProjects}
          onOpenProjectModal={handleOpenProjectModal}
          onOpenProject={handleOpenProject}
          onEditProject={handleOpenEditProject}
          onToggleProjectPin={handleToggleProjectPin}
          onDeleteProject={handleDeleteProject}
        />

        <AppSiderAccountPanel
          authUser={authUser}
          locale={locale}
          onLocaleChange={handleLocaleChange}
          onNavigateToSettings={() => onNavigate(PATHS.settings)}
          onLogout={onLogout}
        />
      </div>

      <ProjectFormModal
        open={projectModalOpen}
        submitting={projectSubmitting}
        editingProject={editingProject}
        onCancel={handleCloseProjectModal}
        onSubmit={handleSubmitProject}
      />
    </Sider>
  );
};
