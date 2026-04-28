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
    <section className="relative z-1 flex flex-col bg-[#FBFDFC] p-[clamp(34px,4vw,58px)] max-[960px]:px-6 max-[960px]:py-8 max-[560px]:px-5 max-[560px]:py-6">
      <div className="mx-auto flex w-full max-w-[28rem] flex-1 flex-col">
        <div className="mb-7">
          <div className="mb-8 flex justify-end max-[560px]:mb-6 max-[560px]:justify-start">
            <div className="inline-flex w-fit items-center rounded-full bg-[#EDF5F3] p-1 shadow-[inset_0_0_0_1px_rgba(111,142,137,0.16)]">
              {LOGIN_LOCALE_OPTIONS.map((option) => {
                const active = option.locale === locale;

                return (
                  <button
                    key={option.locale}
                    type="button"
                    className={[
                      'min-h-8 rounded-full px-3 py-1 text-xs font-semibold transition-[background-color,color,box-shadow,transform] duration-150 active:scale-[0.96]',
                      active
                        ? 'bg-white text-[#163A36] shadow-[0_2px_8px_rgba(28,48,64,0.10)]'
                        : 'text-[#6F8E89] [@media(hover:hover)]:hover:text-[#243635]',
                    ].join(' ')}
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
            className="m-0! text-[clamp(36px,4vw,46px)]! font-[760]! leading-[1.03]! tracking-[-0.02em]! text-[#0F172A]! max-[560px]:text-[32px]!"
          >
            {isRegisterMode ? t('register.title') : t('login.title')}
          </Typography.Title>
          <Typography.Paragraph className="mb-0! mt-3! text-body! leading-relaxed! text-[#607670]!">
            {isRegisterMode ? t('register.subtitle') : t('login.subtitle')}
          </Typography.Paragraph>
          <div className="mt-3 inline-flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-[#607670]">
            <span>{isRegisterMode ? t('register.hasAccount') : t('login.noAccount')}</span>
            <button
              type="button"
              onClick={() => onModeChange(isRegisterMode ? 'login' : 'register')}
              className="cursor-pointer border-none bg-transparent p-0 font-semibold text-[#168E7B] transition-opacity [@media(hover:hover)]:hover:opacity-80"
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
              <div className="text-sm text-[#7C9691]">{t('register.directEntryHint')}</div>
            ) : (
              <Button
                className="p-0! font-medium! transition-opacity! [@media(hover:hover)]:hover:opacity-80!"
                type="link"
                style={{ color: KNOWJECT_BRAND.primaryText }}
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
              className="h-[54px]! rounded-hero! border-none! text-base! font-bold! transition-[box-shadow,transform,background-color]! duration-200! [@media(hover:hover)]:hover:-translate-y-px! active:scale-[0.96]!"
              style={{
                background: '#123765',
                boxShadow: '0 12px 24px rgba(18,55,101,0.18)',
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
        <Typography.Paragraph className="mb-0! mt-auto! pt-7 text-center text-sm! text-[#607670]! max-[960px]:pt-6">
          {t('register.hasAccount')}
          <button
            type="button"
            onClick={() => onModeChange('login')}
            className="cursor-pointer border-none bg-transparent p-0 font-semibold text-[#168E7B] transition-opacity [@media(hover:hover)]:hover:opacity-80"
          >
            {t('register.footerAction')}
          </button>
        </Typography.Paragraph>
      ) : (
        <Typography.Paragraph className="mb-0! mt-auto! pt-7 text-center text-sm! text-[#607670]! max-[960px]:pt-6">
          {t('actions.help')}
          <button
            type="button"
            onClick={onForgotPassword}
            className="cursor-pointer border-none bg-transparent p-0 font-semibold text-[#168E7B] transition-opacity [@media(hover:hover)]:hover:opacity-80"
          >
            {t('actions.contactSupport')}
          </button>
        </Typography.Paragraph>
      )}
    </section>
  );
};
