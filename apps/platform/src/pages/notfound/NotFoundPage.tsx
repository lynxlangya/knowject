import { Button, Result } from 'antd';
import { useNavigate } from 'react-router-dom';
import { PATHS } from '@app/navigation/paths';

export const NotFoundPage = () => {
  const navigate = useNavigate();

  return (
    <Result
      status="404"
      title="404"
      subTitle="页面不存在或已被移动。"
      extra={
        <Button type="primary" onClick={() => navigate(PATHS.home)}>
          返回主页
        </Button>
      }
    />
  );
};
