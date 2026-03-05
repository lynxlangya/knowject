import { Button, Layout, Space, Typography } from 'antd';
import { LogoutOutlined } from '@ant-design/icons';

const { Header } = Layout;

export interface AppHeaderProps {
  onLogout: () => void;
}

export const AppHeader = ({ onLogout }: AppHeaderProps) => {
  return (
    <Header className="flex! items-center justify-between border-b! border-white/10! bg-gradient-to-r! from-slate-900! via-slate-800! to-slate-700! px-5!">
      <div className="flex min-w-0 flex-col gap-0.5">
        <Typography.Text className="text-[18px] leading-tight text-slate-50!">知项 · Knowject</Typography.Text>
        <Typography.Text className="text-xs leading-tight text-slate-100/85!">
          让项目知识，真正为团队所用。
        </Typography.Text>
      </div>

      <Space>
        <Button
          type="text"
          className="text-slate-50! hover:bg-white/10! hover:text-white!"
          onClick={onLogout}
          icon={<LogoutOutlined />}
        >
          退出登录
        </Button>
      </Space>
    </Header>
  );
};
