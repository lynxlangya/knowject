import {
  CloudDownloadOutlined,
  PlusOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import { Alert, App, Button, Spin, Tooltip } from 'antd';
import { useTranslation } from 'react-i18next';
import {
  GlobalAssetPageHeader,
  GlobalAssetPageLayout,
} from '@pages/assets/components/GlobalAssetLayout';
import { SkillDetailPane } from './components/SkillDetailPane';
import { SkillEditorModal } from './components/SkillEditorModal';
import { SkillImportModal } from './components/SkillImportModal';
import { SkillsSidebar } from './components/SkillsSidebar';
import { SKILLS_PAGE_SUBTITLE } from './constants/skillsManagement.constants';
import { useSkillCatalogActions } from './hooks/useSkillCatalogActions';
import { useSkillEditor } from './hooks/useSkillEditor';
import { useSkillImportFlow } from './hooks/useSkillImportFlow';
import { useSkillsListState } from './hooks/useSkillsListState';

export const SkillsManagementPage = () => {
  const { message, modal } = App.useApp();
  const { t } = useTranslation('pages');
  const skillsListState = useSkillsListState();
  const skillEditor = useSkillEditor({
    message,
    onSaved: skillsListState.handleReload,
  });
  const skillImportFlow = useSkillImportFlow({
    message,
    onImported: skillsListState.handleReload,
  });
  const skillCatalogActions = useSkillCatalogActions({
    message,
    modal,
    onReload: skillsListState.handleReload,
    onOpenEdit: skillEditor.handleOpenEditModal,
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
            title={t('skills.title')}
            subtitle={SKILLS_PAGE_SUBTITLE}
            summaryItems={skillsListState.summaryItems}
            actions={
              <div className="flex flex-wrap items-center gap-3">
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={skillEditor.handleOpenCreateModal}
                >
                  {t('skills.create')}
                </Button>
                <Button
                  icon={<CloudDownloadOutlined />}
                  onClick={skillImportFlow.openImportModal}
                >
                  {t('skills.import')}
                </Button>
                <Tooltip title={t('skills.reload')}>
                  <Button
                    aria-label={t('skills.reload')}
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
                  {t('skills.retry')}
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

      <SkillEditorModal
        editorMode={skillEditor.editorMode}
        editorTabKey={skillEditor.editorTabKey}
        onEditorTabKeyChange={skillEditor.setEditorTabKey}
        editingSkill={skillEditor.editingSkill}
        editorMarkdown={skillEditor.editorMarkdown}
        onEditorMarkdownChange={skillEditor.setEditorMarkdown}
        editorLifecycleStatus={skillEditor.editorLifecycleStatus}
        onEditorLifecycleStatusChange={skillEditor.setEditorLifecycleStatus}
        editorLoading={skillEditor.editorLoading}
        editorSubmitting={skillEditor.editorSubmitting}
        editorValidation={skillEditor.editorValidation}
        onCancel={skillEditor.resetEditorState}
        onSubmit={() => {
          void skillEditor.handleSubmitEditor();
        }}
      />

      <SkillImportModal
        importModalOpen={skillImportFlow.importModalOpen}
        importMode={skillImportFlow.importMode}
        importGitHubUrl={skillImportFlow.importGitHubUrl}
        importRepository={skillImportFlow.importRepository}
        importPath={skillImportFlow.importPath}
        importRef={skillImportFlow.importRef}
        importUrl={skillImportFlow.importUrl}
        importPreview={skillImportFlow.importPreview}
        importSubmitting={skillImportFlow.importSubmitting}
        importPreviewLoading={skillImportFlow.importPreviewLoading}
        onCancel={skillImportFlow.closeImportModal}
        onSubmit={() => {
          void skillImportFlow.handleImportSkill();
        }}
        onPreview={() => {
          void skillImportFlow.handlePreviewImport();
        }}
        onImportModeChange={skillImportFlow.setImportModeValue}
        onImportGitHubUrlChange={skillImportFlow.setImportGitHubUrlValue}
        onImportRepositoryChange={skillImportFlow.setImportRepositoryValue}
        onImportPathChange={skillImportFlow.setImportPathValue}
        onImportRefChange={skillImportFlow.setImportRefValue}
        onImportUrlChange={skillImportFlow.setImportUrlValue}
      />
    </>
  );
};
