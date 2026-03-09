import { Card, Tag, Typography } from 'antd';
import { useProjectPageContext } from './projectPageContext';

export const ProjectMembersPage = () => {
  const { members, activeProject } = useProjectPageContext();

  return (
    <section className="space-y-4">
      <Card className="rounded-[24px]! border-slate-200! shadow-[0_12px_30px_rgba(15,23,42,0.04)]!">
        <Typography.Text className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
          项目成员
        </Typography.Text>
        <Typography.Title level={3} className="mb-1! mt-2 text-slate-900!">
          {activeProject.name} 的协作成员
        </Typography.Title>
        <Typography.Paragraph className="mb-0! text-sm! text-slate-500!">
          当前版本先展示项目已关联成员与活跃状态，后续接入角色、权限和协作活动记录。
        </Typography.Paragraph>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {members.map((member) => (
          <article
            key={member.id}
            className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-[0_12px_30px_rgba(15,23,42,0.04)]"
          >
            <div className="flex items-center gap-4">
              <img
                src={member.avatarUrl}
                alt={member.name}
                className="h-14 w-14 rounded-full object-cover"
              />
              <div className="min-w-0">
                <Typography.Title level={5} className="mb-1! truncate text-slate-900!">
                  {member.name}
                </Typography.Title>
                <Tag color={member.isActive ? 'green' : 'default'}>
                  {member.isActive ? '活跃中' : '未活跃'}
                </Tag>
              </div>
            </div>
            <Typography.Paragraph className="mb-0! mt-4 text-sm! text-slate-500!">
              当前为项目协作者占位视图，后续将补充角色分工、权限范围和最近协作动态。
            </Typography.Paragraph>
          </article>
        ))}
      </div>
    </section>
  );
};
