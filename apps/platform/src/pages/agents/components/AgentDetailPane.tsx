import { MoreOutlined } from '@ant-design/icons';
import {
  Button,
  Card,
  Dropdown,
  Empty,
  Tag,
  Typography,
  type MenuProps,
} from 'antd';
import type { AgentResponse } from '@api/agents';
import { useTranslation } from 'react-i18next';
import { GLOBAL_ASSET_CONTENT_CARD_CLASS_NAME, GlobalAssetMetaPill } from '@pages/assets/components/GlobalAssetLayout';
import { formatGlobalAssetUpdatedAt } from '@pages/assets/components/globalAsset.shared';
import { AGENT_STATUS_META } from '../constants/agentsManagement.constants';
import { buildAgentPromptPreview } from '../utils/agentPromptPreview';

interface AgentDetailPaneProps {
  buildAgentActionMenuItems: (
    agent: AgentResponse,
  ) => NonNullable<MenuProps['items']>;
  error: string | null;
  filteredAgents: AgentResponse[];
  handleAgentMenuAction: (agent: AgentResponse, key: string) => void;
  isAgentBusy: (agentId: string) => boolean;
  itemsCount: number;
  onCreateFirstAgent: () => void;
  registerAgentCardRef: (agentId: string, node: HTMLElement | null) => void;
  selectedAgentId: string | null;
}

export const AgentDetailPane = ({
  buildAgentActionMenuItems,
  error,
  filteredAgents,
  handleAgentMenuAction,
  isAgentBusy,
  itemsCount,
  onCreateFirstAgent,
  registerAgentCardRef,
  selectedAgentId,
}: AgentDetailPaneProps) => {
  const { t } = useTranslation('pages');
  if (!error && itemsCount === 0) {
    return (
      <Card className={GLOBAL_ASSET_CONTENT_CARD_CLASS_NAME}>
        <Empty
          description={t('agents.detail.emptyAll')}
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        >
          <Button type="primary" onClick={onCreateFirstAgent}>
            {t('agents.detail.createFirst')}
          </Button>
        </Empty>
      </Card>
    );
  }

  if (!error && itemsCount > 0 && filteredAgents.length === 0) {
    return (
      <Card className={GLOBAL_ASSET_CONTENT_CARD_CLASS_NAME}>
        <Empty
          description={t('agents.detail.emptyFiltered')}
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        />
      </Card>
    );
  }

  if (error || filteredAgents.length === 0) {
    return null;
  }

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      {filteredAgents.map((agent) => {
        const statusMeta = AGENT_STATUS_META[agent.status];
        const promptPreview = buildAgentPromptPreview(agent.systemPrompt);
        const isBusy = isAgentBusy(agent.id);
        const isHighlighted = selectedAgentId === agent.id;

        return (
          <article
            key={agent.id}
            ref={(node) => {
              registerAgentCardRef(agent.id, node);
            }}
            className={`group rounded-3xl border bg-white p-5 shadow-float transition ${
              isHighlighted
                ? 'border-emerald-300 bg-emerald-50/40 shadow-[0_18px_36px_rgba(16,185,129,0.12)]'
                : 'border-slate-200'
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Typography.Title level={4} className="mb-0! text-slate-900!">
                    {agent.name}
                  </Typography.Title>
                  <Tag color={statusMeta.tagColor}>{statusMeta.label}</Tag>
                </div>
                <Typography.Paragraph
                  className="mb-0! mt-3 text-sm! text-slate-500!"
                  ellipsis={{ rows: 2 }}
                >
                  {agent.description || t('agents.detail.descriptionFallback')}
                </Typography.Paragraph>
              </div>

              <Dropdown
                trigger={['click']}
                placement="bottomRight"
                menu={{
                  items: buildAgentActionMenuItems(agent),
                  onClick: ({ key }) => handleAgentMenuAction(agent, key),
                }}
              >
                <Button
                  type="text"
                  size="small"
                  icon={<MoreOutlined />}
                  loading={isBusy}
                  aria-label={t('agents.detail.moreActions', { name: agent.name })}
                  className="opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100"
                />
              </Dropdown>
            </div>

            <div className="mt-3 flex items-start gap-2 text-xs">
              <Typography.Text className="shrink-0 text-slate-400!">
                {t('agents.detail.prompt')}
              </Typography.Text>
              <Typography.Text className="min-w-0 text-slate-500!">
                {promptPreview}
              </Typography.Text>
            </div>

            <div className="mt-4 flex flex-wrap gap-2 text-caption text-slate-600">
              <GlobalAssetMetaPill className="border-slate-200 bg-slate-50 text-slate-600">
                {t('agents.detail.boundKnowledge', {
                  count: agent.boundKnowledgeIds.length,
                })}
              </GlobalAssetMetaPill>
              <GlobalAssetMetaPill className="border-slate-200 bg-slate-50 text-slate-600">
                {t('agents.detail.boundSkills', {
                  count: agent.boundSkillIds.length,
                })}
              </GlobalAssetMetaPill>
              <GlobalAssetMetaPill className="border-slate-200 bg-slate-50 text-slate-600">
                {t('agents.detail.updatedAt', {
                  value: formatGlobalAssetUpdatedAt(agent.updatedAt),
                })}
              </GlobalAssetMetaPill>
            </div>
          </article>
        );
      })}
    </div>
  );
};
