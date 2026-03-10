import { Router, type RequestHandler } from 'express';
import { AppError } from '@lib/app-error.js';

interface MemoryQueryBody {
  query?: string;
  topK?: number;
}

interface MemoryItem {
  id: string;
  title: string;
  type: 'document' | 'code' | 'design';
  snippet: string;
  source: string;
  updatedAt: string;
  score: number;
}

const DEMO_ITEMS: MemoryItem[] = [
  {
    id: 'doc-01',
    title: '项目架构总览',
    type: 'document',
    snippet: '记录当前 Monorepo 结构、前后端边界、路由矩阵与兼容策略。',
    source: 'docs/architecture.md',
    updatedAt: '2026-03-09',
    score: 0.95,
  },
  {
    id: 'code-01',
    title: '登录鉴权流程',
    type: 'code',
    snippet: '前端通过 /api/auth/login 获取 token，受保护路由通过 Bearer token 校验。',
    source: 'apps/platform/src/pages/login/LoginPage.tsx',
    updatedAt: '2026-03-09',
    score: 0.91,
  },
  {
    id: 'design-01',
    title: '品牌表达与文案规范',
    type: 'design',
    snippet: '品牌名为“知项 · Knowject”，slogan 为“让项目知识，真正为团队所用”。',
    source: 'docs/design/knowject-wordmark-philosophy.md',
    updatedAt: '2026-03-09',
    score: 0.88,
  },
  {
    id: 'doc-02',
    title: '本地联调 API 说明',
    type: 'document',
    snippet: 'health、auth、memory 接口用于本地联调与演示，不直接驱动项目态页面内容。',
    source: 'apps/api/README.md',
    updatedAt: '2026-03-09',
    score: 0.86,
  },
  {
    id: 'code-02',
    title: '项目资源页与全局资产分层',
    type: 'code',
    snippet: '项目资源页只展示已接入资产，全局知识库、技能、智能体页面负责资产治理与复用。',
    source: 'apps/platform/src/pages/project/ProjectResourcesPage.tsx',
    updatedAt: '2026-03-09',
    score: 0.84,
  },
];

export const createMemoryRouter = (requireAuth: RequestHandler): Router => {
  const memoryRouter = Router();

  memoryRouter.use(requireAuth);

  memoryRouter.get('/overview', (_req, res) => {
    res.json({
      projectName: '知项 · Knowject',
      slogan: '让项目知识，真正为团队所用。',
      summary:
        '知项（Knowject）是一个面向开发团队的项目级 AI 知识助手，帮助团队把文档、代码与设计上下文沉淀成可持续复用的项目记忆，让查询、理解与协作都建立在真实项目语境之上。',
      stats: {
        documents: 36,
        codeModules: 18,
        designAssets: 12,
      },
    });
  });

  memoryRouter.post('/query', (req, res) => {
    const { query, topK = 3 } = req.body as MemoryQueryBody;

    if (!query || !query.trim()) {
      throw new AppError({
        statusCode: 400,
        code: 'VALIDATION_ERROR',
        message: 'query 为必填项',
        details: {
          fields: {
            query: 'query 为必填项',
          },
        },
      });
    }

    const keyword = query.trim().toLowerCase();
    const limited = Number.isInteger(topK) && topK > 0 ? topK : 3;

    const ranked = DEMO_ITEMS.filter((item) => {
      return (
        item.title.toLowerCase().includes(keyword) ||
        item.snippet.toLowerCase().includes(keyword) ||
        item.source.toLowerCase().includes(keyword)
      );
    });

    const results = (ranked.length > 0 ? ranked : DEMO_ITEMS)
      .slice(0, limited)
      .map((item, index) => ({
        ...item,
        score: Number((item.score - index * 0.02).toFixed(2)),
      }));

    res.json({
      query: query.trim(),
      total: results.length,
      items: results,
    });
  });

  return memoryRouter;
};
