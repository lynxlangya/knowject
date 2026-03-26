import { Avatar, Button, Empty, Typography } from 'antd';
import { useTranslation } from 'react-i18next';
import type { KnowledgeSummaryResponse } from '@api/knowledge';
import {
  GlobalAssetSidebar,
  GlobalAssetSidebarItem,
  GlobalAssetSidebarSection,
} from '@pages/assets/components/GlobalAssetLayout';
import {
  formatKnowledgeCompactDate,
  getKnowledgeInitials,
  KNOWLEDGE_INDEX_STATUS_CLASS,
  KNOWLEDGE_INDEX_STATUS_META,
} from '../knowledgeDomain.shared';

interface KnowledgeSidebarProps {
  items: KnowledgeSummaryResponse[];
  activeKnowledgeId: string | null;
  onSelectKnowledge: (knowledgeId: string) => void;
  onCreateKnowledge: () => void;
}

export const KnowledgeSidebar = ({
  items,
  activeKnowledgeId,
  onSelectKnowledge,
  onCreateKnowledge,
}: KnowledgeSidebarProps) => {
  const { t } = useTranslation('pages');

  return (
    <GlobalAssetSidebar
      header={
        <div className="flex items-end justify-between gap-3">
          <Typography.Title level={5} className="mb-0! text-slate-800!">
            {t('knowledge.list.title')}
          </Typography.Title>
          <Typography.Text className="text-xs text-slate-400">
            {t('knowledge.list.count', { count: items.length })}
          </Typography.Text>
        </div>
      }
    >
      {items.length === 0 ? (
        <Empty className="my-10" description={t('knowledge.list.empty')}>
          <Button type="primary" onClick={onCreateKnowledge}>
            {t('knowledge.list.createFirst')}
          </Button>
        </Empty>
      ) : (
        <GlobalAssetSidebarSection>
          {items.map((knowledge) => {
            const indexStatusMeta =
              KNOWLEDGE_INDEX_STATUS_META[knowledge.indexStatus];
            const isActive = knowledge.id === activeKnowledgeId;
            const compactMeta = t('knowledge.list.compactMeta', {
              count: knowledge.documentCount,
              updatedAt: formatKnowledgeCompactDate(knowledge.updatedAt),
            });

            return (
              <GlobalAssetSidebarItem
                key={knowledge.id}
                active={isActive}
                onClick={() => onSelectKnowledge(knowledge.id)}
              >
                <div className="flex items-center gap-3">
                  <Avatar size={36} className="shrink-0 bg-slate-200 text-slate-600">
                    {getKnowledgeInitials(knowledge.name)}
                  </Avatar>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Typography.Text
                        className={`truncate text-label font-semibold ${
                          isActive ? 'text-slate-900!' : 'text-slate-800!'
                        }`}
                      >
                        {knowledge.name}
                      </Typography.Text>
                      <span
                        className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium ${KNOWLEDGE_INDEX_STATUS_CLASS[knowledge.indexStatus]}`}
                      >
                        {indexStatusMeta.label}
                      </span>
                    </div>

                    <Typography.Text className="mt-1 block truncate text-caption text-slate-500">
                      {compactMeta}
                    </Typography.Text>
                  </div>
                </div>
              </GlobalAssetSidebarItem>
            );
          })}
        </GlobalAssetSidebarSection>
      )}
    </GlobalAssetSidebar>
  );
};
