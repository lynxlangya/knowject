import type { ReactNode } from 'react';
import { Card, Flex, Space, Typography } from 'antd';

const { Paragraph, Text, Title } = Typography;

export const SectionBlock = ({
  title,
  description,
  extra,
  children,
}: {
  title: string;
  description: string;
  extra?: ReactNode;
  children: ReactNode;
}) => {
  return (
    <Card
      style={{
        borderRadius: 20,
        boxShadow: '0 14px 32px rgba(15, 23, 42, 0.06)',
      }}
    >
      <Flex justify="space-between" align="flex-start" gap={16} wrap>
        <div style={{ maxWidth: 640 }}>
          <Title level={5} style={{ margin: 0, color: '#0f172a' }}>
            {title}
          </Title>
          <Paragraph
            type="secondary"
            style={{
              marginTop: 6,
              marginBottom: 0,
              fontSize: 14,
              lineHeight: 1.7,
              color: 'rgba(100, 116, 139, 0.94)',
            }}
          >
            {description}
          </Paragraph>
        </div>
        {extra}
      </Flex>

      <div style={{ marginTop: 20 }}>{children}</div>
    </Card>
  );
};

export const SettingField = ({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: ReactNode;
  children: ReactNode;
}) => {
  return (
    <Space orientation="vertical" size={8} style={{ width: '100%' }}>
      <Text strong style={{ color: '#0f172a' }}>
        {label}
      </Text>
      {children}
      {hint ? (
        <Text type="secondary" style={{ display: 'block' }}>
          {hint}
        </Text>
      ) : null}
    </Space>
  );
};
