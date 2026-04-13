import { ReloadOutlined } from "@ant-design/icons";
import { Alert, App, Button, Spin, Tooltip } from "antd";
import { useTranslation } from "react-i18next";
import {
  GlobalAssetPageHeader,
  GlobalAssetPageLayout,
} from "@pages/assets/components/GlobalAssetLayout";
import { SkillDetailPane } from "./components/SkillDetailPane";
import { SkillsSidebar } from "./components/SkillsSidebar";
import { getSkillsPageSubtitle } from "./constants/skillsManagement.constants";
import { useSkillCatalogActions } from "./hooks/useSkillCatalogActions";
import { useSkillsListState } from "./hooks/useSkillsListState";

export const SkillsManagementPage = () => {
  const { message, modal } = App.useApp();
  const { t } = useTranslation("pages");
  const skillsListState = useSkillsListState();
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
        <SkillDetailPane
          error={skillsListState.error}
          items={skillsListState.items}
          filteredItems={skillsListState.filteredItems}
          onSkillMenuAction={skillCatalogActions.handleSkillMenuAction}
        />
      </GlobalAssetPageLayout>
    </>
  );
};
