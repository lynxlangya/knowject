# CURRENT_ARCHITECTURE（Derived）

本文件是导出副本，派生自 `docs/current/architecture.md` 与 `AGENTS.md`。

- Truth surface：`AGENTS.md` 为入口，`docs/current/*` 为 current facts，`docs/contracts/*` 为契约，`docs/exports/*` 为派生层。
- Monorepo：`apps/` + `packages/` + `docs/`。
- 当前核心服务：`apps/platform`（React）、`apps/api`（Express + TS）、`apps/indexer-py`（FastAPI + uv）。
- 当前主链路：鉴权、项目协作、项目对话流式、知识索引、工作区设置。
- 项目对话 source/citation 专题事实已下沉到 `docs/current/project-chat-sources.md`。
- 事实边界：当前状态以 `docs/current/architecture.md` 与源码为准；本文件仅为上传摘要。
