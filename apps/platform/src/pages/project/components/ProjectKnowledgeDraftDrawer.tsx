import {
  Alert,
  Button,
  Drawer,
  Empty,
  Input,
  Select,
  Space,
  Typography,
} from 'antd';
import type { ProjectKnowledgeDraftValues } from '../useProjectConversationMessageActions';
import { tp } from '../project.i18n';

interface ProjectKnowledgeDraftDrawerProps {
  open: boolean;
  value: ProjectKnowledgeDraftValues | null;
  saving: boolean;
  projectKnowledgeOptions: Array<{ label: string; value: string }>;
  projectKnowledgeLoading: boolean;
  projectKnowledgeError?: string | null;
  selectedKnowledgeId: string | null;
  onChange: (patch: Partial<ProjectKnowledgeDraftValues>) => void;
  onKnowledgeChange: (knowledgeId: string | null) => void;
  onCreateKnowledge: () => void;
  onClose: () => void;
  onSubmit: () => void;
}

const { TextArea } = Input;

export const ProjectKnowledgeDraftDrawer = ({
  open,
  value,
  saving,
  projectKnowledgeOptions,
  projectKnowledgeLoading,
  projectKnowledgeError,
  selectedKnowledgeId,
  onChange,
  onKnowledgeChange,
  onCreateKnowledge,
  onClose,
  onSubmit,
}: ProjectKnowledgeDraftDrawerProps) => {
  const hasProjectKnowledgeOptions = projectKnowledgeOptions.length > 0;
  const submitDisabled =
    saving ||
    !value ||
    projectKnowledgeLoading ||
    !!projectKnowledgeError ||
    !selectedKnowledgeId ||
    value.documentTitle.trim().length <= 0 ||
    value.markdownContent.trim().length <= 0;

  return (
    <Drawer
      open={open}
      size={520}
      destroyOnClose={false}
      title={tp('resources.draft.title')}
      onClose={onClose}
      footer={
        <div className="flex flex-wrap items-center justify-end gap-3">
          <Space wrap>
            <Button onClick={onClose} disabled={saving}>
              {tp('resources.draft.close')}
            </Button>
            <Button type="primary" loading={saving} disabled={submitDisabled} onClick={onSubmit}>
              {tp('resources.draft.submit')}
            </Button>
          </Space>
        </div>
      }
    >
      {!value ? null : (
        <div className="space-y-5">
          <div className="space-y-2">
            <Typography.Text strong>{tp('resources.draft.knowledgeLabel')}</Typography.Text>
            {hasProjectKnowledgeOptions ? (
              <div className="space-y-2">
                <Select
                  value={selectedKnowledgeId ?? undefined}
                  options={projectKnowledgeOptions}
                  placeholder={tp('resources.draft.knowledgePlaceholder')}
                  status={!selectedKnowledgeId ? 'error' : undefined}
                  onChange={(nextValue) => onKnowledgeChange(nextValue)}
                />
                {!selectedKnowledgeId ? (
                  <Typography.Text type="danger" className="text-xs!">
                    {tp('resources.draft.knowledgeRequired')}
                  </Typography.Text>
                ) : null}
              </div>
            ) : projectKnowledgeLoading ? (
              <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50/80 px-5 py-6">
                <Typography.Paragraph className="mb-0! text-sm! leading-6! text-slate-500!">
                  {tp('resources.draft.loading')}
                </Typography.Paragraph>
              </div>
            ) : projectKnowledgeError ? (
              <Alert
                type="warning"
                showIcon
                message={tp('resources.draft.loadFailed')}
                description={projectKnowledgeError}
              />
            ) : (
              <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50/80 px-5 py-6">
                <Empty
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description={tp('resources.draft.empty')}
                >
                  <Button type="primary" onClick={onCreateKnowledge}>
                    {tp('resources.draft.create')}
                  </Button>
                </Empty>
              </div>
            )}
          </div>

          <label className="block space-y-2">
            <Typography.Text strong>{tp('resources.draft.documentTitle')}</Typography.Text>
            <Input
              value={value.documentTitle}
              maxLength={120}
              placeholder={tp('resources.draft.documentTitlePlaceholder')}
              onChange={(event) => onChange({ documentTitle: event.target.value })}
            />
          </label>

          <label className="block space-y-2">
            <Typography.Text strong>{tp('resources.draft.markdownLabel')}</Typography.Text>
            <TextArea
              value={value.markdownContent}
              autoSize={{ minRows: 16, maxRows: 28 }}
              placeholder={tp('resources.draft.markdownPlaceholder')}
              onChange={(event) => onChange({ markdownContent: event.target.value })}
            />
          </label>
        </div>
      )}
    </Drawer>
  );
};
