import { App, Button, Card, Tag, Typography } from 'antd';
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
  const assets = getGlobalAssetsByType(assetType);

  return (
    <section className="space-y-4">
      <Card className="mb-5! rounded-3xl! border-slate-200! shadow-float!">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <Typography.Text className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
              全局资产管理中心
            </Typography.Text>
            <Typography.Title level={2} className="mb-1! mt-2 text-slate-900!">
              {title}
            </Typography.Title>
            <Typography.Paragraph className="mb-0! max-w-2xl text-sm! text-slate-500!">
              {description}
            </Typography.Paragraph>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="primary" onClick={() => message.info('后续版本将在此接入全局资产创建能力。')}>
              新建资产
            </Button>
            <Button onClick={() => message.info('后续版本将在此选择项目并完成资源引入。')}>
              引入到项目
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
              <Tag color="blue">全局资产</Tag>
            </div>
            <Typography.Paragraph className="mb-0! mt-3 text-sm! text-slate-500!">
              {asset.description}
            </Typography.Paragraph>
            <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-xs text-slate-400">
              <span>维护方：{asset.owner}</span>
              <span>最近更新：{asset.updatedAt}</span>
              <span>使用项目：{asset.usageCount}</span>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
};
