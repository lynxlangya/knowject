import {
  Alert,
  App,
  Button,
  Card,
  Empty,
  Form,
  Input,
  Modal,
  Select,
  Spin,
  Tag,
  Typography,
} from 'antd';
import { useEffect, useMemo, useState } from 'react';
import {
  createAgent,
  deleteAgent,
  listAgents,
  updateAgent,
  type AgentResponse,
  type AgentStatus,
} from '@api/agents';
import { extractApiErrorMessage } from '@api/error';
import {
  listKnowledge,
  type KnowledgeSummaryResponse,
} from '@api/knowledge';
import {
  listSkills,
  type SkillSummaryResponse,
} from '@api/skills';

type ModalMode = 'create' | 'edit' | null;

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

const updatedAtFormatter = new Intl.DateTimeFormat('zh-CN', {
  month: 'numeric',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

const sortAgentsByUpdatedAt = (items: AgentResponse[]): AgentResponse[] => {
  return [...items].sort(
    (left, right) =>
      new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime(),
  );
};

const resolveBoundLabels = (
  ids: string[],
  labelMap: Map<string, string>,
  fallbackPrefix: string,
): string[] => {
  return ids.map(
    (id) => labelMap.get(id) ?? `未知${fallbackPrefix}（${id}）`,
  );
};

export const AgentsManagementPage = () => {
  const { message, modal } = App.useApp();
  const [form] = Form.useForm<AgentFormValues>();
  const [items, setItems] = useState<AgentResponse[]>([]);
  const [knowledgeItems, setKnowledgeItems] = useState<KnowledgeSummaryResponse[]>(
    [],
  );
  const [skillItems, setSkillItems] = useState<SkillSummaryResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [editingAgent, setEditingAgent] = useState<AgentResponse | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deletingAgentId, setDeletingAgentId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadData = async () => {
      setLoading(true);
      setError(null);

      try {
        const [agentsResult, knowledgeResult, skillsResult] = await Promise.all([
          listAgents(),
          listKnowledge(),
          listSkills(),
        ]);

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

        console.error('[AgentsManagementPage] 加载智能体目录失败:', currentError);
        setError(
          extractApiErrorMessage(currentError, '加载智能体目录失败，请稍后重试'),
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

  const knowledgeNameMap = useMemo(() => {
    return new Map(knowledgeItems.map((item) => [item.id, item.name]));
  }, [knowledgeItems]);

  const skillNameMap = useMemo(() => {
    return new Map(skillItems.map((item) => [item.id, item.name]));
  }, [skillItems]);

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
    return skillItems.map((item) => ({
      value: item.id,
      label:
        item.status === 'available'
          ? `${item.name} · 已接服务`
          : `${item.name} · 契约预留`,
    }));
  }, [skillItems]);

  const summaryItems = useMemo(() => {
    const activeCount = items.filter((item) => item.status === 'active').length;
    const disabledCount = items.filter(
      (item) => item.status === 'disabled',
    ).length;
    const totalBindings = items.reduce(
      (total, item) =>
        total + item.boundKnowledgeIds.length + item.boundSkillIds.length,
      0,
    );

    return [
      {
        label: '智能体总数',
        value: `${items.length} 个`,
        hint: '当前账号可见的全局 Agent 配置总数。',
      },
      {
        label: '启用中',
        value: `${activeCount} 个`,
        hint: '可直接参与后续项目绑定与执行编排的 Agent。',
      },
      {
        label: '已绑资源',
        value: `${totalBindings} 项`,
        hint: '所有 Agent 当前累计绑定的知识库与 Skill 数量。',
      },
      {
        label: '已停用',
        value: `${disabledCount} 个`,
        hint: '配置保留但当前不参与默认使用的 Agent。',
      },
    ];
  }, [items]);

  const handleReload = () => {
    setReloadToken((currentValue) => currentValue + 1);
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
      const payload = {
        name: values.name.trim(),
        description: values.description.trim(),
        systemPrompt: values.systemPrompt.trim(),
        boundKnowledgeIds: values.boundKnowledgeIds ?? [],
        boundSkillIds: values.boundSkillIds ?? [],
        status: values.status,
      };

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

  const handleDeleteAgent = async (agent: AgentResponse) => {
    setDeletingAgentId(agent.id);

    try {
      await deleteAgent(agent.id);
      setItems((currentItems) =>
        currentItems.filter((item) => item.id !== agent.id),
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

  if (loading) {
    return (
      <div className="flex min-h-[420px] items-center justify-center">
        <Spin size="large" />
      </div>
    );
  }

  return (
    <section className="space-y-5">
      <Card
        className="mb-5! rounded-[24px]! border-slate-200! shadow-[0_12px_30px_rgba(15,23,42,0.04)]!"
        styles={{ body: { padding: '22px 22px 20px' } }}
      >
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <Typography.Text className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
              全局资产管理中心
            </Typography.Text>
            <Typography.Title level={2} className="mb-1! mt-2 text-slate-900!">
              智能体
            </Typography.Title>
            <Typography.Paragraph className="mb-0! max-w-2xl text-sm! text-slate-500!">
              全局智能体负责封装可复用的角色、提示词和协作流程，项目内仅做绑定和执行编排，不直接修改全局定义。
            </Typography.Paragraph>
          </div>
          <div className="flex max-w-md flex-col gap-3 rounded-[20px] border border-slate-200 bg-slate-50 px-4 py-3">
            <div className="flex flex-wrap items-center gap-2">
              <Tag color="blue">正式配置</Tag>
              <Tag color="geekblue">服务端校验</Tag>
            </div>
            <Typography.Paragraph className="mb-0! text-sm! text-slate-500!">
              当前模型由服务端固定为 <code>server-default</code>，绑定知识库和 Skill 时会做存在性校验。
            </Typography.Paragraph>
            <div className="flex flex-wrap gap-2">
              <Button type="primary" onClick={openCreateModal}>
                新建智能体
              </Button>
              <Button onClick={handleReload}>刷新目录</Button>
            </div>
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {summaryItems.map((item) => (
            <div
              key={item.label}
              className="rounded-[20px] border border-slate-200 bg-slate-50/70 px-4 py-4"
            >
              <Typography.Text className="text-xs font-medium uppercase tracking-[0.14em] text-slate-400">
                {item.label}
              </Typography.Text>
              <Typography.Title level={4} className="mb-0! mt-2 text-slate-800!">
                {item.value}
              </Typography.Title>
              <Typography.Paragraph className="mb-0! mt-2 text-xs! leading-5! text-slate-500!">
                {item.hint}
              </Typography.Paragraph>
            </div>
          ))}
        </div>
      </Card>

      {error ? (
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
      ) : null}

      {!error && items.length === 0 ? (
        <Card className="mb-5! rounded-[24px]! border-slate-200! shadow-[0_12px_30px_rgba(15,23,42,0.04)]!">
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

      {!error && items.length > 0 ? (
        <div className="grid gap-4 xl:grid-cols-2">
          {items.map((agent) => {
            const statusMeta = AGENT_STATUS_META[agent.status];
            const boundKnowledgeLabels = resolveBoundLabels(
              agent.boundKnowledgeIds,
              knowledgeNameMap,
              '知识库',
            );
            const boundSkillLabels = resolveBoundLabels(
              agent.boundSkillIds,
              skillNameMap,
              'Skill',
            );

            return (
              <article
                key={agent.id}
                className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-[0_12px_30px_rgba(15,23,42,0.04)]"
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Typography.Title level={4} className="mb-0! text-slate-900!">
                        {agent.name}
                      </Typography.Title>
                      <Tag color={statusMeta.tagColor}>{statusMeta.label}</Tag>
                      <Tag color="default">模型：{agent.model}</Tag>
                    </div>
                    <Typography.Paragraph className="mb-0! mt-3 text-sm! text-slate-500!">
                      {agent.description || '当前未补充智能体描述。'}
                    </Typography.Paragraph>
                  </div>
                  <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-medium text-slate-500">
                    {agent.id}
                  </span>
                </div>

                <div className="mt-4 flex flex-wrap gap-2 text-[11px] text-slate-600">
                  <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 font-medium">
                    知识库：{agent.boundKnowledgeIds.length}
                  </span>
                  <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 font-medium">
                    Skill：{agent.boundSkillIds.length}
                  </span>
                  <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 font-medium">
                    最近更新：{updatedAtFormatter.format(new Date(agent.updatedAt))}
                  </span>
                </div>

                <div className="mt-4 rounded-[18px] border border-slate-200 bg-slate-50 px-4 py-3">
                  <Typography.Text className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                    System Prompt
                  </Typography.Text>
                  <Typography.Paragraph
                    className="mb-0! mt-2 whitespace-pre-wrap text-sm! text-slate-600!"
                    style={{
                      display: '-webkit-box',
                      overflow: 'hidden',
                      WebkitLineClamp: 4,
                      WebkitBoxOrient: 'vertical',
                    }}
                  >
                    {agent.systemPrompt}
                  </Typography.Paragraph>
                </div>

                <div className="mt-4 grid gap-3 lg:grid-cols-2">
                  <div className="rounded-[18px] border border-slate-200 bg-slate-50 px-4 py-3">
                    <Typography.Text className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                      绑定知识库
                    </Typography.Text>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {boundKnowledgeLabels.length > 0 ? (
                        boundKnowledgeLabels.map((label) => (
                          <span
                            key={`${agent.id}-knowledge-${label}`}
                            className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] text-slate-600"
                          >
                            {label}
                          </span>
                        ))
                      ) : (
                        <Typography.Text className="text-sm text-slate-500">
                          当前未绑定知识库
                        </Typography.Text>
                      )}
                    </div>
                  </div>

                  <div className="rounded-[18px] border border-slate-200 bg-slate-50 px-4 py-3">
                    <Typography.Text className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                      绑定 Skill
                    </Typography.Text>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {boundSkillLabels.length > 0 ? (
                        boundSkillLabels.map((label) => (
                          <span
                            key={`${agent.id}-skill-${label}`}
                            className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] text-slate-600"
                          >
                            {label}
                          </span>
                        ))
                      ) : (
                        <Typography.Text className="text-sm text-slate-500">
                          当前未绑定 Skill
                        </Typography.Text>
                      )}
                    </div>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <Button onClick={() => openEditModal(agent)}>编辑配置</Button>
                  <Button
                    danger
                    loading={deletingAgentId === agent.id}
                    onClick={() => confirmDeleteAgent(agent)}
                  >
                    删除
                  </Button>
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
              { required: true, whitespace: true, message: '请输入 System Prompt' },
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
    </section>
  );
};
