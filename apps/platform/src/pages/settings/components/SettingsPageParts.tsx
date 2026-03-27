import type { ReactNode } from 'react';
import { Card, Flex, Space, Tag, Typography } from 'antd';
import { KNOWJECT_BRAND } from '@styles/brand';

const { Paragraph, Text, Title } = Typography;

// Helper type for Tag key status color
type KeyStatusColor = 'default' | 'gold' | 'green';

const SOURCE_TAG_STYLES = {
  database: {
    borderColor: KNOWJECT_BRAND.primaryBorder,
    backgroundColor: KNOWJECT_BRAND.primarySurface,
    color: KNOWJECT_BRAND.primaryText,
  },
  environment: {
    borderColor: '#D4A017',
    backgroundColor: 'rgba(212,160,23,0.08)',
    color: '#B45309',
  },
} as const;

const KEY_TAG_STYLES: Record<KeyStatusColor, { borderColor: string; backgroundColor: string; color: string }> = {
  green: {
    borderColor: KNOWJECT_BRAND.primaryBorder,
    backgroundColor: KNOWJECT_BRAND.primarySurface,
    color: KNOWJECT_BRAND.primaryText,
  },
  gold: {
    borderColor: '#D4A017',
    backgroundColor: 'rgba(212,160,23,0.08)',
    color: '#B45309',
  },
  default: {
    borderColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
    color: '#64748b',
  },
};

export const SourceTag = ({ source, label }: { source: 'database' | 'environment'; label: ReactNode }) => (
  <Tag style={SOURCE_TAG_STYLES[source]}>
    {label}
  </Tag>
);

export const KeyStatusTag = ({ color, children }: { color: KeyStatusColor; children: ReactNode }) => (
  <Tag style={KEY_TAG_STYLES[color]}>
    {children}
  </Tag>
);

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
      className="group transition-shadow duration-200 hover:shadow-[0_8px_28px_rgba(15,42,38,0.08)]"
      style={{
        borderRadius: 20,
        border: '1px solid #C2EDE6',
        boxShadow: '0 14px 32px rgba(15, 23, 42, 0.06)',
      }}
      styles={{ body: { padding: '24px' } }}
    >
      <Flex justify="space-between" align="flex-start" gap={16} wrap>
        <div>
          <Title level={5} style={{ margin: 0, color: '#1e293b' }}>
            {title}
          </Title>
          <Paragraph
            type="secondary"
            style={{
              marginTop: 6,
              marginBottom: 0,
              fontSize: 14,
              lineHeight: 1.7,
              color: '#4A6260',
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
      <Text strong style={{ color: '#1e293b' }}>
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
