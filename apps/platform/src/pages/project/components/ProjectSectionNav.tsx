import type { ProjectSectionKey } from '@app/project/project.types';
import { KNOWJECT_BRAND } from '@styles/brand';
import { tp } from '../project.i18n';

interface ProjectSectionNavProps {
  activeKey: ProjectSectionKey;
  onSelect: (key: ProjectSectionKey) => void;
}

const NAV_ITEMS: Array<{ key: ProjectSectionKey; label: string; description: string }> = [
  {
    key: 'overview',
    label: tp('nav.overview.label'),
    description: tp('nav.overview.description'),
  },
  {
    key: 'chat',
    label: tp('nav.chat.label'),
    description: tp('nav.chat.description'),
  },
  {
    key: 'resources',
    label: tp('nav.resources.label'),
    description: tp('nav.resources.description'),
  },
  {
    key: 'members',
    label: tp('nav.members.label'),
    description: tp('nav.members.description'),
  },
];

export const ProjectSectionNav = ({
  activeKey,
  onSelect,
}: ProjectSectionNavProps) => {
  return (
    <nav aria-label={tp('nav.aria')} className="border-b border-slate-200/90">
      <div className="flex gap-1 overflow-x-auto">
        {NAV_ITEMS.map((item) => {
          const active = item.key === activeKey;
          return (
            <button
              key={item.key}
              type="button"
              className={[
                'group relative flex min-w-37 flex-1 flex-col gap-1 border-b-2 border-transparent px-4 pb-3 pt-2 text-left transition-colors duration-200 ease-out',
                active
                  ? 'font-semibold'
                  : 'text-slate-500 hover:text-slate-700 hover:border-slate-300',
              ].join(' ')}
              style={active ? { color: KNOWJECT_BRAND.primary, borderBottomColor: KNOWJECT_BRAND.primary } : undefined}
              aria-current={active ? 'page' : undefined}
              onClick={() => onSelect(item.key)}
            >
              <span className="text-body leading-6">{item.label}</span>
              <span className="text-caption leading-5 text-slate-400 transition-colors duration-200 group-hover:text-slate-500">
                {item.description}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
