import { Empty, Typography } from 'antd';
import { useTranslation } from 'react-i18next';

export const HomePage = () => {
  const { t } = useTranslation('pages');

  return (
    <section className="grid min-h-[calc(100vh-88px)] place-items-center border border-slate-200 bg-white px-6 py-10">
      <div className="max-w-2xl text-center">
        <Typography.Title level={2} className="mb-2! text-slate-900!">
          {t('home.title')}
        </Typography.Title>
        <Typography.Paragraph className="mb-8! text-base! text-slate-500!">
          {t('home.subtitle')}
        </Typography.Paragraph>

        <Empty
          description={
            <Typography.Text type="secondary">
              {t('home.empty')}
            </Typography.Text>
          }
        />
      </div>
    </section>
  );
};
