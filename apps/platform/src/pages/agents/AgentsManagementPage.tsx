import { ReloadOutlined } from '@ant-design/icons';
import { Alert, App, Button, Spin, Tooltip, Typography } from 'antd';
import { useTranslation } from 'react-i18next';
import { GlobalAssetPageHeader, GlobalAssetPageLayout } from '@pages/assets/components/GlobalAssetLayout';
import { AgentDetailPane } from './components/AgentDetailPane';
import { AgentFormModal } from './components/AgentFormModal';
import { AgentsSidebar } from './components/AgentsSidebar';
import { AGENTS_PAGE_SUBTITLE } from './constants/agentsManagement.constants';
import { useAgentBindingsOptions } from './hooks/useAgentBindingsOptions';
import { useAgentForm } from './hooks/useAgentForm';
import { useAgentMutations } from './hooks/useAgentMutations';
import { useAgentsListState } from './hooks/useAgentsListState';

export const AgentsManagementPage = () => {
  const { message, modal } = App.useApp();
  const { t } = useTranslation('pages');
  const {
    agentFilters,
    error,
    filteredAgents,
    items,
    knowledgeItems,
    loading,
    reload,
    removeAgent,
    registerAgentCardRef,
    selectedAgentId,
    selectedFilter,
    setSelectedFilter,
    skillItems,
    summaryItems,
    highlightAgentCard,
    upsertAgent,
  } = useAgentsListState();

  const {
    closeModal,
    form,
    handleSubmitAgent,
    modalMode,
    openCreateModal,
    openEditModal,
    submitting,
    watchedSkillIds,
  } = useAgentForm({
    message,
    onUpsertAgent: upsertAgent,
  });

  const { knowledgeOptions, skillOptions } = useAgentBindingsOptions({
    knowledgeItems,
    skillItems,
    selectedSkillIds: watchedSkillIds,
  });

  const {
    buildAgentActionMenuItems,
    handleAgentMenuAction,
    isAgentBusy,
  } = useAgentMutations({
    message,
    modal,
    onEditAgent: openEditModal,
    onRemoveAgent: removeAgent,
    onUpsertAgent: upsertAgent,
  });

  if (loading) {
    return (
      <div className="flex min-h-105 items-center justify-center">
        <Spin size="large" />
      </div>
    );
  }

  return (
    <GlobalAssetPageLayout
      header={
        <GlobalAssetPageHeader
          title={t('agents.title')}
          subtitle={AGENTS_PAGE_SUBTITLE}
          summaryItems={summaryItems}
          actions={
            <div className="flex flex-col items-start gap-3 lg:items-end">
              <Typography.Text className="text-xs text-slate-400">
                {t('agents.modelHint')}
              </Typography.Text>
              <div className="flex flex-wrap gap-2">
                <Button type="primary" onClick={openCreateModal}>
                  {t('agents.create')}
                </Button>
                <Tooltip title={t('agents.reload')}>
                  <Button
                    aria-label={t('agents.reload')}
                    shape="circle"
                    icon={<ReloadOutlined />}
                    onClick={reload}
                  />
                </Tooltip>
              </div>
            </div>
          }
        />
      }
      alert={
        error ? (
          <Alert
            type="error"
            showIcon
            message={error}
            action={
                <Button size="small" onClick={reload}>
                  {t('agents.retry')}
                </Button>
            }
          />
        ) : null
      }
      sidebar={
        <AgentsSidebar
          agentFilters={agentFilters}
          filteredAgents={filteredAgents}
          itemsCount={items.length}
          onFilterChange={setSelectedFilter}
          onSelectAgent={highlightAgentCard}
          selectedAgentId={selectedAgentId}
          selectedFilter={selectedFilter}
        />
      }
    >
      <AgentDetailPane
        buildAgentActionMenuItems={buildAgentActionMenuItems}
        error={error}
        filteredAgents={filteredAgents}
        handleAgentMenuAction={handleAgentMenuAction}
        isAgentBusy={isAgentBusy}
        itemsCount={items.length}
        onCreateFirstAgent={openCreateModal}
        registerAgentCardRef={registerAgentCardRef}
        selectedAgentId={selectedAgentId}
      />

      <AgentFormModal
        form={form}
        knowledgeOptions={knowledgeOptions}
        modalMode={modalMode}
        onCancel={closeModal}
        onSubmit={(values) => {
          void handleSubmitAgent(values);
        }}
        skillOptions={skillOptions}
        submitting={submitting}
      />
    </GlobalAssetPageLayout>
  );
};
