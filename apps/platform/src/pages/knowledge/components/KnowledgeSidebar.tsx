import type { CSSProperties } from 'react';
import { Avatar, Button, Empty, Typography } from 'antd';
import { useTranslation } from 'react-i18next';
import type { KnowledgeSummaryResponse } from '@api/knowledge';
import type { KnowledgeIndexStatus } from '@api/knowledge';
import {
  GlobalAssetSidebar,
  GlobalAssetSidebarSection,
} from '@pages/assets/components/GlobalAssetLayout';
import {
  formatKnowledgeCompactDate,
  getKnowledgeInitials,
} from '../knowledgeDomain.shared';

interface KnowledgeSidebarProps {
  items: KnowledgeSummaryResponse[];
  activeKnowledgeId: string | null;
  onSelectKnowledge: (knowledgeId: string) => void;
  onCreateKnowledge: () => void;
}

const STATUS_ACCENT: Record<KnowledgeIndexStatus, string> = {
  idle:      '#CBD5E1',
  pending:   '#D4A017',
  processing:'#5EC8E8',
  completed: '#28B8A0',
  failed:    '#F87171',
};

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
          {items.map((knowledge, index) => {
            const isActive = knowledge.id === activeKnowledgeId;
            const accentColor = STATUS_ACCENT[knowledge.indexStatus] ?? STATUS_ACCENT.idle;
            const compactMeta = t('knowledge.list.compactMeta', {
              count: knowledge.documentCount,
              updatedAt: formatKnowledgeCompactDate(knowledge.updatedAt),
            });

            return (
              <button
                key={knowledge.id}
                type="button"
                onClick={() => onSelectKnowledge(knowledge.id)}
                aria-pressed={isActive}
                className={`knowledge-sidebar-card knowledge-sidebar-card--enter ${isActive ? 'knowledge-sidebar-card--active' : ''}`}
                style={{
                  animationDelay: `${index * 35}ms`,
                  '--accent': accentColor,
                } as CSSProperties}
              >
                {/* Left accent bar */}
                <span
                  className="knowledge-sidebar-card__accent"
                  aria-hidden="true"
                />

                {/* Avatar */}
                <Avatar
                  size={36}
                  className={`shrink-0 ${isActive ? 'knowledge-sidebar-card__avatar--active' : 'knowledge-sidebar-card__avatar'}`}
                >
                  {getKnowledgeInitials(knowledge.name)}
                </Avatar>

                {/* Info */}
                <div className="min-w-0 flex-1 pr-5">
                  <div className="flex items-center gap-2">
                    <Typography.Text
                      className={`truncate text-label font-semibold ${
                        isActive ? 'text-[#1C2B2A]!' : 'text-slate-800!'
                      }`}
                    >
                      {knowledge.name}
                    </Typography.Text>
                  </div>

                  <Typography.Text className="mt-1 block truncate text-caption text-slate-400">
                    {compactMeta}
                  </Typography.Text>
                </div>

                {/* Status dot */}
                <span
                  className="knowledge-sidebar-card__dot"
                  aria-hidden="true"
                />
              </button>
            );
          })}
        </GlobalAssetSidebarSection>
      )}
    </GlobalAssetSidebar>
  );
};
