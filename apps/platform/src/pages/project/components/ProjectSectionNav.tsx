import type { ProjectSectionKey } from '../../../app/project/project.types';
import { KNOWJECT_BRAND } from '../../../styles/brand';

interface ProjectSectionNavProps {
  activeKey: ProjectSectionKey;
  onSelect: (key: ProjectSectionKey) => void;
}

const NAV_ITEMS: Array<{ key: ProjectSectionKey; label: string; description: string }> = [
  {
    key: 'overview',
    label: '概览',
    description: '项目摘要与最近动态',
  },
  {
    key: 'chat',
    label: '对话',
    description: '项目讨论与上下文',
  },
  {
    key: 'resources',
    label: '资源',
    description: '已接入的全局知识、技能与智能体',
  },
  {
    key: 'members',
    label: '成员',
    description: '项目参与者与协作状态',
  },
];

export const ProjectSectionNav = ({
  activeKey,
  onSelect,
}: ProjectSectionNavProps) => {
  return (
    <nav aria-label="项目页面分区" className="border-b border-slate-200/90">
      <div className="flex gap-1 overflow-x-auto">
        {NAV_ITEMS.map((item) => {
          const active = item.key === activeKey;
          return (
            <button
              key={item.key}
              type="button"
              className={[
                'group relative flex min-w-[148px] flex-1 flex-col gap-1 border-b-2 border-transparent px-4 pb-3 pt-2 text-left transition-[color,border-color] duration-200 ease-out',
                active
                  ? 'font-semibold'
                  : 'text-slate-500 hover:text-slate-700 hover:border-slate-300',
              ].join(' ')}
              style={active ? { color: KNOWJECT_BRAND.primary, borderBottomColor: KNOWJECT_BRAND.primary } : undefined}
              aria-current={active ? 'page' : undefined}
              onClick={() => onSelect(item.key)}
            >
              <span className="text-[15px] leading-6">{item.label}</span>
              <span className="text-[11px] leading-5 text-slate-400 transition-colors duration-200 group-hover:text-slate-500">
                {item.description}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
