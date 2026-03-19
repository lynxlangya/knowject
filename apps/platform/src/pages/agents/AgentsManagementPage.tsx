import {
  DeleteOutlined,
  EditOutlined,
  MoreOutlined,
  PauseCircleOutlined,
  PlayCircleOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import {
  Alert,
  App,
  Button,
  Card,
  Dropdown,
  Empty,
  Form,
  Input,
  Modal,
  Select,
  Spin,
  Tag,
  Tooltip,
  Typography,
} from 'antd';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  createAgent,
  deleteAgent,
  listAgents,
  updateAgent,
  type AgentResponse,
  type AgentStatus,
} from '@api/agents';
import { extractApiErrorMessage } from '@api/error';
import { listKnowledge, type KnowledgeSummaryResponse } from '@api/knowledge';
import { listSkills, type SkillSummaryResponse } from '@api/skills';
import type { MenuProps } from 'antd';
import {
  GLOBAL_ASSET_CONTENT_CARD_CLASS_NAME,
  GlobalAssetMetaPill,
  GlobalAssetPageHeader,
  GlobalAssetPageLayout,
  GlobalAssetSidebar,
  GlobalAssetSidebarFilterItem,
  GlobalAssetSidebarItem,
  GlobalAssetSidebarSection,
  type GlobalAssetSummaryItem,
} from '@pages/assets/components/GlobalAssetLayout';
import {
  createGlobalAssetSummaryItem,
  formatGlobalAssetUpdatedAt,
} from '@pages/assets/components/globalAsset.shared';

type ModalMode = 'create' | 'edit' | null;
type AgentSidebarFilter = 'all' | 'recent' | 'active' | 'disabled';

interface AgentFormValues {
  name: string;
  description: string;
  systemPrompt: string;
  boundKnowledgeIds: string[];
  boundSkillIds: string[];
  status: AgentStatus;
}

const AGENT_STATUS_META: Record<
  AgentStatus,
  { label: string; tagColor: string }
> = {
  active: {
    label: '启用中',
    tagColor: 'green',
  },
  disabled: {
    label: '已停用',
    tagColor: 'default',
  },
};

const AGENTS_PAGE_SUBTITLE = '复用角色与流程，项目内绑定执行';

const sortAgentsByUpdatedAt = (items: AgentResponse[]): AgentResponse[] => {
  return [...items].sort(
    (left, right) =>
      new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime(),
  );
};

const createAgentPayload = (
  source: Pick<
    AgentResponse | AgentFormValues,
    | 'name'
    | 'description'
    | 'systemPrompt'
    | 'boundKnowledgeIds'
    | 'boundSkillIds'
    | 'status'
  >,
) => {
  return {
    name: source.name.trim(),
    description: source.description.trim(),
    systemPrompt: source.systemPrompt.trim(),
    boundKnowledgeIds: source.boundKnowledgeIds ?? [],
    boundSkillIds: source.boundSkillIds ?? [],
    status: source.status,
  };
};

const buildPromptPreview = (systemPrompt: string): string => {
  const normalized = systemPrompt.replace(/\s+/g, ' ').trim();

  if (!normalized) {
    return '当前未填写提示词。';
  }

  return normalized.length > 60 ? `${normalized.slice(0, 60)}…` : normalized;
};

const resolveSelectableOptions = (
  selectedIds: string[],
  baseOptions: Array<{ value: string; label: string }>,
): Array<{ value: string; label: string }> => {
  const optionMap = new Map(
    baseOptions.map((option) => [option.value, option] as const),
  );

  selectedIds.forEach((resourceId) => {
    if (optionMap.has(resourceId)) {
      return;
    }

    optionMap.set(resourceId, {
      value: resourceId,
      label: `未知 Skill（${resourceId}）`,
    });
  });

  return Array.from(optionMap.values());
};

const filterAgents = (
  items: AgentResponse[],
  filter: AgentSidebarFilter,
): AgentResponse[] => {
  if (filter === 'recent') {
    return items.slice(0, 5);
  }

  if (filter === 'active') {
    return items.filter((item) => item.status === 'active');
  }

  if (filter === 'disabled') {
    return items.filter((item) => item.status === 'disabled');
  }

  return items;
};

export const AgentsManagementPage = () => {
  const { message, modal } = App.useApp();
  const [form] = Form.useForm<AgentFormValues>();
  const watchedSkillIds = Form.useWatch('boundSkillIds', form);
  const agentCardRefs = useRef<Record<string, HTMLElement | null>>({});
  const [items, setItems] = useState<AgentResponse[]>([]);
  const [knowledgeItems, setKnowledgeItems] = useState<
    KnowledgeSummaryResponse[]
  >([]);
  const [skillItems, setSkillItems] = useState<SkillSummaryResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [editingAgent, setEditingAgent] = useState<AgentResponse | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deletingAgentId, setDeletingAgentId] = useState<string | null>(null);
  const [updatingStatusAgentId, setUpdatingStatusAgentId] = useState<
    string | null
  >(null);
  const [selectedFilter, setSelectedFilter] =
    useState<AgentSidebarFilter>('all');
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadData = async () => {
      setLoading(true);
      setError(null);

      try {
        const [agentsResult, knowledgeResult, skillsResult] = await Promise.all(
          [listAgents(), listKnowledge(), listSkills({ bindable: true })],
        );

        if (cancelled) {
          return;
        }

        setItems(sortAgentsByUpdatedAt(agentsResult.items));
        setKnowledgeItems(knowledgeResult.items);
        setSkillItems(skillsResult.items);
      } catch (currentError) {
        if (cancelled) {
          return;
        }

        console.error(
          '[AgentsManagementPage] 加载智能体目录失败:',
          currentError,
        );
        setError(
          extractApiErrorMessage(
            currentError,
            '加载智能体目录失败，请稍后重试',
          ),
        );
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadData();

    return () => {
      cancelled = true;
    };
  }, [reloadToken]);

  const knowledgeOptions = useMemo(() => {
    return knowledgeItems.map((item) => ({
      value: item.id,
      label:
        item.sourceType === 'global_code'
          ? `${item.name} · global_code（预留）`
          : item.name,
    }));
  }, [knowledgeItems]);

  const skillOptions = useMemo(() => {
    const selectedSkillIds = watchedSkillIds ?? [];
    const baseOptions = skillItems.map((item) => ({
      value: item.id,
      label:
        item.runtimeStatus === 'available'
          ? `${item.name} · 已接服务`
          : `${item.name} · 契约预留`,
    }));

    return resolveSelectableOptions(selectedSkillIds, baseOptions);
  }, [skillItems, watchedSkillIds]);

  const summaryItems = useMemo(() => {
    const activeCount = items.filter((item) => item.status === 'active').length;
    const disabledCount = items.length - activeCount;
    const knowledgeBoundCount = items.filter(
      (item) => item.boundKnowledgeIds.length > 0,
    ).length;
    const skillBoundCount = items.filter(
      (item) => item.boundSkillIds.length > 0,
    ).length;
    const knowledgeBindingTotal = items.reduce(
      (sum, item) => sum + item.boundKnowledgeIds.length,
      0,
    );
    const skillBindingTotal = items.reduce(
      (sum, item) => sum + item.boundSkillIds.length,
      0,
    );

    return [
      createGlobalAssetSummaryItem(
        '智能体总数',
        `${items.length} 个`,
        '当前目录中的全局智能体配置数量。',
      ),
      createGlobalAssetSummaryItem(
        '启用中',
        `${activeCount} 个`,
        disabledCount === 0
          ? '当前没有停用中的智能体。'
          : `${disabledCount} 个当前处于停用状态。`,
      ),
      createGlobalAssetSummaryItem(
        '已绑知识库',
        `${knowledgeBoundCount} 个`,
        knowledgeBindingTotal === 0
          ? '当前还没有智能体接入知识库。'
          : `累计 ${knowledgeBindingTotal} 条知识库绑定。`,
      ),
      createGlobalAssetSummaryItem(
        '已绑 Skill',
        `${skillBoundCount} 个`,
        skillBindingTotal === 0
          ? '当前还没有智能体接入 Skill。'
          : `累计 ${skillBindingTotal} 条 Skill 绑定。`,
      ),
    ] satisfies GlobalAssetSummaryItem[];
  }, [items]);
  const filteredAgents = filterAgents(items, selectedFilter);
  const agentFilters = [
    {
      key: 'all' as const,
      label: '全部',
      count: items.length,
    },
    {
      key: 'recent' as const,
      label: '最近使用',
      count: filterAgents(items, 'recent').length,
    },
    {
      key: 'active' as const,
      label: '启用中',
      count: filterAgents(items, 'active').length,
    },
    {
      key: 'disabled' as const,
      label: '已停用',
      count: filterAgents(items, 'disabled').length,
    },
  ];

  const handleReload = () => {
    setReloadToken((currentValue) => currentValue + 1);
  };

  const highlightAgentCard = (agentId: string) => {
    setSelectedAgentId(agentId);
    window.setTimeout(() => {
      agentCardRefs.current[agentId]?.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
      });
    }, 0);
  };

  const openCreateModal = () => {
    setEditingAgent(null);
    setModalMode('create');
    form.setFieldsValue({
      name: '',
      description: '',
      systemPrompt: '',
      boundKnowledgeIds: [],
      boundSkillIds: [],
      status: 'active',
    });
  };

  const openEditModal = (agent: AgentResponse) => {
    setEditingAgent(agent);
    setModalMode('edit');
    form.setFieldsValue({
      name: agent.name,
      description: agent.description,
      systemPrompt: agent.systemPrompt,
      boundKnowledgeIds: agent.boundKnowledgeIds,
      boundSkillIds: agent.boundSkillIds,
      status: agent.status,
    });
  };

  const closeModal = () => {
    setModalMode(null);
    setEditingAgent(null);
    form.resetFields();
  };

  const upsertAgent = (nextAgent: AgentResponse) => {
    setSelectedFilter('all');
    highlightAgentCard(nextAgent.id);
    setItems((currentItems) =>
      sortAgentsByUpdatedAt([
        nextAgent,
        ...currentItems.filter((item) => item.id !== nextAgent.id),
      ]),
    );
  };

  const handleSubmitAgent = async (values: AgentFormValues) => {
    setSubmitting(true);

    try {
      const payload = createAgentPayload(values);

      const result =
        modalMode === 'edit' && editingAgent
          ? await updateAgent(editingAgent.id, payload)
          : await createAgent(payload);

      upsertAgent(result.agent);
      message.success(modalMode === 'edit' ? '智能体已更新' : '智能体已创建');
      closeModal();
    } catch (currentError) {
      console.error('[AgentsManagementPage] 保存智能体失败:', currentError);
      message.error(
        extractApiErrorMessage(currentError, '保存智能体失败，请稍后重试'),
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleAgentStatus = async (agent: AgentResponse) => {
    const nextStatus: AgentStatus =
      agent.status === 'active' ? 'disabled' : 'active';

    setUpdatingStatusAgentId(agent.id);

    try {
      const result = await updateAgent(
        agent.id,
        createAgentPayload({
          ...agent,
          status: nextStatus,
        }),
      );

      upsertAgent(result.agent);
      message.success(
        nextStatus === 'disabled' ? '智能体已停用' : '智能体已启用',
      );
    } catch (currentError) {
      console.error('[AgentsManagementPage] 更新智能体状态失败:', currentError);
      message.error(
        extractApiErrorMessage(currentError, '更新智能体状态失败，请稍后重试'),
      );
    } finally {
      setUpdatingStatusAgentId(null);
    }
  };

  const handleDeleteAgent = async (agent: AgentResponse) => {
    setDeletingAgentId(agent.id);

    try {
      await deleteAgent(agent.id);
      setItems((currentItems) =>
        currentItems.filter((item) => item.id !== agent.id),
      );
      setSelectedAgentId((currentId) =>
        currentId === agent.id ? null : currentId,
      );
      message.success('智能体已删除');
    } catch (currentError) {
      console.error('[AgentsManagementPage] 删除智能体失败:', currentError);
      message.error(
        extractApiErrorMessage(currentError, '删除智能体失败，请稍后重试'),
      );
    } finally {
      setDeletingAgentId(null);
    }
  };

  useEffect(() => {
    if (!selectedAgentId) {
      return;
    }

    if (!filteredAgents.some((agent) => agent.id === selectedAgentId)) {
      setSelectedAgentId(null);
    }
  }, [filteredAgents, selectedAgentId]);

  const confirmDeleteAgent = (agent: AgentResponse) => {
    modal.confirm({
      title: '删除智能体',
      content: '会删除该智能体配置，但不会移除已绑定的知识库或 Skill 资产。',
      okText: '删除',
      cancelText: '取消',
      okButtonProps: {
        danger: true,
      },
      centered: true,
      onOk: async () => {
        await handleDeleteAgent(agent);
      },
    });
  };

  const buildAgentActionMenuItems = (
    agent: AgentResponse,
  ): NonNullable<MenuProps['items']> => {
    const busy =
      deletingAgentId === agent.id || updatingStatusAgentId === agent.id;
    const toggleToDisabled = agent.status === 'active';

    return [
      {
        key: 'edit',
        icon: <EditOutlined />,
        label: '编辑配置',
        disabled: busy,
      },
      {
        key: 'toggle-status',
        icon: toggleToDisabled ? (
          <PauseCircleOutlined />
        ) : (
          <PlayCircleOutlined />
        ),
        label: toggleToDisabled ? '停用' : '启用',
        disabled: busy,
      },
      {
        type: 'divider',
      },
      {
        key: 'delete',
        icon: <DeleteOutlined />,
        label: '删除',
        danger: true,
        disabled: busy,
      },
    ];
  };

  const handleAgentMenuAction = (agent: AgentResponse, key: string) => {
    if (key === 'edit') {
      openEditModal(agent);
      return;
    }

    if (key === 'toggle-status') {
      void handleToggleAgentStatus(agent);
      return;
    }

    if (key === 'delete') {
      confirmDeleteAgent(agent);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-105 items-center justify-center">
        <Spin size="large" />
      </div>
    );
  }

  return (
    <GlobalAssetPageLayout
      header={
        <GlobalAssetPageHeader
          title="智能体"
          subtitle={AGENTS_PAGE_SUBTITLE}
          summaryItems={summaryItems}
          actions={
            <div className="flex flex-col items-start gap-3 lg:items-end">
              <Typography.Text className="text-xs text-slate-400">
                模型由服务端固定，绑定资源时会做存在性校验
              </Typography.Text>
              <div className="flex flex-wrap gap-2">
                <Button type="primary" onClick={openCreateModal}>
                  新建智能体
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
        <GlobalAssetSidebar
          header={
            <div className="flex items-end justify-between gap-3">
              <Typography.Title level={5} className="mb-0! text-slate-800!">
                分组与定位
              </Typography.Title>
              <Typography.Text className="text-xs text-slate-400">
                共 {items.length} 个
              </Typography.Text>
            </div>
          }
        >
          <GlobalAssetSidebarSection title="分组浏览">
            {agentFilters.map((filter) => (
              <GlobalAssetSidebarFilterItem
                key={filter.key}
                active={selectedFilter === filter.key}
                label={filter.label}
                count={filter.count}
                onClick={() => {
                  setSelectedFilter(filter.key);
                }}
              />
            ))}
          </GlobalAssetSidebarSection>

          <GlobalAssetSidebarSection title="智能体列表">
            {filteredAgents.length === 0 ? (
              <div className="px-2 py-4">
                <Typography.Text className="text-sm text-slate-400">
                  当前分组下暂无智能体。
                </Typography.Text>
              </div>
            ) : (
              filteredAgents.map((agent) => {
                const statusMeta = AGENT_STATUS_META[agent.status];

                return (
                  <GlobalAssetSidebarItem
                    key={agent.id}
                    active={selectedAgentId === agent.id}
                    onClick={() => {
                      highlightAgentCard(agent.id);
                    }}
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between gap-3">
                        <Typography.Text
                          className={`truncate text-sm font-medium ${
                            selectedAgentId === agent.id
                              ? 'text-slate-900!'
                              : 'text-slate-700!'
                          }`}
                        >
                          {agent.name}
                        </Typography.Text>
                        <Typography.Text className="text-caption text-slate-400">
                          {statusMeta.label}
                        </Typography.Text>
                      </div>
                      <Typography.Text className="block text-caption text-slate-500">
                        最近更新：
                        {formatGlobalAssetUpdatedAt(agent.updatedAt)}
                      </Typography.Text>
                    </div>
                  </GlobalAssetSidebarItem>
                );
              })
            )}
          </GlobalAssetSidebarSection>
        </GlobalAssetSidebar>
      }
    >
      {!error && items.length === 0 ? (
        <Card className={GLOBAL_ASSET_CONTENT_CARD_CLASS_NAME}>
          <Empty
            description="当前还没有全局智能体配置"
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          >
            <Button type="primary" onClick={openCreateModal}>
              创建第一个智能体
            </Button>
          </Empty>
        </Card>
      ) : null}

      {!error && items.length > 0 && filteredAgents.length === 0 ? (
        <Card className={GLOBAL_ASSET_CONTENT_CARD_CLASS_NAME}>
          <Empty
            description="当前分组下暂无智能体"
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          />
        </Card>
      ) : null}

      {!error && filteredAgents.length > 0 ? (
        <div className="grid gap-4 xl:grid-cols-2">
          {filteredAgents.map((agent) => {
            const statusMeta = AGENT_STATUS_META[agent.status];
            const promptPreview = buildPromptPreview(agent.systemPrompt);
            const isBusy =
              deletingAgentId === agent.id ||
              updatingStatusAgentId === agent.id;
            const isHighlighted = selectedAgentId === agent.id;

            return (
              <article
                key={agent.id}
                ref={(node) => {
                  agentCardRefs.current[agent.id] = node;
                }}
                className={`group rounded-3xl border bg-white p-5 shadow-float transition ${
                  isHighlighted
                    ? 'border-emerald-300 bg-emerald-50/40 shadow-[0_18px_36px_rgba(16,185,129,0.12)]'
                    : 'border-slate-200'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Typography.Title
                        level={4}
                        className="mb-0! text-slate-900!"
                      >
                        {agent.name}
                      </Typography.Title>
                      <Tag color={statusMeta.tagColor}>{statusMeta.label}</Tag>
                    </div>
                    <Typography.Paragraph
                      className="mb-0! mt-3 text-sm! text-slate-500!"
                      ellipsis={{ rows: 2 }}
                    >
                      {agent.description || '当前未补充智能体描述。'}
                    </Typography.Paragraph>
                  </div>

                  <Dropdown
                    trigger={['click']}
                    placement="bottomRight"
                    menu={{
                      items: buildAgentActionMenuItems(agent),
                      onClick: ({ key }) => handleAgentMenuAction(agent, key),
                    }}
                  >
                    <Button
                      type="text"
                      size="small"
                      icon={<MoreOutlined />}
                      loading={isBusy}
                      aria-label={`更多操作：${agent.name}`}
                      className="opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100"
                    />
                  </Dropdown>
                </div>

                <div className="mt-3 flex items-start gap-2 text-xs">
                  <Typography.Text className="shrink-0 text-slate-400!">
                    提示词
                  </Typography.Text>
                  <Typography.Text className="min-w-0 text-slate-500!">
                    {promptPreview}
                  </Typography.Text>
                </div>

                <div className="mt-4 flex flex-wrap gap-2 text-caption text-slate-600">
                  <GlobalAssetMetaPill className="border-slate-200 bg-slate-50 text-slate-600">
                    知识库：{agent.boundKnowledgeIds.length}
                  </GlobalAssetMetaPill>
                  <GlobalAssetMetaPill className="border-slate-200 bg-slate-50 text-slate-600">
                    Skill：{agent.boundSkillIds.length}
                  </GlobalAssetMetaPill>
                  <GlobalAssetMetaPill className="border-slate-200 bg-slate-50 text-slate-600">
                    最近更新：
                    {formatGlobalAssetUpdatedAt(agent.updatedAt)}
                  </GlobalAssetMetaPill>
                </div>
              </article>
            );
          })}
        </div>
      ) : null}

      <Modal
        title={modalMode === 'create' ? '新建智能体' : '编辑智能体'}
        open={modalMode !== null}
        onCancel={closeModal}
        onOk={() => form.submit()}
        confirmLoading={submitting}
        destroyOnHidden
        okText={modalMode === 'create' ? '创建智能体' : '保存修改'}
        cancelText="取消"
      >
        <Form<AgentFormValues>
          form={form}
          layout="vertical"
          onFinish={(values) => {
            void handleSubmitAgent(values);
          }}
          initialValues={{
            name: '',
            description: '',
            systemPrompt: '',
            boundKnowledgeIds: [],
            boundSkillIds: [],
            status: 'active',
          }}
        >
          <Alert
            type="info"
            showIcon
            className="mb-4"
            message="当前模型由服务端固定为 server-default，页面只维护提示词、状态与资源绑定。"
          />

          <Form.Item
            name="name"
            label="智能体名称"
            rules={[
              { required: true, whitespace: true, message: '请输入智能体名称' },
            ]}
          >
            <Input maxLength={80} placeholder="例如：代码审查助手" />
          </Form.Item>

          <Form.Item name="description" label="描述">
            <Input.TextArea
              autoSize={{ minRows: 3, maxRows: 5 }}
              maxLength={240}
              placeholder="描述这个智能体的职责、边界和适用场景。"
            />
          </Form.Item>

          <Form.Item
            name="systemPrompt"
            label="System Prompt"
            rules={[
              {
                required: true,
                whitespace: true,
                message: '请输入 System Prompt',
              },
            ]}
          >
            <Input.TextArea
              autoSize={{ minRows: 5, maxRows: 8 }}
              maxLength={2000}
              showCount
              placeholder="例如：你是一个严格但务实的代码审查助手，优先指出回归风险、测试缺口和可维护性问题。"
            />
          </Form.Item>

          <Form.Item name="status" label="状态">
            <Select
              options={[
                { value: 'active', label: 'active · 启用中' },
                { value: 'disabled', label: 'disabled · 已停用' },
              ]}
            />
          </Form.Item>

          <Form.Item name="boundKnowledgeIds" label="绑定知识库">
            <Select
              mode="multiple"
              allowClear
              placeholder="可选"
              options={knowledgeOptions}
              notFoundContent="暂无可选知识库"
            />
          </Form.Item>

          <Form.Item name="boundSkillIds" label="绑定 Skill">
            <Select
              mode="multiple"
              allowClear
              placeholder="可选"
              options={skillOptions}
              notFoundContent="暂无可选 Skill"
            />
          </Form.Item>
        </Form>
      </Modal>
    </GlobalAssetPageLayout>
  );
};
