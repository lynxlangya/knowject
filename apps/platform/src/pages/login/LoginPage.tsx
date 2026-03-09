import { App, Form, Layout } from 'antd';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { login, type LoginRequest } from '../../api/auth';
import { setToken } from '../../app/auth/token';
import { setAuthUser } from '../../app/auth/user';
import { PATHS } from '../../app/navigation/paths';
import { LoginFlowBackground } from './components/LoginFlowBackground';
import { LoginFormPanel } from './components/LoginFormPanel';
import { LoginHeroPanel } from './components/LoginHeroPanel';
import {
  getRememberedUsername,
  LOGIN_PAGE_BACKGROUND,
  persistRememberedUsername,
  type LoginFormValues,
} from './constants';

const { Content } = Layout;

export const LoginPage = () => {
  const [form] = Form.useForm<LoginFormValues>();
  const navigate = useNavigate();
  const { message } = App.useApp();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const rememberedUsername = getRememberedUsername();
    form.setFieldsValue({
      username: rememberedUsername,
      password: '',
      remember: true,
    });
  }, [form]);

  const handleSubmit = async (values: LoginFormValues) => {
    setLoading(true);

    try {
      const payload: LoginRequest = {
        username: values.username.trim(),
        password: values.password,
      };

      const result = await login(payload);
      persistRememberedUsername(payload.username, values.remember);

      setToken(result.token);
      setAuthUser(result.user);
      message.success(`欢迎回来，${result.user.name}`);
      navigate(PATHS.home, { replace: true });
    } catch (error) {
      console.error(error);
      message.error('登录失败，请检查用户名和密码');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = () => {
    message.info('请联系技术支持处理密码重置。');
  };

  return (
    <Layout
      className="min-h-screen"
      style={{
        backgroundImage: LOGIN_PAGE_BACKGROUND,
      }}
    >
      <Content className="relative grid h-screen place-items-center overflow-hidden px-6 py-5 max-[960px]:p-3.5 max-[560px]:p-2">
        <LoginFlowBackground />

        <main
          className="flow-anim relative z-10 grid w-full max-w-295 overflow-hidden rounded-[26px] border border-slate-200/95 bg-white/85 shadow-[0_10px_26px_rgba(15,23,42,0.06),0_24px_56px_rgba(15,23,42,0.08)] backdrop-blur-sm grid-cols-[56%_44%] animate-[liftIn_260ms_ease-out_both] max-[1199px]:grid-cols-[52%_48%] max-[960px]:h-auto max-[960px]:min-h-[calc(100dvh-28px)] max-[960px]:grid-cols-1 max-[560px]:min-h-[calc(100vh-20px)] max-[560px]:rounded-[18px]"
          style={{
            height: 'min(720px, calc(100vh - 120px))',
            minHeight: '580px',
          }}
          aria-label="知项登录入口"
        >
          <LoginHeroPanel />
          <LoginFormPanel
            form={form}
            loading={loading}
            onSubmit={handleSubmit}
            onForgotPassword={handleForgotPassword}
          />
        </main>
      </Content>
    </Layout>
  );
};
