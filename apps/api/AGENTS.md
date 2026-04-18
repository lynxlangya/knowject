# AGENTS.md

## 1. 目录职责

- 本目录负责 Knowject 正式业务 API：认证、统一 envelope、locale 协商、项目/知识/技能/智能体/设置等模块。
- 这里是业务主链路入口，不负责 Python 索引运行时的实现细节。

## 2. 先读什么

1. 根 `AGENTS.md`
2. `apps/api/README.md`
3. `docs/current/architecture.md`
4. 与任务直接相关的 `docs/contracts/*`
5. 若进入 `modules/projects` 或 `modules/knowledge`，继续读对应子目录 `AGENTS.md`

## 3. 本层不能猜的事实

- locale、auth、error 与 envelope 的统一语义
- 模块边界与 `/api/*` 路由归属
- 项目对话、知识索引、settings effective config 的正式契约
- 哪些状态属于 Mongo 主数据，哪些只属于索引层

## 4. 边界

- 正式业务路由默认放 `src/modules/*`，统一在 `src/app/create-app.ts` 挂载。
- 不绕过统一 auth / locale / error / envelope 约定。
- facade 可以保留，但复杂逻辑优先下沉 helpers、adapters、validators、types。
- 内部控制面、索引运行时与存储边界，必须反推到对应 contracts/current docs。

## 5. 默认验证

- `pnpm --filter api check-types`
- 需要时：`pnpm --filter api build`

## 6. 文档同步

- 模块边界、路由、错误语义、配置契约变化时，回推：
  - `apps/api/README.md`
  - `docs/current/architecture.md`
  - 对应 `docs/contracts/*`
