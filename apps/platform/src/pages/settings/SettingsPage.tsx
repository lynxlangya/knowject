import { Card, Typography } from 'antd';

export const SettingsPage = () => {
  return (
    <Card>
      <Typography.Title level={4}>设置</Typography.Title>
      <Typography.Paragraph>
        设置模块正在建设中，当前为独立路由占位页，后续将接入工作区配置与团队偏好管理。
      </Typography.Paragraph>
    </Card>
  );
};
