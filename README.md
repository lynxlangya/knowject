# 知项 · Knowject

让项目知识，真正为团队所用。

知项（Knowject）是一个面向开发团队的项目级 AI 知识助手，目标是把文档、代码与设计上下文沉淀成可持续复用的项目记忆，让查询、理解与协作建立在真实项目语境之上。

## 当前状态

- 前端 `apps/platform` 已形成登录后产品壳、项目态页面与全局资产管理页。
- 后端 `apps/api` 当前提供本地联调与演示接口，覆盖 `health`、`auth`、`memory`，并已完成 MongoDB、用户注册/登录和 JWT 鉴权基线。
- 项目概览、对话、资源、成员等页面仍主要由前端本地 Mock 数据驱动。
- 全局 `知识库 / 技能 / 智能体` 页面当前为管理壳层，资产创建与引入流程仍是占位行为。

## 项目结构

```text
apps/
  platform/   前端应用（React + Vite + Ant Design）
  api/        本地联调与演示 API（Express + TypeScript）
packages/
  request/    HTTP 请求封装（@knowject/request）
  ui/         通用 UI 组件（@knowject/ui）
docs/
  architecture.md   当前架构事实源
  handoff-guide.md  快速接手指南
  handoff-prompt.md 交接 Prompt 模板
  design/           品牌与视觉资料
```

## 当前信息架构

- `/login`：登录页。
- `/home`：登录后默认首页，当前承载首页空态引导。
- `/project/:projectId/overview`：项目概览。
- `/project/:projectId/chat`、`/project/:projectId/chat/:chatId`：项目对话。
- `/project/:projectId/resources`：项目资源，只展示当前项目已接入资产。
- `/project/:projectId/members`：项目成员。
- `/knowledge`、`/skills`、`/agents`：全局资产管理页。
- `/members`、`/analytics`、`/settings`：全局占位页。
- `/workspace`：仅保留兼容重定向，当前统一跳转到 `/home`。

## 模块职责

- `apps/platform`：页面、路由、鉴权状态、项目态编排、全局资产管理页。
- `apps/api`：本地联调与演示 API，当前已具备 `config / db / modules / middleware` 基础骨架。
- `packages/request`：Axios 请求能力封装。
- `packages/ui`：通用 UI 组件与搜索面板等共享能力。

## 数据与联调边界

- `knowject_token`：登录 token 的本地存储键。
- `knowject_projects`：项目列表的本地存储键，包含排序、置顶状态、项目名称、项目说明与项目基础信息。
- `apps/platform/src/app/project/project.catalog.ts`：全局资产与成员的共享 Mock 源。
- `apps/platform/src/pages/project/project.mock.ts`：项目页演示数据源。
- `apps/api` 当前不直接驱动项目态页面内容；`memory` 接口主要用于演示查询流程。
- 后端环境变量模板位于仓库根 `/.env.example`，认证与环境实施合同位于 `docs/auth-contract.md`。

## 文档入口

- [项目规则](./AGENTS.md)
- [架构事实](./docs/architecture.md)
- [快速接手指南](./docs/handoff-guide.md)
- [交接 Prompt 模板](./docs/handoff-prompt.md)
- [前端说明](./apps/platform/README.md)
- [API 说明](./apps/api/README.md)
- [设计资料](./docs/design)
- [执行计划模板](./.agent/PLANS.md)

## 运行要求

- Node.js >= 22
- pnpm 10

## 本地开发

```bash
pnpm install
pnpm dev
```

常用命令：

```bash
pnpm dev:web
pnpm dev:api
pnpm check-types
pnpm build
```

默认端口：

- 前端：`http://localhost:5173`
- 后端：`http://localhost:3001`

## 当前演示接口

- `GET /api/health`（返回应用与数据库状态）
- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/memory/overview`（需 Bearer Token）
- `POST /api/memory/query`（需 Bearer Token）
