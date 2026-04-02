import { Card } from 'antd';

interface SkillMarkdownPreviewProps {
  markdown: string;
}

export const SkillMarkdownPreview = ({ markdown }: SkillMarkdownPreviewProps) => {
  return (
    <Card
      className="rounded-card-lg! border-slate-200!"
      styles={{ body: { padding: 0 } }}
    >
      <pre className="max-h-85 overflow-auto whitespace-pre-wrap px-5 py-5 text-label leading-6 text-slate-600">
        {markdown}
      </pre>
    </Card>
  );
};
