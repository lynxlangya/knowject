import { Alert, Button, Input, Modal, Tag, Tabs, Typography } from 'antd';
import { CloudDownloadOutlined } from '@ant-design/icons';
import type { SkillImportPreview } from '@api/skills';
import { GlobalAssetMetaPill } from '@pages/assets/components/GlobalAssetLayout';
import {
  LIFECYCLE_STATUS_META,
  SOURCE_META,
} from '../constants/skillsManagement.constants';
import type { ImportMode } from '../types/skillsManagement.types';
import { SkillMarkdownPreview } from './SkillMarkdownPreview';

interface SkillImportModalProps {
  importModalOpen: boolean;
  importMode: ImportMode;
  importGitHubUrl: string;
  importRepository: string;
  importPath: string;
  importRef: string;
  importUrl: string;
  importPreview: SkillImportPreview | null;
  importSubmitting: boolean;
  importPreviewLoading: boolean;
  onCancel: () => void;
  onSubmit: () => void;
  onPreview: () => void;
  onImportModeChange: (mode: ImportMode) => void;
  onImportGitHubUrlChange: (value: string) => void;
  onImportRepositoryChange: (value: string) => void;
  onImportPathChange: (value: string) => void;
  onImportRefChange: (value: string) => void;
  onImportUrlChange: (value: string) => void;
}

export const SkillImportModal = ({
  importModalOpen,
  importMode,
  importGitHubUrl,
  importRepository,
  importPath,
  importRef,
  importUrl,
  importPreview,
  importSubmitting,
  importPreviewLoading,
  onCancel,
  onSubmit,
  onPreview,
  onImportModeChange,
  onImportGitHubUrlChange,
  onImportRepositoryChange,
  onImportPathChange,
  onImportRefChange,
  onImportUrlChange,
}: SkillImportModalProps) => {
  return (
    <Modal
      title="导入 Skill"
      open={importModalOpen}
      onCancel={onCancel}
      onOk={onSubmit}
      okText="导入 Skill"
      cancelText="取消"
      okButtonProps={{
        disabled: importPreview === null,
      }}
      confirmLoading={importSubmitting}
      destroyOnHidden
      width={820}
    >
      <div className="space-y-5">
        <Alert
          type="info"
          showIcon
          message="导入即自有：导入后的 Skill 会成为你的可编辑全局资产，但当前阶段不会自动回源同步。"
        />

        <Tabs
          activeKey={importMode}
          onChange={(activeKey) => {
            onImportModeChange(activeKey as ImportMode);
          }}
          items={[
            {
              key: 'github',
              label: 'GitHub',
              children: (
                <div className="space-y-3">
                  <Input
                    value={importGitHubUrl}
                    placeholder="优先支持 GitHub tree/blob/raw URL"
                    onChange={(event) => {
                      onImportGitHubUrlChange(event.target.value);
                    }}
                  />
                  <div className="grid gap-3 md:grid-cols-3">
                    <Input
                      value={importRepository}
                      placeholder="owner/repo"
                      onChange={(event) => {
                        onImportRepositoryChange(event.target.value);
                      }}
                    />
                    <Input
                      value={importPath}
                      placeholder="skills/review"
                      onChange={(event) => {
                        onImportPathChange(event.target.value);
                      }}
                    />
                    <Input
                      value={importRef}
                      placeholder="main"
                      onChange={(event) => {
                        onImportRefChange(event.target.value);
                      }}
                    />
                  </div>
                  <Typography.Text className="text-xs text-slate-400">
                    支持 `repository + path + ref`，也支持直接粘贴 GitHub URL。若路径指向 Skill 目录，会保留 bundle 结构。
                  </Typography.Text>
                </div>
              ),
            },
            {
              key: 'url',
              label: '原始 Markdown URL',
              children: (
                <div className="space-y-3">
                  <Input
                    value={importUrl}
                    placeholder="https://example.com/path/to/SKILL.md"
                    onChange={(event) => {
                      onImportUrlChange(event.target.value);
                    }}
                  />
                  <Typography.Text className="text-xs text-slate-400">
                    仅支持直接返回 Markdown 文本的原始 URL，不支持网页抓取与 zip。
                  </Typography.Text>
                </div>
              ),
            },
          ]}
        />

        <div className="flex justify-end">
          <Button
            icon={<CloudDownloadOutlined />}
            loading={importPreviewLoading}
            onClick={onPreview}
          >
            解析预览
          </Button>
        </div>

        {importPreview ? (
          <div className="space-y-4 rounded-card-lg border border-slate-200 bg-slate-50/70 p-5">
            <div className="flex flex-wrap items-center gap-2">
              <GlobalAssetMetaPill className={SOURCE_META.imported.accentClass}>
                公网导入
              </GlobalAssetMetaPill>
              <GlobalAssetMetaPill
                className={LIFECYCLE_STATUS_META.draft.accentClass}
              >
                草稿
              </GlobalAssetMetaPill>
            </div>

            <div>
              <Typography.Title level={4} className="mb-0! text-slate-900!">
                {importPreview.name}
              </Typography.Title>
              <Typography.Paragraph className="mb-0! mt-2 text-sm! leading-6! text-slate-600!">
                {importPreview.description}
              </Typography.Paragraph>
            </div>

            <div className="rounded-panel border border-slate-200 bg-white px-4 py-4">
              <Typography.Text className="text-caption font-semibold uppercase tracking-[0.14em] text-slate-400">
                来源信息
              </Typography.Text>
              <Typography.Paragraph className="mb-0! mt-2 break-all text-sm! text-slate-500!">
                {importPreview.importProvenance.githubUrl ??
                  importPreview.importProvenance.sourceUrl}
              </Typography.Paragraph>
            </div>

            <div className="rounded-panel border border-slate-200 bg-white px-4 py-4">
              <Typography.Text className="text-caption font-semibold uppercase tracking-[0.14em] text-slate-400">
                Bundle 文件
              </Typography.Text>
              <div className="mt-3 flex flex-wrap gap-2">
                {importPreview.bundleFiles.map((file) => (
                  <Tag key={file.path} className="rounded-full px-3 py-1">
                    {file.path}
                  </Tag>
                ))}
              </div>
            </div>

            <SkillMarkdownPreview markdown={importPreview.skillMarkdown} />
          </div>
        ) : null}
      </div>
    </Modal>
  );
};
