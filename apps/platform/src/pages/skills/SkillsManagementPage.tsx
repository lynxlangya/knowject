import {
  CloudDownloadOutlined,
  DeleteOutlined,
  EditOutlined,
  MoreOutlined,
  PlusOutlined,
  ReloadOutlined,
  UploadOutlined,
} from '@ant-design/icons';
import {
  Alert,
  App,
  Button,
  Card,
  Dropdown,
  Empty,
  Input,
  Modal,
  Select,
  Spin,
  Tabs,
  Tag,
  Tooltip,
  Typography,
  type MenuProps,
} from 'antd';
import { useEffect, useMemo, useState } from 'react';
import { extractApiErrorMessage } from '@api/error';
import {
  createSkill,
  deleteSkill,
  getSkillDetail,
  importSkill,
  listSkills,
  updateSkill,
  type SkillDetailResponse,
  type SkillImportPreview,
  type SkillLifecycleStatus,
  type SkillRuntimeStatus,
  type SkillSource,
  type SkillSummaryResponse,
} from '@api/skills';
import {
  GLOBAL_ASSET_CONTENT_CARD_CLASS_NAME,
  GlobalAssetPageHeader,
  GlobalAssetPageLayout,
  GlobalAssetSidebar,
  GlobalAssetSidebarItem,
  GlobalAssetSidebarSection,
  type GlobalAssetSummaryItem,
} from '@pages/assets/components/GlobalAssetLayout';
import {
  buildSkillMarkdownTemplate,
  parseSkillMarkdownPreview,
} from './skillsMarkdown';

type SkillSidebarFilter =
  | 'all'
  | 'published'
  | 'draft'
  | 'system'
  | 'custom'
  | 'imported';
type EditorMode = 'create' | 'edit' | null;
type ImportMode = 'github' | 'url';

const SKILLS_PAGE_SUBTITLE = '让 Skill 成为可治理、可复用、可发布的全局方法资产';
const META_PILL_CLASS =
  'inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-medium';
const editorTabs = [
  { key: 'editor', label: '编辑器' },
  { key: 'preview', label: '预览' },
] as const;
const lifecycleOptions = [
  { value: 'draft', label: 'draft · 草稿' },
  { value: 'published', label: 'published · 已发布' },
] satisfies Array<{ value: SkillLifecycleStatus; label: string }>;

const updatedAtFormatter = new Intl.DateTimeFormat('zh-CN', {
  month: 'numeric',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

const SOURCE_META: Record<
  SkillSource,
  { label: string; accentClass: string; cardTintClass: string }
> = {
  system: {
    label: '系统内置',
    accentClass: 'border-sky-200 bg-sky-50 text-sky-700',
    cardTintClass: 'from-sky-50/70 via-white to-white',
  },
  custom: {
    label: '自建 Skill',
    accentClass: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    cardTintClass: 'from-emerald-50/60 via-white to-white',
  },
  imported: {
    label: '公网导入',
    accentClass: 'border-amber-200 bg-amber-50 text-amber-700',
    cardTintClass: 'from-amber-50/60 via-white to-white',
  },
};

const RUNTIME_STATUS_META: Record<
  SkillRuntimeStatus,
  { label: string; accentClass: string }
> = {
  available: {
    label: '已接服务',
    accentClass: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  },
  contract_only: {
    label: '契约预留',
    accentClass: 'border-slate-200 bg-slate-100 text-slate-600',
  },
};

const LIFECYCLE_STATUS_META: Record<
  SkillLifecycleStatus,
  { label: string; accentClass: string }
> = {
  draft: {
    label: '草稿',
    accentClass: 'border-amber-200 bg-amber-50 text-amber-700',
  },
  published: {
    label: '已发布',
    accentClass: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  },
};

const filterSkills = (
  items: SkillSummaryResponse[],
  filter: SkillSidebarFilter,
): SkillSummaryResponse[] => {
  if (filter === 'published') {
    return items.filter((item) => item.lifecycleStatus === 'published');
  }

  if (filter === 'draft') {
    return items.filter((item) => item.lifecycleStatus === 'draft');
  }

  if (filter === 'system') {
    return items.filter((item) => item.source === 'system');
  }

  if (filter === 'custom') {
    return items.filter((item) => item.source === 'custom');
  }

  if (filter === 'imported') {
    return items.filter((item) => item.source === 'imported');
  }

  return items;
};

const buildSkillSummaryItems = (
  items: SkillSummaryResponse[],
): GlobalAssetSummaryItem[] => {
  const publishedCount = items.filter(
    (item) => item.lifecycleStatus === 'published',
  ).length;
  const draftCount = items.length - publishedCount;
  const availableCount = items.filter(
    (item) => item.runtimeStatus === 'available',
  ).length;
  const contractOnlyCount = items.length - availableCount;
  const importedCount = items.filter((item) => item.source === 'imported').length;

  return [
    {
      label: '技能总数',
      value: `${items.length} 个`,
      hint: '当前纳入目录治理的 Skill 资产。',
    },
    {
      label: '已发布',
      value: `${publishedCount} 个`,
      hint:
        draftCount === 0
          ? '当前没有待整理的草稿。'
          : `${draftCount} 个仍处于草稿阶段。`,
    },
    {
      label: '已接服务',
      value: `${availableCount} 个`,
      hint:
        contractOnlyCount === 0
          ? '当前全部 Skill 都已接入运行时。'
          : `${contractOnlyCount} 个仍是契约预留。`,
    },
    {
      label: '公网导入',
      value: `${importedCount} 个`,
      hint: '来自 GitHub 或 URL 的外部 Skill。',
    },
  ];
};

const getStatusBadgeMeta = (
  skill: Pick<SkillSummaryResponse, 'lifecycleStatus' | 'runtimeStatus'>,
): { label: string; accentClass: string } => {
  if (skill.lifecycleStatus === 'draft') {
    return LIFECYCLE_STATUS_META.draft;
  }

  if (skill.runtimeStatus === 'contract_only') {
    return {
      label: '已发布 · 契约预留',
      accentClass: RUNTIME_STATUS_META.contract_only.accentClass,
    };
  }

  return LIFECYCLE_STATUS_META.published;
};

const buildSkillActionMenuItems = (
  skill: SkillSummaryResponse,
): MenuProps['items'] => {
  if (skill.source === 'system') {
    return [
      {
        key: 'readonly',
        label: '系统内置 Skill，仅支持查看',
        icon: <EditOutlined />,
        disabled: true,
      },
    ];
  }

  const items: NonNullable<MenuProps['items']> = [
    {
      key: 'edit',
      label: '编辑',
      icon: <EditOutlined />,
    },
  ];

  if (skill.lifecycleStatus === 'draft') {
    items.push({
      key: 'publish',
      label: '发布',
      icon: <UploadOutlined />,
    });
  }

  items.push(
    {
      type: 'divider',
    },
    {
      key: 'delete',
      label: '删除',
      icon: <DeleteOutlined />,
      danger: true,
    },
  );

  return items;
};

const renderMarkdownPreviewContent = (markdown: string) => {
  const preview = parseSkillMarkdownPreview(markdown);

  return (
    <div className="space-y-4">
      {preview.errors.length > 0 ? (
        <Alert
          type="warning"
          showIcon
          message="预览前发现 frontmatter 校验问题"
          description={
            <div className="space-y-1">
              {preview.errors.map((error) => (
                <div key={error}>{error}</div>
              ))}
            </div>
          }
        />
      ) : null}

      <div className="rounded-[22px] border border-slate-200 bg-slate-50/80 p-5">
        <Typography.Text className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
          SKILL Preview
        </Typography.Text>
        <Typography.Title level={4} className="mb-0! mt-3 text-slate-900!">
          {preview.name || '等待填写 name'}
        </Typography.Title>
        <Typography.Paragraph className="mb-0! mt-2 text-sm! leading-6! text-slate-600!">
          {preview.description || '等待填写 description'}
        </Typography.Paragraph>
      </div>

      <Card
        className="rounded-[22px]! border-slate-200!"
        styles={{ body: { padding: 0 } }}
      >
        <pre className="max-h-[340px] overflow-auto whitespace-pre-wrap px-5 py-5 text-[13px] leading-6 text-slate-600">
          {preview.body || '这里会显示 frontmatter 之后的正文内容。'}
        </pre>
      </Card>
    </div>
  );
};

export const SkillsManagementPage = () => {
  const { message, modal } = App.useApp();
  const [items, setItems] = useState<SkillSummaryResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const [selectedFilter, setSelectedFilter] =
    useState<SkillSidebarFilter>('all');
  const [editorMode, setEditorMode] = useState<EditorMode>(null);
  const [editorTabKey, setEditorTabKey] = useState<'editor' | 'preview'>(
    'editor',
  );
  const [editingSkill, setEditingSkill] = useState<SkillDetailResponse | null>(
    null,
  );
  const [editorMarkdown, setEditorMarkdown] = useState('');
  const [editorLifecycleStatus, setEditorLifecycleStatus] =
    useState<SkillLifecycleStatus>('draft');
  const [editorLoading, setEditorLoading] = useState(false);
  const [editorSubmitting, setEditorSubmitting] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importMode, setImportMode] = useState<ImportMode>('github');
  const [importGitHubUrl, setImportGitHubUrl] = useState('');
  const [importRepository, setImportRepository] = useState('');
  const [importPath, setImportPath] = useState('');
  const [importRef, setImportRef] = useState('');
  const [importUrl, setImportUrl] = useState('');
  const [importPreview, setImportPreview] = useState<SkillImportPreview | null>(
    null,
  );
  const [importSubmitting, setImportSubmitting] = useState(false);
  const [importPreviewLoading, setImportPreviewLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const loadSkills = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await listSkills();

        if (cancelled) {
          return;
        }

        setItems(response.items);
      } catch (currentError) {
        if (cancelled) {
          return;
        }

        console.error('[SkillsManagementPage] 加载技能目录失败:', currentError);
        setError(
          extractApiErrorMessage(currentError, '加载技能目录失败，请稍后重试'),
        );
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadSkills();

    return () => {
      cancelled = true;
    };
  }, [reloadToken]);

  const editorValidation = useMemo(() => {
    return parseSkillMarkdownPreview(editorMarkdown);
  }, [editorMarkdown]);

  const summaryItems = useMemo(() => {
    return buildSkillSummaryItems(items);
  }, [items]);

  const filterGroups = useMemo(() => {
    return [
      {
        key: 'all' as const,
        label: '全部',
        count: items.length,
      },
      {
        key: 'published' as const,
        label: '已发布',
        count: filterSkills(items, 'published').length,
      },
      {
        key: 'draft' as const,
        label: '草稿',
        count: filterSkills(items, 'draft').length,
      },
      {
        key: 'system' as const,
        label: '系统内置',
        count: filterSkills(items, 'system').length,
      },
      {
        key: 'custom' as const,
        label: '自建',
        count: filterSkills(items, 'custom').length,
      },
      {
        key: 'imported' as const,
        label: '公网导入',
        count: filterSkills(items, 'imported').length,
      },
    ];
  }, [items]);

  const filteredItems = useMemo(() => {
    return filterSkills(items, selectedFilter);
  }, [items, selectedFilter]);

  const handleReload = () => {
    setReloadToken((currentValue) => currentValue + 1);
  };

  const resetEditorState = () => {
    setEditorMode(null);
    setEditorTabKey('editor');
    setEditingSkill(null);
    setEditorMarkdown('');
    setEditorLifecycleStatus('draft');
    setEditorLoading(false);
    setEditorSubmitting(false);
  };

  const handleOpenCreateModal = () => {
    setEditorMode('create');
    setEditorTabKey('editor');
    setEditingSkill(null);
    setEditorMarkdown(buildSkillMarkdownTemplate());
    setEditorLifecycleStatus('draft');
  };

  const handleOpenEditModal = async (skill: SkillSummaryResponse) => {
    setEditorMode('edit');
    setEditorTabKey('editor');
    setEditorLoading(true);

    try {
      const result = await getSkillDetail(skill.id);
      setEditingSkill(result.skill);
      setEditorMarkdown(result.skill.skillMarkdown);
      setEditorLifecycleStatus(result.skill.lifecycleStatus);
    } catch (currentError) {
      console.error('[SkillsManagementPage] 加载 Skill 详情失败:', currentError);
      message.error(
        extractApiErrorMessage(currentError, '加载 Skill 详情失败，请稍后重试'),
      );
      resetEditorState();
    } finally {
      setEditorLoading(false);
    }
  };

  const handleSubmitEditor = async () => {
    if (!editorValidation.valid) {
      message.warning('请先修正 SKILL.md frontmatter 校验问题');
      setEditorTabKey('editor');
      return;
    }

    setEditorSubmitting(true);

    try {
      if (editorMode === 'create') {
        await createSkill({
          skillMarkdown: editorMarkdown,
        });
        message.success('Skill 已创建为草稿');
      }

      if (editorMode === 'edit' && editingSkill) {
        await updateSkill(editingSkill.id, {
          skillMarkdown: editorMarkdown,
          lifecycleStatus: editorLifecycleStatus,
        });
        message.success('Skill 已保存');
      }

      resetEditorState();
      handleReload();
    } catch (currentError) {
      console.error('[SkillsManagementPage] 保存 Skill 失败:', currentError);
      message.error(
        extractApiErrorMessage(currentError, '保存 Skill 失败，请稍后重试'),
      );
    } finally {
      setEditorSubmitting(false);
    }
  };

  const closeImportModal = () => {
    setImportModalOpen(false);
    setImportMode('github');
    setImportGitHubUrl('');
    setImportRepository('');
    setImportPath('');
    setImportRef('');
    setImportUrl('');
    setImportPreview(null);
    setImportPreviewLoading(false);
    setImportSubmitting(false);
  };

  const buildImportPayload = (
    mode: ImportMode,
    dryRun: boolean,
  ) => {
    if (mode === 'github') {
      return {
        mode,
        dryRun,
        ...(importGitHubUrl.trim()
          ? {
              githubUrl: importGitHubUrl.trim(),
            }
          : {
              repository: importRepository.trim(),
              path: importPath.trim() || undefined,
              ref: importRef.trim() || undefined,
            }),
      } as const;
    }

    return {
      mode,
      dryRun,
      url: importUrl.trim(),
    } as const;
  };

  const handlePreviewImport = async () => {
    setImportPreviewLoading(true);

    try {
      const result = await importSkill(buildImportPayload(importMode, true));

      if (!('preview' in result)) {
        throw new Error('import preview response missing');
      }

      setImportPreview(result.preview);
    } catch (currentError) {
      console.error('[SkillsManagementPage] 解析导入预览失败:', currentError);
      setImportPreview(null);
      message.error(
        extractApiErrorMessage(currentError, '解析导入预览失败，请检查来源信息'),
      );
    } finally {
      setImportPreviewLoading(false);
    }
  };

  const handleImportSkill = async () => {
    setImportSubmitting(true);

    try {
      const result = await importSkill(buildImportPayload(importMode, false));

      if (!('skill' in result)) {
        throw new Error('persisted skill response missing');
      }

      message.success('Skill 导入成功，已纳入你的全局资产目录');
      closeImportModal();
      handleReload();
    } catch (currentError) {
      console.error('[SkillsManagementPage] 导入 Skill 失败:', currentError);
      message.error(
        extractApiErrorMessage(currentError, '导入 Skill 失败，请稍后重试'),
      );
    } finally {
      setImportSubmitting(false);
    }
  };

  const handlePublishSkill = async (skill: SkillSummaryResponse) => {
    try {
      await updateSkill(skill.id, {
        lifecycleStatus: 'published',
      });
      message.success(`“${skill.name}”已发布，可用于绑定`);
      handleReload();
    } catch (currentError) {
      console.error('[SkillsManagementPage] 发布 Skill 失败:', currentError);
      message.error(
        extractApiErrorMessage(currentError, '发布 Skill 失败，请稍后重试'),
      );
    }
  };

  const handleDeleteSkill = (skill: SkillSummaryResponse) => {
    modal.confirm({
      title: `删除「${skill.name}」`,
      content: '删除后该 Skill 会从全局资产目录移除，且不会自动回源同步。',
      okText: '确认删除',
      okButtonProps: {
        danger: true,
      },
      cancelText: '取消',
      onOk: async () => {
        await deleteSkill(skill.id);
        message.success(`“${skill.name}”已删除`);
        handleReload();
      },
    });
  };

  const handleSkillMenuAction = (
    skill: SkillSummaryResponse,
    actionKey: string,
  ) => {
    if (actionKey === 'edit') {
      void handleOpenEditModal(skill);
      return;
    }

    if (actionKey === 'publish') {
      void handlePublishSkill(skill);
      return;
    }

    if (actionKey === 'delete') {
      handleDeleteSkill(skill);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[420px] items-center justify-center">
        <Spin size="large" />
      </div>
    );
  }

  return (
    <>
      <GlobalAssetPageLayout
        header={
          <GlobalAssetPageHeader
            title="技能"
            subtitle={SKILLS_PAGE_SUBTITLE}
            summaryItems={summaryItems}
            actions={
              <div className="flex flex-wrap items-center gap-3">
                <Button type="primary" icon={<PlusOutlined />} onClick={handleOpenCreateModal}>
                  新建 Skill
                </Button>
                <Button
                  icon={<CloudDownloadOutlined />}
                  onClick={() => setImportModalOpen(true)}
                >
                  导入 Skill
                </Button>
                <Tooltip title="刷新目录">
                  <Button
                    aria-label="刷新目录"
                    shape="circle"
                    icon={<ReloadOutlined />}
                    onClick={handleReload}
                  />
                </Tooltip>
              </div>
            }
          />
        }
        alert={
          error ? (
            <Alert
              type="error"
              showIcon
              message={error}
              action={
                <Button size="small" onClick={handleReload}>
                  重试
                </Button>
              }
            />
          ) : null
        }
        sidebar={
          <GlobalAssetSidebar>
            <GlobalAssetSidebarSection>
              {filterGroups.map((group) => (
                <GlobalAssetSidebarItem
                  key={group.key}
                  active={selectedFilter === group.key}
                  onClick={() => {
                    setSelectedFilter(group.key);
                  }}
                >
                  <div className="flex items-center justify-between gap-3">
                    <Typography.Text
                      className={`text-sm font-medium ${
                        selectedFilter === group.key
                          ? 'text-slate-900!'
                          : 'text-slate-600!'
                      }`}
                    >
                      {group.label}
                    </Typography.Text>
                    <Typography.Text className="text-xs text-slate-400">
                      {group.count}
                    </Typography.Text>
                  </div>
                </GlobalAssetSidebarItem>
              ))}
            </GlobalAssetSidebarSection>
          </GlobalAssetSidebar>
        }
      >
        {!error && items.length === 0 ? (
          <Card className={GLOBAL_ASSET_CONTENT_CARD_CLASS_NAME}>
            <Empty
              description="当前还没有 Skill，先新建一个方法资产吧。"
              image={Empty.PRESENTED_IMAGE_SIMPLE}
            />
          </Card>
        ) : null}

        {!error && items.length > 0 && filteredItems.length === 0 ? (
          <Card className={GLOBAL_ASSET_CONTENT_CARD_CLASS_NAME}>
            <Empty
              description="当前分组下暂无 Skill"
              image={Empty.PRESENTED_IMAGE_SIMPLE}
            />
          </Card>
        ) : null}

        {!error && filteredItems.length > 0 ? (
          <div className="grid gap-4 xl:grid-cols-2">
            {filteredItems.map((skill) => {
              const sourceMeta = SOURCE_META[skill.source];
              const statusMeta = getStatusBadgeMeta(skill);

              return (
                <article
                  key={skill.id}
                  className={`group flex h-full flex-col rounded-[26px] border border-slate-200 bg-gradient-to-br ${sourceMeta.cardTintClass} p-5 shadow-[0_10px_24px_rgba(15,23,42,0.04)]`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="space-y-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`${META_PILL_CLASS} ${sourceMeta.accentClass}`}
                        >
                          {sourceMeta.label}
                        </span>
                        <span
                          className={`${META_PILL_CLASS} ${statusMeta.accentClass}`}
                        >
                          {statusMeta.label}
                        </span>
                      </div>

                      <div className="space-y-3">
                        <Typography.Title level={4} className="mb-0! text-slate-900!">
                          {skill.name}
                        </Typography.Title>
                        <Typography.Paragraph
                          className="mb-0! min-h-[48px] text-sm! leading-6! text-slate-600!"
                          ellipsis={{ rows: 2, tooltip: skill.description }}
                        >
                          {skill.description}
                        </Typography.Paragraph>
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-2">
                      {skill.source === 'system' ? (
                        <Tag color="default" className="mr-0 rounded-full px-3 py-1">
                          只读
                        </Tag>
                      ) : null}

                      <Dropdown
                        trigger={['click']}
                        placement="bottomRight"
                        menu={{
                          items: buildSkillActionMenuItems(skill),
                          onClick: ({ key }) => handleSkillMenuAction(skill, key),
                        }}
                        destroyOnHidden
                      >
                        <Button
                          type="text"
                          size="small"
                          icon={<MoreOutlined />}
                          aria-label={`更多操作：${skill.name}`}
                        />
                      </Dropdown>
                    </div>
                  </div>

                  <div className="mt-auto pt-5">
                    <div className="border-t border-slate-200/80 pt-4 text-xs text-slate-400">
                      更新于 {updatedAtFormatter.format(new Date(skill.updatedAt))}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        ) : null}
      </GlobalAssetPageLayout>

      <Modal
        title={editorMode === 'create' ? '新建 Skill' : '编辑 Skill'}
        open={editorMode !== null}
        onCancel={resetEditorState}
        onOk={() => {
          void handleSubmitEditor();
        }}
        confirmLoading={editorSubmitting}
        destroyOnHidden
        width={880}
        okText={editorMode === 'create' ? '创建草稿' : '保存修改'}
        cancelText="取消"
      >
        {editorLoading ? (
          <div className="flex min-h-[320px] items-center justify-center">
            <Spin />
          </div>
        ) : (
          <div className="space-y-4">
            <Alert
              type="info"
              showIcon
              message="Skill 以原生 SKILL.md 作为事实源。创建后默认进入草稿，发布后才可被 Agent 或项目绑定。"
            />

            {editorMode === 'edit' && editingSkill?.source !== 'system' ? (
              <div className="flex items-center gap-3">
                <Typography.Text className="text-sm text-slate-500">
                  发布状态
                </Typography.Text>
                <Select
                  value={editorLifecycleStatus}
                  className="w-52"
                  options={lifecycleOptions}
                  onChange={(value) => setEditorLifecycleStatus(value)}
                />
              </div>
            ) : null}

            <Tabs
              activeKey={editorTabKey}
              onChange={(activeKey) => {
                setEditorTabKey(activeKey as 'editor' | 'preview');
              }}
              items={editorTabs.map((tab) => ({
                key: tab.key,
                label: tab.label,
                children:
                  tab.key === 'editor' ? (
                    <div className="space-y-3">
                      {editorValidation.errors.length > 0 ? (
                        <Alert
                          type="warning"
                          showIcon
                          message="当前还不能保存"
                          description={
                            <div className="space-y-1">
                              {editorValidation.errors.map((currentError) => (
                                <div key={currentError}>{currentError}</div>
                              ))}
                            </div>
                          }
                        />
                      ) : (
                        <Alert
                          type="success"
                          showIcon
                          message="frontmatter 校验通过"
                        />
                      )}
                      <Input.TextArea
                        value={editorMarkdown}
                        autoSize={{ minRows: 18, maxRows: 22 }}
                        className="font-mono"
                        placeholder="请填写原生 SKILL.md"
                        onChange={(event) => {
                          setEditorMarkdown(event.target.value);
                        }}
                      />
                    </div>
                  ) : (
                    renderMarkdownPreviewContent(editorMarkdown)
                  ),
              }))}
            />
          </div>
        )}
      </Modal>

      <Modal
        title="导入 Skill"
        open={importModalOpen}
        onCancel={closeImportModal}
        onOk={() => {
          void handleImportSkill();
        }}
        okText="导入 Skill"
        cancelText="取消"
        okButtonProps={{
          disabled: importPreview === null,
        }}
        confirmLoading={importSubmitting}
        destroyOnHidden
        width={820}
      >
        <div className="space-y-5">
          <Alert
            type="info"
            showIcon
            message="导入即自有：导入后的 Skill 会成为你的可编辑全局资产，但当前阶段不会自动回源同步。"
          />

          <Tabs
            activeKey={importMode}
            onChange={(activeKey) => {
              setImportMode(activeKey as ImportMode);
              setImportPreview(null);
            }}
            items={[
              {
                key: 'github',
                label: 'GitHub',
                children: (
                  <div className="space-y-3">
                    <Input
                      value={importGitHubUrl}
                      placeholder="优先支持 GitHub tree/blob/raw URL"
                      onChange={(event) => {
                        setImportGitHubUrl(event.target.value);
                        setImportPreview(null);
                      }}
                    />
                    <div className="grid gap-3 md:grid-cols-3">
                      <Input
                        value={importRepository}
                        placeholder="owner/repo"
                        onChange={(event) => {
                          setImportRepository(event.target.value);
                          setImportPreview(null);
                        }}
                      />
                      <Input
                        value={importPath}
                        placeholder="skills/review"
                        onChange={(event) => {
                          setImportPath(event.target.value);
                          setImportPreview(null);
                        }}
                      />
                      <Input
                        value={importRef}
                        placeholder="main"
                        onChange={(event) => {
                          setImportRef(event.target.value);
                          setImportPreview(null);
                        }}
                      />
                    </div>
                    <Typography.Text className="text-xs text-slate-400">
                      支持 `repository + path + ref`，也支持直接粘贴 GitHub URL。若路径指向 Skill 目录，会保留 bundle 结构。
                    </Typography.Text>
                  </div>
                ),
              },
              {
                key: 'url',
                label: '原始 Markdown URL',
                children: (
                  <div className="space-y-3">
                    <Input
                      value={importUrl}
                      placeholder="https://example.com/path/to/SKILL.md"
                      onChange={(event) => {
                        setImportUrl(event.target.value);
                        setImportPreview(null);
                      }}
                    />
                    <Typography.Text className="text-xs text-slate-400">
                      仅支持直接返回 Markdown 文本的原始 URL，不支持网页抓取与 zip。
                    </Typography.Text>
                  </div>
                ),
              },
            ]}
          />

          <div className="flex justify-end">
            <Button
              icon={<CloudDownloadOutlined />}
              loading={importPreviewLoading}
              onClick={() => {
                void handlePreviewImport();
              }}
            >
              解析预览
            </Button>
          </div>

          {importPreview ? (
            <div className="space-y-4 rounded-[22px] border border-slate-200 bg-slate-50/70 p-5">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`${META_PILL_CLASS} ${SOURCE_META.imported.accentClass}`}
                >
                  公网导入
                </span>
                <span
                  className={`${META_PILL_CLASS} ${LIFECYCLE_STATUS_META.draft.accentClass}`}
                >
                  草稿
                </span>
              </div>

              <div>
                <Typography.Title level={4} className="mb-0! text-slate-900!">
                  {importPreview.name}
                </Typography.Title>
                <Typography.Paragraph className="mb-0! mt-2 text-sm! leading-6! text-slate-600!">
                  {importPreview.description}
                </Typography.Paragraph>
              </div>

              <div className="rounded-[18px] border border-slate-200 bg-white px-4 py-4">
                <Typography.Text className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                  来源信息
                </Typography.Text>
                <Typography.Paragraph className="mb-0! mt-2 break-all text-sm! text-slate-500!">
                  {importPreview.importProvenance.githubUrl ??
                    importPreview.importProvenance.sourceUrl}
                </Typography.Paragraph>
              </div>

              <div className="rounded-[18px] border border-slate-200 bg-white px-4 py-4">
                <Typography.Text className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                  Bundle 文件
                </Typography.Text>
                <div className="mt-3 flex flex-wrap gap-2">
                  {importPreview.bundleFiles.map((file) => (
                    <Tag key={file.path} className="rounded-full px-3 py-1">
                      {file.path}
                    </Tag>
                  ))}
                </div>
              </div>

              {renderMarkdownPreviewContent(importPreview.skillMarkdown)}
            </div>
          ) : null}
        </div>
      </Modal>
    </>
  );
};
