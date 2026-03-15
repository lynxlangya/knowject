import { ExportOutlined, PlusOutlined } from '@ant-design/icons';
import { Button, Empty, Tag, Tooltip, Typography } from 'antd';
import type { KeyboardEvent, ReactNode } from 'react';
import type {
  ProjectResourceGroup as ProjectResourceGroupType,
  ProjectResourceItem,
} from '@app/project/project.types';

interface ProjectResourceGroupProps {
  group: ProjectResourceGroupType;
  highlighted?: boolean;
  onAddProjectResource: () => void;
  onOpenGlobal: () => void;
  addButtonLabel?: string;
  onItemClick?: (item: ProjectResourceItem) => void;
  renderItemActions?: (item: ProjectResourceItem) => ReactNode;
  renderEmptyActions?: () => ReactNode;
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
  addButtonLabel = '新增',
  onItemClick,
  renderItemActions,
  renderEmptyActions,
}: ProjectResourceGroupProps) => {
  const handleItemKeyDown = (
    event: KeyboardEvent<HTMLElement>,
    item: ProjectResourceItem,
  ) => {
    if (!onItemClick) {
      return;
    }

    if (event.key !== 'Enter' && event.key !== ' ') {
      return;
    }

    event.preventDefault();
    onItemClick(item);
  };

  const renderResourceCard = (item: ProjectResourceItem) => (
    <article
      key={item.id}
      className={[
        'rounded-[20px] border border-slate-200 bg-slate-50/55 p-4 shadow-[0_4px_16px_rgba(15,23,42,0.02)] transition',
        onItemClick
          ? 'cursor-pointer hover:-translate-y-0.5 hover:border-slate-300 hover:bg-white hover:shadow-[0_12px_24px_rgba(15,23,42,0.06)]'
          : '',
      ].join(' ')}
      role={onItemClick ? 'button' : undefined}
      tabIndex={onItemClick ? 0 : undefined}
      onClick={onItemClick ? () => onItemClick(item) : undefined}
      onKeyDown={
        onItemClick
          ? (event) => handleItemKeyDown(event, item)
          : undefined
      }
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
          <div
            className="shrink-0"
            onClick={(event) => {
              event.stopPropagation();
            }}
            onKeyDown={(event) => {
              event.stopPropagation();
            }}
          >
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
  );

  const knowledgeSections =
    group.key === 'knowledge'
      ? [
          {
            key: 'project',
            label: '项目私有',
            items: group.items.filter((item) => item.source === 'project'),
          },
          {
            key: 'global',
            label: '全局绑定',
            items: group.items.filter((item) => item.source === 'global'),
          },
        ].filter((section) => section.items.length > 0)
      : [];

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
            {addButtonLabel}
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
          group.key === 'knowledge' ? (
            <div className="space-y-5">
              {knowledgeSections.map((section, index) => (
                <div
                  key={section.key}
                  className={index > 0 ? 'border-t border-slate-100 pt-5' : ''}
                >
                  <div className="mb-3">
                    <Typography.Text className="text-sm font-medium text-slate-500">
                      {section.label} · {section.items.length} 个
                    </Typography.Text>
                  </div>

                  <div className="grid gap-3 xl:grid-cols-2">
                    {section.items.map(renderResourceCard)}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid gap-3 xl:grid-cols-2">
              {group.items.map(renderResourceCard)}
            </div>
          )
        ) : (
          <div className="rounded-[20px] border border-dashed border-slate-200 bg-slate-50/50 px-4 py-8">
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={`当前项目尚未接入${group.title}`}
            >
              {renderEmptyActions ? renderEmptyActions() : null}
            </Empty>
          </div>
        )}
      </div>
    </section>
  );
};
