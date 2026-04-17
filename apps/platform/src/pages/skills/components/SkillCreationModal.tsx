import { Alert, Button, Card, Input, Modal, Select, Space, Typography } from "antd";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import type {
  CreateSkillCreationJobRequest,
  SkillCreationJobResponse,
} from "@api/skills";
import { extractApiErrorMessage } from "@api/error";
import { getSkillCreationTemplateOptions } from "../constants/skillsManagement.constants";
import { hasMinimumSkillCreationInputs } from "../utils/skillCreationDraft";
import type { SkillCreationInputDraft } from "../types/skillsManagement.types";

const INITIAL_INPUT_DRAFT: SkillCreationInputDraft = {
  name: "",
  description: "",
  taskIntent: "",
  templateHint: null,
};

interface SkillCreationModalProps {
  open: boolean;
  onClose: () => void;
  onSubmitted: (job: SkillCreationJobResponse) => void;
  submitCreateJob: (
    payload: CreateSkillCreationJobRequest,
  ) => Promise<SkillCreationJobResponse>;
}

export const SkillCreationModal = ({
  open,
  onClose,
  onSubmitted,
  submitCreateJob,
}: SkillCreationModalProps) => {
  const { t } = useTranslation("pages");
  const [inputDraft, setInputDraft] =
    useState<SkillCreationInputDraft>(INITIAL_INPUT_DRAFT);
  const [submitting, setSubmitting] = useState(false);
  const [surfaceError, setSurfaceError] = useState<string | null>(null);

  const templateOptions = getSkillCreationTemplateOptions();
  const activeTemplate = templateOptions.find(
    (option) => option.value === inputDraft.templateHint,
  );
  const canSubmit = hasMinimumSkillCreationInputs(inputDraft) && !submitting;

  useEffect(() => {
    if (!open) {
      setInputDraft(INITIAL_INPUT_DRAFT);
      setSubmitting(false);
      setSurfaceError(null);
    }
  }, [open]);

  const handleSubmit = async () => {
    if (!canSubmit) {
      return;
    }

    setSubmitting(true);
    setSurfaceError(null);

    try {
      const job = await submitCreateJob({
        name: inputDraft.name,
        description: inputDraft.description,
        taskIntent: inputDraft.taskIntent,
        ...(inputDraft.templateHint
          ? {
              templateHint: inputDraft.templateHint,
            }
          : {}),
      });
      onSubmitted(job);
      onClose();
    } catch (error) {
      setSurfaceError(
        extractApiErrorMessage(error, t("skills.creation.jobs.feedback.submitFailed")),
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      onCancel={onClose}
      width={840}
      title={t("skills.creation.title")}
      destroyOnClose
      footer={
        <div className="flex items-center justify-end gap-3">
          <Space>
            <Button onClick={onClose} disabled={submitting}>
              {t("skills.creation.cancel")}
            </Button>
            <Button type="primary" loading={submitting} disabled={!canSubmit} onClick={handleSubmit}>
              {t("skills.creation.generate")}
            </Button>
          </Space>
        </div>
      }
    >
      <div className="space-y-5">
        <Typography.Paragraph className="mb-0! text-sm! leading-6! text-slate-500!">
          {t("skills.creation.intro")}
        </Typography.Paragraph>

        {surfaceError ? <Alert type="error" showIcon message={surfaceError} /> : null}

        <Card className="border-slate-200 shadow-none">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="block space-y-2">
              <Typography.Text strong>
                {t("skills.creation.fields.name.label")}
              </Typography.Text>
              <Input
                value={inputDraft.name}
                placeholder={t("skills.creation.fields.name.placeholder")}
                onChange={(event) =>
                  setInputDraft((current) => ({
                    ...current,
                    name: event.target.value,
                  }))
                }
              />
            </label>

            <label className="block space-y-2">
              <Typography.Text strong>
                {t("skills.creation.fields.description.label")}
              </Typography.Text>
              <Input
                value={inputDraft.description}
                placeholder={t("skills.creation.fields.description.placeholder")}
                onChange={(event) =>
                  setInputDraft((current) => ({
                    ...current,
                    description: event.target.value,
                  }))
                }
              />
            </label>
          </div>

          <label className="mt-4 block space-y-2">
            <Typography.Text strong>
              {t("skills.creation.fields.taskIntent.label")}
            </Typography.Text>
            <Input.TextArea
              value={inputDraft.taskIntent}
              rows={5}
              placeholder={t("skills.creation.fields.taskIntent.placeholder")}
              onChange={(event) =>
                setInputDraft((current) => ({
                  ...current,
                  taskIntent: event.target.value,
                }))
              }
            />
          </label>

          <div className="mt-4 space-y-3">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <Typography.Text strong className="shrink-0">
                {t("skills.creation.fields.template.label")}
              </Typography.Text>
              <Select
                allowClear
                className="w-[196px]"
                value={inputDraft.templateHint ?? undefined}
                placeholder={t("skills.creation.fields.template.placeholder")}
                options={templateOptions.map((option) => ({
                  value: option.value,
                  label: option.label,
                }))}
                onChange={(value) =>
                  setInputDraft((current) => ({
                    ...current,
                    templateHint: value ?? null,
                  }))
                }
              />
            </div>
            {activeTemplate ? (
              <pre className="overflow-x-auto rounded-panel border border-slate-200 bg-slate-50 px-4 py-3 text-xs leading-6 text-slate-500 whitespace-pre-wrap">
                {activeTemplate.preview}
              </pre>
            ) : null}
          </div>
        </Card>
      </div>
    </Modal>
  );
};
