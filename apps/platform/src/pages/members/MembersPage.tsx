import { Card, Typography } from 'antd';

export const MembersPage = () => {
  return (
    <Card>
      <Typography.Title level={4}>成员</Typography.Title>
      <Typography.Paragraph>
        成员模块正在建设中，当前为独立路由占位页，后续将接入组织成员、角色与权限管理能力。
      </Typography.Paragraph>
    </Card>
  );
};
