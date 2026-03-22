import { App, Form, Layout } from 'antd';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { isApiError } from '@knowject/request';
import {
  login,
  register,
  type LoginRequest,
  type RegisterRequest,
} from '@api/auth';
import { setAuthSession } from '@app/auth/user';
import { PATHS } from '@app/navigation/paths';
import {
  useLocale,
} from '@app/providers/LocaleProvider';
import {
  type SupportedLocale,
  writeGuestLocale,
} from '@app/providers/locale.storage';
import { LoginFlowBackground } from './components/LoginFlowBackground';
import { LoginFormPanel } from './components/LoginFormPanel';
import { LoginHeroPanel } from './components/LoginHeroPanel';
import {
  getRememberedUsername,
  LOGIN_PAGE_BACKGROUND,
  persistRememberedUsername,
  type AuthMode,
  type LoginFormValues,
} from './constants';

const { Content } = Layout;

export const LoginPage = () => {
  const [form] = Form.useForm<LoginFormValues>();
  const navigate = useNavigate();
  const { message } = App.useApp();
  const { t } = useTranslation('auth');
  const { locale, setLocale } = useLocale();
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<AuthMode>('login');

  const resetForm = useCallback(() => {
    const rememberedUsername = getRememberedUsername();
    form.resetFields();
    form.setFieldsValue({
      name: '',
      username: rememberedUsername,
      password: '',
      confirmPassword: '',
      remember: true,
    });
  }, [form]);

  useEffect(() => {
    resetForm();
  }, [mode, resetForm]);

  const handleModeChange = (nextMode: AuthMode) => {
    setMode(nextMode);
  };

  const handleGuestLocaleChange = async (nextLocale: SupportedLocale) => {
    if (nextLocale === locale) {
      return;
    }

    writeGuestLocale(nextLocale);
    await setLocale(nextLocale, 'guest');
  };

  const handleSubmit = async (values: LoginFormValues) => {
    setLoading(true);

    try {
      const username = values.username.trim();

      const result =
        mode === 'register'
          ? await register({
              username,
              password: values.password,
              name: values.name?.trim() ?? '',
            } satisfies RegisterRequest)
          : await login({
              username,
              password: values.password,
            } satisfies LoginRequest);

      persistRememberedUsername(username, values.remember);
      await setLocale(result.user.locale, 'account');

      setAuthSession({
        token: result.token,
        user: result.user,
      });
      message.success(
        mode === 'register'
          ? t('messages.registerSuccess', { name: result.user.name })
          : t('messages.loginSuccess', { name: result.user.name })
      );
      void navigate(PATHS.home, { replace: true });
    } catch (error) {
      console.error(error);
      message.error(
        isApiError(error)
          ? error.message
          : mode === 'register'
            ? t('messages.registerFailed')
            : t('messages.loginFailed')
      );
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = () => {
    message.info(t('messages.forgotPassword'));
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
          className="flow-anim relative z-10 grid w-full max-w-295 overflow-hidden rounded-shell border border-slate-200/95 bg-white/85 shadow-[0_10px_26px_rgba(15,23,42,0.06),0_24px_56px_rgba(15,23,42,0.08)] backdrop-blur-sm grid-cols-[56%_44%] animate-[liftIn_260ms_ease-out_both] max-[1199px]:grid-cols-[52%_48%] max-[960px]:h-auto max-[960px]:min-h-[calc(100dvh-28px)] max-[960px]:grid-cols-1 max-[560px]:min-h-[calc(100vh-20px)] max-[560px]:rounded-panel"
          style={{
            height: 'min(720px, calc(100vh - 120px))',
            minHeight: '580px',
          }}
          aria-label="知项登录入口"
        >
          <LoginHeroPanel />
          <LoginFormPanel
            form={form}
            locale={locale}
            mode={mode}
            loading={loading}
            onModeChange={handleModeChange}
            onLocaleChange={handleGuestLocaleChange}
            onSubmit={handleSubmit}
            onForgotPassword={handleForgotPassword}
          />
        </main>
      </Content>
    </Layout>
  );
};
