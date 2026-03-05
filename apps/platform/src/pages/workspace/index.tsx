import { App, Button, Card, Empty, Input, List, Space, Tag, Typography } from 'antd';
import { useEffect, useState } from 'react';
import {
  getMemoryOverview,
  queryMemory,
  type MemoryItem,
  type MemoryOverviewResponse,
} from '../../api/memory';

export const WorkspacePage = () => {
  const { message } = App.useApp();
  const [overview, setOverview] = useState<MemoryOverviewResponse | null>(null);
  const [query, setQuery] = useState('');
  const [loadingOverview, setLoadingOverview] = useState(false);
  const [loadingQuery, setLoadingQuery] = useState(false);
  const [items, setItems] = useState<MemoryItem[]>([]);

  useEffect(() => {
    const loadOverview = async () => {
      setLoadingOverview(true);
      try {
        const data = await getMemoryOverview();
        setOverview(data);
      } catch (error) {
        console.error(error);
        message.error('加载项目记忆概览失败');
      } finally {
        setLoadingOverview(false);
      }
    };

    void loadOverview();
  }, [message]);

  const handleQuery = async () => {
    const keyword = query.trim();
    if (!keyword) {
      message.warning('请输入要检索的项目问题');
      return;
    }

    setLoadingQuery(true);
    try {
      const result = await queryMemory({ query: keyword, topK: 5 });
      setItems(result.items);
    } catch (error) {
      console.error(error);
      message.error('项目记忆检索失败');
    } finally {
      setLoadingQuery(false);
    }
  };

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <Card loading={loadingOverview}>
        <Typography.Title level={4} style={{ marginBottom: 8 }}>
          {overview?.projectName ?? '知项 · Knowject'}
        </Typography.Title>
        <Typography.Paragraph style={{ marginBottom: 8 }}>
          {overview?.summary ??
            '知项（Knowject）是一个面向开发团队的项目级 AI 知识助手，帮助团队把文档、代码与设计上下文沉淀成可持续复用的项目记忆，让查询、理解与协作都建立在真实项目语境之上。'}
        </Typography.Paragraph>
        <Space wrap>
          <Tag color="blue">文档 {overview?.stats.documents ?? 0}</Tag>
          <Tag color="purple">代码模块 {overview?.stats.codeModules ?? 0}</Tag>
          <Tag color="geekblue">设计资产 {overview?.stats.designAssets ?? 0}</Tag>
        </Space>
      </Card>

      <Card title="项目记忆检索">
        <Space.Compact style={{ width: '100%', marginBottom: 16 }}>
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="例如：登录流程、接口约定、组件边界"
            onPressEnter={() => {
              void handleQuery();
            }}
          />
          <Button type="primary" loading={loadingQuery} onClick={() => void handleQuery()}>
            查询
          </Button>
        </Space.Compact>

        {items.length === 0 ? (
          <Empty description="还没有检索结果，请先输入问题" />
        ) : (
          <List
            dataSource={items}
            renderItem={(item) => (
              <List.Item key={item.id}>
                <List.Item.Meta
                  title={
                    <Space>
                      <span>{item.title}</span>
                      <Tag>{item.type}</Tag>
                    </Space>
                  }
                  description={
                    <>
                      <Typography.Paragraph style={{ marginBottom: 6 }}>
                        {item.snippet}
                      </Typography.Paragraph>
                      <Typography.Text type="secondary">
                        来源：{item.source} · 更新时间：{item.updatedAt} · 匹配分：
                        {item.score.toFixed(2)}
                      </Typography.Text>
                    </>
                  }
                />
              </List.Item>
            )}
          />
        )}
      </Card>
    </Space>
  );
};

export default WorkspacePage;
