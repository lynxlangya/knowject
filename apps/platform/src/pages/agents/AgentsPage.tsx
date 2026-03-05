import { Card, Typography } from 'antd';

export const AgentsPage = () => {
  return (
    <Card>
      <Typography.Title level={4}>智能体</Typography.Title>
      <Typography.Paragraph>
        智能体模块正在建设中，当前为独立路由占位页，后续将接入 Agent 配置与协作流程。
      </Typography.Paragraph>
    </Card>
  );
};
