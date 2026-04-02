import { Drawer, Spin, Typography } from 'antd';
import type { SkillDetailResponse } from '@api/skills';
import { useTranslation } from 'react-i18next';
import { getStatusBadgeMeta } from '../adapters/skillStatus.adapter';
import { CATEGORY_META, SOURCE_META } from '../constants/skillsManagement.constants';
import { SkillMarkdownPreview } from './SkillMarkdownPreview';

interface SkillViewerDrawerProps {
  viewerOpen: boolean;
  viewerLoading: boolean;
  viewingSkill: SkillDetailResponse | null;
  onClose: () => void;
}

export const SkillViewerDrawer = ({
  viewerOpen,
  viewerLoading,
  viewingSkill,
  onClose,
}: SkillViewerDrawerProps) => {
  const { t } = useTranslation('pages');
  const sourceMeta = viewingSkill ? SOURCE_META[viewingSkill.source] : null;
  const statusMeta = viewingSkill ? getStatusBadgeMeta(viewingSkill) : null;
  const categoryMeta =
    viewingSkill?.category ? CATEGORY_META[viewingSkill.category] : null;

  return (
    <Drawer
      title={t('skills.viewer.title')}
      open={viewerOpen}
      placement="right"
      size={720}
      onClose={onClose}
      destroyOnHidden
    >
      {viewerLoading || !viewingSkill ? (
        <div className="flex min-h-80 items-center justify-center">
          <Spin />
        </div>
      ) : (
        <div className="space-y-4">
          <div className="space-y-3">
            <Typography.Title level={3} className="mb-0! text-slate-900!">
              {viewingSkill.name}
            </Typography.Title>
            <Typography.Paragraph className="mb-0! text-sm! leading-6! text-slate-600!">
              {viewingSkill.description}
            </Typography.Paragraph>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-panel border border-slate-200 bg-slate-50/80 px-4 py-3">
              <Typography.Text className="text-caption font-semibold uppercase tracking-[0.14em] text-slate-400">
                {t('skills.viewer.source')}
              </Typography.Text>
              <Typography.Paragraph className="mb-0! mt-2 text-sm! text-slate-600!">
                {sourceMeta?.label ?? '-'}
              </Typography.Paragraph>
            </div>

            <div className="rounded-panel border border-slate-200 bg-slate-50/80 px-4 py-3">
              <Typography.Text className="text-caption font-semibold uppercase tracking-[0.14em] text-slate-400">
                {t('skills.viewer.status')}
              </Typography.Text>
              <Typography.Paragraph className="mb-0! mt-2 text-sm! text-slate-600!">
                {statusMeta?.label ?? '-'}
              </Typography.Paragraph>
            </div>

            <div className="rounded-panel border border-slate-200 bg-slate-50/80 px-4 py-3">
              <Typography.Text className="text-caption font-semibold uppercase tracking-[0.14em] text-slate-400">
                {t('skills.viewer.category')}
              </Typography.Text>
              <Typography.Paragraph className="mb-0! mt-2 text-sm! text-slate-600!">
                {categoryMeta?.label ?? '-'}
              </Typography.Paragraph>
            </div>
          </div>

          <SkillMarkdownPreview markdown={viewingSkill.skillMarkdown} />
        </div>
      )}
    </Drawer>
  );
};
