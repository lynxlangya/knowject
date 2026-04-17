import { PlusOutlined, ReloadOutlined } from "@ant-design/icons";
import { Alert, App, Button, Spin, Tooltip } from "antd";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  GlobalAssetPageHeader,
  GlobalAssetPageLayout,
} from "@pages/assets/components/GlobalAssetLayout";
import { SkillCreationModal } from "./components/SkillCreationModal";
import { SkillCreationDraftDrawer } from "./components/SkillCreationDraftDrawer";
import { SkillCreationJobsPanel } from "./components/SkillCreationJobsPanel";
import { SkillDetailPane } from "./components/SkillDetailPane";
import { SkillsSidebar } from "./components/SkillsSidebar";
import { getSkillsPageSubtitle } from "./constants/skillsManagement.constants";
import { useSkillCreationJobs } from "./hooks/useSkillCreationJobs";
import { useSkillCatalogActions } from "./hooks/useSkillCatalogActions";
import { useSkillsListState } from "./hooks/useSkillsListState";

export const SkillsManagementPage = () => {
  const { message, modal } = App.useApp();
  const { t } = useTranslation("pages");
  const [creationModalOpen, setCreationModalOpen] = useState(false);
  const skillsListState = useSkillsListState();
  const skillCreationJobs = useSkillCreationJobs();
  const skillCatalogActions = useSkillCatalogActions({
    message,
    modal,
    onReload: skillsListState.handleReload,
  });

  if (skillsListState.loading) {
    return (
      <div className="flex min-h-105 items-center justify-center">
        <Spin size="large" />
      </div>
    );
  }

  return (
    <>
      <GlobalAssetPageLayout
        header={
          <GlobalAssetPageHeader
            title={t("skills.title")}
            subtitle={getSkillsPageSubtitle()}
            summaryItems={skillsListState.summaryItems}
            actions={
              <div className="flex flex-wrap items-center gap-3">
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={() => setCreationModalOpen(true)}
                >
                  {t("skills.create")}
                </Button>
                <Tooltip title={t("skills.reload")}>
                  <Button
                    aria-label={t("skills.reload")}
                    shape="circle"
                    icon={<ReloadOutlined />}
                    onClick={skillsListState.handleReload}
                  />
                </Tooltip>
              </div>
            }
          />
        }
        alert={
          skillsListState.error ? (
            <Alert
              type="error"
              showIcon
              message={skillsListState.error}
              action={
                <Button size="small" onClick={skillsListState.handleReload}>
                  {t("skills.retry")}
                </Button>
              }
            />
          ) : null
        }
        sidebar={
          <SkillsSidebar
            filterGroups={skillsListState.filterGroups}
            selectedFilter={skillsListState.selectedFilter}
            onFilterChange={skillsListState.setSelectedFilter}
          />
        }
      >
        <SkillCreationJobsPanel
          items={skillCreationJobs.items}
          loading={skillCreationJobs.loading}
          error={skillCreationJobs.error}
          pollingStopped={skillCreationJobs.pollingStopped}
          onRetry={skillCreationJobs.refresh}
          onOpenJob={skillCreationJobs.openDrawer}
        />
        <SkillDetailPane
          error={skillsListState.error}
          items={skillsListState.items}
          filteredItems={skillsListState.filteredItems}
          onSkillMenuAction={skillCatalogActions.handleSkillMenuAction}
        />
      </GlobalAssetPageLayout>
      <SkillCreationModal
        open={creationModalOpen}
        onClose={() => setCreationModalOpen(false)}
        submitCreateJob={skillCreationJobs.submitCreateJob}
        onSubmitted={(_job) => {
          message.success(t("skills.creation.jobs.feedback.submitted"));
          skillCreationJobs.refresh();
        }}
      />
      <SkillCreationDraftDrawer
        open={skillCreationJobs.drawerOpen}
        job={skillCreationJobs.activeJob}
        loading={skillCreationJobs.activeJobLoading}
        onClose={skillCreationJobs.closeDrawer}
        onJobUpdated={skillCreationJobs.mergeJob}
        onSaved={() => {
          message.success(t("skills.creation.feedback.saved"));
          skillCreationJobs.refresh();
          skillsListState.handleReload();
        }}
      />
    </>
  );
};
