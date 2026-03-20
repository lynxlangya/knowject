# Knowject 项目协作规则（ChatGPT Projects 上传版）

状态：2026-03-19
来源：基于项目 `AGENTS.md` 与当前 handoff / roadmap 文档精简同步。  
定位：这是给 ChatGPT Projects 用的协作规则副本，不是仓库自动生效规则。

## 1. 输出风格

- 默认中文。
- 结论先行，避免空泛。
- 优先短段落，不做无意义长列表。
- 需求不完整时，先基于最低风险假设推进。

## 2. 工作原则

- 优先级顺序：
  - Safety > Correctness > Maintainability > Minimal Diff > Speed
- 不臆造 API、路径、配置或实现状态。
- 修改前先检查现有实现和现有文档。
- 优先复用现有架构、模块边界和命名。
- 默认做最小可行改动，不顺手修 unrelated issues。

## 3. 项目级事实判断规则

- 当前事实以 `.codex/docs/current/architecture.md` 和源码为准。
- 目标蓝图以 `.codex/docs/roadmap/target-architecture.md` 为准。
- 当前差距与优先顺序以 `.codex/docs/roadmap/gap-analysis.md` 为准。
- Node / Python / MongoDB / Chroma 的索引分层判断，以 `.codex/docs/contracts/chroma-decision.md` 为准。
- 工程治理与协作规则以 `.codex/docs/standards/*` 为准。

## 4. 当前项目最重要的架构边界

- `apps/platform`
  - 登录后产品壳、路由、项目态页面，以及全局 `/knowledge`、`/skills`、`/agents` 正式管理页。
- `apps/api`
  - 正式业务主后端。
  - 当前已落地 auth、members、projects、memberships、knowledge、skills、agents、settings、memory。
- MongoDB
  - 正式业务主数据库。
- Chroma
  - 当前已进入 `global_docs` 与项目私有 docs 的正式最小索引 / 检索闭环。
- Python indexer
  - 已在 `apps/indexer-py` 落地为 FastAPI + `uv` 内部索引控制面。

## 5. 当前产品与路由约束

- 登录页固定为 `/login`。
- 登录后默认落点固定为 `/home`。
- 项目 canonical 路由固定为：
  - `/project/:projectId/overview`
  - `/project/:projectId/chat`
  - `/project/:projectId/chat/:chatId`
  - `/project/:projectId/resources`
  - `/project/:projectId/members`
- `/workspace` 只是兼容入口，必须重定向到 `/home`。
- `/home/project/*` 只是兼容入口，不应继续作为主路径扩展。

## 6. 当前阶段范围约束

- 当前迭代重点已经切到“更完整的来源引用渲染与流式体验收口”；后端对话写链路、项目级 merged retrieval 与最小 `sources`、`messages/stream` SSE 基线，以及聊天页默认流式发送都已落地。
- 当前仓库已补充 `WEEK7_8_CHAT_CORE_TASKS.md` 与 `CHAT_CORE_CONTRACT.md`；若需要判断优先级，优先参考 `PROJECT_BRIEF.md`、`GAP_ANALYSIS.md`、`WEEK5_6_TASKS.md` 与这两份当前阶段文档。
- 不要提前一次做完：
  - 更细的流式恢复 / 观测增强
  - 完整 Skill / Agent runtime
  - `global_code` 真实导入
  - 更完整的 memory / 运行时沉淀链路

## 7. 文档同步要求

如果改动了以下内容，必须同步更新文档：

- 路由、重定向、页面命名
- localStorage 键
- 模块职责边界
- API 边界
- 环境变量与部署拓扑
- Node / Python / Chroma / MongoDB 分层边界

优先更新位置：

1. `.codex/docs/current/architecture.md`
2. `.codex/docs/contracts/*`
3. `.codex/docs/standards/*`
4. `.codex/docs/plans/*`
5. `.codex/docs/roadmap/*`
5. 必要时更新项目 `AGENTS.md`
6. 若外部模型上传包依赖这些文档，也同步更新 `.codex/packs/chatgpt-projects/*`

## 8. 这份上传包的特别说明

- `.codex/packs/chatgpt-projects/` 是“上传给 ChatGPT Projects 的派生目录”。
- 它不是新的主文档根目录。
- 若这里与 `.codex/docs/` 冲突，以 `.codex/docs/` 和源码为准。
