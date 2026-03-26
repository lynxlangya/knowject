import { CloudUploadOutlined, DeleteOutlined, EditOutlined } from '@ant-design/icons';
import { Button, Popconfirm, Tag, Tooltip, Typography } from 'antd';
import { useTranslation } from 'react-i18next';
import type { KnowledgeDetailResponse } from '@api/knowledge';
import type { KnowledgeDetailOverviewStat } from '../knowledgeDomain.shared';
import { KNOWLEDGE_INDEX_STATUS_META } from '../knowledgeDomain.shared';
import { KNOWLEDGE_UPLOAD_TOOLTIP } from '../knowledgeUpload.shared';

interface KnowledgeDetailHeaderProps {
  activeKnowledge: KnowledgeDetailResponse;
  activeOverviewStats: KnowledgeDetailOverviewStat[];
  uploading: boolean;
  deletingKnowledgeId: string | null;
  onUploadDocument: () => void;
  onEditKnowledge: () => void;
  onDeleteKnowledge: () => Promise<void>;
}

export const KnowledgeDetailHeader = ({
  activeKnowledge,
  activeOverviewStats,
  uploading,
  deletingKnowledgeId,
  onUploadDocument,
  onEditKnowledge,
  onDeleteKnowledge,
}: KnowledgeDetailHeaderProps) => {
  const { t } = useTranslation('pages');

  return (
    <>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-3xl">
          <div className="flex flex-wrap items-center gap-2">
            <Typography.Title level={4} className="mb-0! text-slate-800!">
              {activeKnowledge.name}
            </Typography.Title>
            <Tag color={KNOWLEDGE_INDEX_STATUS_META[activeKnowledge.indexStatus].color}>
              {KNOWLEDGE_INDEX_STATUS_META[activeKnowledge.indexStatus].label}
            </Tag>
          </div>
          <Typography.Paragraph className="mb-0! mt-3 text-sm! leading-6! text-slate-600!">
            {activeKnowledge.description || t('knowledge.detailHeader.descriptionFallback')}
          </Typography.Paragraph>
        </div>

        <div className="flex flex-wrap gap-2">
          <Tooltip
            title={
              activeKnowledge.sourceType === 'global_docs'
                ? KNOWLEDGE_UPLOAD_TOOLTIP
                : t('knowledge.detailHeader.uploadDisabled')
            }
          >
            <span>
              <Button
                icon={<CloudUploadOutlined />}
                loading={uploading}
                disabled={activeKnowledge.sourceType !== 'global_docs'}
                onClick={onUploadDocument}
              >
                {t('knowledge.detailHeader.upload')}
              </Button>
            </span>
          </Tooltip>
          <Button icon={<EditOutlined />} onClick={onEditKnowledge}>
            {t('knowledge.detailHeader.edit')}
          </Button>
          <Popconfirm
            title={t('knowledge.detailHeader.deleteTitle')}
            description={t('knowledge.detailHeader.deleteDescription')}
            okText={t('knowledge.detailHeader.delete')}
            cancelText={t('knowledge.detailHeader.cancel')}
            okButtonProps={{
              danger: true,
              loading: deletingKnowledgeId === activeKnowledge.id,
            }}
            onConfirm={() => void onDeleteKnowledge()}
          >
            <Button
              danger
              icon={<DeleteOutlined />}
              loading={deletingKnowledgeId === activeKnowledge.id}
            >
              {t('knowledge.detailHeader.delete')}
            </Button>
          </Popconfirm>
        </div>
      </div>

      <div className="overflow-hidden rounded-card-lg border border-slate-200 bg-white/85 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]">
        <div className="grid gap-px bg-slate-200 md:grid-cols-2">
          {activeOverviewStats.map((item) => (
            <div key={item.label} className="bg-slate-50/75 px-4 py-4">
              <Typography.Text className="text-caption font-medium uppercase tracking-[0.14em] text-slate-400">
                {item.label}
              </Typography.Text>
              <Typography.Text
                className={`mt-3 block text-slate-800 ${
                  item.emphasis === 'number'
                    ? 'text-3xl font-semibold leading-none tracking-tight'
                    : 'text-lg font-semibold leading-7'
                }`}
              >
                {item.value}
              </Typography.Text>
            </div>
          ))}
        </div>
      </div>
    </>
  );
};
