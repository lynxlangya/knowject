import { Button, Input, Select, Typography } from 'antd';
import type { SkillCategory } from '@api/skills';
import { useTranslation } from 'react-i18next';
import { getAuthoringScopeTargetOptions, getCategoryOptions } from '../constants/skillsManagement.constants';
import type { SkillAuthoringSessionState } from '../types/skillsManagement.types';

interface SkillAuthoringConversationTabProps {
  session: SkillAuthoringSessionState;
  onScenarioChange: (value: SkillCategory) => void;
  onTargetsChange: (value: string[]) => void;
  onAnswerChange: (value: string) => void;
  onSubmitAnswer: () => void;
  onConfirmDraft: () => void;
}

export const SkillAuthoringConversationTab = ({
  session,
  onScenarioChange,
  onTargetsChange,
  onAnswerChange,
  onSubmitAnswer,
  onConfirmDraft,
}: SkillAuthoringConversationTabProps) => {
  const { t } = useTranslation('pages');
  const categoryOptions = getCategoryOptions();
  const scopeTargetOptions = getAuthoringScopeTargetOptions();
  const authoringSubmitting = session.stage === 'synthesizing';
  const hasConfirmedScope = Boolean(
    session.stage !== 'scope_selecting' &&
    session.scope.scenario &&
    session.scope.targets.length > 0,
  );
  const canContinue = hasConfirmedScope && session.pendingAnswer.trim().length > 0;
  const introMessage = session.messages[0]?.content ?? t('skills.authoring.intro');
  const conversationMessages =
    session.messages.length > 0
      ? session.messages
      : [
        {
          role: 'assistant' as const,
          content: introMessage,
        },
      ];

  return (
    <div className="flex h-full min-h-0 flex-col bg-[#eef4fa]">
      <section className="border-b border-slate-200/80 bg-white px-8 py-8">
        <div className="mx-auto grid max-w-245 grid-cols-1 gap-8 md:grid-cols-2 md:gap-10 lg:gap-14">
          <div className="space-y-3">
            <Typography.Text className="text-[17px] font-semibold tracking-tight text-slate-900">
              {t('skills.authoring.scope.scenario')}
            </Typography.Text>
            <Select
              className="w-full [&_.ant-select-arrow]:text-lg [&_.ant-select-arrow]:text-slate-300 [&_.ant-select-selector]:h-15! [&_.ant-select-selector]:items-center! [&_.ant-select-selector]:rounded-[22px]! [&_.ant-select-selector]:border-slate-200! [&_.ant-select-selector]:bg-white! [&_.ant-select-selector]:px-3! [&_.ant-select-selection-item]:text-[15px]! [&_.ant-select-selection-item]:font-medium! [&_.ant-select-selection-item]:text-slate-700! [&_.ant-select-selection-placeholder]:text-[15px]! [&_.ant-select-selection-placeholder]:text-slate-400!"
              placeholder={t('skills.authoring.scope.placeholders.scenario')}
              value={session.scope.scenario}
              options={categoryOptions}
              popupMatchSelectWidth
              onChange={onScenarioChange}
            />
          </div>

          <div className="space-y-3">
            <Typography.Text className="text-[17px] font-semibold tracking-tight text-slate-900">
              {t('skills.authoring.scope.targets')}
            </Typography.Text>
            <Select
              className="w-full [&_.ant-select-arrow]:text-lg [&_.ant-select-arrow]:text-slate-300 [&_.ant-select-selector]:min-h-15! [&_.ant-select-selector]:rounded-[22px]! [&_.ant-select-selector]:border-slate-200! [&_.ant-select-selector]:bg-white! [&_.ant-select-selector]:px-3! [&_.ant-select-selection-item]:rounded-full! [&_.ant-select-selection-item]:bg-slate-100! [&_.ant-select-selection-item]:px-3! [&_.ant-select-selection-item]:py-0.5! [&_.ant-select-selection-item]:text-xs! [&_.ant-select-selection-item]:font-medium! [&_.ant-select-selection-item]:text-slate-700! [&_.ant-select-selection-overflow]:gap-1.5! [&_.ant-select-selection-overflow]:py-2! [&_.ant-select-selection-placeholder]:text-[15px]! [&_.ant-select-selection-placeholder]:text-slate-400!"
              mode="multiple"
              placeholder={t('skills.authoring.scope.placeholders.targets')}
              value={session.scope.targets}
              options={scopeTargetOptions}
              popupMatchSelectWidth
              maxTagCount="responsive"
              onChange={onTargetsChange}
            />
          </div>
        </div>
      </section>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-8">
        <div className="mx-auto flex max-w-220 flex-col gap-7">
          {conversationMessages.map((message, index) => (
            <div
              key={message.id ?? `${message.role}-${index}`}
              className={message.role === 'user' ? 'flex justify-end' : 'flex justify-start'}
            >
              <div
                className={
                  message.role === 'user'
                    ? 'max-w-[78%] rounded-hero rounded-tr-[10px] bg-[#dff6e6] px-7 py-5 text-[15px] leading-8 text-slate-700 shadow-[0_14px_28px_rgba(34,197,94,0.08)]'
                    : 'max-w-[76%] rounded-hero rounded-tl-[10px] border border-slate-200/80 bg-white px-7 py-5 text-[15px] leading-8 text-slate-700 shadow-[0_12px_28px_rgba(148,163,184,0.12)]'
                }
              >
                {message.content}
              </div>
            </div>
          ))}

          {session.stage === 'synthesizing' ? (
            <div className="flex justify-start">
              <div className="flex max-w-[76%] items-center gap-3 rounded-hero rounded-tl-[10px] border border-slate-200/80 bg-white px-6 py-4 text-[15px] text-slate-600 shadow-[0_12px_28px_rgba(148,163,184,0.12)]">
                <span className="relative flex h-3 w-9 items-center justify-between">
                  <span className="h-2 w-2 rounded-full bg-emerald-500/70 animate-pulse" />
                  <span className="h-2 w-2 rounded-full bg-emerald-500/55 animate-pulse [animation-delay:120ms]" />
                  <span className="h-2 w-2 rounded-full bg-emerald-500/40 animate-pulse [animation-delay:240ms]" />
                </span>
                <span>{t('skills.authoring.synthesizing')}</span>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      <section className="border-t border-slate-200/80 bg-white/92 px-8 py-6 backdrop-blur-sm">
        <div className="mx-auto max-w-220">
          <div className="relative">
            <div className="pointer-events-none absolute inset-3 rounded-shell bg-emerald-100/60 blur-3xl" />
            <div className="relative flex items-end gap-3 rounded-shell border border-slate-200/80 bg-white/95 p-2.5 shadow-[0_22px_42px_rgba(148,163,184,0.2)]">
              <div className="min-w-0 flex-1">
                <Input.TextArea
                  className="rounded-card-lg border-0! bg-transparent! px-4 py-3 shadow-none!"
                  value={authoringSubmitting ? '' : session.pendingAnswer}
                  autoSize={{ minRows: 2, maxRows: 8 }}
                  disabled={!hasConfirmedScope || authoringSubmitting}
                  placeholder={t('skills.authoring.intro')}
                  onChange={(event) => {
                    onAnswerChange(event.target.value);
                  }}
                />
              </div>

              <div className="flex shrink-0 flex-wrap items-center gap-3 p-2">
                {session.readyForConfirmation ? (
                  <Button
                    type="default"
                    onClick={onConfirmDraft}
                    disabled={authoringSubmitting}
                    className="h-12 rounded-card-lg border-slate-200 px-5 text-slate-700 shadow-none"
                  >
                    {t('skills.authoring.actions.confirmDraft')}
                  </Button>
                ) : null}
                <Button
                  type="primary"
                  onClick={onSubmitAnswer}
                  loading={authoringSubmitting}
                  disabled={!canContinue || authoringSubmitting}
                  className="h-12 rounded-card-lg border-0 bg-linear-to-r from-emerald-600 to-emerald-500 px-6 text-base font-semibold shadow-[0_16px_28px_rgba(16,185,129,0.22)]"
                >
                  {t('skills.authoring.actions.continue')}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
