import type { ChatMessage, ConversationSummary } from '../../app/project/project.types';

const CONVERSATIONS_BY_PROJECT: Record<string, ConversationSummary[]> = {
  'project-mobile-rebuild': [
    {
      id: 'conv-mobile-1',
      projectId: 'project-mobile-rebuild',
      title: '移动端应用重构',
      updatedAt: '2026-03-05 17:20',
      preview: '讨论移动端重构的里程碑与风险控制方案。',
    },
    {
      id: 'conv-mobile-2',
      projectId: 'project-mobile-rebuild',
      title: 'UI 组件库迁移策略',
      updatedAt: '2026-03-05 11:40',
      preview: '评估现有组件与新设计系统之间的兼容差异。',
    },
    {
      id: 'conv-mobile-3',
      projectId: 'project-mobile-rebuild',
      title: '接口收敛清单',
      updatedAt: '2026-03-04 22:18',
      preview: '梳理旧接口与新域模型映射，明确淘汰节奏。',
    },
  ],
  'project-api-v2': [
    {
      id: 'conv-api-1',
      projectId: 'project-api-v2',
      title: 'API V2 迁移规划',
      updatedAt: '2026-03-05 16:08',
      preview: '确定兼容窗口、切流比例和回滚门槛。',
    },
    {
      id: 'conv-api-2',
      projectId: 'project-api-v2',
      title: '鉴权字段统一',
      updatedAt: '2026-03-05 09:22',
      preview: '收敛 header 与 token 规则，降低联调成本。',
    },
  ],
  'project-marketing-site': [
    {
      id: 'conv-marketing-1',
      projectId: 'project-marketing-site',
      title: '营销网站改版',
      updatedAt: '2026-03-04 21:35',
      preview: '对齐品牌表达、增长目标与落地页转化漏斗。',
    },
  ],
};

const MESSAGES_BY_CONVERSATION: Record<string, ChatMessage[]> = {
  'conv-mobile-1': [
    {
      id: 'msg-mobile-1',
      conversationId: 'conv-mobile-1',
      role: 'user',
      content: '我们需要先确定移动端重构的阶段目标，避免一次性大改导致风险过高。',
      createdAt: '2026-03-05 16:58',
    },
    {
      id: 'msg-mobile-2',
      conversationId: 'conv-mobile-1',
      role: 'assistant',
      content:
        '建议分三阶段推进：1) 路由与布局重构；2) 组件替换与样式统一；3) 业务流程联调。每阶段设置可回滚检查点。',
      createdAt: '2026-03-05 16:59',
    },
    {
      id: 'msg-mobile-3',
      conversationId: 'conv-mobile-1',
      role: 'user',
      content: '先锁定第一阶段交付清单，确保团队能在本周内验证结果。',
      createdAt: '2026-03-05 17:00',
    },
  ],
  'conv-mobile-2': [
    {
      id: 'msg-mobile-ui-1',
      conversationId: 'conv-mobile-2',
      role: 'assistant',
      content: '当前组件差异主要集中在表单、抽屉和图表模块，建议先做兼容层。',
      createdAt: '2026-03-05 11:40',
    },
  ],
  'conv-mobile-3': [
    {
      id: 'msg-mobile-api-1',
      conversationId: 'conv-mobile-3',
      role: 'assistant',
      content: '接口收敛建议优先处理登录、项目查询和会话检索三条主链路。',
      createdAt: '2026-03-04 22:18',
    },
  ],
  'conv-api-1': [
    {
      id: 'msg-api-1',
      conversationId: 'conv-api-1',
      role: 'user',
      content: '请给出 API V2 切流策略，要求支持灰度并可快速回滚。',
      createdAt: '2026-03-05 16:07',
    },
    {
      id: 'msg-api-2',
      conversationId: 'conv-api-1',
      role: 'assistant',
      content: '建议以租户维度灰度：10% -> 30% -> 60% -> 100%，每阶段观察错误率与延迟，超阈值自动回切。',
      createdAt: '2026-03-05 16:08',
    },
  ],
  'conv-api-2': [
    {
      id: 'msg-api-auth-1',
      conversationId: 'conv-api-2',
      role: 'assistant',
      content: '统一使用 Bearer Token，弃用 query token，并在网关层追加格式校验。',
      createdAt: '2026-03-05 09:22',
    },
  ],
  'conv-marketing-1': [
    {
      id: 'msg-marketing-1',
      conversationId: 'conv-marketing-1',
      role: 'assistant',
      content: '改版目标建议聚焦“价值表达 + 社会证明 + CTA 转化”三块主模块。',
      createdAt: '2026-03-04 21:35',
    },
  ],
};

export const getConversationsByProject = (projectId: string): ConversationSummary[] => {
  return CONVERSATIONS_BY_PROJECT[projectId] ?? [];
};

export const getMessagesByConversation = (conversationId: string): ChatMessage[] => {
  return MESSAGES_BY_CONVERSATION[conversationId] ?? [];
};
