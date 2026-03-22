import { Card, Typography } from 'antd';
import { useTranslation } from 'react-i18next';

export const AnalyticsPage = () => {
  const { t } = useTranslation('pages');

  return (
    <Card>
      <Typography.Title level={4}>{t('analytics.title')}</Typography.Title>
      <Typography.Paragraph>
        {t('analytics.description')}
      </Typography.Paragraph>
    </Card>
  );
};
