import { ExportOutlined, PlusOutlined } from '@ant-design/icons';
import { Button, Empty, Tag, Tooltip, Typography } from 'antd';
import type { KeyboardEvent, ReactNode } from 'react';
import type {
  ProjectResourceGroup as ProjectResourceGroupType,
  ProjectResourceItem,
} from '@app/project/project.types';
import { tp } from '../project.i18n';

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

const createTagMeta = <TColor extends string>(
  color: TColor,
  labelKey: string,
) => ({
  color,
  get label(): string {
    return tp(labelKey);
  },
});

const SOURCE_TAG_META = {
  global: createTagMeta('blue', 'resources.group.sourceGlobal'),
  project: createTagMeta('green', 'resources.group.sourceProject'),
} as const;

const KNOWLEDGE_INDEX_META = {
  idle: createTagMeta('default', 'resources.group.indexIdle'),
  pending: createTagMeta('gold', 'resources.group.indexPending'),
  processing: createTagMeta('processing', 'resources.group.indexProcessing'),
  completed: createTagMeta('success', 'resources.group.indexCompleted'),
  failed: createTagMeta('error', 'resources.group.indexFailed'),
} as const;

export const ProjectResourceGroup = ({
  group,
  highlighted = false,
  onAddProjectResource,
  onOpenGlobal,
  addButtonLabel = tp('resources.addDefault'),
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
        'rounded-card border border-slate-200 bg-white p-4 shadow-[0_4px_16px_rgba(15,23,42,0.03)] transition-shadow duration-200',
        onItemClick
          ? 'cursor-pointer hover:border-[#C2EDE6] hover:shadow-[0_8px_24px_rgba(15,42,38,0.08)]'
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
        <span>{tp('resources.group.owner', { value: item.owner })}</span>
        <span>{tp('resources.group.updatedAt', { value: item.updatedAt })}</span>
        {item.type === 'knowledge' ? (
          <span>{tp('resources.group.documentCount', { count: item.documentCount ?? 0 })}</span>
        ) : (
          <span>{tp('resources.group.usageCount', { count: item.usageCount })}</span>
        )}
      </div>
    </article>
  );

  const knowledgeSections =
    group.key === 'knowledge'
      ? [
          {
            key: 'project',
            label: tp('resources.group.sourceProject'),
            items: group.items.filter((item) => item.source === 'project'),
          },
          {
            key: 'global',
            label: tp('resources.group.sourceGlobal'),
            items: group.items.filter((item) => item.source === 'global'),
          },
        ].filter((section) => section.items.length > 0)
      : [];

  return (
    <section
      className={[
        'rounded-3xl border bg-white p-5 shadow-surface transition-colors',
        highlighted
          ? 'border-[#C2EDE6] bg-[#F2FDFB]/60'
          : 'border-slate-200',
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
          <Tooltip title={tp('resources.group.viewGlobal', { title: group.title })}>
            <Button
              aria-label={tp('resources.group.viewGlobal', { title: group.title })}
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
                  className={index > 0 ? 'border-t border-[#C2EDE6] pt-5' : ''}
                >
                  <div className="mb-3">
                    <Typography.Text className="text-sm font-medium text-slate-500">
                      {tp('resources.group.sectionCount', {
                        label: section.label,
                        count: section.items.length,
                      })}
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
          <div className="rounded-card border border-dashed border-[#C2EDE6] bg-[#F2FDFB] px-4 py-8 shadow-[inset_0_2px_8px_rgba(40,184,160,0.04)]">
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={tp('resources.group.empty', { title: group.title })}
            >
              {renderEmptyActions ? renderEmptyActions() : null}
            </Empty>
          </div>
        )}
      </div>
    </section>
  );
};
