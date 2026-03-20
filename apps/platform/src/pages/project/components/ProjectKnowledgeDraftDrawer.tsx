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
      title="生成项目知识草稿"
      onClose={onClose}
      footer={
        <div className="flex flex-wrap items-center justify-end gap-3">
          <Space wrap>
            <Button onClick={onClose} disabled={saving}>
              关闭
            </Button>
            <Button type="primary" loading={saving} disabled={submitDisabled} onClick={onSubmit}>
              保存到项目知识库
            </Button>
          </Space>
        </div>
      }
    >
      {!value ? null : (
        <div className="space-y-5">
          <div className="space-y-2">
            <Typography.Text strong>项目私有知识库</Typography.Text>
            {hasProjectKnowledgeOptions ? (
              <div className="space-y-2">
                <Select
                  value={selectedKnowledgeId ?? undefined}
                  options={projectKnowledgeOptions}
                  placeholder="请选择项目私有知识库"
                  status={!selectedKnowledgeId ? 'error' : undefined}
                  onChange={(nextValue) => onKnowledgeChange(nextValue)}
                />
                {!selectedKnowledgeId ? (
                  <Typography.Text type="danger" className="text-xs!">
                    请选择项目私有知识库
                  </Typography.Text>
                ) : null}
              </div>
            ) : projectKnowledgeLoading ? (
              <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50/80 px-5 py-6">
                <Typography.Paragraph className="mb-0! text-sm! leading-6! text-slate-500!">
                  正在加载项目私有知识库...
                </Typography.Paragraph>
              </div>
            ) : projectKnowledgeError ? (
              <Alert
                type="warning"
                showIcon
                message="项目私有知识库加载失败"
                description={projectKnowledgeError}
              />
            ) : (
              <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50/80 px-5 py-6">
                <Empty
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description="当前项目还没有项目私有知识库，请先创建一个空知识库。"
                >
                  <Button type="primary" onClick={onCreateKnowledge}>
                    新建项目私有知识库
                  </Button>
                </Empty>
              </div>
            )}
          </div>

          <label className="block space-y-2">
            <Typography.Text strong>文档标题</Typography.Text>
            <Input
              value={value.documentTitle}
              maxLength={120}
              placeholder="用于上传 Markdown 文档的标题"
              onChange={(event) => onChange({ documentTitle: event.target.value })}
            />
          </label>

          <label className="block space-y-2">
            <Typography.Text strong>Markdown 内容</Typography.Text>
            <TextArea
              value={value.markdownContent}
              autoSize={{ minRows: 16, maxRows: 28 }}
              placeholder="这里会保存将要上传的 Markdown 内容"
              onChange={(event) => onChange({ markdownContent: event.target.value })}
            />
          </label>
        </div>
      )}
    </Drawer>
  );
};
