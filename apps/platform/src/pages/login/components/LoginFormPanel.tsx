import { IdcardOutlined, LockOutlined, UserOutlined } from '@ant-design/icons';
import { Button, Checkbox, Form, Input, Typography, type FormInstance } from 'antd';
import { KNOWJECT_BRAND } from '@styles/brand';
import {
  LOGIN_FORM_CLASS_NAME,
  type AuthMode,
  type LoginFormValues,
} from '@pages/login/constants';

interface LoginFormPanelProps {
  form: FormInstance<LoginFormValues>;
  mode: AuthMode;
  loading: boolean;
  onModeChange: (mode: AuthMode) => void;
  onSubmit: (values: LoginFormValues) => void | Promise<void>;
  onForgotPassword: () => void;
}

export const LoginFormPanel = ({
  form,
  mode,
  loading,
  onModeChange,
  onSubmit,
  onForgotPassword,
}: LoginFormPanelProps) => {
  const isRegisterMode = mode === 'register';
  const passwordRules = isRegisterMode
    ? [
        { required: true, message: '请输入至少 8 位密码' },
        { min: 8, message: '密码至少需要 8 位' },
      ]
    : [{ required: true, message: '请输入登录密码' }];

  return (
    <section className="relative z-1 flex flex-col p-[clamp(30px,3.6vw,52px)] max-[960px]:px-5.5 max-[960px]:py-7 max-[560px]:px-3.5 max-[560px]:py-5.5">
      <div>
        <div className="mb-6">
          <Typography.Title
            level={2}
            className="m-0! text-[52px]! font-[780]! leading-[1.04]! tracking-[-0.02em]! text-slate-900! max-[1199px]:text-[46px]! max-[960px]:text-[38px]! max-[560px]:text-[30px]!"
          >
            {isRegisterMode ? '创建账号' : '欢迎回来'}
          </Typography.Title>
          <Typography.Paragraph className="mb-0! mt-2.5! text-[15px]! text-slate-500!">
            {isRegisterMode ? '创建你的第一个知项账号并直接进入系统' : '请输入用户名和密码以继续'}
          </Typography.Paragraph>
          <div className="mt-3 inline-flex items-center gap-2 text-sm text-slate-500">
            <span>{isRegisterMode ? '已经有账号？' : '还没有账号？'}</span>
            <button
              type="button"
              onClick={() => onModeChange(isRegisterMode ? 'login' : 'register')}
              className="cursor-pointer border-none bg-transparent p-0 font-semibold transition-opacity hover:opacity-90"
              style={{ color: KNOWJECT_BRAND.primaryHover }}
            >
              {isRegisterMode ? '去登录' : '立即注册'}
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
              label="显示名称"
              name="name"
              rules={[{ required: true, message: '请输入显示名称' }]}
            >
              <Input
                placeholder="请输入显示名称"
                prefix={<IdcardOutlined />}
                size="large"
              />
            </Form.Item>
          ) : null}

          <Form.Item
            label="用户名"
            name="username"
            rules={[{ required: true, message: '请输入用户名' }]}
          >
            <Input
              placeholder="请输入用户名"
              prefix={<UserOutlined />}
              size="large"
            />
          </Form.Item>

          <Form.Item
            label={isRegisterMode ? '设置密码' : '登录密码'}
            name="password"
            rules={passwordRules}
          >
            <Input.Password
              placeholder={isRegisterMode ? '请输入至少 8 位密码' : '请输入登录密码'}
              prefix={<LockOutlined />}
              size="large"
            />
          </Form.Item>

          {isRegisterMode ? (
            <Form.Item
              label="确认密码"
              name="confirmPassword"
              dependencies={['password']}
              rules={[
                { required: true, message: '请再次输入密码' },
                ({ getFieldValue }) => ({
                  validator: (_, value) => {
                    if (!value || getFieldValue('password') === value) {
                      return Promise.resolve();
                    }

                    return Promise.reject(new Error('两次输入的密码不一致'));
                  },
                }),
              ]}
            >
              <Input.Password
                placeholder="请再次输入密码"
                prefix={<LockOutlined />}
                size="large"
              />
            </Form.Item>
          ) : null}

          <div className="my-0.5 mb-5.5 flex items-center justify-between">
            <Form.Item name="remember" valuePropName="checked" noStyle>
              <Checkbox>记住用户名</Checkbox>
            </Form.Item>

            {isRegisterMode ? (
              <div className="text-sm text-slate-400">注册后将直接进入系统</div>
            ) : (
              <Button
                className="p-0! font-medium! hover:opacity-90!"
                type="link"
                style={{ color: KNOWJECT_BRAND.primary }}
                onClick={onForgotPassword}
              >
                忘记密码？
              </Button>
            )}
          </div>

          <Form.Item className="mb-0!">
            <Button
              type="primary"
              htmlType="submit"
              className="h-14! rounded-[28px]! border-none! text-base! font-bold! tracking-[0.01em]! transition-all! duration-200! hover:-translate-y-px! active:translate-y-0!"
              style={{
                backgroundImage: KNOWJECT_BRAND.navGradient,
                boxShadow: `0 8px 20px ${KNOWJECT_BRAND.primaryGlow}, inset 0 0 0 1px rgba(255,255,255,0.34)`,
              }}
              loading={loading}
              block
            >
              {isRegisterMode ? '创建并进入' : '登录系统'}
            </Button>
          </Form.Item>
        </Form>
      </div>

      {isRegisterMode ? (
        <Typography.Paragraph className="mb-0! mt-auto! pt-8 text-center text-sm! text-slate-500!">
          已经有账号？
          <button
            type="button"
            onClick={() => onModeChange('login')}
            className="cursor-pointer border-none bg-transparent p-0 font-semibold transition-opacity hover:opacity-90"
            style={{ color: KNOWJECT_BRAND.primaryHover }}
          >
            直接登录
          </button>
        </Typography.Paragraph>
      ) : (
        <Typography.Paragraph className="mb-0! mt-auto! pt-8 text-center text-sm! text-slate-500!">
          需要帮助？
          <button
            type="button"
            onClick={onForgotPassword}
            className="cursor-pointer border-none bg-transparent p-0 font-semibold transition-opacity hover:opacity-90"
            style={{ color: KNOWJECT_BRAND.primaryHover }}
          >
            联系技术支持
          </button>
        </Typography.Paragraph>
      )}
    </section>
  );
};
