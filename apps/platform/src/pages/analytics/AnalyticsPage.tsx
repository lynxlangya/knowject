import { Card, Typography } from 'antd';

export const AnalyticsPage = () => {
  return (
    <Card>
      <Typography.Title level={4}>分析</Typography.Title>
      <Typography.Paragraph>
        分析模块正在建设中，当前为独立路由占位页，后续将接入项目健康度与协作指标分析。
      </Typography.Paragraph>
    </Card>
  );
};
