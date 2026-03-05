import {
  App,
  Button,
  Checkbox,
  Form,
  Input,
  Layout,
  Typography,
} from 'antd';
import {
  CheckCircleOutlined,
  LockOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { login, type LoginRequest } from '../../api/auth';
import { setToken } from '../../app/auth/token';
import { PATHS } from '../../app/navigation/paths';
import styles from './LoginPage.module.css';

const { Content } = Layout;

const REMEMBERED_USERNAME_KEY = 'knowject_remembered_username';

interface LoginFormValues {
  username: string;
  password: string;
  remember?: boolean;
}

const getRememberedUsername = (): string => {
  if (typeof window === 'undefined') {
    return '';
  }

  return localStorage.getItem(REMEMBERED_USERNAME_KEY) ?? '';
};

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

      if (values.remember) {
        localStorage.setItem(REMEMBERED_USERNAME_KEY, payload.username);
      } else {
        localStorage.removeItem(REMEMBERED_USERNAME_KEY);
      }

      setToken(result.token);
      message.success(`欢迎回来，${result.user.name}`);
      navigate(PATHS.workspace, { replace: true });
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
    <Layout className={styles.page}>
      <Content className={styles.content}>
        <div className={styles.flowLayer} aria-hidden="true">
          <svg
            className={styles.flowSvg}
            viewBox="0 0 1920 1080"
            preserveAspectRatio="none"
          >
            <defs>
              <linearGradient id="knowject-flow-charge" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#60A5FA" stopOpacity="0.04" />
                <stop offset="62%" stopColor="#38BDF8" stopOpacity="0.9" />
                <stop offset="100%" stopColor="#E0F2FE" stopOpacity="1" />
              </linearGradient>
            </defs>

            <g>
              <path className={styles.flowPath} d="M -120 60 C 20 90 130 120 250 170" />
              <path className={styles.flowPath} d="M -130 130 C 20 145 140 160 250 170" />
              <path className={styles.flowPath} d="M -120 220 C 20 210 130 190 250 170" />
              <path className={styles.flowPath} d="M -110 320 C 20 280 140 220 250 170" />
              <path className={styles.flowPath} d="M -120 470 C 20 360 150 250 250 170" />
              <path className={styles.flowPath} d="M -130 650 C 30 470 160 300 250 170" />
              <path className={styles.flowPath} d="M -140 900 C 40 620 170 360 250 170" />

              <path className={styles.flowPath} d="M 2060 80 C 1890 180 1720 380 1360 980" />
              <path className={styles.flowPath} d="M 2050 170 C 1890 250 1710 430 1360 980" />
              <path className={styles.flowPath} d="M 2040 300 C 1880 350 1700 500 1360 980" />
              <path className={styles.flowPath} d="M 2030 450 C 1880 470 1690 570 1360 980" />
              <path className={styles.flowPath} d="M 2040 620 C 1880 600 1680 650 1360 980" />
              <path className={styles.flowPath} d="M 2050 800 C 1890 730 1680 760 1360 980" />
              <path className={styles.flowPath} d="M 2060 980 C 1890 900 1680 900 1360 980" />

              <path className={`${styles.flowCharge} ${styles.charge1}`} d="M -120 60 C 20 90 130 120 250 170" />
              <path className={`${styles.flowCharge} ${styles.charge2}`} d="M -130 130 C 20 145 140 160 250 170" />
              <path className={`${styles.flowCharge} ${styles.charge3}`} d="M -120 220 C 20 210 130 190 250 170" />
              <path className={`${styles.flowCharge} ${styles.charge4}`} d="M -110 320 C 20 280 140 220 250 170" />
              <path className={`${styles.flowCharge} ${styles.charge5}`} d="M -120 470 C 20 360 150 250 250 170" />
              <path className={`${styles.flowCharge} ${styles.charge6}`} d="M -130 650 C 30 470 160 300 250 170" />
              <path className={`${styles.flowCharge} ${styles.charge7}`} d="M -140 900 C 40 620 170 360 250 170" />

              <path className={`${styles.flowCharge} ${styles.charge8}`} d="M 2060 80 C 1890 180 1720 380 1360 980" />
              <path className={`${styles.flowCharge} ${styles.charge9}`} d="M 2050 170 C 1890 250 1710 430 1360 980" />
              <path className={`${styles.flowCharge} ${styles.charge10}`} d="M 2040 300 C 1880 350 1700 500 1360 980" />
              <path className={`${styles.flowCharge} ${styles.charge11}`} d="M 2030 450 C 1880 470 1690 570 1360 980" />
              <path className={`${styles.flowCharge} ${styles.charge12}`} d="M 2040 620 C 1880 600 1680 650 1360 980" />
              <path className={`${styles.flowCharge} ${styles.charge13}`} d="M 2050 800 C 1890 730 1680 760 1360 980" />
              <path className={`${styles.flowCharge} ${styles.charge14}`} d="M 2060 980 C 1890 900 1680 900 1360 980" />
            </g>
          </svg>

          <span className={`${styles.hubCore} ${styles.hubLeft}`} />
          <span className={`${styles.hubRing} ${styles.hubLeft}`} />
          <span className={`${styles.hubCore} ${styles.hubRight}`} />
          <span className={`${styles.hubRing} ${styles.hubRight}`} />
          <span className={`${styles.spark} ${styles.sparkL1}`} />
          <span className={`${styles.spark} ${styles.sparkL2}`} />
          <span className={`${styles.spark} ${styles.sparkR1}`} />
          <span className={`${styles.spark} ${styles.sparkR2}`} />
        </div>

        <main className={styles.shell} aria-label="知项登录入口">
          <section className={styles.brandPane}>
            <div className={styles.brandContent}>
              <div className={styles.logoWrap} aria-hidden="true">
                <img src="/favicon.png" alt="" className={styles.logo} />
              </div>

              <Typography.Title level={1} className={styles.brandTitle}>
                知项 · Knowject
              </Typography.Title>

              <Typography.Paragraph className={styles.brandSubtitle}>
                让项目知识，真正为团队所用。
              </Typography.Paragraph>

              <div className={styles.featureList}>
                <div className={styles.featureItem}>
                  <CheckCircleOutlined />
                  <span>提升项目交付效率达 40%</span>
                </div>
                <div className={styles.featureItem}>
                  <CheckCircleOutlined />
                  <span>在真实语境中快速理解项目上下文</span>
                </div>
              </div>
            </div>
          </section>

          <section className={styles.loginPane}>
            <div className={styles.panelHeader}>
              <Typography.Title level={2} className={styles.welcomeTitle}>
                欢迎回来
              </Typography.Title>
              <Typography.Paragraph className={styles.welcomeDesc}>
                请输入您的用户名以继续
              </Typography.Paragraph>
            </div>

            <Form<LoginFormValues>
              form={form}
              className={styles.form}
              layout="vertical"
              requiredMark={false}
              onFinish={handleSubmit}
              autoComplete="off"
            >
              <Form.Item
                label="用户名"
                name="username"
                rules={[{ required: true, message: '请输入用户名' }]}
              >
                <Input
                  className={styles.field}
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
                  className={styles.field}
                  placeholder="请输入登录密码"
                  prefix={<LockOutlined />}
                  size="large"
                />
              </Form.Item>

              <div className={styles.assistRow}>
                <Form.Item name="remember" valuePropName="checked" noStyle>
                  <Checkbox>保持登录</Checkbox>
                </Form.Item>

                <Button
                  className={styles.linkBtn}
                  type="link"
                  onClick={handleForgotPassword}
                >
                  忘记密码？
                </Button>
              </div>

              <Form.Item className={styles.submitItem}>
                <Button
                  type="primary"
                  htmlType="submit"
                  className={styles.submitButton}
                  loading={loading}
                  block
                >
                  登录系统
                </Button>
              </Form.Item>
            </Form>

            <Typography.Paragraph className={styles.supportText}>
              需要帮助？
              <button type="button" onClick={handleForgotPassword}>
                联系技术支持
              </button>
            </Typography.Paragraph>
          </section>
        </main>
      </Content>
    </Layout>
  );
};
