import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { ProjectSectionKey } from '@app/project/project.types';
import { KNOWJECT_BRAND } from '@styles/brand';

interface ProjectSectionNavProps {
  activeKey: ProjectSectionKey;
  onSelect: (key: ProjectSectionKey) => void;
}

export const ProjectSectionNav = ({
  activeKey,
  onSelect,
}: ProjectSectionNavProps) => {
  const { t } = useTranslation('project');
  const navItems = useMemo<Array<{ key: ProjectSectionKey; label: string; description: string }>>(
    () => [
      {
        key: 'overview',
        label: t('nav.overview.label'),
        description: t('nav.overview.description'),
      },
      {
        key: 'chat',
        label: t('nav.chat.label'),
        description: t('nav.chat.description'),
      },
      {
        key: 'resources',
        label: t('nav.resources.label'),
        description: t('nav.resources.description'),
      },
      {
        key: 'members',
        label: t('nav.members.label'),
        description: t('nav.members.description'),
      },
    ],
    [t],
  );

  return (
    <nav aria-label={t('nav.aria')} className="border-b border-slate-200/90">
      <div className="flex gap-1 overflow-x-auto">
        {navItems.map((item) => {
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
