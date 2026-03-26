---
name: Knowject 项目概览
description: Knowject 技术栈、架构、当前状态和治理 hotspot
type: project
---

## 技术栈

- **前端**：React 19 + Vite 7 + Ant Design 6 + Tailwind CSS 4 + React Router 7
- **后端**：Express 4 + TypeScript + MongoDB Node.js Driver
- **索引服务**：FastAPI + uv（解析/分块/向量写删）
- **向量存储**：Chroma
- **Monorepo**：pnpm + Turborepo

## Monorepo 结构

```
apps/
  platform/   # 前端 React 应用
  api/        # 后端 Express API
  indexer-py/ # Python 索引服务
packages/
  request/   # @knowject/request：Axios 请求封装
  ui/        # @knowject/ui：通用 UI 组件
docker/      # 容器化基线
docs/        # 唯一正式文档主源
```

## 当前状态（2026-03-26）

### 已完成
- 认证流程（JWT + locale）
- projects CRUD + 成员接口
- skills 正式资产治理（系统内置 + 自建 + GitHub/URL 导入）
- agents CRUD + 绑定校验
- knowledge 读侧检索 + MongoDB 元数据
- projectsConversation 流式编排（SSE messages/stream）
- settings facade + helper 拆分
- overview dashboard 新增
- LocaleProvider locale 解析顺序落地

### 进行中
- chat citation UX
- stream recovery
- 前后端契约对齐

## 架构事实源

- **当前实现事实**：`docs/current/architecture.md` + 源码
- **工程治理规则**：`docs/standards/`
- **接口契约**：`docs/contracts/`
- **执行计划**：`docs/plans/`
- **AGENTS.md**：项目级协作长期指令入口

## 治理规则

- Rules 分散在 `.claude/rules/`（frontend/backend/safety/git）
- Skill 标准布局在 `.agents/skills/`
- 3 个已落地 Skill：docs-boundary-guard、knowledge-index-boundary-guard、api-contract-align-review
- Hook 配置在 `.claude/settings.local.json`

## 结构治理 Hotspot

每次改动前重新对齐职责：
- `apps/platform/src/pages/project/ProjectChatPage.tsx`
- `apps/platform/src/app/layouts/components/AppSider.tsx`
- `apps/api/src/modules/knowledge/knowledge.repository.ts`
