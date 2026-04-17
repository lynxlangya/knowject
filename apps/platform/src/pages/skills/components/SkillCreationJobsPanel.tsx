import { Alert, Button, Card, Empty, Spin, Tag, Typography } from "antd";
import type { SkillCreationJobResponse } from "@api/skills";
import { formatGlobalAssetUpdatedAt } from "@pages/assets/components/globalAsset.shared";
import { useTranslation } from "react-i18next";

interface SkillCreationJobsPanelProps {
  items: SkillCreationJobResponse[];
  loading: boolean;
  error: string | null;
  pollingStopped: boolean;
  onRetry: () => void;
  onOpenJob: (jobId: string) => void;
}

const resolveStatusColor = (status: SkillCreationJobResponse["status"]): string => {
  switch (status) {
    case "ready":
      return "success";
    case "failed":
      return "error";
    case "saved":
      return "processing";
    default:
      return "warning";
  }
};

export const SkillCreationJobsPanel = ({
  items,
  loading,
  error,
  pollingStopped,
  onRetry,
  onOpenJob,
}: SkillCreationJobsPanelProps) => {
  const { t } = useTranslation("pages");

  if (!loading && !error && items.length === 0) {
    return null;
  }

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="space-y-1">
          <Typography.Title level={4} className="mb-0! text-slate-900!">
            {t("skills.creation.jobs.title")}
          </Typography.Title>
          <Typography.Paragraph className="mb-0! text-sm! leading-6! text-slate-500!">
            {t("skills.creation.jobs.subtitle")}
          </Typography.Paragraph>
        </div>
        <Button onClick={onRetry}>{t("skills.reload")}</Button>
      </div>

      {error ? (
        <Alert type="error" showIcon message={error} action={<Button size="small" onClick={onRetry}>{t("skills.retry")}</Button>} />
      ) : null}

      {pollingStopped ? (
        <Alert type="info" showIcon message={t("skills.creation.jobs.pollingStopped")} />
      ) : null}

      {loading && items.length === 0 ? (
        <Card className="border-slate-200 shadow-none">
          <div className="flex items-center justify-center py-10">
            <Spin />
          </div>
        </Card>
      ) : items.length === 0 ? (
        <Card className="border-slate-200 shadow-none">
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t("skills.creation.jobs.empty")} />
        </Card>
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {items.slice(0, 5).map((job) => (
            <button
              type="button"
              key={job.id}
              className="text-left"
              onClick={() => onOpenJob(job.id)}
            >
              <article className="flex h-full flex-col rounded-shell border border-slate-200 bg-white p-5 shadow-card transition hover:border-teal-300 hover:shadow-lg">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <Tag color={resolveStatusColor(job.status)}>
                        {t(`skills.creation.jobs.status.${job.status}`)}
                      </Tag>
                    </div>
                    <div className="space-y-2">
                      <Typography.Title level={4} className="mb-0! text-slate-900!">
                        {job.name}
                      </Typography.Title>
                      <Typography.Paragraph className="mb-0! text-sm! leading-6! text-slate-600!" ellipsis={{ rows: 2, tooltip: job.description }}>
                        {job.description}
                      </Typography.Paragraph>
                    </div>
                  </div>
                </div>

                <div className="mt-4 rounded-panel border border-slate-200 bg-slate-50/80 px-4 py-3">
                  <Typography.Paragraph className="mb-0! text-sm! leading-6! text-slate-600!">
                    {job.status === "failed"
                      ? job.errorMessage || t("skills.creation.jobs.feedback.failed")
                      : job.currentSummary || t(`skills.creation.jobs.hint.${job.status}`)}
                  </Typography.Paragraph>
                </div>

                <Typography.Text className="mt-4 text-xs text-slate-400">
                  {t("skills.updatedAt", {
                    value: formatGlobalAssetUpdatedAt(job.updatedAt),
                  })}
                </Typography.Text>
              </article>
            </button>
          ))}
        </div>
      )}
    </section>
  );
};

