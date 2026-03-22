import { Alert, Button, Input, Modal, Tag, Tabs, Typography } from 'antd';
import { CloudDownloadOutlined } from '@ant-design/icons';
import type { SkillImportPreview } from '@api/skills';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation('pages');
  return (
    <Modal
      title={t('skills.importFlow.title')}
      open={importModalOpen}
      onCancel={onCancel}
      onOk={onSubmit}
      okText={t('skills.importFlow.submit')}
      cancelText={t('skills.importFlow.cancel')}
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
          message={t('skills.importFlow.intro')}
        />

        <Tabs
          activeKey={importMode}
          onChange={(activeKey) => {
            onImportModeChange(activeKey as ImportMode);
          }}
          items={[
            {
              key: 'github',
              label: t('skills.importFlow.github'),
              children: (
                <div className="space-y-3">
                  <Input
                    value={importGitHubUrl}
                    placeholder={t('skills.importFlow.githubUrlPlaceholder')}
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
                    {t('skills.importFlow.githubHelp')}
                  </Typography.Text>
                </div>
              ),
            },
            {
              key: 'url',
              label: t('skills.importFlow.rawUrl'),
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
                    {t('skills.importFlow.rawUrlHelp')}
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
            {t('skills.importFlow.preview')}
          </Button>
        </div>

        {importPreview ? (
          <div className="space-y-4 rounded-card-lg border border-slate-200 bg-slate-50/70 p-5">
            <div className="flex flex-wrap items-center gap-2">
              <GlobalAssetMetaPill className={SOURCE_META.imported.accentClass}>
                {t('skills.importFlow.imported')}
              </GlobalAssetMetaPill>
              <GlobalAssetMetaPill
                className={LIFECYCLE_STATUS_META.draft.accentClass}
              >
                {t('skills.importFlow.draft')}
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
                {t('skills.importFlow.provenance')}
              </Typography.Text>
              <Typography.Paragraph className="mb-0! mt-2 break-all text-sm! text-slate-500!">
                {importPreview.importProvenance.githubUrl ??
                  importPreview.importProvenance.sourceUrl}
              </Typography.Paragraph>
            </div>

            <div className="rounded-panel border border-slate-200 bg-white px-4 py-4">
              <Typography.Text className="text-caption font-semibold uppercase tracking-[0.14em] text-slate-400">
                {t('skills.importFlow.bundleFiles')}
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
