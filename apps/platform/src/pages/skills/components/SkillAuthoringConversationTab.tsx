import { Button, Input, Typography } from "antd";
import { useTranslation } from "react-i18next";
import {
  getAuthoringScopeTargetOptions,
  getCategoryOptions,
} from "../constants/skillsManagement.constants";
import type { SkillAuthoringSessionState } from "../types/skillsManagement.types";

interface SkillAuthoringConversationTabProps {
  session: SkillAuthoringSessionState;
  onAnswerChange: (value: string) => void;
  onSubmitAnswer: () => void;
  onConfirmDraft: () => void;
}

export const SkillAuthoringConversationTab = ({
  session,
  onAnswerChange,
  onSubmitAnswer,
  onConfirmDraft,
}: SkillAuthoringConversationTabProps) => {
  const { t } = useTranslation("pages");
  const categoryOptions = getCategoryOptions();
  const scopeTargetOptions = getAuthoringScopeTargetOptions();
  const authoringSubmitting = session.stage === "synthesizing";
  const canContinue = session.pendingAnswer.trim().length > 0;
  const inferredCategoryLabel =
    categoryOptions.find(
      (option) => option.value === session.currentInference?.category,
    )?.label ?? t("skills.authoring.inference.emptyCategory");
  const inferredTargetLabels = session.currentInference?.contextTargets.length
    ? session.currentInference.contextTargets.map(
        (target) =>
          scopeTargetOptions.find((option) => option.value === target)?.label ??
          target,
      )
    : [t("skills.authoring.inference.emptyTargets")];
  const inferredSummary =
    session.currentSummary.trim() ||
    t("skills.authoring.inference.emptySummary");
  const introMessage =
    session.messages[0]?.content ?? t("skills.authoring.intro");
  const conversationMessages =
    session.messages.length > 0
      ? session.messages
      : [
          {
            role: "assistant" as const,
            content: introMessage,
          },
        ];

  return (
    <div className="flex h-full min-h-0 flex-col bg-[#eef4fa]">
      <section className="border-b border-slate-200/80 bg-white/92 px-8 py-4">
        <div className="mx-auto max-w-245">
          <div className="flex flex-col gap-3 rounded-[18px] border border-slate-200/70 bg-slate-50/70 px-5 py-3 xl:flex-row xl:items-start xl:gap-6">
            <div className="flex items-center gap-2.5 xl:pt-1">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              <Typography.Text className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                {t("skills.authoring.inference.title")}
              </Typography.Text>
            </div>
            <div className="grid min-w-0 flex-1 grid-cols-1 gap-x-6 gap-y-3 md:grid-cols-[140px_220px_minmax(0,1fr)]">
              <div className="min-w-0">
                <Typography.Text className="text-[11px] font-medium uppercase tracking-[0.08em] text-slate-400">
                  {t("skills.authoring.inference.category")}
                </Typography.Text>
                <div className="mt-1 text-[14px] font-medium leading-6 text-slate-700">
                  {inferredCategoryLabel}
                </div>
              </div>

              <div className="min-w-0">
                <Typography.Text className="text-[11px] font-medium uppercase tracking-[0.08em] text-slate-400">
                  {t("skills.authoring.inference.targets")}
                </Typography.Text>
                <div className="mt-1 text-[14px] leading-6 text-slate-700">
                  {inferredTargetLabels.join(" / ")}
                </div>
              </div>

              <div className="min-w-0">
                <Typography.Text className="text-[11px] font-medium uppercase tracking-[0.08em] text-slate-400">
                  {t("skills.authoring.inference.summary")}
                </Typography.Text>
                <div className="mt-1 text-[14px] leading-6 text-slate-700 break-words">
                  {inferredSummary}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-8">
        <div className="mx-auto flex max-w-220 flex-col gap-7">
          {conversationMessages.map((message, index) => (
            <div
              key={message.id ?? `${message.role}-${index}`}
              className={
                message.role === "user"
                  ? "flex justify-end"
                  : "flex justify-start"
              }
            >
              <div
                className={
                  message.role === "user"
                    ? "max-w-[78%] rounded-hero rounded-tr-[10px] bg-[#dff6e6] px-7 py-5 text-[15px] leading-8 text-slate-700 shadow-[0_14px_28px_rgba(34,197,94,0.08)]"
                    : "max-w-[76%] rounded-hero rounded-tl-[10px] border border-slate-200/80 bg-white px-7 py-5 text-[15px] leading-8 text-slate-700 shadow-[0_12px_28px_rgba(148,163,184,0.12)]"
                }
              >
                {message.content}
              </div>
            </div>
          ))}

          {session.stage === "synthesizing" ? (
            <div className="flex justify-start">
              <div className="flex max-w-[76%] items-center gap-3 rounded-hero rounded-tl-[10px] border border-slate-200/80 bg-white px-6 py-4 text-[15px] text-slate-600 shadow-[0_12px_28px_rgba(148,163,184,0.12)]">
                <span className="relative flex h-3 w-9 items-center justify-between">
                  <span className="h-2 w-2 rounded-full bg-emerald-500/70 animate-pulse" />
                  <span className="h-2 w-2 rounded-full bg-emerald-500/55 animate-pulse [animation-delay:120ms]" />
                  <span className="h-2 w-2 rounded-full bg-emerald-500/40 animate-pulse [animation-delay:240ms]" />
                </span>
                <span>{t("skills.authoring.synthesizing")}</span>
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
                  value={authoringSubmitting ? "" : session.pendingAnswer}
                  autoSize={{ minRows: 2, maxRows: 8 }}
                  disabled={authoringSubmitting}
                  placeholder={t("skills.authoring.intro")}
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
                    {t("skills.authoring.actions.confirmDraft")}
                  </Button>
                ) : null}
                <Button
                  type="primary"
                  onClick={onSubmitAnswer}
                  loading={authoringSubmitting}
                  disabled={!canContinue || authoringSubmitting}
                  className="h-12 rounded-card-lg border-0 bg-linear-to-r from-emerald-600 to-emerald-500 px-6 text-base font-semibold shadow-[0_16px_28px_rgba(16,185,129,0.22)]"
                >
                  {t("skills.authoring.actions.continue")}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
