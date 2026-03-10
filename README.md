# 知项 · Knowject

让项目知识，真正为团队所用。

知项（Knowject）是一个面向开发团队的项目级 AI 知识助手，目标是把文档、代码与设计上下文沉淀成可持续复用的项目记忆，让查询、理解与协作建立在真实项目语境之上。

## 当前状态

- 前端 `apps/platform` 已形成登录后产品壳、项目态页面与全局资产管理页。
- 基础框架阶段已完成；后端 `apps/api` 当前提供可继续叠加开发的最小正式 API 基线，覆盖 `health`、`auth`、`members`、`projects`、`memberships`、`memory`，并已完成 MongoDB、用户注册 / 登录、JWT 鉴权、最小项目 CRUD、成员管理与成员搜索接口。
- 项目列表、项目基础信息与成员 roster 已接入 `/api/projects*`；项目概览、对话与资源页仍部分依赖前端 Mock 与本地绑定数据。
- 全局 `知识库 / 技能 / 智能体` 页面当前为管理壳层，资产创建与引入流程仍是占位行为。
- 当前最小本地开发拓扑已经明确为 `platform + api + mongodb`；`docker-compose` 仍只停留在规划，不是当前交付物。

## 项目结构

```text
apps/
  platform/   前端应用（React + Vite + Ant Design）
  api/        基础框架 API（Express + TypeScript）
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
- `/members`：全局成员协作总览页。
- `/analytics`、`/settings`：全局占位页。
- `/workspace`：仅保留兼容重定向，当前统一跳转到 `/home`。

## 模块职责

- `apps/platform`：页面、路由、鉴权状态、项目态编排、全局资产管理页。
- `apps/api`：基础框架 API，当前已具备 `config / db / modules / middleware` 基础骨架和最小正式数据链路。
- `packages/request`：Axios 请求能力封装。
- `packages/ui`：通用 UI 组件与搜索面板等共享能力。

## 数据与联调边界

- `knowject_token`：登录 token 的本地存储键。
- `knowject_project_pins`：项目置顶偏好的本地存储键。
- `knowject_project_resource_bindings`：项目资源绑定的本地存储键。
- `knowject_projects`：历史本地 Mock 项目缓存键，当前仅用于一次性迁移旧项目到后端主链路。
- `apps/platform/src/app/project/project.catalog.ts`：全局资产与成员的共享 Mock 源。
- `apps/platform/src/pages/project/project.mock.ts`：项目页演示数据源。
- `AppSider` 的项目创建 / 编辑表单当前提交 `name / description`，并继续维护本地资源绑定。
- `apps/api` 当前已具备项目正式写模型、CRUD 和成员管理接口；`memory` 接口主要用于演示查询流程。
- 后端环境变量模板位于仓库根 `/.env.example`，认证与环境实施合同位于 `docs/auth-contract.md`。

## 文档入口

- [项目规则](./AGENTS.md)
- [架构事实](./docs/architecture.md)
- [基础框架任务归档](./docs/tasks-foundation-framework.md)
- [认证与环境契约](./docs/auth-contract.md)
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
cp .env.example .env.local
# 准备本地 MongoDB，并按 .env.local 注入连接串
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

## 当前接口

- `GET /api/health`（返回应用与数据库状态）
- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/users`（需 Bearer Token，用于按用户名 / 姓名搜索已有用户）
- `GET /api/projects`（需 Bearer Token）
- `POST /api/projects`（需 Bearer Token）
- `PATCH /api/projects/:projectId`（需 Bearer Token）
- `DELETE /api/projects/:projectId`（需 Bearer Token）
- `POST /api/projects/:projectId/members`（需 Bearer Token）
- `PATCH /api/projects/:projectId/members/:userId`（需 Bearer Token）
- `DELETE /api/projects/:projectId/members/:userId`（需 Bearer Token）
- `GET /api/members`（需 Bearer Token，返回当前账号可见项目中的成员概览）
- `GET /api/memory/overview`（需 Bearer Token）
- `POST /api/memory/query`（需 Bearer Token）
