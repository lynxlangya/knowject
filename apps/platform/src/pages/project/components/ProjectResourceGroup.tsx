import { Button, Empty, Tag, Typography } from 'antd';
import type { ProjectResourceGroup as ProjectResourceGroupType } from '../../../app/project/project.types';

interface ProjectResourceGroupProps {
  group: ProjectResourceGroupType;
  highlighted?: boolean;
  onOpenGlobal: () => void;
}

export const ProjectResourceGroup = ({
  group,
  highlighted = false,
  onOpenGlobal,
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
        <Button onClick={onOpenGlobal}>查看全局{group.title}</Button>
      </div>

      <div className="mt-5">
        {group.items.length > 0 ? (
          <div className="grid gap-3 xl:grid-cols-2">
            {group.items.map((item) => (
              <article
                key={item.id}
                className="rounded-[20px] border border-slate-200 bg-slate-50/55 p-4"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <Typography.Text className="text-base font-semibold text-slate-800">
                    {item.name}
                  </Typography.Text>
                  <Tag color="blue">来自全局</Tag>
                </div>
                <Typography.Paragraph className="mb-0! mt-3 text-sm! text-slate-600!">
                  {item.description}
                </Typography.Paragraph>
                <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-xs text-slate-500">
                  <span>维护方：{item.owner}</span>
                  <span>最近更新：{item.updatedAt}</span>
                  <span>使用项目：{item.usageCount}</span>
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
