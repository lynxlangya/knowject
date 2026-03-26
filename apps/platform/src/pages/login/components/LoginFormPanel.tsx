import { IdcardOutlined, LockOutlined, UserOutlined } from '@ant-design/icons';
import { Button, Checkbox, Form, Input, Typography, type FormInstance } from 'antd';
import type { KeyboardEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { KNOWJECT_BRAND } from '@styles/brand';
import type { SupportedLocale } from '@app/providers/locale.storage';
import {
  LOGIN_FORM_CLASS_NAME,
  LOGIN_LOCALE_OPTIONS,
  type AuthMode,
  type LoginFormValues,
} from '@pages/login/constants';

interface LoginFormPanelProps {
  form: FormInstance<LoginFormValues>;
  locale: SupportedLocale;
  mode: AuthMode;
  loading: boolean;
  onModeChange: (mode: AuthMode) => void;
  onLocaleChange: (locale: SupportedLocale) => void | Promise<void>;
  onSubmit: (values: LoginFormValues) => void | Promise<void>;
  onForgotPassword: () => void;
}

export const LoginFormPanel = ({
  form,
  locale,
  mode,
  loading,
  onModeChange,
  onLocaleChange,
  onSubmit,
  onForgotPassword,
}: LoginFormPanelProps) => {
  const { t } = useTranslation('auth');
  const isRegisterMode = mode === 'register';
  const passwordRules = isRegisterMode
    ? [
        { required: true, message: t('validation.passwordRequired') },
        { min: 8, message: t('validation.passwordMinLength') },
      ]
    : [{ required: true, message: t('validation.passwordRequired') }];
  const handlePressEnter = (event: KeyboardEvent<HTMLInputElement>) => {
    event.preventDefault();
    void form.submit();
  };

  return (
    <section className="relative z-1 flex flex-col p-[clamp(30px,3.6vw,52px)] max-[960px]:px-5.5 max-[960px]:py-7 max-[560px]:px-3.5 max-[560px]:py-5.5">
      <div>
        <div className="mb-6">
          <div className="mb-5 flex items-start justify-between gap-4 max-[560px]:flex-col max-[560px]:items-stretch">
            <div className="inline-flex w-fit items-center rounded-full border border-slate-200/80 bg-white/85 p-1 shadow-[0_10px_24px_rgba(15,23,42,0.05)]">
              {LOGIN_LOCALE_OPTIONS.map((option) => {
                const active = option.locale === locale;

                return (
                  <button
                    key={option.locale}
                    type="button"
                    className={[
                      'rounded-full px-3 py-1.5 text-xs font-semibold tracking-[0.01em] transition-colors',
                      active
                        ? 'text-white! shadow-[0_8px_18px_rgba(27,80,183,0.24)]'
                        : 'text-slate-500 hover:text-slate-900',
                    ].join(' ')}
                    style={
                      active
                        ? {
                            backgroundImage: KNOWJECT_BRAND.navGradient,
                          }
                        : undefined
                    }
                    onClick={() => {
                      void onLocaleChange(option.locale);
                    }}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          </div>

          <Typography.Title
            level={2}
            className="m-0! text-display-lg! font-[780]! leading-[1.04]! tracking-[-0.02em]! text-slate-900! max-[1199px]:text-[46px]! max-[960px]:text-[38px]! max-[560px]:text-3xl!"
          >
            {isRegisterMode ? t('register.title') : t('login.title')}
          </Typography.Title>
          <Typography.Paragraph className="mb-0! mt-2.5! text-body! text-slate-500!">
            {isRegisterMode ? t('register.subtitle') : t('login.subtitle')}
          </Typography.Paragraph>
          <div className="mt-3 inline-flex items-center gap-2 text-sm text-slate-500">
            <span>{isRegisterMode ? t('register.hasAccount') : t('login.noAccount')}</span>
            <button
              type="button"
              onClick={() => onModeChange(isRegisterMode ? 'login' : 'register')}
              className="cursor-pointer border-none bg-transparent p-0 font-semibold transition-opacity hover:opacity-90"
              style={{ color: KNOWJECT_BRAND.primaryHover }}
            >
              {isRegisterMode ? t('register.action') : t('login.action')}
            </button>
          </div>
        </div>

        <Form<LoginFormValues>
          form={form}
          className={LOGIN_FORM_CLASS_NAME}
          layout="vertical"
          requiredMark={false}
          onFinish={onSubmit}
          autoComplete="off"
        >
          {isRegisterMode ? (
            <Form.Item
              label={t('fields.displayNameLabel')}
              name="name"
              rules={[{ required: true, message: t('validation.displayNameRequired') }]}
            >
              <Input
                placeholder={t('fields.displayNamePlaceholder')}
                prefix={<IdcardOutlined />}
                size="large"
                onPressEnter={handlePressEnter}
              />
            </Form.Item>
          ) : null}

          <Form.Item
            label={t('fields.usernameLabel')}
            name="username"
            rules={[{ required: true, message: t('validation.usernameRequired') }]}
          >
            <Input
              placeholder={t('fields.usernamePlaceholder')}
              prefix={<UserOutlined />}
              size="large"
              onPressEnter={handlePressEnter}
            />
          </Form.Item>

          <Form.Item
            label={isRegisterMode ? t('register.passwordLabel') : t('login.passwordLabel')}
            name="password"
            rules={passwordRules}
          >
            <Input.Password
              placeholder={
                isRegisterMode
                  ? t('register.passwordPlaceholder')
                  : t('login.passwordPlaceholder')
              }
              prefix={<LockOutlined />}
              size="large"
              onPressEnter={handlePressEnter}
            />
          </Form.Item>

          {isRegisterMode ? (
            <Form.Item
              label={t('fields.confirmPasswordLabel')}
              name="confirmPassword"
              dependencies={['password']}
              rules={[
                { required: true, message: t('validation.confirmPasswordRequired') },
                ({ getFieldValue }) => ({
                  validator: (_, value) => {
                    if (!value || getFieldValue('password') === value) {
                      return Promise.resolve();
                    }

                    return Promise.reject(
                      new Error(t('validation.confirmPasswordMismatch')),
                    );
                  },
                }),
              ]}
            >
              <Input.Password
                placeholder={t('fields.confirmPasswordPlaceholder')}
                prefix={<LockOutlined />}
                size="large"
                onPressEnter={handlePressEnter}
              />
            </Form.Item>
          ) : null}

          <div className="my-0.5 mb-5.5 flex items-center justify-between">
            <Form.Item name="remember" valuePropName="checked" noStyle>
              <Checkbox>{t('actions.rememberUsername')}</Checkbox>
            </Form.Item>

            {isRegisterMode ? (
              <div className="text-sm text-slate-400">{t('register.directEntryHint')}</div>
            ) : (
              <Button
                className="p-0! font-medium! hover:opacity-90!"
                type="link"
                style={{ color: KNOWJECT_BRAND.primary }}
                onClick={onForgotPassword}
              >
                {t('actions.forgotPassword')}
              </Button>
            )}
          </div>

          <Form.Item className="mb-0!">
            <Button
              type="primary"
              htmlType="submit"
              className="h-14! rounded-hero! border-none! text-base! font-bold! tracking-[0.01em]! transition-all! duration-200! hover:-translate-y-px! active:translate-y-0!"
              style={{
                backgroundImage: KNOWJECT_BRAND.navGradient,
                boxShadow: `0 8px 20px ${KNOWJECT_BRAND.primaryGlow}, inset 0 0 0 1px rgba(255,255,255,0.34)`,
              }}
              loading={loading}
              block
            >
              {isRegisterMode ? t('register.submit') : t('login.submit')}
            </Button>
          </Form.Item>
        </Form>
      </div>

      {isRegisterMode ? (
        <Typography.Paragraph className="mb-0! mt-auto! pt-8 text-center text-sm! text-slate-500!">
          {t('register.hasAccount')}
          <button
            type="button"
            onClick={() => onModeChange('login')}
            className="cursor-pointer border-none bg-transparent p-0 font-semibold transition-opacity hover:opacity-90"
            style={{ color: KNOWJECT_BRAND.primaryHover }}
          >
            {t('register.footerAction')}
          </button>
        </Typography.Paragraph>
      ) : (
        <Typography.Paragraph className="mb-0! mt-auto! pt-8 text-center text-sm! text-slate-500!">
          {t('actions.help')}
          <button
            type="button"
            onClick={onForgotPassword}
            className="cursor-pointer border-none bg-transparent p-0 font-semibold transition-opacity hover:opacity-90"
            style={{ color: KNOWJECT_BRAND.primaryHover }}
          >
            {t('actions.contactSupport')}
          </button>
        </Typography.Paragraph>
      )}
    </section>
  );
};
