import {
  Alert,
  Button,
  Drawer,
  Input,
  Space,
  Typography,
} from 'antd';
import type { ProjectKnowledgeDraftValues } from '../useProjectConversationMessageActions';

interface ProjectKnowledgeDraftDrawerProps {
  open: boolean;
  value: ProjectKnowledgeDraftValues | null;
  saving: boolean;
  partialFailureMessage?: string | null;
  hasExistingKnowledge: boolean;
  onChange: (patch: Partial<ProjectKnowledgeDraftValues>) => void;
  onClose: () => void;
  onSubmit: () => void;
  onRetryUpload: () => void;
  onOpenResources: () => void;
}

const { TextArea } = Input;

export const ProjectKnowledgeDraftDrawer = ({
  open,
  value,
  saving,
  partialFailureMessage,
  hasExistingKnowledge,
  onChange,
  onClose,
  onSubmit,
  onRetryUpload,
  onOpenResources,
}: ProjectKnowledgeDraftDrawerProps) => {
  const submitDisabled =
    saving ||
    !value ||
    value.knowledgeName.trim().length <= 0 ||
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
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Space wrap>
            {partialFailureMessage && hasExistingKnowledge ? (
              <Button onClick={onRetryUpload} disabled={saving}>
                重试上传
              </Button>
            ) : null}
            {partialFailureMessage ? (
              <Button type="link" className="px-0!" onClick={onOpenResources}>
                前往项目资源
              </Button>
            ) : null}
          </Space>

          <Space wrap>
            <Button onClick={onClose} disabled={saving}>
              关闭
            </Button>
            <Button type="primary" loading={saving} disabled={submitDisabled} onClick={onSubmit}>
              {hasExistingKnowledge ? '继续上传 Markdown' : '创建知识并上传'}
            </Button>
          </Space>
        </div>
      }
    >
      {!value ? null : (
        <div className="space-y-5">
          <Typography.Paragraph className="mb-0! text-sm! leading-6! text-slate-500!">
            当前会按“先创建项目私有知识库，再上传一份 Markdown 文档”的顺序保存。关闭抽屉不会清空你当前的消息选择。
          </Typography.Paragraph>

          {partialFailureMessage ? (
            <Alert
              type="warning"
              showIcon
              message="知识草稿未完全保存"
              description={partialFailureMessage}
            />
          ) : null}

          <label className="block space-y-2">
            <Typography.Text strong>知识名称</Typography.Text>
            <Input
              value={value.knowledgeName}
              maxLength={80}
              placeholder="请输入项目知识名称"
              onChange={(event) => onChange({ knowledgeName: event.target.value })}
            />
          </label>

          <label className="block space-y-2">
            <Typography.Text strong>知识描述</Typography.Text>
            <TextArea
              value={value.knowledgeDescription}
              autoSize={{ minRows: 3, maxRows: 6 }}
              placeholder="描述这份知识草稿会沉淀什么内容"
              onChange={(event) =>
                onChange({ knowledgeDescription: event.target.value })
              }
            />
          </label>

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
