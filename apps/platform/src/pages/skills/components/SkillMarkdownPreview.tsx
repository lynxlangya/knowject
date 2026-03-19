import { Alert, Card, Typography } from 'antd';
import { parseSkillMarkdownPreview } from '../skillsMarkdown';

interface SkillMarkdownPreviewProps {
  markdown: string;
}

export const SkillMarkdownPreview = ({ markdown }: SkillMarkdownPreviewProps) => {
  const preview = parseSkillMarkdownPreview(markdown);

  return (
    <div className="space-y-4">
      {preview.errors.length > 0 ? (
        <Alert
          type="warning"
          showIcon
          message="预览前发现 frontmatter 校验问题"
          description={
            <div className="space-y-1">
              {preview.errors.map((error) => (
                <div key={error}>{error}</div>
              ))}
            </div>
          }
        />
      ) : null}

      <div className="rounded-card-lg border border-slate-200 bg-slate-50/80 p-5">
        <Typography.Text className="text-caption font-semibold uppercase tracking-[0.16em] text-slate-400">
          SKILL Preview
        </Typography.Text>
        <Typography.Title level={4} className="mb-0! mt-3 text-slate-900!">
          {preview.name || '等待填写 name'}
        </Typography.Title>
        <Typography.Paragraph className="mb-0! mt-2 text-sm! leading-6! text-slate-600!">
          {preview.description || '等待填写 description'}
        </Typography.Paragraph>
      </div>

      <Card
        className="rounded-card-lg! border-slate-200!"
        styles={{ body: { padding: 0 } }}
      >
        <pre className="max-h-85 overflow-auto whitespace-pre-wrap px-5 py-5 text-label leading-6 text-slate-600">
          {preview.body || '这里会显示 frontmatter 之后的正文内容。'}
        </pre>
      </Card>
    </div>
  );
};
