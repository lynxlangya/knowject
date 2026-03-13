# Knowject API (`apps/api`)

`apps/api` 当前是基础框架阶段已经收口的本地开发 API 基线，使用 Express + TypeScript 实现。
截至 2026-03-13，服务端已经落下 `config / db / modules / middleware` 的服务骨架，并接入 MongoDB、用户模型、`argon2id`、JWT、登录 / 注册接口、全局成员概览、最小项目 CRUD、成员管理接口，以及成员添加用的已有用户搜索接口；项目列表、项目基础信息、成员 roster 与全局成员页已切到后端。Week 3-4 的 `knowledge / skills / agents` 也已建立最小模块骨架，其中 `knowledge` 已完成 Mongo 元数据模型与正式列表 response shape，`skills / agents` 仍停留在鉴权占位响应阶段。

## 当前接口

- `GET /api/health`
  - 返回应用状态、数据库状态与可选的 Chroma 心跳诊断信息。
- `POST /api/auth/register`
  - 接收 `username`、`password`、`name`。
  - 注册成功后直接返回 JWT 与基础用户信息。
- `POST /api/auth/login`
  - 接收 `username` 和 `password`。
  - 返回 JWT 与基础用户信息。
- `GET /api/auth/users`
  - 需要 `Authorization: Bearer <token>`。
  - 按 `username / name` 模糊搜索已有注册用户，供项目成员添加下拉候选使用。
- `GET /api/members`
  - 需要 `Authorization: Bearer <token>`。
  - 聚合当前登录用户可见项目中的成员基础信息、项目参与关系和最小权限摘要，供全局成员页使用。
- `GET /api/projects`
  - 需要 `Authorization: Bearer <token>`。
  - 只返回当前用户参与的项目。
- `POST /api/projects`
  - 需要 `Authorization: Bearer <token>`。
  - 接收 `name`、`description`，创建者自动成为项目 `admin`。
- `PATCH /api/projects/:projectId`
  - 需要 `Authorization: Bearer <token>`。
  - 只允许项目级 `admin` 更新项目基础信息。
- `DELETE /api/projects/:projectId`
  - 需要 `Authorization: Bearer <token>`。
  - 只允许项目级 `admin` 删除项目。
- `POST /api/projects/:projectId/members`
  - 需要 `Authorization: Bearer <token>`。
  - 只允许项目级 `admin` 按用户名添加已注册用户。
- `PATCH /api/projects/:projectId/members/:userId`
  - 需要 `Authorization: Bearer <token>`。
  - 只允许项目级 `admin` 修改成员的 `admin / member` 角色。
- `DELETE /api/projects/:projectId/members/:userId`
  - 需要 `Authorization: Bearer <token>`。
  - 只允许项目级 `admin` 移除成员，并保证项目至少保留一位 `admin`。
  - 若移除的是当前登录用户本人，响应会返回 `project: null` 与 `removedCurrentUser: true`，前端据此退出当前项目上下文。
- `GET /api/knowledge`
  - 需要 `Authorization: Bearer <token>`。
  - 返回知识库列表的正式 summary shape：`id / name / description / sourceType / indexStatus / documentCount / chunkCount / maintainerId / createdBy / createdAt / updatedAt`。
  - 当前若没有数据，返回 `total: 0` 与空数组；首次访问时会确保 `knowledge_bases` 与 `knowledge_documents` 的索引存在。
- `GET /api/skills`
  - 需要 `Authorization: Bearer <token>`。
  - 返回 GA-02 阶段的 Skill 模块占位响应，当前 `items` 为空数组。
- `GET /api/agents`
  - 需要 `Authorization: Bearer <token>`。
  - 返回 GA-02 阶段的 Agent 模块占位响应，当前 `items` 为空数组。
- `GET /api/memory/overview`
  - 需要 `Authorization: Bearer <token>`。
  - 返回项目简介与统计信息。
- `POST /api/memory/query`
  - 需要 `Authorization: Bearer <token>`。
  - 返回基于本地 `DEMO_ITEMS` 的演示检索结果。

错误响应约定：

- 当前 API 已接入统一错误中间件。
- 失败响应统一为 `error + meta(requestId, timestamp)` 结构。
- `projects`、`memberships` 与 `memory` 路由当前都已切到正式 JWT 鉴权中间件。
- 生产环境下，`/api/auth/*` 与 `/api/memory/*` 必须通过 HTTPS 访问；不安全传输会被拒绝。
- `auth` 与 `memory` 响应默认携带 `Cache-Control: no-store`，避免敏感响应被中间层缓存。

## 当前边界

- 这是本地联调与基础框架接口；项目列表、项目基础信息、成员 roster 与全局成员概览已由它提供正式数据源。
- 项目概览、对话与资源等内容目前仍主要由 `apps/platform` 本地 Mock 驱动。
- `memory` 路由中的返回结果用于演示“项目记忆查询”流程，不代表正式检索服务接口设计。
- `projects` 已落地最小项目模型与 CRUD；`memberships` 已落地最小成员管理闭环。
- `knowledge` 当前已完成 Mongo 元数据模型、集合索引和列表 response shape，但还没有 CRUD、上传、状态流与统一知识检索 service。
- `skills / agents` 当前只完成了模块骨架、路由挂载和鉴权接入。
- 当前已经有真实用户注册、登录、JWT 鉴权、全局成员概览、项目 CRUD 和成员管理接口，但资产、资源与对话等正式后端接口仍未落地。
- 当前宿主机开发最小服务拓扑为 `api + mongodb`。
- 仓库已交付 Docker Compose 基线，可在容器内运行 `api + mongodb + chroma`，并通过 `platform / caddy` 进入完整部署拓扑。
- 当前 Chroma 仍只用于基础设施与健康诊断；仓库已预留 `apps/indexer-py/README.md` 作为 Python indexer 边界占位，但还没有可运行的独立 Python indexer，也还没有正式知识索引写入与统一知识检索 service。
- Week 3-4 的推荐演进路径是：`apps/api` 继续负责业务主链路与对外 API，Python 独立索引运行时负责解析、分块、向量写入、重建与诊断，具体边界以 [`.agent/docs/contracts/chroma-decision.md`](/Users/langya/Documents/CodeHub/ai/knowject/.agent/docs/contracts/chroma-decision.md) 为准。
- Docker 公共基线中的 `app / data` 网络默认保持 `internal`；本地若要从宿主机直接访问 API，则通过 `compose.local.yml` 额外挂载 `publish` 网络完成端口发布。
- Docker 当前使用方式与部署边界见 [`.agent/docs/current/docker-usage.md`](/Users/langya/Documents/CodeHub/ai/knowject/.agent/docs/current/docker-usage.md)。
- Docker 操作手册见 [`docker/README.md`](/Users/langya/Documents/CodeHub/ai/knowject/docker/README.md)。

## 当前环境约定

- 环境变量模板位于仓库根 [`.env.example`](/Users/langya/Documents/CodeHub/ai/knowject/.env.example)。
- 本地真实值应放在仓库根 `.env.local`。
- 运行时按 `.env` → `.env.local` 顺序加载；`.env.local` 可覆盖低优先级同族键，但同一份 env 文件不要同时定义 `NAME` 和 `NAME_FILE`。
- Docker 本地 / 线上模板分别位于 [`.env.docker.local.example`](/Users/langya/Documents/CodeHub/ai/knowject/.env.docker.local.example) 与 [`.env.docker.production.example`](/Users/langya/Documents/CodeHub/ai/knowject/.env.docker.production.example)。
- 最小必需变量：
  - `PORT`
  - `APP_NAME`
  - `CORS_ORIGIN`
  - `MONGODB_URI`
  - `MONGODB_DB_NAME`
  - `JWT_SECRET`
  - `JWT_EXPIRES_IN`
  - `JWT_ISSUER`
  - `JWT_AUDIENCE`
  - `ARGON2_MEMORY_COST`
  - `ARGON2_TIME_COST`
  - `ARGON2_PARALLELISM`
  - `API_ERROR_EXPOSE_DETAILS`
  - `API_ERROR_INCLUDE_STACK`
- 所有字符串型变量都支持 `<NAME>_FILE` 形式，适用于 Docker secrets。
- 若最终生效环境里同时出现 `NAME` 和 `NAME_FILE`，服务会直接启动失败；推荐只保留高优先级来源中的一个。
- 容器化部署里，API 容器内部监听端口固定为 `3001`；宿主机发布端口由 `compose.local.yml` 中的 `API_PUBLISHED_PORT` 控制。
- 可选 Chroma 变量：
  - `CHROMA_URL`
  - `CHROMA_HEARTBEAT_PATH`
- 未来全局知识索引闭环会新增 embedding provider、本地文件存储、Node / Python 触发等环境契约；在代码真正落地前，以 [`.agent/docs/contracts/chroma-decision.md`](/Users/langya/Documents/CodeHub/ai/knowject/.agent/docs/contracts/chroma-decision.md) 与 [`.agent/docs/plans/tasks-global-assets-foundation.md`](/Users/langya/Documents/CodeHub/ai/knowject/.agent/docs/plans/tasks-global-assets-foundation.md) 的分类说明为准，不把它们误写成当前已生效环境变量。
- 认证和环境的详细实施合同见 [.agent/docs/contracts/auth-contract.md](/Users/langya/Documents/CodeHub/ai/knowject/.agent/docs/contracts/auth-contract.md)。

## 关键文件

- `src/server.ts`：启动入口、MongoDB 预连接与优雅关闭。
- `src/app/create-app.ts`：统一路由挂载、中间件组装。
- `src/config/env.ts`：环境变量加载与校验。
- `src/lib/chroma-health.ts`：Chroma 心跳诊断。
- `src/db/mongo.ts`：MongoDB 连接管理与健康快照。
- `src/modules/auth/*`：用户模型、密码哈希、JWT、中间件和注册 / 登录接口。
- `src/modules/members/*`：全局成员聚合只读接口，按当前用户可见项目汇总成员概览。
- `src/modules/projects/*`：项目模型、MongoDB 仓储、权限校验和 CRUD 接口。
- `src/modules/memberships/*`：项目成员增删改接口与最小角色规则。
- `src/modules/knowledge/*`：全局知识库元数据模型、Mongo 仓储与列表 response shape。
- `src/modules/skills/*`：全局 Skill 模块最小骨架，当前仅提供鉴权占位响应。
- `src/modules/agents/*`：全局 Agent 模块最小骨架，当前仅提供鉴权占位响应。
- `src/routes/health.ts`：健康检查。
- `src/routes/memory.ts`：记忆概览与检索演示接口，当前已复用 JWT 中间件。
- `src/middleware/*`：请求上下文、404、统一错误处理。
- `../indexer-py/README.md`：Python 索引服务目录边界与 Node / Python 集成约束说明。

## 开发

```bash
pnpm --filter api dev
pnpm --filter api check-types
pnpm --filter api build
```
