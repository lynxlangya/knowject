import { Button, Result } from 'antd';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { PATHS } from '@app/navigation/paths';

export const NotFoundPage = () => {
  const { t } = useTranslation('pages');
  const navigate = useNavigate();

  return (
    <Result
      status="404"
      title="404"
      subTitle={t('notFound.subtitle')}
      extra={
        <Button type="primary" onClick={() => navigate(PATHS.home)}>
          {t('notFound.backHome')}
        </Button>
      }
    />
  );
};
