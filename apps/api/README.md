# Knowject API (`apps/api`)

`apps/api` 当前是本地联调与演示 API，使用 Express + TypeScript 实现。
截至 2026-03-10，基础框架阶段已经落下 `config / db / modules / middleware` 的服务骨架，并接入 MongoDB、用户模型、`argon2id`、JWT 与登录/注册接口，但项目态页面主数据仍未切到后端。

## 当前接口

- `GET /api/health`
  - 返回应用状态、数据库状态和最小诊断信息。
- `POST /api/auth/register`
  - 接收 `username`、`password`、`name`。
  - 注册成功后直接返回 JWT 与基础用户信息。
- `POST /api/auth/login`
  - 接收 `username` 和 `password`。
  - 返回 JWT 与基础用户信息。
- `GET /api/memory/overview`
  - 需要 `Authorization: Bearer <token>`。
  - 返回项目简介与统计信息。
- `POST /api/memory/query`
  - 需要 `Authorization: Bearer <token>`。
  - 返回基于本地 `DEMO_ITEMS` 的演示检索结果。

错误响应约定：

- 当前 API 已接入统一错误中间件。
- 失败响应统一为 `error + meta(requestId, timestamp)` 结构。
- `memory` 路由当前已切到正式 JWT 鉴权中间件。
- 生产环境下，`/api/auth/*` 与 `/api/memory/*` 必须通过 HTTPS 访问；不安全传输会被拒绝。
- `auth` 与 `memory` 响应默认携带 `Cache-Control: no-store`，避免敏感响应被中间层缓存。

## 当前边界

- 这是本地演示接口，不是项目态页面的主要数据源。
- 项目概览、对话、资源、成员等内容目前仍由 `apps/platform` 本地 Mock 驱动。
- `memory` 路由中的返回结果用于演示“项目记忆查询”流程，不代表正式检索服务接口设计。
- `projects` 与 `memberships` 目录边界已建立，但正式接口尚未实现。
- 当前已经有真实用户注册、登录和 JWT 鉴权，但项目、成员、资源等正式后端接口仍未落地。

## 当前环境约定

- 环境变量模板位于仓库根 [`.env.example`](/Users/langya/Documents/CodeHub/ai/knowject/.env.example)。
- 本地真实值应放在仓库根 `.env.local`。
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
- 认证和环境的详细实施合同见 [docs/auth-contract.md](/Users/langya/Documents/CodeHub/ai/knowject/docs/auth-contract.md)。

## 关键文件

- `src/server.ts`：启动入口、MongoDB 预连接与优雅关闭。
- `src/app/create-app.ts`：统一路由挂载、中间件组装。
- `src/config/env.ts`：环境变量加载与校验。
- `src/db/mongo.ts`：MongoDB 连接管理与健康快照。
- `src/modules/auth/*`：用户模型、密码哈希、JWT、中间件和注册 / 登录接口。
- `src/modules/projects/projects.router.ts`：项目模块骨架，占位待实现。
- `src/modules/memberships/memberships.router.ts`：成员模块骨架，占位待实现。
- `src/routes/health.ts`：健康检查。
- `src/routes/memory.ts`：记忆概览与检索演示接口，当前已复用 JWT 中间件。
- `src/middleware/*`：请求上下文、404、统一错误处理。

## 开发

```bash
pnpm --filter api dev
pnpm --filter api check-types
pnpm --filter api build
```
