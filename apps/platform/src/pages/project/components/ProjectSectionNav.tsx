import type { ProjectSectionKey } from '../../../app/project/project.types';
import { KNOWJECT_BRAND } from '../../../styles/brand';

interface ProjectSectionNavProps {
  activeKey: ProjectSectionKey;
  overviewProjectInitial: string;
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
  overviewProjectInitial,
  onSelect,
}: ProjectSectionNavProps) => {
  return (
    <nav className="rounded-[24px] border border-slate-200/90 bg-white/88 p-2 shadow-[0_8px_24px_rgba(15,23,42,0.035)] backdrop-blur-sm transition-[box-shadow,transform] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]">
      <div className="grid gap-2 md:grid-cols-4">
        {NAV_ITEMS.map((item) => {
          const active = item.key === activeKey;
          const showOverviewProjectIcon = item.key === 'overview' && activeKey !== 'overview';
          return (
            <button
              key={item.key}
              type="button"
              className={[
                'transform-gpu rounded-[18px] border px-4 py-3 text-left transition-[transform,box-shadow,background-color,color,border-color] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]',
                active
                  ? '-translate-y-px text-white'
                  : 'border-transparent text-slate-600 hover:-translate-y-px hover:bg-white/82 hover:text-slate-800',
              ].join(' ')}
              style={
                active
                  ? {
                      borderColor: KNOWJECT_BRAND.primaryBorder,
                      backgroundImage: KNOWJECT_BRAND.navGradient,
                      boxShadow: `0 10px 20px ${KNOWJECT_BRAND.primaryGlow}`,
                    }
                  : undefined
              }
              onClick={() => onSelect(item.key)}
            >
              {showOverviewProjectIcon ? (
                <div className="flex items-center gap-3">
                  <span
                    className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[20px] border text-lg font-semibold text-white"
                    style={{
                      borderColor: KNOWJECT_BRAND.primaryBorder,
                      backgroundImage: KNOWJECT_BRAND.heroGradient,
                      boxShadow: `0 10px 20px ${KNOWJECT_BRAND.primaryGlow}`,
                    }}
                  >
                    {overviewProjectInitial}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold text-slate-800 transition-colors duration-300">
                      {item.label}
                    </span>
                    <span className="mt-1 block text-xs text-slate-500 transition-colors duration-300">
                      {item.description}
                    </span>
                  </span>
                </div>
              ) : (
                <>
                  <div
                    className={[
                      'flex items-center gap-2 text-sm font-semibold transition-colors duration-300',
                      active ? 'text-white' : 'text-slate-700',
                    ].join(' ')}
                  >
                    {item.label}
                  </div>
                  <div
                    className={[
                      'mt-1 text-xs transition-colors duration-300',
                      active ? 'text-slate-300' : 'text-slate-500',
                    ].join(' ')}
                  >
                    {item.description}
                  </div>
                </>
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};
