import {
  DatabaseOutlined,
  FolderAddOutlined,
  LinkOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import type { KnowledgeSummaryResponse } from '@api/knowledge';
import { Button, Empty, Form, Input, Modal, Pagination, Tag, Typography } from 'antd';
import { useState } from 'react';
import { KNOWLEDGE_INDEX_STATUS_META } from '@pages/knowledge/knowledgeDomain.shared';
import { tp } from '../project.i18n';

export interface ProjectKnowledgeFormValues {
  name: string;
  description?: string;
}

export type ProjectKnowledgeAccessMode = 'global' | 'project';

interface ProjectKnowledgeAccessModalProps {
  open: boolean;
  initialMode: ProjectKnowledgeAccessMode;
  allowedModes?: ProjectKnowledgeAccessMode[];
  knowledgeCatalog: KnowledgeSummaryResponse[];
  knowledgeCatalogLoading: boolean;
  boundKnowledgeIds: string[];
  binding: boolean;
  creating: boolean;
  createProjectTitle?: string;
  createProjectDescription?: string;
  createProjectHelperText?: string;
  createProjectSubmitText?: string;
  onCancel: () => void;
  onBindGlobalKnowledge: (knowledgeIds: string[]) => void | Promise<void>;
  onCreateProjectKnowledge: (
    values: ProjectKnowledgeFormValues,
  ) => void | Promise<void>;
  onOpenGlobalManagement: () => void;
}

const GLOBAL_KNOWLEDGE_PAGE_SIZE = 4;

export const ProjectKnowledgeAccessModal = ({
  open,
  initialMode,
  allowedModes,
  knowledgeCatalog,
  knowledgeCatalogLoading,
  boundKnowledgeIds,
  binding,
  creating,
  createProjectTitle,
  createProjectDescription,
  createProjectHelperText,
  createProjectSubmitText = tp('resources.access.createSubmitDefault'),
  onCancel,
  onBindGlobalKnowledge,
  onCreateProjectKnowledge,
  onOpenGlobalManagement,
}: ProjectKnowledgeAccessModalProps) => {
  const availableGlobalKnowledge = knowledgeCatalog.filter(
    (knowledge) => !boundKnowledgeIds.includes(knowledge.id),
  );
  const modeOptions = [
    {
      value: 'global' as const,
      icon: <LinkOutlined />,
      title: tp('resources.access.globalTitle'),
      description: tp('resources.access.globalDescription'),
      helper: tp('resources.access.globalHelper', {
        bound: boundKnowledgeIds.length,
        available: availableGlobalKnowledge.length,
      }),
      accentClassName: {
        wrapper:
          'border-sky-300 bg-[linear-gradient(180deg,rgba(240,249,255,0.98),rgba(224,242,254,0.84))] shadow-[0_20px_40px_rgba(14,116,144,0.12)]',
        icon: 'border-sky-200 bg-white text-sky-600',
        badge: 'border-sky-200 bg-white/90 text-sky-700',
        helper: 'text-sky-700',
      },
    },
    {
      value: 'project' as const,
      icon: <FolderAddOutlined />,
      title: tp('resources.access.projectTitle'),
      description:
        createProjectDescription ??
        tp('resources.access.projectDescription'),
      helper:
        createProjectHelperText ??
        tp('resources.access.projectHelper'),
      accentClassName: {
        wrapper:
          'border-emerald-300 bg-[linear-gradient(180deg,rgba(236,253,245,0.98),rgba(209,250,229,0.84))] shadow-[0_20px_40px_rgba(5,150,105,0.12)]',
        icon: 'border-emerald-200 bg-white text-emerald-600',
        badge: 'border-emerald-200 bg-white/90 text-emerald-700',
        helper: 'text-emerald-700',
      },
    },
  ];
  const visibleModeOptions = modeOptions.filter((option) =>
    allowedModes?.includes(option.value) ?? true,
  );
  const resolvedInitialMode =
    visibleModeOptions.find((option) => option.value === initialMode)?.value ??
    visibleModeOptions[0]?.value ??
    'project';
  const [mode, setMode] = useState<ProjectKnowledgeAccessMode>(resolvedInitialMode);
  const [globalSearchValue, setGlobalSearchValue] = useState('');
  const [globalKnowledgePage, setGlobalKnowledgePage] = useState(1);
  const [selectedGlobalKnowledgeIds, setSelectedGlobalKnowledgeIds] = useState<string[]>([]);
  const [form] = Form.useForm<ProjectKnowledgeFormValues>();

  const resetTransientState = (
    nextMode: ProjectKnowledgeAccessMode = resolvedInitialMode,
  ) => {
    form.resetFields();
    setGlobalSearchValue('');
    setGlobalKnowledgePage(1);
    setSelectedGlobalKnowledgeIds([]);
    setMode(
      visibleModeOptions.find((option) => option.value === nextMode)?.value ??
        resolvedInitialMode,
    );
  };

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
  const totalGlobalKnowledgePages = Math.max(
    1,
    Math.ceil(filteredGlobalKnowledge.length / GLOBAL_KNOWLEDGE_PAGE_SIZE),
  );
  const currentGlobalKnowledgePage = Math.min(
    globalKnowledgePage,
    totalGlobalKnowledgePages,
  );
  const pagedGlobalKnowledge = filteredGlobalKnowledge.slice(
    (currentGlobalKnowledgePage - 1) * GLOBAL_KNOWLEDGE_PAGE_SIZE,
    currentGlobalKnowledgePage * GLOBAL_KNOWLEDGE_PAGE_SIZE,
  );
  const isGlobalMode = mode === 'global';
  const confirmLoading = isGlobalMode ? binding : creating;
  const confirmDisabled = isGlobalMode
    ? selectedGlobalKnowledgeIds.length === 0
    : false;
  const showModeSwitcher = visibleModeOptions.length > 1;
  const accessModeDescription = showModeSwitcher
    ? tp('resources.access.modeDescription')
    : isGlobalMode
      ? tp('resources.access.globalPickerDescription')
      : createProjectDescription ??
        tp('resources.access.defaultCreateDescription');

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
      title={tp('resources.access.title')}
      open={open}
      onCancel={onCancel}
      afterOpenChange={(nextOpen) => {
        if (nextOpen) {
          resetTransientState(resolvedInitialMode);
        }
      }}
      onOk={handleConfirm}
      okText={isGlobalMode ? tp('resources.access.okGlobal') : createProjectSubmitText}
      cancelText={tp('resources.access.cancel')}
      confirmLoading={confirmLoading}
      okButtonProps={{
        disabled: confirmDisabled,
      }}
      width={840}
      destroyOnHidden
      styles={{ body: { paddingTop: 12 } }}
    >
      <div className="space-y-6">
        <div className="rounded-3xl border border-slate-200 bg-[linear-gradient(180deg,rgba(248,250,252,0.96),rgba(241,245,249,0.9))] p-4">
          <div className="flex flex-col gap-2">
            <Typography.Text className="text-caption font-semibold uppercase tracking-[0.24em] text-slate-400!">
              {tp('resources.access.modeLabel')}
            </Typography.Text>
            <Typography.Paragraph className="mb-0! text-sm! leading-6! text-slate-600!">
              {accessModeDescription}
            </Typography.Paragraph>
          </div>

          {showModeSwitcher ? (
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {visibleModeOptions.map((option) => {
                const selected = mode === option.value;

                return (
                  <button
                    key={option.value}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => setMode(option.value)}
                    className={[
                      'group rounded-card-lg border px-4 py-3.5 text-left transition',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300 focus-visible:ring-offset-2',
                      selected
                        ? option.accentClassName.wrapper
                        : 'border-slate-200 bg-white hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-[0_16px_32px_rgba(15,23,42,0.06)]',
                    ].join(' ')}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <span
                        className={[
                          'flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border text-lg transition',
                          selected
                            ? option.accentClassName.icon
                            : 'border-slate-200 bg-slate-50 text-slate-500',
                        ].join(' ')}
                      >
                        {option.icon}
                      </span>

                      <span
                        className={[
                          'rounded-full border px-3 py-1 text-xs font-medium transition',
                          selected
                            ? option.accentClassName.badge
                            : 'border-slate-200 bg-slate-50 text-slate-500',
                        ].join(' ')}
                      >
                        {selected ? tp('resources.access.switchCurrent') : tp('resources.access.switchClick')}
                      </span>
                    </div>

                    <div className="mt-3 space-y-1.5">
                      <Typography.Title level={5} className="mb-0! text-lg! text-slate-800!">
                        {option.title}
                      </Typography.Title>
                      <Typography.Paragraph className="mb-0! text-label! leading-5! text-slate-500!">
                        {option.description}
                      </Typography.Paragraph>
                    </div>

                    <div
                      className={[
                        'mt-3 rounded-2xl border px-3.5 py-2 text-xs leading-5 transition',
                        selected
                          ? option.accentClassName.badge
                          : 'border-slate-200 bg-slate-50 text-slate-500',
                      ].join(' ')}
                    >
                      <span
                        className={[
                          'font-medium',
                          selected ? option.accentClassName.helper : '',
                        ].join(' ')}
                      >
                        {option.helper}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : null}
        </div>

        {isGlobalMode ? (
          <div className="space-y-4">
            <div className="flex flex-col gap-3 rounded-3xl border border-slate-200 bg-white p-5">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <Typography.Title level={5} className="mb-1! text-slate-800!">
                    {tp('resources.access.globalPickerTitle')}
                  </Typography.Title>
                  <Typography.Paragraph className="mb-0! text-sm! text-slate-500!">
                    {tp('resources.access.globalPickerDescription')}
                  </Typography.Paragraph>
                </div>

                <Button icon={<LinkOutlined />} onClick={onOpenGlobalManagement}>
                  {tp('resources.access.openGlobal')}
                </Button>
              </div>

              <Input
                value={globalSearchValue}
                onChange={(event) => {
                  setGlobalSearchValue(event.target.value);
                  setGlobalKnowledgePage(1);
                }}
                placeholder={tp('resources.access.searchPlaceholder')}
                prefix={<SearchOutlined className="text-slate-400" />}
                allowClear
              />

              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                <Tag color="blue">{tp('resources.access.batchTag')}</Tag>
                <span>{tp('resources.access.selectedCount', { count: selectedGlobalKnowledgeIds.length })}</span>
                <span>{tp('resources.access.availableCount', { count: availableGlobalKnowledge.length })}</span>
              </div>
            </div>

            {knowledgeCatalogLoading ? (
              <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50/70 px-6 py-10">
                <Typography.Paragraph className="mb-0! text-center text-sm! text-slate-500!">
                  {tp('resources.access.loading')}
                </Typography.Paragraph>
              </div>
            ) : availableGlobalKnowledge.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50/70 px-6 py-10">
                <Empty
                  description={tp('resources.access.empty')}
                >
                  <Button onClick={onOpenGlobalManagement}>{tp('resources.access.openGlobalPage')}</Button>
                </Empty>
              </div>
            ) : filteredGlobalKnowledge.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50/70 px-6 py-10">
                <Empty description={tp('resources.access.emptyFiltered')} />
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid gap-3 md:grid-cols-2">
                  {pagedGlobalKnowledge.map((knowledge) => {
                    const selected = selectedGlobalKnowledgeIds.includes(knowledge.id);
                    const statusMeta = KNOWLEDGE_INDEX_STATUS_META[knowledge.indexStatus];

                    return (
                      <button
                        key={knowledge.id}
                        type="button"
                        onClick={() => handleToggleGlobalKnowledge(knowledge.id)}
                        className={[
                          'group rounded-3xl border p-4 text-left transition',
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
                              {knowledge.description || tp('resources.access.noDescription')}
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
                            {selected ? tp('resources.access.selected') : tp('resources.access.selectable')}
                          </span>
                        </div>

                        <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-xs text-slate-500">
                          <span>{tp('resources.access.documentCount', { count: knowledge.documentCount })}</span>
                          <span>{tp('resources.access.chunkCount', { count: knowledge.chunkCount })}</span>
                          <span>{tp('resources.access.maintainer', { value: knowledge.maintainerName ?? knowledge.createdByName ?? tp('resources.item.unassigned') })}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {filteredGlobalKnowledge.length > GLOBAL_KNOWLEDGE_PAGE_SIZE ? (
                  <div className="flex justify-center border-t border-slate-100 pt-3">
                    <Pagination
                      size="small"
                      current={currentGlobalKnowledgePage}
                      pageSize={GLOBAL_KNOWLEDGE_PAGE_SIZE}
                      total={filteredGlobalKnowledge.length}
                      showSizeChanger={false}
                      showLessItems
                      onChange={(page) => setGlobalKnowledgePage(page)}
                    />
                  </div>
                ) : null}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4 rounded-3xl border border-slate-200 bg-white p-5">
            <div className="flex items-start gap-3">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-panel border border-emerald-100 bg-emerald-50 text-xl text-emerald-600">
                <FolderAddOutlined />
              </span>
              <div className="min-w-0">
                <Typography.Title level={5} className="mb-1! text-slate-800!">
                  {createProjectTitle ?? tp('resources.access.defaultCreateTitle')}
                </Typography.Title>
                <Typography.Paragraph className="mb-0! text-sm! leading-6! text-slate-500!">
                  {createProjectDescription ??
                    tp('resources.access.defaultCreateDescription')}
                </Typography.Paragraph>
              </div>
            </div>

            <Form<ProjectKnowledgeFormValues>
              form={form}
              layout="vertical"
              initialValues={{
                name: '',
                description: '',
              }}
              onFinish={(values) => void onCreateProjectKnowledge(values)}
            >
              <Form.Item
                name="name"
                label={tp('resources.access.formName')}
                rules={[
                  {
                    required: true,
                    message: tp('resources.access.formNameRequired'),
                  },
                ]}
              >
                <Input maxLength={80} placeholder={tp('resources.access.formNamePlaceholder')} />
              </Form.Item>

              <Form.Item name="description" label={tp('resources.access.formDescription')}>
                <Input.TextArea
                  autoSize={{ minRows: 4, maxRows: 6 }}
                  maxLength={240}
                  placeholder={tp('resources.access.formDescriptionPlaceholder')}
                />
              </Form.Item>

              <div className="rounded-card border border-dashed border-emerald-200 bg-emerald-50/60 px-4 py-3 text-sm text-emerald-700">
                {createProjectHelperText ??
                  tp('resources.access.createContinueHint')}
              </div>
            </Form>
          </div>
        )}

        <div className="rounded-card border border-slate-200 bg-slate-50/70 px-4 py-3 text-xs leading-6 text-slate-500">
          <DatabaseOutlined className="mr-2 text-slate-400" />
          {tp('resources.access.footerHint')}
        </div>
      </div>
    </Modal>
  );
};
