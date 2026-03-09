import type { ProjectSectionKey } from '../../../app/project/project.types';

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
    <nav className="rounded-[24px] border border-slate-200 bg-white p-2 shadow-[0_12px_30px_rgba(15,23,42,0.04)]">
      <div className="grid gap-2 md:grid-cols-4">
        {NAV_ITEMS.map((item) => {
          const active = item.key === activeKey;
          return (
            <button
              key={item.key}
              type="button"
              className={[
                'rounded-[18px] px-4 py-3 text-left transition-all',
                active
                  ? 'bg-slate-900 text-white shadow-[0_10px_24px_rgba(15,23,42,0.18)]'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900',
              ].join(' ')}
              onClick={() => onSelect(item.key)}
            >
              <div className="text-sm font-semibold">{item.label}</div>
              <div className={active ? 'mt-1 text-xs text-slate-300' : 'mt-1 text-xs text-slate-400'}>
                {item.description}
              </div>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
