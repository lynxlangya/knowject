import {
  DatabaseOutlined,
  FolderAddOutlined,
  LinkOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import type { KnowledgeSummaryResponse } from '@api/knowledge';
import { Button, Empty, Form, Input, Modal, Segmented, Tag, Typography } from 'antd';
import { useEffect, useState } from 'react';

export interface ProjectKnowledgeFormValues {
  name: string;
  description?: string;
}

export type ProjectKnowledgeAccessMode = 'global' | 'project';

interface ProjectKnowledgeAccessModalProps {
  open: boolean;
  initialMode: ProjectKnowledgeAccessMode;
  knowledgeCatalog: KnowledgeSummaryResponse[];
  knowledgeCatalogLoading: boolean;
  boundKnowledgeIds: string[];
  binding: boolean;
  creating: boolean;
  onCancel: () => void;
  onBindGlobalKnowledge: (knowledgeIds: string[]) => void | Promise<void>;
  onCreateProjectKnowledge: (
    values: ProjectKnowledgeFormValues,
  ) => void | Promise<void>;
  onOpenGlobalManagement: () => void;
}

const INDEX_STATUS_META = {
  idle: {
    color: 'default',
    label: '待索引',
  },
  pending: {
    color: 'gold',
    label: '排队中',
  },
  processing: {
    color: 'processing',
    label: '处理中',
  },
  completed: {
    color: 'success',
    label: '已完成',
  },
  failed: {
    color: 'error',
    label: '失败',
  },
} as const;

export const ProjectKnowledgeAccessModal = ({
  open,
  initialMode,
  knowledgeCatalog,
  knowledgeCatalogLoading,
  boundKnowledgeIds,
  binding,
  creating,
  onCancel,
  onBindGlobalKnowledge,
  onCreateProjectKnowledge,
  onOpenGlobalManagement,
}: ProjectKnowledgeAccessModalProps) => {
  const [mode, setMode] = useState<ProjectKnowledgeAccessMode>(initialMode);
  const [globalSearchValue, setGlobalSearchValue] = useState('');
  const [selectedGlobalKnowledgeIds, setSelectedGlobalKnowledgeIds] = useState<string[]>([]);
  const [form] = Form.useForm<ProjectKnowledgeFormValues>();

  useEffect(() => {
    if (!open) {
      return;
    }

    setMode(initialMode);
    setGlobalSearchValue('');
    setSelectedGlobalKnowledgeIds([]);
    form.setFieldsValue({
      name: '',
      description: '',
    });
  }, [form, initialMode, open]);

  const availableGlobalKnowledge = knowledgeCatalog.filter(
    (knowledge) => !boundKnowledgeIds.includes(knowledge.id),
  );
  const normalizedSearchValue = globalSearchValue.trim().toLowerCase();
  const filteredGlobalKnowledge = availableGlobalKnowledge.filter((knowledge) => {
    if (!normalizedSearchValue) {
      return true;
    }

    return (
      knowledge.name.toLowerCase().includes(normalizedSearchValue) ||
      knowledge.description.toLowerCase().includes(normalizedSearchValue)
    );
  });
  const isGlobalMode = mode === 'global';
  const confirmLoading = isGlobalMode ? binding : creating;
  const confirmDisabled = isGlobalMode
    ? selectedGlobalKnowledgeIds.length === 0
    : false;

  const handleToggleGlobalKnowledge = (knowledgeId: string) => {
    setSelectedGlobalKnowledgeIds((current) => {
      if (current.includes(knowledgeId)) {
        return current.filter((id) => id !== knowledgeId);
      }

      return [...current, knowledgeId];
    });
  };

  const handleConfirm = () => {
    if (isGlobalMode) {
      void onBindGlobalKnowledge(selectedGlobalKnowledgeIds);
      return;
    }

    form.submit();
  };

  return (
    <Modal
      title="接入知识库"
      open={open}
      onCancel={onCancel}
      onOk={handleConfirm}
      okText={isGlobalMode ? '绑定到当前项目' : '创建并继续上传'}
      cancelText="取消"
      confirmLoading={confirmLoading}
      okButtonProps={{
        disabled: confirmDisabled,
      }}
      width={840}
      destroyOnHidden
      styles={{ body: { paddingTop: 12 } }}
    >
      <div className="space-y-6">
        <div className="rounded-[24px] border border-slate-200 bg-[linear-gradient(180deg,rgba(248,250,252,0.96),rgba(241,245,249,0.9))] p-5">
          <Typography.Paragraph className="mb-0! text-sm! leading-6! text-slate-600!">
            把团队已经治理好的全局知识库接入到当前项目，或直接新建只属于当前项目的私有知识库。前者复用全局资产，后者用于沉淀项目专属上下文。
          </Typography.Paragraph>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <Segmented<ProjectKnowledgeAccessMode>
              value={mode}
              onChange={(value) => {
                setMode(value);
              }}
              options={[
                {
                  label: '引入全局知识库',
                  value: 'global',
                },
                {
                  label: '新建项目私有知识库',
                  value: 'project',
                },
              ]}
            />
            <Typography.Text className="text-xs text-slate-400">
              当前已绑定 {boundKnowledgeIds.length} 个全局知识库
            </Typography.Text>
          </div>
        </div>

        {isGlobalMode ? (
          <div className="space-y-4">
            <div className="flex flex-col gap-3 rounded-[24px] border border-slate-200 bg-white p-5">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <Typography.Title level={5} className="mb-1! text-slate-800!">
                    选择要接入的全局知识库
                  </Typography.Title>
                  <Typography.Paragraph className="mb-0! text-sm! text-slate-500!">
                    项目页只读查看这些文档；编辑、删除和运维仍然回到全局知识库治理页。
                  </Typography.Paragraph>
                </div>

                <Button icon={<LinkOutlined />} onClick={onOpenGlobalManagement}>
                  打开全局知识库
                </Button>
              </div>

              <Input
                value={globalSearchValue}
                onChange={(event) => setGlobalSearchValue(event.target.value)}
                placeholder="搜索全局知识库名称或描述"
                prefix={<SearchOutlined className="text-slate-400" />}
                allowClear
              />

              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                <Tag color="blue">可批量绑定</Tag>
                <span>本次已选择 {selectedGlobalKnowledgeIds.length} 个</span>
                <span>当前仍有 {availableGlobalKnowledge.length} 个可接入</span>
              </div>
            </div>

            {knowledgeCatalogLoading ? (
              <div className="rounded-[24px] border border-dashed border-slate-200 bg-slate-50/70 px-6 py-10">
                <Typography.Paragraph className="mb-0! text-center text-sm! text-slate-500!">
                  正在加载可接入的全局知识库...
                </Typography.Paragraph>
              </div>
            ) : availableGlobalKnowledge.length === 0 ? (
              <div className="rounded-[24px] border border-dashed border-slate-200 bg-slate-50/70 px-6 py-10">
                <Empty
                  description="当前没有可新增绑定的全局知识库。"
                >
                  <Button onClick={onOpenGlobalManagement}>前往全局知识库页</Button>
                </Empty>
              </div>
            ) : filteredGlobalKnowledge.length === 0 ? (
              <div className="rounded-[24px] border border-dashed border-slate-200 bg-slate-50/70 px-6 py-10">
                <Empty description="没有匹配的全局知识库，试试换个关键词。" />
              </div>
            ) : (
              <div className="grid gap-3 md:grid-cols-2">
                {filteredGlobalKnowledge.map((knowledge) => {
                  const selected = selectedGlobalKnowledgeIds.includes(knowledge.id);
                  const statusMeta = INDEX_STATUS_META[knowledge.indexStatus];

                  return (
                    <button
                      key={knowledge.id}
                      type="button"
                      onClick={() => handleToggleGlobalKnowledge(knowledge.id)}
                      className={[
                        'group rounded-[24px] border p-4 text-left transition',
                        selected
                          ? 'border-sky-300 bg-sky-50/70 shadow-[0_14px_28px_rgba(14,116,144,0.08)]'
                          : 'border-slate-200 bg-white hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-[0_14px_28px_rgba(15,23,42,0.06)]',
                      ].join(' ')}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <Typography.Text className="text-base font-semibold text-slate-800!">
                              {knowledge.name}
                            </Typography.Text>
                            <Tag color={statusMeta.color}>{statusMeta.label}</Tag>
                          </div>
                          <Typography.Paragraph className="mb-0! mt-2 text-sm! leading-6! text-slate-500!">
                            {knowledge.description || '暂无描述'}
                          </Typography.Paragraph>
                        </div>

                        <span
                          className={[
                            'flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-xs font-semibold transition',
                            selected
                              ? 'border-sky-300 bg-sky-500 text-white'
                              : 'border-slate-200 bg-slate-50 text-slate-400',
                          ].join(' ')}
                        >
                          {selected ? '已选' : '可选'}
                        </span>
                      </div>

                      <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-xs text-slate-500">
                        <span>文档数：{knowledge.documentCount}</span>
                        <span>分块数：{knowledge.chunkCount}</span>
                        <span>维护方：{knowledge.maintainerName ?? knowledge.createdByName ?? '未指定'}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4 rounded-[24px] border border-slate-200 bg-white p-5">
            <div className="flex items-start gap-3">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[18px] border border-emerald-100 bg-emerald-50 text-[20px] text-emerald-600">
                <FolderAddOutlined />
              </span>
              <div className="min-w-0">
                <Typography.Title level={5} className="mb-1! text-slate-800!">
                  新建当前项目的私有知识库
                </Typography.Title>
                <Typography.Paragraph className="mb-0! text-sm! leading-6! text-slate-500!">
                  创建完成后会立刻进入上传来源流程。项目私有知识只在当前项目内消费，不会出现在全局知识库列表中。
                </Typography.Paragraph>
              </div>
            </div>

            <Form<ProjectKnowledgeFormValues>
              form={form}
              layout="vertical"
              onFinish={(values) => void onCreateProjectKnowledge(values)}
            >
              <Form.Item
                name="name"
                label="知识库名称"
                rules={[
                  {
                    required: true,
                    message: '请输入知识库名称',
                  },
                ]}
              >
                <Input maxLength={80} placeholder="例如：项目执行手册" />
              </Form.Item>

              <Form.Item name="description" label="描述">
                <Input.TextArea
                  autoSize={{ minRows: 4, maxRows: 6 }}
                  maxLength={240}
                  placeholder="描述这份项目私有知识的内容边界、维护职责和使用场景。"
                />
              </Form.Item>

              <div className="rounded-[20px] border border-dashed border-emerald-200 bg-emerald-50/60 px-4 py-3 text-sm text-emerald-700">
                创建成功后会直接弹出上传来源面板，继续完成文档导入。
              </div>
            </Form>
          </div>
        )}

        <div className="rounded-[20px] border border-slate-200 bg-slate-50/70 px-4 py-3 text-xs leading-6 text-slate-500">
          <DatabaseOutlined className="mr-2 text-slate-400" />
          全局知识适合跨项目复用；项目私有知识适合当前项目的执行手册、会议纪要、里程碑资料和上下文沉淀。
        </div>
      </div>
    </Modal>
  );
};
