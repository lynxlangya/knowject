# PROJECT_RULES（Derived）

本文件是导出副本，派生自 `AGENTS.md` 与 `docs/standards/*`。

## 协作规则（精简）

- 输出默认中文，先结论后依据，保持短而可执行。
- 优先级：Safety > Correctness > Maintainability > Minimal Diff > Speed。
- 不臆造 API、路径、配置、状态；以源码与 `docs/*` 为准。
- 默认最小可行改动，不顺手修无关问题。
- 根 `AGENTS.md` 只做仓库入口；进入 `apps/platform`、`apps/api`、`apps/indexer-py` 与热点业务目录后，继续读最近的子目录 `AGENTS.md`。
- `.claude/*` 只做兼容摘要层，不覆盖 `docs/current/*`、`docs/contracts/*` 与源码。
- 架构、路由、边界变化后，先更新 `docs/*`，再更新导出层。
