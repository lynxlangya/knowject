# CURRENT_ARCHITECTURE（Derived）

本文件是导出副本，派生自 `docs/current/architecture.md` 与 `AGENTS.md`。

- Monorepo：`apps/` + `packages/` + `docs/`。
- 当前核心服务：`apps/platform`（React）、`apps/api`（Express + TS）、`apps/indexer-py`（FastAPI + uv）。
- 产品核心路由（节选）：`/home`、`/knowledge`、`/skills`、`/agents`、`/members`、`/analytics`、`/settings`，项目路由在 `/project/:projectId/*`。
- 事实边界：当前状态以 `docs/current/architecture.md` 与源码为准；本文件仅为上传摘要。
