import { Empty, Typography } from 'antd';

export const HomePage = () => {
  return (
    <section className="grid min-h-[calc(100vh-88px)] place-items-center border border-slate-200 bg-white px-6 py-10">
      <div className="max-w-2xl text-center">
        <Typography.Title level={2} className="mb-2! text-slate-900!">
          主页
        </Typography.Title>
        <Typography.Paragraph className="mb-8! text-base! text-slate-500!">
          在左侧「我的项目」中选择项目后，将进入项目概览、对话、资源与成员页。
        </Typography.Paragraph>

        <Empty
          description={
            <Typography.Text type="secondary">
              当前未打开项目，请从左侧项目列表进入。
            </Typography.Text>
          }
        />
      </div>
    </section>
  );
};
