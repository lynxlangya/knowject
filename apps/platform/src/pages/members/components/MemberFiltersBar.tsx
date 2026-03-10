import { Input, Select, Typography } from 'antd';
import type { ProjectSummary } from '@app/project/project.types';
import type { MemberFiltersState } from '../members.types';
import { MEMBER_STATUS_META } from '../members.helpers';

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
  return (
    <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-[0_8px_24px_rgba(15,23,42,0.035)]">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <Typography.Title level={5} className="mb-1! text-slate-800!">
            成员筛选
          </Typography.Title>
          <Typography.Text className="text-sm text-slate-500">
            共 {total} 位成员，当前筛选后 {filteredTotal} 位。
          </Typography.Text>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <Input
            allowClear
            value={filters.query}
            placeholder="搜索姓名、用户名或项目"
            onChange={(event) => onChange({ query: event.target.value })}
          />
          <Select
            value={filters.status}
            options={[
              { value: 'all', label: '全部状态' },
              ...Object.entries(MEMBER_STATUS_META).map(([value, meta]) => ({
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
              { value: 'all', label: '全部权限' },
              { value: 'admin', label: '含管理员权限' },
              { value: 'member', label: '仅协作成员' },
            ]}
            onChange={(value) =>
              onChange({ adminScope: value as MemberFiltersState['adminScope'] })
            }
          />
          <Select
            value={filters.projectId}
            options={[
              { value: 'all', label: '全部项目' },
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
              { value: 'activity', label: '最近活跃优先' },
              { value: 'projects', label: '参与项目数优先' },
              { value: 'joined', label: '最近加入优先' },
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
