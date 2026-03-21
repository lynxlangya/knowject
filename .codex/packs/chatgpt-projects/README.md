# Knowject ChatGPT Projects 上传包

状态：2026-03-19 同步。
定位：本目录位于 `.codex/packs/chatgpt-projects/`，是“给 ChatGPT Projects 上传用的派生文档包”，不是新的事实源。
.agent/gpt/ 已废弃，仅保留兼容说明；后续不要再把历史路径当成上传包主目录。
事实、契约与任务的正式维护仍以仓库原文档为准：

- `AGENTS.md`
- `.codex/docs/current/architecture.md`
- `.codex/docs/contracts/*`
- `.codex/docs/standards/*`
- `.codex/docs/plans/*`
- `.codex/docs/roadmap/*`

## 1. 这个目录解决什么问题

- 避免把 ChatGPT Projects 直接建立在零散仓库文档之上。
- 给 ChatGPT 一套更稳定、更适合上传的“高信号文档副本”。
- 明确哪些是：
  - 当前事实
  - 固定决策
  - 当前阶段任务
  - 差距与演进顺序

## 2. 推荐上传顺序

### 必传

1. `PROJECT_BRIEF.md`
2. `PROJECT_RULES.md`
3. `CURRENT_ARCHITECTURE.md`
4. `INDEXING_DECISION.md`
5. `GAP_ANALYSIS.md`
6. `WEEK5_6_TASKS.md`

### 当前迭代建议补传

7. `WEEK7_8_CHAT_CORE_TASKS.md`
8. `CHAT_CORE_CONTRACT.md`

### 按需补传

9. `WEEK3_4_TASKS.md`（仅在需要回看上一阶段基线时）
10. `AUTH_ENV_CONTRACT.md`

适用场景：

- 如果你主要用 ChatGPT 做：
  - 方案讨论
  - 任务拆解
  - 文档协作
  - 架构/实现评审
    那么前 6 份通常够用。
- 如果你当前主要推进项目对话、合并检索与来源引用，建议把 `WEEK7_8_CHAT_CORE_TASKS.md` 与 `CHAT_CORE_CONTRACT.md` 一并上传。
- 如果你还要让它参与：
  - 登录 / JWT / env / Docker secrets 相关设计
    再加传 `AUTH_ENV_CONTRACT.md`。

## 3. 各文件用途

- `PROJECT_BRIEF.md`
  - 整个项目的最小必要上下文入口。
- `PROJECT_RULES.md`
  - 项目协作约束、表达风格、文档同步规则。
- `CURRENT_ARCHITECTURE.md`
  - 当前已经落地的系统事实。
- `INDEXING_DECISION.md`
  - Node / Python / MongoDB / Chroma 的新分层决策。
- `WEEK5_6_TASKS.md`
  - 最近一个已完成阶段的基线、DoD、顺延项与 Week 7-8 交接接口。
- `WEEK7_8_CHAT_CORE_TASKS.md`
  - 当前对话核心阶段的目标、DoD、边界与顺序。
- `CHAT_CORE_CONTRACT.md`
  - 当前对话写链路、merged retrieval 与 `sources` 的 API 契约。
- `WEEK3_4_TASKS.md`
  - 上一阶段的历史任务边界与 DoD。
- `GAP_ANALYSIS.md`
  - 当前缺口和推荐演进顺序。
- `AUTH_ENV_CONTRACT.md`
  - 登录、JWT、环境变量和安全边界。

## 4. 使用约束

- 这里的文件是“上传副本 / 精简同步版”，不是主维护入口。
- 当原文档发生变化时，应优先更新原文，再同步这里。
- 若这里与原文冲突，以原文为准。
- 不要直接在历史 `.agent/gpt/*` 路径维护同名文件。
- 本轮已同步 Week 5-6 的索引运维、项目私有 knowledge 最小闭环、`/project/:projectId/resources` 正式消费、Week 7 的 `/settings` 设置中心、`CC-03` 的项目对话后端写链路 / merged retrieval / assistant `sources`，以及知识索引“namespace key + versioned collection + active pointer”契约。
- 2026-03-19 又补同步了四类增量事实：`clientRequestId` 幂等重试、knowledge rebuild 的 staged/versioned target collection 语义、diagnostics 的 `indexer.expected.*` 字段、以及项目创建 / 编辑弹层的 Agent 选项已切到正式 `/api/agents`。
- 2026-03-19 当前批次还补同步了两类结构事实：`/settings` 与 `/knowledge` 页面已拆为“编排壳层 + hooks/components”，`apps/api` 的 `settings` / `knowledge` 模块已按 facade + helper submodules 拆分 service / repository。
- 2026-03-19 本次同步继续补了两类运行时事实：项目对话默认发送已切到 `messages/stream`，聊天页具备 pending / draft / stop / reconcile 流式交互；`POST /api/settings/llm/test` 对 OpenAI `gpt-5*` 已切到 `max_completion_tokens` 兼容 payload。
- 2026-03-19 本次同步继续补了项目对话 replay/edit 事实：消息写接口新增 `targetUserMessageId`，聊天页用户气泡已支持 `retry / edit / copy`，其中 `retry / edit` 会在同线程内裁掉后续 turn 再重跑。
- 当前仓库已补充 `WEEK7_8_CHAT_CORE_TASKS.md` 与 `CHAT_CORE_CONTRACT.md`；ChatGPT 判断当前迭代重点时，应优先组合 `PROJECT_BRIEF.md`、`GAP_ANALYSIS.md`、`WEEK5_6_TASKS.md`、`WEEK7_8_CHAT_CORE_TASKS.md` 与 `CHAT_CORE_CONTRACT.md`。

## 5. 一句话建议

- 把 `PROJECT_BRIEF.md` 当成 ChatGPT Projects 的默认入口。
- 把 `CURRENT_ARCHITECTURE.md` 和 `INDEXING_DECISION.md` 当成它判断“现在是什么、为什么这样做”的主依据。
- 把 `GAP_ANALYSIS.md` 当成它判断“当前迭代先做什么”的主依据。
- 把 `WEEK5_6_TASKS.md` 当成它判断“最近一阶段已经做完什么、当前该接什么”的交接基线。
- 当前若推进项目对话主链路，再把 `WEEK7_8_CHAT_CORE_TASKS.md` 与 `CHAT_CORE_CONTRACT.md` 一起上传。
