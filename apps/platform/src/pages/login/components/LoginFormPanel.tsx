import { LockOutlined, UserOutlined } from '@ant-design/icons';
import { Button, Checkbox, Form, Input, Typography, type FormInstance } from 'antd';
import { KNOWJECT_BRAND } from '../../../styles/brand';
import { LOGIN_FORM_CLASS_NAME, type LoginFormValues } from '../constants';

interface LoginFormPanelProps {
  form: FormInstance<LoginFormValues>;
  loading: boolean;
  onSubmit: (values: LoginFormValues) => void | Promise<void>;
  onForgotPassword: () => void;
}

export const LoginFormPanel = ({
  form,
  loading,
  onSubmit,
  onForgotPassword,
}: LoginFormPanelProps) => {
  return (
    <section className="relative z-1 flex flex-col p-[clamp(30px,3.6vw,52px)] max-[960px]:px-5.5 max-[960px]:py-7 max-[560px]:px-3.5 max-[560px]:py-5.5">
      <div>
        <div className="mb-6">
          <Typography.Title
            level={2}
            className="m-0! text-[52px]! font-[780]! leading-[1.04]! tracking-[-0.02em]! text-slate-900! max-[1199px]:text-[46px]! max-[960px]:text-[38px]! max-[560px]:text-[30px]!"
          >
            欢迎回来
          </Typography.Title>
          <Typography.Paragraph className="mb-0! mt-2.5! text-[15px]! text-slate-500!">
            请输入您的用户名以继续
          </Typography.Paragraph>
        </div>

        <Form<LoginFormValues>
          form={form}
          className={LOGIN_FORM_CLASS_NAME}
          layout="vertical"
          requiredMark={false}
          onFinish={onSubmit}
          autoComplete="off"
        >
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
            label="登录密码"
            name="password"
            rules={[{ required: true, message: '请输入登录密码' }]}
          >
            <Input.Password
              placeholder="请输入登录密码"
              prefix={<LockOutlined />}
              size="large"
            />
          </Form.Item>

          <div className="my-0.5 mb-5.5 flex items-center justify-between">
            <Form.Item name="remember" valuePropName="checked" noStyle>
              <Checkbox>保持登录</Checkbox>
            </Form.Item>

            <Button
              className="p-0! font-medium! hover:opacity-90!"
              type="link"
              style={{ color: KNOWJECT_BRAND.primary }}
              onClick={onForgotPassword}
            >
              忘记密码？
            </Button>
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
              登录系统
            </Button>
          </Form.Item>
        </Form>
      </div>

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
    </section>
  );
};
