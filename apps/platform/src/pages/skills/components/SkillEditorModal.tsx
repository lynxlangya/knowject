import {
  CloseOutlined,
  EyeOutlined,
  FormOutlined,
  MessageOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import {
  Button,
  Drawer,
  Input,
  Popconfirm,
  Select,
  Space,
  Spin,
  Tabs,
  Typography,
} from 'antd';
import type { SkillCategory, SkillDetailResponse } from '@api/skills';
import type { Dispatch, SetStateAction } from 'react';
import { useTranslation } from 'react-i18next';
import {
  getCategoryOptions,
  getEditorTabs,
  getStatusOptions,
} from '../constants/skillsManagement.constants';
import {
  getSkillDefinitionGoalSection,
  getSkillDefinitionListSections,
  getSkillFollowupStrategyOptions,
  type SkillEditorDraft,
} from '../skillDefinition';
import { tp } from '../skills.i18n';
import type {
  EditorMode,
  SkillAuthoringSessionState,
} from '../types/skillsManagement.types';
import { SkillAuthoringConversationTab } from './SkillAuthoringConversationTab';
import { SkillDefinitionListField } from './SkillDefinitionListField';
import { SkillMarkdownPreview } from './SkillMarkdownPreview';

interface SkillEditorModalProps {
  editorMode: EditorMode;
  editorTabKey: 'conversation' | 'editor' | 'preview';
  onEditorTabKeyChange: (key: 'conversation' | 'editor' | 'preview') => void;
  editingSkill: SkillDetailResponse | null;
  editorDraft: SkillEditorDraft;
  onEditorDraftChange: Dispatch<SetStateAction<SkillEditorDraft>>;
  editorMarkdownPreview: string;
  editorLoading: boolean;
  editorSubmitting: boolean;
  authoringSession?: SkillAuthoringSessionState;
  authoringSubmitting?: boolean;
  onAuthoringScenarioChange?: (value: SkillCategory) => void;
  onAuthoringTargetsChange?: (value: string[]) => void;
  onAuthoringConfirmScope?: () => void;
  onAuthoringAnswerChange?: (value: string) => void;
  onAuthoringSubmitAnswer?: () => void;
  onAuthoringConfirmDraft?: () => void;
  onAuthoringReset?: () => void;
  onCancel: () => void;
  onSubmit: () => void;
}

const FALLBACK_AUTHORING_SESSION: SkillAuthoringSessionState = {
  stage: 'scope_selecting',
  scope: {
    scenario: null,
    targets: [],
  },
  messages: [],
  questionCount: 0,
  currentSummary: '',
  structuredDraft: null,
  readyForConfirmation: false,
  pendingAnswer: '',
};

export const SkillEditorModal = ({
  editorMode,
  editorTabKey,
  onEditorTabKeyChange,
  editingSkill,
  editorDraft,
  onEditorDraftChange,
  editorMarkdownPreview,
  editorLoading,
  editorSubmitting,
  authoringSession = FALLBACK_AUTHORING_SESSION,
  authoringSubmitting = false,
  onAuthoringScenarioChange = () => undefined,
  onAuthoringTargetsChange = () => undefined,
  onAuthoringConfirmScope = () => undefined,
  onAuthoringAnswerChange = () => undefined,
  onAuthoringSubmitAnswer = () => undefined,
  onAuthoringConfirmDraft = () => undefined,
  onAuthoringReset = () => undefined,
  onCancel,
  onSubmit,
}: SkillEditorModalProps) => {
  const { t } = useTranslation('pages');
  const editorTabs = getEditorTabs(editorMode);
  const categoryOptions = getCategoryOptions();
  const statusOptions = getStatusOptions();
  const skillDefinitionGoalSection = getSkillDefinitionGoalSection();
  const skillDefinitionListSections = getSkillDefinitionListSections();
  const skillFollowupStrategyOptions = getSkillFollowupStrategyOptions();
  const drawerTitle =
    editorMode === 'create'
      ? t('skills.editor.createTitle')
      : t('skills.editor.editTitle');
  const editorSectionTitle =
    editorTabs.find((tab) => tab.key === 'editor')?.label ??
    t('skills.tabs.editor');
  const getTabIcon = (key: 'conversation' | 'editor' | 'preview') => {
    if (key === 'conversation') {
      return <MessageOutlined />;
    }
    if (key === 'editor') {
      return <FormOutlined />;
    }
    return <EyeOutlined />;
  };

  return (
    <Drawer
      closable={false}
      title={
        <div className="flex items-center justify-between gap-4">
          <Typography.Title
            level={2}
            className="mb-0! font-display text-xl! font-bold! tracking-[-0.04em] text-emerald-600!"
          >
            {drawerTitle}
          </Typography.Title>
          <Button
            type="text"
            aria-label={t('skills.editor.cancel')}
            icon={<CloseOutlined className="text-xl text-slate-500" />}
            onClick={onCancel}
            className="flex h-11 w-11 items-center justify-center rounded-full border border-slate-200/70 bg-white text-slate-500 shadow-none hover:border-slate-300 hover:bg-slate-50!"
          />
        </div>
      }
      open={editorMode !== null}
      placement="right"
      size="large"
      onClose={onCancel}
      destroyOnHidden
      classNames={{
        header: 'border-b border-slate-200/80 bg-white px-8 py-6',
        body: 'bg-[#eef4fa] p-0!',
        footer:
          'border-t border-slate-200/80 bg-white/95 px-8 py-5 backdrop-blur-sm',
      }}
      footer={
        editorMode === 'create' && editorTabKey === 'conversation' ? null : (
          <div className="flex flex-wrap items-center justify-end gap-3">
            <Space wrap>
              <Button
                onClick={onCancel}
                disabled={editorSubmitting}
                className="rounded-full border-slate-200 px-5 text-slate-600 shadow-none"
              >
                {t('skills.editor.cancel')}
              </Button>
              <Button
                type="primary"
                loading={editorSubmitting}
                onClick={onSubmit}
                className="rounded-full px-6 shadow-none"
              >
                {editorMode === 'create'
                  ? t('skills.editor.createDraft')
                  : t('skills.editor.save')}
              </Button>
            </Space>
          </div>
        )
      }
    >
      {editorLoading ? (
        <div className="flex min-h-80 items-center justify-center">
          <Spin />
        </div>
      ) : (
        <div className="relative h-full">
          <Tabs
            tabPlacement="start"
            className="h-full [&_.ant-tabs-content]:h-full [&_.ant-tabs-content-holder]:h-full [&_.ant-tabs-content-holder]:min-h-0 [&_.ant-tabs-content-holder]:bg-[#eef4fa] [&_.ant-tabs-ink-bar]:hidden [&_.ant-tabs-left]:h-full [&_.ant-tabs-nav]:m-0! [&_.ant-tabs-nav]:w-16 [&_.ant-tabs-nav]:border-r [&_.ant-tabs-nav]:border-slate-200/80 [&_.ant-tabs-nav]:bg-[#eaeff5] [&_.ant-tabs-nav]:px-1.5 [&_.ant-tabs-nav]:py-4 [&_.ant-tabs-nav]:pb-22 [&_.ant-tabs-nav-list]:w-full [&_.ant-tabs-tab]:m-0! [&_.ant-tabs-tab]:w-full [&_.ant-tabs-tab]:p-0 [&_.ant-tabs-tab-btn]:w-full [&_.ant-tabs-tab-active_.skill-rail-item]:opacity-100 [&_.ant-tabs-tab-active_.skill-rail-icon]:bg-linear-to-br [&_.ant-tabs-tab-active_.skill-rail-icon]:from-emerald-500 [&_.ant-tabs-tab-active_.skill-rail-icon]:to-emerald-600 [&_.ant-tabs-tab-active_.skill-rail-icon]:text-white [&_.ant-tabs-tab-active_.skill-rail-icon]:shadow-[0_6px_16px_rgba(16,185,129,0.22)] [&_.ant-tabs-tab-active_.skill-rail-label]:text-emerald-600 [&_.ant-tabs-tabpane]:h-full [&_.ant-tabs-tabpane]:pl-0!"
            activeKey={editorTabKey}
            onChange={(activeKey) => {
              onEditorTabKeyChange(activeKey as 'conversation' | 'editor' | 'preview');
            }}
            items={editorTabs.map((tab) => ({
              key: tab.key,
              label: (
                <div className="skill-rail-item flex w-full flex-col items-center gap-1.5 px-1 py-3 text-center opacity-50 transition">
                  <span className="skill-rail-icon flex h-9 w-9 items-center justify-center rounded-xl bg-white text-base text-slate-400 shadow-[0_4px_12px_rgba(148,163,184,0.1)] transition">
                    {getTabIcon(tab.key)}
                  </span>
                  <span className="skill-rail-label text-[10px] font-medium tracking-[0.01em] text-slate-400 transition">
                    {tab.label}
                  </span>
                </div>
              ),
              children:
                tab.key === 'conversation' ? (
                  <SkillAuthoringConversationTab
                    session={authoringSession}
                    authoringSubmitting={authoringSubmitting}
                    onScenarioChange={onAuthoringScenarioChange}
                    onTargetsChange={onAuthoringTargetsChange}
                    onConfirmScope={onAuthoringConfirmScope}
                    onAnswerChange={onAuthoringAnswerChange}
                    onSubmitAnswer={onAuthoringSubmitAnswer}
                    onConfirmDraft={onAuthoringConfirmDraft}
                  />
                ) : tab.key === 'editor' ? (
                  <div className="mx-auto max-w-220 space-y-5 px-8 py-8">
                    <section className="rounded-shell border border-slate-200/80 bg-white px-6 py-6 shadow-card">
                      <div className="mb-4 border-b border-slate-100 pb-4">
                        <Typography.Text className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                          {editorSectionTitle}
                        </Typography.Text>
                        <Typography.Paragraph className="mb-0! mt-1.5 text-sm! leading-6! text-slate-500!">
                          {t('skills.editor.validationPreview')}
                        </Typography.Paragraph>
                      </div>

                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                          <Typography.Text className="text-sm font-medium text-slate-700">
                            {t('skills.editor.fields.name')}
                          </Typography.Text>
                          <Input
                            className="rounded-xl border-slate-200 bg-slate-50/70"
                            value={editorDraft.name}
                            placeholder={t('skills.editor.placeholders.name')}
                            onChange={(event) => {
                              onEditorDraftChange((current) => ({
                                ...current,
                                name: event.target.value,
                              }));
                            }}
                          />
                        </div>

                        <div className="space-y-2">
                          <Typography.Text className="text-sm font-medium text-slate-700">
                            {t('skills.editor.fields.owner')}
                          </Typography.Text>
                          <Input
                            className="rounded-xl border-slate-200 bg-slate-50/70"
                            value={editorDraft.owner}
                            placeholder={t('skills.editor.placeholders.owner')}
                            onChange={(event) => {
                              onEditorDraftChange((current) => ({
                                ...current,
                                owner: event.target.value,
                              }));
                            }}
                          />
                        </div>
                      </div>

                      <div className="mt-4 space-y-2">
                        <Typography.Text className="text-sm font-medium text-slate-700">
                          {t('skills.editor.fields.description')}
                        </Typography.Text>
                        <Input.TextArea
                          className="rounded-xl border-slate-200 bg-slate-50/70"
                          value={editorDraft.description}
                          autoSize={{ minRows: 3, maxRows: 5 }}
                          placeholder={t(
                            'skills.editor.placeholders.description',
                          )}
                          onChange={(event) => {
                            onEditorDraftChange((current) => ({
                              ...current,
                              description: event.target.value,
                            }));
                          }}
                        />
                      </div>

                      <div className="mt-4 grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                          <Typography.Text className="text-sm font-medium text-slate-700">
                            {t('skills.editor.fields.category')}
                          </Typography.Text>
                          <Select
                            className="w-full"
                            value={editorDraft.category}
                            options={categoryOptions}
                            onChange={(value) => {
                              onEditorDraftChange((current) => ({
                                ...current,
                                category: value,
                              }));
                            }}
                          />
                        </div>

                        {editorMode === 'edit' &&
                        editingSkill?.source === 'team' ? (
                          <div className="space-y-2">
                            <Typography.Text className="text-sm font-medium text-slate-700">
                              {t('skills.status.title')}
                            </Typography.Text>
                            <Select
                              className="w-full"
                              value={editorDraft.status}
                              options={statusOptions}
                              onChange={(value) => {
                                onEditorDraftChange((current) => ({
                                  ...current,
                                  status: value,
                                }));
                              }}
                            />
                          </div>
                        ) : null}
                      </div>
                    </section>

                    <section className="rounded-shell border border-slate-200/80 bg-white px-6 py-6 shadow-card">
                      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_15rem]">
                        <div className="space-y-2">
                          <Typography.Text className="text-sm font-medium text-slate-700">
                            {skillDefinitionGoalSection.label}
                          </Typography.Text>
                          <Input.TextArea
                            className="rounded-xl border-slate-200 bg-slate-50/70"
                            value={editorDraft.definition.goal}
                            autoSize={{ minRows: 4, maxRows: 6 }}
                            placeholder={skillDefinitionGoalSection.placeholder}
                            onChange={(event) => {
                              onEditorDraftChange((current) => ({
                                ...current,
                                definition: {
                                  ...current.definition,
                                  goal: event.target.value,
                                },
                              }));
                            }}
                          />
                        </div>

                        <div className="space-y-2">
                          <Typography.Text className="text-sm font-medium text-slate-700">
                            {t(
                              'skills.definition.followupQuestionsStrategy.label',
                            )}
                          </Typography.Text>
                          <Select
                            className="w-full"
                            value={
                              editorDraft.definition.followupQuestionsStrategy
                            }
                            options={skillFollowupStrategyOptions}
                            onChange={(value) => {
                              onEditorDraftChange((current) => ({
                                ...current,
                                definition: {
                                  ...current.definition,
                                  followupQuestionsStrategy: value,
                                },
                              }));
                            }}
                          />
                        </div>
                      </div>
                    </section>

                    <section className="rounded-shell border border-slate-200/80 bg-white px-6 py-6 shadow-card">
                      <div className="grid gap-4 xl:grid-cols-2">
                        {skillDefinitionListSections.map((section) => (
                          <SkillDefinitionListField
                            key={section.key}
                            label={section.label}
                            addLabel={section.addLabel}
                            placeholder={section.placeholder}
                            value={editorDraft.definition[section.key]}
                            onChange={(value) => {
                              onEditorDraftChange((current) => ({
                                ...current,
                                definition: {
                                  ...current.definition,
                                  [section.key]: value,
                                },
                              }));
                            }}
                          />
                        ))}
                      </div>
                    </section>
                  </div>
                ) : (
                  <SkillMarkdownPreview markdown={editorMarkdownPreview} />
                ),
            }))}
          />
          {editorMode === 'create' ? (
            <div className="pointer-events-none absolute inset-x-0 bottom-4 left-0 z-10 flex w-16 justify-center px-1.5">
              <Popconfirm
                title={tp('authoring.resetConfirm.title')}
                description={tp('authoring.resetConfirm.description')}
                okText={tp('authoring.resetConfirm.confirm')}
                cancelText={t('skills.editor.cancel')}
                placement="rightBottom"
                onConfirm={onAuthoringReset}
              >
                <Button
                  type="text"
                  aria-label={tp('authoring.actions.reset')}
                  icon={<ReloadOutlined className="text-[18px]" />}
                  className="pointer-events-auto flex h-10 w-10 items-center justify-center rounded-full border border-transparent px-0 py-0 text-rose-300 shadow-none hover:border-rose-100 hover:bg-rose-50/80! hover:text-rose-400!"
                />
              </Popconfirm>
            </div>
          ) : null}
        </div>
      )}
    </Drawer>
  );
};
