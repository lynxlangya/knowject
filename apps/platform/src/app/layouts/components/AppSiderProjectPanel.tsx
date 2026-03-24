import { useState } from 'react';
import type { MenuProps } from 'antd';
import { Dropdown, Skeleton, Typography } from 'antd';
import { useTranslation } from 'react-i18next';
import {
  DeleteOutlined,
  EditOutlined,
  EllipsisOutlined,
  InboxOutlined,
  PlusOutlined,
  PushpinOutlined,
  ShareAltOutlined,
} from '@ant-design/icons';
import { KNOWJECT_BRAND } from '@styles/brand';
import type { ProjectSummary } from '@app/project/project.types';

interface AppSiderProjectPanelProps {
  projects: ProjectSummary[];
  loading: boolean;
  error: string | null;
  activeProjectId: string | null;
  onRefreshProjects: () => void | Promise<void>;
  onOpenProjectModal: () => void;
  onOpenProject: (projectId: string) => void;
  onEditProject: (project: ProjectSummary) => void;
  onToggleProjectPin: (project: ProjectSummary) => void;
  onDeleteProject: (project: ProjectSummary) => void;
}

export const AppSiderProjectPanel = ({
  projects,
  loading,
  error,
  activeProjectId,
  onRefreshProjects,
  onOpenProjectModal,
  onOpenProject,
  onEditProject,
  onToggleProjectPin,
  onDeleteProject,
}: AppSiderProjectPanelProps) => {
  const { t } = useTranslation('navigation');
  const [actionMenuOpenProjectId, setActionMenuOpenProjectId] = useState<
    string | null
  >(null);

  const getProjectActionItems = (
    project: ProjectSummary,
  ): MenuProps['items'] => [
    {
      key: 'share',
      icon: <ShareAltOutlined />,
      label: t('projects.share'),
      disabled: true,
    },
    {
      key: 'edit',
      icon: <EditOutlined />,
      label: t('projects.edit'),
    },
    {
      key: 'pin',
      icon: <PushpinOutlined />,
      label: project.isPinned ? t('projects.unpin') : t('projects.pin'),
    },
    {
      key: 'archive',
      icon: <InboxOutlined />,
      label: t('projects.archive'),
      disabled: true,
    },
    {
      key: 'delete',
      icon: <DeleteOutlined />,
      label: t('projects.delete'),
      danger: true,
    },
  ];

  const handleProjectActionClick = (project: ProjectSummary, key: string) => {
    setActionMenuOpenProjectId(null);

    if (key === 'edit') {
      onEditProject(project);
      return;
    }

    if (key === 'pin') {
      onToggleProjectPin(project);
      return;
    }

    if (key === 'delete') {
      onDeleteProject(project);
    }
  };

  return (
    <div
      className="mt-4 mb-3.5 flex min-h-0 flex-1 flex-col rounded-shell border p-3"
      style={{
        borderColor: 'rgba(255,255,255,0.68)',
        background: KNOWJECT_BRAND.shellSurface,
      }}
    >
      <div className="mb-3 flex items-center justify-between">
        <Typography.Text className="text-sm font-semibold tracking-[0.08em] text-slate-600">
          {t('projects.mine')}
        </Typography.Text>
        <button
          type="button"
          aria-label={t('projects.addProject')}
          className="flex h-9 w-9 items-center justify-center rounded-[14px] border text-slate-600 transition-all duration-200 hover:-translate-y-px hover:text-slate-900"
          style={{
            borderColor: 'rgba(255,255,255,0.72)',
            background: KNOWJECT_BRAND.shellSurfaceStrong,
          }}
          onClick={onOpenProjectModal}
        >
          <PlusOutlined />
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto pr-0.5">
        {loading && projects.length === 0 ? (
          <div className="px-2 py-1">
            <Skeleton active paragraph={{ rows: 3 }} title={false} />
          </div>
        ) : error && projects.length === 0 ? (
          <div className="flex flex-col gap-2 px-2 py-1">
            <Typography.Text className="text-xs text-rose-500">
              {error}
            </Typography.Text>
            <button
              type="button"
              className="self-start text-xs font-medium text-slate-600 transition-colors hover:text-slate-900"
              onClick={() => void onRefreshProjects()}
            >
              {t('projects.reload')}
            </button>
          </div>
        ) : projects.length === 0 ? (
          <div
            className="rounded-card border px-3 py-4"
            style={{
              borderColor: 'rgba(226,232,240,0.96)',
              background: 'rgba(255,255,255,0.88)',
            }}
          >
            <div className="flex flex-col gap-3">
              <div>
                <Typography.Text className="block text-label font-semibold text-slate-800">
                  {t('projects.emptyTitle')}
                </Typography.Text>
                <Typography.Text className="mt-1 block text-xs leading-5 text-slate-500">
                  {t('projects.emptyDescription')}
                </Typography.Text>
              </div>

              <button
                type="button"
                className="inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-xl border text-xs font-medium text-slate-700 transition-colors hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900"
                style={{
                  borderColor: 'rgba(203,213,225,0.88)',
                  background: 'rgba(248,250,252,0.96)',
                }}
                onClick={onOpenProjectModal}
              >
                <PlusOutlined />
                <span>{t('projects.createProject')}</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-1.5">
            {error ? (
              <div className="rounded-xl border border-amber-200 bg-amber-50/80 px-3 py-2">
                <Typography.Text className="text-caption leading-5 text-amber-700">
                  {t('projects.syncWarning')}
                </Typography.Text>
              </div>
            ) : null}
            {projects.map((project) => {
              const active = project.id === activeProjectId;
              const actionMenuOpen = actionMenuOpenProjectId === project.id;

              return (
                <div key={project.id} className="group relative">
                  <button
                    type="button"
                    className={[
                      'flex w-full items-center gap-3 rounded-2xl border px-3 py-2.5 pr-14 text-left text-label transition-all duration-200',
                      active
                        ? 'text-slate-900'
                        : 'text-slate-600 hover:-translate-y-px hover:text-slate-900',
                    ].join(' ')}
                    style={
                      active
                        ? {
                            borderColor: KNOWJECT_BRAND.primaryBorder,
                            background: KNOWJECT_BRAND.shellSurfaceStrong,
                          }
                        : {
                            borderColor: 'transparent',
                            background: 'transparent',
                          }
                    }
                    onClick={() => onOpenProject(project.id)}
                  >
                    <span
                      className={[
                        'flex h-8 w-8 shrink-0 items-center justify-center text-xs font-semibold',
                        active || project.isPinned
                          ? 'rounded-[14px] border text-white'
                          : 'rounded-xl bg-slate-200/90 text-slate-600',
                      ].join(' ')}
                      style={
                        active || project.isPinned
                          ? {
                              borderColor: KNOWJECT_BRAND.primaryBorder,
                              backgroundImage: KNOWJECT_BRAND.heroGradient,
                            }
                          : undefined
                      }
                    >
                      {(project.name.trim().charAt(0) || 'P').toUpperCase()}
                    </span>
                    <span className="truncate font-medium">{project.name}</span>
                  </button>

                  <Dropdown
                    trigger={['click']}
                    placement="bottomRight"
                    open={actionMenuOpen}
                    onOpenChange={(open) => {
                      setActionMenuOpenProjectId(open ? project.id : null);
                    }}
                    menu={{
                      items: getProjectActionItems(project),
                      onClick: ({ key, domEvent }) => {
                        domEvent.stopPropagation();
                        handleProjectActionClick(project, String(key));
                      },
                    }}
                  >
                    <button
                      type="button"
                      aria-label={t('projects.actionAria', {
                        name: project.name,
                      })}
                      className={[
                        'absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-xl border text-slate-500 transition-all duration-200',
                        'opacity-0 scale-95 pointer-events-none group-hover:opacity-100 group-hover:scale-100 group-hover:pointer-events-auto',
                        'group-focus-within:opacity-100 group-focus-within:scale-100 group-focus-within:pointer-events-auto',
                        actionMenuOpen
                          ? 'opacity-100 scale-100 pointer-events-auto'
                          : '',
                      ].join(' ')}
                      style={{
                        borderColor: 'rgba(255,255,255,0.78)',
                        background: KNOWJECT_BRAND.shellSurfaceStrong,
                      }}
                      onClick={(event) => {
                        event.stopPropagation();
                      }}
                      onMouseDown={(event) => {
                        event.stopPropagation();
                      }}
                    >
                      <EllipsisOutlined />
                    </button>
                  </Dropdown>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
