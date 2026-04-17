import { Alert, Button, Drawer, Empty, Input, Space, Spin, Tag, Typography } from "antd";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { extractApiErrorMessage } from "@api/error";
import {
  refineSkillCreationJob,
  saveSkillCreationJob,
  type SkillCreationInference,
  type SkillCreationJobResponse,
} from "@api/skills";
import { CATEGORY_META } from "../constants/skillsManagement.constants";
import {
  hasValidMinimumCreationMarkdown,
  readSkillCreationDraftFrontmatter,
  syncSkillCreationDraftFrontmatter,
} from "../utils/skillCreationDraft";
import type { SkillCreationSnapshot } from "../types/skillsManagement.types";

interface SkillCreationDraftDrawerProps {
  open: boolean;
  job: SkillCreationJobResponse | null;
  loading: boolean;
  onClose: () => void;
  onJobUpdated: (job: SkillCreationJobResponse) => void;
  onSaved: (skillId: string) => void;
}

export const SkillCreationDraftDrawer = ({
  open,
  job,
  loading,
  onClose,
  onJobUpdated,
  onSaved,
}: SkillCreationDraftDrawerProps) => {
  const { t } = useTranslation("pages");
  const [markdownDraft, setMarkdownDraft] = useState("");
  const [baselineMarkdownDraft, setBaselineMarkdownDraft] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [currentInference, setCurrentInference] =
    useState<SkillCreationInference | null>(null);
  const [currentSummary, setCurrentSummary] = useState("");
  const [confirmationQuestions, setConfirmationQuestions] = useState<string[]>([]);
  const [optimizationInstruction, setOptimizationInstruction] = useState("");
  const [lastOptimizationSnapshot, setLastOptimizationSnapshot] =
    useState<SkillCreationSnapshot | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [surfaceError, setSurfaceError] = useState<string | null>(null);
  const [optimizeNotice, setOptimizeNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!job) {
      return;
    }

    const frontmatter = job.markdownDraft
      ? readSkillCreationDraftFrontmatter(job.markdownDraft)
      : null;

    setMarkdownDraft(job.markdownDraft ?? "");
    setBaselineMarkdownDraft(job.markdownDraft ?? "");
    setName(frontmatter?.name ?? job.name);
    setDescription(frontmatter?.description ?? job.description);
    setCurrentInference(job.currentInference);
    setCurrentSummary(job.currentSummary ?? "");
    setConfirmationQuestions(job.confirmationQuestions);
    setOptimizationInstruction("");
    setLastOptimizationSnapshot(null);
    setSubmitting(false);
    setSurfaceError(null);
    setOptimizeNotice(null);
  }, [job]);

  const isBusy = loading || submitting || job?.status === "queued" || job?.status === "generating";
  const isDirty = markdownDraft !== baselineMarkdownDraft;
  const canOptimize =
    !!job &&
    job.status !== "saved" &&
    !isBusy &&
    (isDirty || optimizationInstruction.trim().length > 0);
  const canSave =
    !!job &&
    job.status !== "saved" &&
    !isBusy &&
    hasValidMinimumCreationMarkdown(markdownDraft);

  const applySnapshot = (snapshot: SkillCreationSnapshot) => {
    const frontmatter = readSkillCreationDraftFrontmatter(snapshot.markdownDraft);
    setMarkdownDraft(snapshot.markdownDraft);
    setBaselineMarkdownDraft(snapshot.markdownDraft);
    setCurrentInference(snapshot.currentInference);
    setCurrentSummary(snapshot.currentSummary);
    setConfirmationQuestions(snapshot.confirmationQuestions);
    if (frontmatter) {
      setName(frontmatter.name);
      setDescription(frontmatter.description);
    }
  };

  const handleOptimize = async () => {
    if (!job || !canOptimize) {
      return;
    }

    setSubmitting(true);
    setSurfaceError(null);

    try {
      const previousSnapshot: SkillCreationSnapshot = {
        markdownDraft,
        currentInference,
        currentSummary,
        confirmationQuestions,
      };
      const result = await refineSkillCreationJob(job.id, {
        markdownDraft,
        ...(optimizationInstruction.trim()
          ? {
              optimizationInstruction: optimizationInstruction.trim(),
            }
          : {}),
        ...(currentInference ? { currentInference } : {}),
      });
      setLastOptimizationSnapshot(previousSnapshot);
      setOptimizeNotice(t("skills.creation.feedback.optimized"));
      setOptimizationInstruction("");
      onJobUpdated(result.job);
    } catch (error) {
      setSurfaceError(
        extractApiErrorMessage(error, t("skills.creation.feedback.optimizeFailed")),
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleSave = async () => {
    if (!job || !canSave) {
      return;
    }

    setSubmitting(true);
    setSurfaceError(null);

    try {
      const result = await saveSkillCreationJob(job.id, {
        markdownDraft,
        ...(currentInference ? { currentInference } : {}),
      });
      onJobUpdated(result.job);
      onSaved(result.skill.id);
    } catch (error) {
      setSurfaceError(
        extractApiErrorMessage(error, t("skills.creation.feedback.saveFailed")),
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleUndoOptimize = () => {
    if (!lastOptimizationSnapshot) {
      return;
    }

    applySnapshot(lastOptimizationSnapshot);
    setLastOptimizationSnapshot(null);
    setOptimizeNotice(null);
  };

  const renderInference = () => {
    if (!currentInference) {
      return null;
    }

    const categoryMeta =
      currentInference.category && currentInference.category in CATEGORY_META
        ? CATEGORY_META[currentInference.category]
        : null;

    return (
      <div className="flex flex-wrap gap-2">
        {categoryMeta ? <Tag color="processing">{categoryMeta.label}</Tag> : null}
        {currentInference.contextTargets.map((target) => (
          <Tag key={target}>{target}</Tag>
        ))}
      </div>
    );
  };

  return (
    <Drawer
      open={open}
      onClose={onClose}
      width={760}
      destroyOnClose={false}
      title={t("skills.creation.drawer.title")}
      footer={
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Typography.Text className="text-xs text-slate-400">
            {t("skills.creation.footer.hint")}
          </Typography.Text>
          <Space>
            <Button onClick={onClose}>{t("skills.creation.close")}</Button>
            <Button onClick={handleOptimize} disabled={!canOptimize} loading={submitting && !canSave}>
              {t("skills.creation.optimize")}
            </Button>
            <Button type="primary" onClick={handleSave} disabled={!canSave} loading={submitting && canSave}>
              {t("skills.creation.save")}
            </Button>
          </Space>
        </div>
      }
    >
      {!job ? null : loading ? (
        <div className="flex items-center justify-center py-16">
          <Spin />
        </div>
      ) : (
        <div className="space-y-5">
          {surfaceError ? <Alert type="error" showIcon message={surfaceError} /> : null}
          {optimizeNotice ? (
            <Alert
              type="success"
              showIcon
              message={optimizeNotice}
              action={
                lastOptimizationSnapshot ? (
                  <Button type="link" size="small" onClick={handleUndoOptimize}>
                    {t("skills.creation.undo")}
                  </Button>
                ) : null
              }
            />
          ) : null}

          {job.status === "queued" || job.status === "generating" ? (
            <Alert
              type="info"
              showIcon
              message={t(`skills.creation.jobs.status.${job.status}`)}
              description={t("skills.creation.jobs.drawerGenerating")}
            />
          ) : null}

          {job.status === "failed" ? (
            <Alert
              type="error"
              showIcon
              message={t("skills.creation.jobs.feedback.failed")}
              description={job.errorMessage || t("skills.creation.jobs.drawerFailed")}
            />
          ) : null}

          {!job.markdownDraft && job.status !== "failed" ? (
            <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t("skills.creation.jobs.drawerEmpty")} />
          ) : (
            <>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="block space-y-2">
                  <Typography.Text strong>{t("skills.creation.fields.name.label")}</Typography.Text>
                  <Input
                    value={name}
                    disabled={isBusy}
                    onChange={(event) => {
                      const nextName = event.target.value;
                      setName(nextName);
                      setMarkdownDraft((current) =>
                        syncSkillCreationDraftFrontmatter(current, {
                          name: nextName,
                          description,
                        }),
                      );
                    }}
                  />
                </label>

                <label className="block space-y-2">
                  <Typography.Text strong>{t("skills.creation.fields.description.label")}</Typography.Text>
                  <Input
                    value={description}
                    disabled={isBusy}
                    onChange={(event) => {
                      const nextDescription = event.target.value;
                      setDescription(nextDescription);
                      setMarkdownDraft((current) =>
                        syncSkillCreationDraftFrontmatter(current, {
                          name,
                          description: nextDescription,
                        }),
                      );
                    }}
                  />
                </label>
              </div>

              <div className="rounded-panel border border-slate-200 bg-slate-50/80 px-4 py-4">
                <div className="space-y-2">
                  <Typography.Text strong>{t("skills.creation.summary.title")}</Typography.Text>
                  <Typography.Paragraph className="mb-0! whitespace-pre-wrap text-sm! leading-6! text-slate-600!">
                    {currentSummary || t("skills.creation.summary.empty")}
                  </Typography.Paragraph>
                  {renderInference()}
                </div>
              </div>

              <div className="rounded-panel border border-slate-200 bg-white px-4 py-4">
                <div className="space-y-2">
                  <Typography.Text strong>{t("skills.creation.confirmation.title")}</Typography.Text>
                  {confirmationQuestions.length > 0 ? (
                    <div className="space-y-2 text-sm text-slate-600">
                      {confirmationQuestions.map((question) => (
                        <div key={question}>• {question}</div>
                      ))}
                    </div>
                  ) : (
                    <Typography.Paragraph className="mb-0! text-sm! text-slate-500!">
                      {t("skills.creation.confirmation.empty")}
                    </Typography.Paragraph>
                  )}
                </div>
              </div>

              <label className="block space-y-2">
                <Typography.Text strong>{t("skills.creation.markdown.label")}</Typography.Text>
                <Input.TextArea
                  value={markdownDraft}
                  rows={22}
                  className="font-mono"
                  disabled={isBusy}
                  onChange={(event) => {
                    const nextMarkdownDraft = event.target.value;
                    const frontmatter = readSkillCreationDraftFrontmatter(nextMarkdownDraft);
                    setMarkdownDraft(nextMarkdownDraft);
                    if (frontmatter) {
                      setName(frontmatter.name || name);
                      setDescription(frontmatter.description || description);
                    }
                    setOptimizeNotice(null);
                  }}
                />
              </label>

              <label className="block space-y-2">
                <Typography.Text strong>{t("skills.creation.optimization.label")}</Typography.Text>
                <Input.TextArea
                  value={optimizationInstruction}
                  rows={3}
                  disabled={isBusy}
                  placeholder={t("skills.creation.optimization.placeholder")}
                  onChange={(event) => setOptimizationInstruction(event.target.value)}
                />
              </label>
            </>
          )}
        </div>
      )}
    </Drawer>
  );
};

