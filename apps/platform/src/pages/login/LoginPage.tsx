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
import { useLocale } from '@app/providers/locale.context';
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
              locale,
            } satisfies RegisterRequest)
          : await login({
              username,
              password: values.password,
              locale,
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

  const loginShellClassName = [
    'flow-anim relative z-10 grid w-full max-w-[70rem] overflow-hidden rounded-shell bg-white shadow-[0_18px_48px_rgba(28,48,64,0.10),0_2px_10px_rgba(28,48,64,0.05)] grid-cols-[43%_57%] animate-[liftIn_260ms_ease-out_both]',
    mode === 'register'
      ? 'h-auto min-h-[min(760px,calc(100dvh-48px))]'
      : 'h-[min(660px,calc(100dvh-88px))] min-h-[35rem]',
    'max-[1080px]:grid-cols-[40%_60%] max-[960px]:h-auto max-[960px]:min-h-0 max-[960px]:grid-cols-1 max-[560px]:rounded-panel',
  ].join(' ');

  return (
    <Layout
      className="min-h-screen"
      style={{
        backgroundImage: LOGIN_PAGE_BACKGROUND,
        minHeight: '100dvh',
      }}
    >
      <Content
        className="relative grid place-items-center overflow-y-auto overflow-x-hidden px-6 py-6 max-[960px]:items-start max-[960px]:px-3.5 max-[960px]:py-5 max-[560px]:px-2.5 max-[560px]:py-3"
        style={{
          minHeight: '100dvh',
        }}
      >
        <LoginFlowBackground />

        <main
          className={loginShellClassName}
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
