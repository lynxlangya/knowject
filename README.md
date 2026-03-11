# 知项 · Knowject

让项目知识，真正为团队所用。

知项（Knowject）是一个面向开发团队的项目级 AI 知识助手，目标是把文档、代码与设计上下文沉淀成可持续复用的项目记忆，让查询、理解与协作建立在真实项目语境之上。

## 当前状态

- 前端 `apps/platform` 已形成登录后产品壳、项目态页面与全局资产管理页。
- 基础框架阶段已完成；后端 `apps/api` 当前提供可继续叠加开发的最小正式 API 基线，覆盖 `health`、`auth`、`members`、`projects`、`memberships`、`memory`，并已完成 MongoDB、用户注册 / 登录、JWT 鉴权、最小项目 CRUD、成员管理与成员搜索接口。
- 项目列表、项目基础信息与成员 roster 已接入 `/api/projects*`；项目概览、对话与资源页仍部分依赖前端 Mock 与本地绑定数据。
- 全局 `知识库 / 技能 / 智能体` 页面当前为管理壳层，资产创建与引入流程仍是占位行为。
- 仓库已提供 Docker Compose 本地 / 线上部署基线，覆盖 `platform + api + mongodb + chroma`，其中 MongoDB 为正式主存储，Chroma 当前以基础设施与健康诊断形式接入。
- 当前固定容器版本为 `mongo:8.2.5` 与 `chromadb/chroma:1.5.5`，避免部署时跟随浮动标签漂移。

## 项目结构

```text
apps/
  platform/   前端应用（React + Vite + Ant Design）
  api/        基础框架 API（Express + TypeScript）
packages/
  request/    HTTP 请求封装（@knowject/request）
  ui/         通用 UI 组件（@knowject/ui）
docker/       Docker Compose、镜像构建、反向代理与初始化脚本
scripts/      常用命令包装脚本
.agent/
  docs/
    current/        当前架构事实
    handoff/        接手与交接文档
    roadmap/        目标蓝图与 gap 分析
    plans/          阶段任务与执行计划
    design/         品牌与视觉资料
    templates/      模板文档
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
- 后端环境变量模板位于仓库根 `/.env.example`，认证与环境实施合同位于 `.agent/docs/contracts/auth-contract.md`。
- Docker 环境模板位于仓库根 `/.env.docker.local.example` 与 `/.env.docker.production.example`，部署命令与 secrets 约定位于 `docker/README.md`。

## 文档入口

- [项目规则](./AGENTS.md)
- [文档索引](./.agent/docs/README.md)
- [架构事实](./.agent/docs/current/architecture.md)
- [Docker 使用现状](./.agent/docs/current/docker-usage.md)
- [Docker 操作清单](./.agent/docs/current/docker-operation-checklist.md)
- [Docker 部署手册](./docker/README.md)
- [基础框架任务归档](./.agent/docs/plans/tasks-foundation-framework.md)
- [全局资产阶段任务拆分](./.agent/docs/plans/tasks-global-assets-foundation.md)
- [认证与环境契约](./.agent/docs/contracts/auth-contract.md)
- [Chroma 决策说明书](./.agent/docs/contracts/chroma-decision.md)
- [快速接手指南](./.agent/docs/handoff/handoff-guide.md)
- [交接 Prompt 模板](./.agent/docs/handoff/handoff-prompt.md)
- [前端说明](./apps/platform/README.md)
- [API 说明](./apps/api/README.md)
- [设计资料](./.agent/docs/design)
- [执行计划模板](./.agent/docs/templates/PLANS.md)

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

推荐直接使用包装后的常用命令：

```bash
pnpm host:init
pnpm host:up
pnpm host:web
pnpm host:api
pnpm host:check
pnpm host:build
```

常用命令：

```bash
pnpm dev:web
pnpm dev:api
pnpm check-types
pnpm build
```

所有包装命令的统一入口为：

```bash
./scripts/knowject.sh help
pnpm knowject:help
```

默认端口：

- 前端：`http://localhost:5173`
- 后端：`http://localhost:3001`
- Docker 本地：`http://localhost:8080`、`http://localhost:3001/api/health`、`127.0.0.1:27017`、`http://127.0.0.1:8000/api/v2/heartbeat`
- `compose.local.yml` 会额外挂载本地专用 `publish` 网络，确保 `api / mongo / chroma` 的宿主机端口真正发布；生产编排不使用该网络。

## Docker 部署

本地部署：

```bash
pnpm docker:local:init
pnpm docker:local:up
```

线上部署：

```bash
pnpm docker:prod:init
pnpm docker:prod:up
```

更完整的 secrets 准备、TLS 入口与运维命令见 `docker/README.md`。

## 推荐工作流

日常开发：

```bash
pnpm dev:init
pnpm dev:up
```

说明：

- `pnpm dev:init` / `pnpm dev:up` 会把宿主机 `.env.local` 中的 MongoDB / JWT 关键配置同步到 `docker/secrets` 对应文件引用，避免本地密码和 Docker 依赖漂移。

只管理 Docker 依赖：

```bash
pnpm dev:deps:up
pnpm dev:deps:ps
pnpm dev:deps:health
pnpm dev:deps:down
```

整套 Docker 验收：

```bash
pnpm docker:local:up
pnpm docker:local:ps
pnpm docker:local:health
```

- 本地 Docker 默认发布端口为 `8080 / 3001 / 27017 / 8000`，可分别通过 `.env.docker.local` 中的 `WEB_PORT`、`API_PUBLISHED_PORT`、`MONGO_PUBLISHED_PORT`、`CHROMA_PUBLISHED_PORT` 覆盖；API 容器内部监听端口固定为 `3001`。

## 常用脚本

推荐开发流：

```bash
pnpm dev:init
pnpm dev:up
pnpm dev:deps:up
pnpm dev:deps:ps
pnpm dev:deps:logs -- mongo
pnpm dev:deps:health
pnpm dev:deps:down
pnpm dev:check
pnpm dev:build
```

兼容宿主机命令：

```bash
pnpm host:init
pnpm host:up
pnpm host:web
pnpm host:api
pnpm host:check
pnpm host:build
```

Docker 本地：

```bash
pnpm docker:local:init
pnpm docker:local:up
pnpm docker:local:ps
pnpm docker:local:logs -- api
pnpm docker:local:health
pnpm docker:local:down
pnpm docker:local:reset
```

Docker 线上：

```bash
pnpm docker:prod:init
pnpm docker:prod:config
pnpm docker:prod:up
pnpm docker:prod:ps
pnpm docker:prod:logs -- caddy api
pnpm docker:prod:down
```

## 当前接口

- `GET /api/health`（返回应用、数据库与可选向量存储状态）
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
