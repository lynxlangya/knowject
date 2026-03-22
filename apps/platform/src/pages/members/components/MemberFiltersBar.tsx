import { Input, Select, Typography } from 'antd';
import { useTranslation } from 'react-i18next';
import type { ProjectSummary } from '@app/project/project.types';
import type { MemberFiltersState } from '../members.types';
import { getMemberStatusMeta } from '../members.helpers';

interface MemberFiltersBarProps {
  filters: MemberFiltersState;
  total: number;
  filteredTotal: number;
  projects: ProjectSummary[];
  onChange: (patch: Partial<MemberFiltersState>) => void;
}

export const MemberFiltersBar = ({
  filters,
  total,
  filteredTotal,
  projects,
  onChange,
}: MemberFiltersBarProps) => {
  const { t } = useTranslation('pages');
  const memberStatusMeta = getMemberStatusMeta(t);

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-surface">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <Typography.Title level={5} className="mb-1! text-slate-800!">
            {t('members.filters.title')}
          </Typography.Title>
          <Typography.Text className="text-sm text-slate-500">
            {t('members.filters.summary', { total, filteredTotal })}
          </Typography.Text>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <Input
            allowClear
            value={filters.query}
            placeholder={t('members.filters.queryPlaceholder')}
            onChange={(event) => onChange({ query: event.target.value })}
          />
          <Select
            value={filters.status}
            options={[
              { value: 'all', label: t('members.filters.allStatus') },
              ...Object.entries(memberStatusMeta).map(([value, meta]) => ({
                value,
                label: meta.label,
              })),
            ]}
            onChange={(value) =>
              onChange({ status: value as MemberFiltersState['status'] })
            }
          />
          <Select
            value={filters.adminScope}
            options={[
              { value: 'all', label: t('members.filters.allPermissions') },
              { value: 'admin', label: t('members.filters.adminOnly') },
              { value: 'member', label: t('members.filters.memberOnly') },
            ]}
            onChange={(value) =>
              onChange({ adminScope: value as MemberFiltersState['adminScope'] })
            }
          />
          <Select
            value={filters.projectId}
            options={[
              { value: 'all', label: t('members.filters.allProjects') },
              ...projects.map((project) => ({
                value: project.id,
                label: project.name,
              })),
            ]}
            onChange={(value) => onChange({ projectId: value })}
          />
          <Select
            value={filters.sortBy}
            options={[
              { value: 'activity', label: t('members.filters.sortByActivity') },
              { value: 'projects', label: t('members.filters.sortByProjects') },
              { value: 'joined', label: t('members.filters.sortByJoined') },
            ]}
            onChange={(value) =>
              onChange({ sortBy: value as MemberFiltersState['sortBy'] })
            }
          />
        </div>
      </div>
    </div>
  );
};
