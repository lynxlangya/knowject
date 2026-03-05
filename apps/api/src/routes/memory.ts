import { Router, type NextFunction, type Request, type Response } from 'express';

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
    snippet: '记录前后端边界、模块职责与协作流程。',
    source: 'docs/architecture.md',
    updatedAt: '2026-03-05',
    score: 0.95,
  },
  {
    id: 'code-01',
    title: '登录鉴权流程',
    type: 'code',
    snippet: '前端通过 /api/auth/login 获取 token，受保护路由通过 Bearer token 校验。',
    source: 'apps/platform/src/pages/login/LoginPage.tsx',
    updatedAt: '2026-03-05',
    score: 0.91,
  },
  {
    id: 'design-01',
    title: '品牌表达与文案规范',
    type: 'design',
    snippet: '品牌名为“知项 · Knowject”，slogan 为“让项目知识，真正为团队所用”。',
    source: 'README.md',
    updatedAt: '2026-03-05',
    score: 0.88,
  },
  {
    id: 'doc-02',
    title: 'API 占位接口说明',
    type: 'document',
    snippet: 'health、auth、memory 接口用于联调与骨架验证。',
    source: 'apps/api/src/routes',
    updatedAt: '2026-03-05',
    score: 0.86,
  },
  {
    id: 'code-02',
    title: '工作台检索流程',
    type: 'code',
    snippet: 'Workspace 页面支持输入问题并渲染记忆检索结果。',
    source: 'apps/platform/src/pages/workspace/index.tsx',
    updatedAt: '2026-03-05',
    score: 0.84,
  },
];

const getTokenFromHeader = (request: Request): string | null => {
  const authHeader = request.header('authorization');
  if (!authHeader) {
    return null;
  }

  if (!authHeader.startsWith('Bearer ')) {
    return null;
  }

  return authHeader.slice('Bearer '.length).trim();
};

const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  const token = getTokenFromHeader(req);

  if (!token || !token.startsWith('knowject-token-')) {
    res.status(401).json({ message: 'unauthorized' });
    return;
  }

  next();
};

export const memoryRouter = Router();

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
    res.status(400).json({ message: 'query is required' });
    return;
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
