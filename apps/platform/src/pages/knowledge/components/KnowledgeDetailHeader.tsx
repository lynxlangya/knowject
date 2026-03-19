import { CloudUploadOutlined, DeleteOutlined, EditOutlined } from '@ant-design/icons';
import { Button, Popconfirm, Tag, Tooltip, Typography } from 'antd';
import type { KnowledgeDetailResponse } from '@api/knowledge';
import type {
  KnowledgeDetailOverviewStat,
  KnowledgeSourceMeta,
} from '../knowledgeDomain.shared';
import { KNOWLEDGE_INDEX_STATUS_META } from '../knowledgeDomain.shared';
import { KNOWLEDGE_UPLOAD_TOOLTIP } from '../knowledgeUpload.shared';

interface KnowledgeDetailHeaderProps {
  activeKnowledge: KnowledgeDetailResponse;
  activeSourceMeta: KnowledgeSourceMeta | null;
  activeOverviewStats: KnowledgeDetailOverviewStat[];
  uploading: boolean;
  deletingKnowledgeId: string | null;
  onUploadDocument: () => void;
  onEditKnowledge: () => void;
  onDeleteKnowledge: () => Promise<void>;
}

export const KnowledgeDetailHeader = ({
  activeKnowledge,
  activeSourceMeta,
  activeOverviewStats,
  uploading,
  deletingKnowledgeId,
  onUploadDocument,
  onEditKnowledge,
  onDeleteKnowledge,
}: KnowledgeDetailHeaderProps) => {
  return (
    <>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-3xl">
          <div className="flex flex-wrap items-center gap-2">
            <Typography.Title level={4} className="mb-0! text-slate-800!">
              {activeKnowledge.name}
            </Typography.Title>
            {activeSourceMeta ? <Tag color={activeSourceMeta.color}>{activeSourceMeta.label}</Tag> : null}
            <Tag color={KNOWLEDGE_INDEX_STATUS_META[activeKnowledge.indexStatus].color}>
              {KNOWLEDGE_INDEX_STATUS_META[activeKnowledge.indexStatus].label}
            </Tag>
          </div>
          <Typography.Paragraph className="mb-0! mt-3 text-sm! leading-6! text-slate-600!">
            {activeKnowledge.description || '当前未填写描述。'}
          </Typography.Paragraph>
        </div>

        <div className="flex flex-wrap gap-2">
          <Tooltip
            title={
              activeKnowledge.sourceType === 'global_docs'
                ? KNOWLEDGE_UPLOAD_TOOLTIP
                : 'global_code 当前不支持上传文档。'
            }
          >
            <span>
              <Button
                icon={<CloudUploadOutlined />}
                loading={uploading}
                disabled={activeKnowledge.sourceType !== 'global_docs'}
                onClick={onUploadDocument}
              >
                上传文档
              </Button>
            </span>
          </Tooltip>
          <Button icon={<EditOutlined />} onClick={onEditKnowledge}>
            编辑
          </Button>
          <Popconfirm
            title="删除知识库"
            description="会删除 Mongo 元数据、原始文件，并清理对应 Chroma 向量记录。"
            okText="删除"
            cancelText="取消"
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
              删除
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
