import { App, Button, Card, Tag, Typography } from 'antd';
import { useTranslation } from 'react-i18next';
import type { ProjectResourceFocus } from '@app/project/project.types';
import { getGlobalAssetsByType } from '@app/project/project.catalog';

interface GlobalAssetManagementPageProps {
  title: string;
  assetType: ProjectResourceFocus;
  description: string;
}

export const GlobalAssetManagementPage = ({
  title,
  assetType,
  description,
}: GlobalAssetManagementPageProps) => {
  const { message } = App.useApp();
  const { t } = useTranslation('pages');
  const assets = getGlobalAssetsByType(assetType);

  return (
    <section className="space-y-4">
      <Card className="mb-5! rounded-3xl! border-slate-200! shadow-float!">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <Typography.Text className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
              {t('assets.eyebrow')}
            </Typography.Text>
            <Typography.Title level={2} className="mb-1! mt-2 text-slate-900!">
              {title}
            </Typography.Title>
            <Typography.Paragraph className="mb-0! max-w-2xl text-sm! text-slate-500!">
              {description}
            </Typography.Paragraph>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="primary"
              onClick={() => message.info(t('assets.createPending'))}
            >
              {t('assets.create')}
            </Button>
            <Button onClick={() => message.info(t('assets.importPending'))}>
              {t('assets.importToProject')}
            </Button>
          </div>
        </div>
      </Card>

      <div className="grid gap-4 xl:grid-cols-2">
        {assets.map((asset) => (
          <article
            key={asset.id}
            className="rounded-3xl border border-slate-200 bg-white p-5 shadow-float"
          >
            <div className="flex flex-wrap items-center gap-2">
              <Typography.Title level={4} className="mb-0! text-slate-900!">
                {asset.name}
              </Typography.Title>
              <Tag color="blue">{t('assets.globalTag')}</Tag>
            </div>
            <Typography.Paragraph className="mb-0! mt-3 text-sm! text-slate-500!">
              {asset.description}
            </Typography.Paragraph>
            <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-xs text-slate-400">
              <span>{t('assets.owner', { value: asset.owner })}</span>
              <span>{t('assets.updatedAt', { value: asset.updatedAt })}</span>
              <span>{t('assets.usageCount', { count: asset.usageCount })}</span>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
};
