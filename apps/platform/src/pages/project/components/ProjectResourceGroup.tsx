import { ExportOutlined, PlusOutlined } from '@ant-design/icons';
import { Button, Empty, Tag, Tooltip, Typography } from 'antd';
import type { ReactNode } from 'react';
import type {
  ProjectResourceGroup as ProjectResourceGroupType,
  ProjectResourceItem,
} from '@app/project/project.types';

interface ProjectResourceGroupProps {
  group: ProjectResourceGroupType;
  highlighted?: boolean;
  onAddProjectResource: () => void;
  onOpenGlobal: () => void;
  renderItemActions?: (item: ProjectResourceItem) => ReactNode;
}

const SOURCE_TAG_META = {
  global: {
    color: 'blue',
    label: '全局绑定',
  },
  project: {
    color: 'green',
    label: '项目私有',
  },
} as const;

const KNOWLEDGE_INDEX_META = {
  idle: {
    color: 'default',
    label: '待索引',
  },
  pending: {
    color: 'gold',
    label: '排队中',
  },
  processing: {
    color: 'processing',
    label: '处理中',
  },
  completed: {
    color: 'success',
    label: '已完成',
  },
  failed: {
    color: 'error',
    label: '失败',
  },
} as const;

export const ProjectResourceGroup = ({
  group,
  highlighted = false,
  onAddProjectResource,
  onOpenGlobal,
  renderItemActions,
}: ProjectResourceGroupProps) => {
  return (
    <section
      className={[
        'rounded-[24px] border bg-white p-5 shadow-[0_8px_24px_rgba(15,23,42,0.035)] transition-colors',
        highlighted ? 'border-blue-300 bg-blue-50/30' : 'border-slate-200',
      ].join(' ')}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Typography.Title level={4} className="mb-1! text-slate-800!">
            {group.title}
          </Typography.Title>
          <Typography.Paragraph className="mb-0! max-w-2xl text-sm! text-slate-600!">
            {group.description}
          </Typography.Paragraph>
        </div>
        <div className="flex items-center gap-2">
          <Button icon={<PlusOutlined />} onClick={onAddProjectResource}>
            新增
          </Button>
          <Tooltip title={`查看全局${group.title}`}>
            <Button
              aria-label={`查看全局${group.title}`}
              icon={<ExportOutlined />}
              onClick={onOpenGlobal}
            />
          </Tooltip>
        </div>
      </div>

      <div className="mt-5">
        {group.items.length > 0 ? (
          <div className="grid gap-3 xl:grid-cols-2">
            {group.items.map((item) => (
              <article
                key={item.id}
                className="rounded-[20px] border border-slate-200 bg-slate-50/55 p-4 shadow-[0_4px_16px_rgba(15,23,42,0.02)]"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Typography.Text className="text-base font-semibold text-slate-800">
                        {item.name}
                      </Typography.Text>
                      <Tag color={SOURCE_TAG_META[item.source].color}>
                        {SOURCE_TAG_META[item.source].label}
                      </Tag>
                      {item.type === 'knowledge' && item.indexStatus ? (
                        <Tag color={KNOWLEDGE_INDEX_META[item.indexStatus].color}>
                          {KNOWLEDGE_INDEX_META[item.indexStatus].label}
                        </Tag>
                      ) : null}
                    </div>
                  </div>

                  {renderItemActions ? (
                    <div className="shrink-0">
                      {renderItemActions(item)}
                    </div>
                  ) : null}
                </div>
                <Typography.Paragraph className="mb-0! mt-3 text-sm! text-slate-600!">
                  {item.description}
                </Typography.Paragraph>
                <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-xs text-slate-500">
                  <span>维护方：{item.owner}</span>
                  <span>最近更新：{item.updatedAt}</span>
                  {item.type === 'knowledge' ? (
                    <span>文档数：{item.documentCount ?? 0}</span>
                  ) : (
                    <span>使用项目：{item.usageCount}</span>
                  )}
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="rounded-[20px] border border-dashed border-slate-200 bg-slate-50/50 px-4 py-8">
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={`当前项目尚未接入${group.title}`}
            />
          </div>
        )}
      </div>
    </section>
  );
};
