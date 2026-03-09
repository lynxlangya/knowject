# Knowject API (`apps/api`)

`apps/api` 当前是本地联调与演示 API，使用 Express + TypeScript 实现。

## 当前接口

- `GET /api/health`
  - 返回服务状态与时间戳。
- `POST /api/auth/login`
  - 接收 `username` 和 `password`。
  - 返回 `knowject-token-*` 形式的 token 与基础用户信息。
- `GET /api/memory/overview`
  - 需要 `Authorization: Bearer <token>`。
  - 返回项目简介与统计信息。
- `POST /api/memory/query`
  - 需要 `Authorization: Bearer <token>`。
  - 返回基于本地 `DEMO_ITEMS` 的演示检索结果。

## 当前边界

- 这是本地演示接口，不是项目态页面的主要数据源。
- 项目概览、对话、资源、成员等内容目前仍由 `apps/platform` 本地 Mock 驱动。
- `memory` 路由中的返回结果用于演示“项目记忆查询”流程，不代表正式检索服务接口设计。

## 关键文件

- `src/server.ts`：Express 入口与路由挂载。
- `src/routes/health.ts`：健康检查。
- `src/routes/auth.ts`：登录接口。
- `src/routes/memory.ts`：记忆概览与检索演示接口。

## 开发

```bash
pnpm --filter api dev
pnpm --filter api check-types
pnpm --filter api build
```
