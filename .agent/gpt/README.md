# Knowject ChatGPT Projects 上传包

状态：2026-03-13 生成。  
定位：本目录是“给 ChatGPT Projects 上传用的派生文档包”，不是新的事实源。  
事实、契约与任务的正式维护仍以仓库原文档为准：

- `AGENTS.md`
- `.agent/docs/current/architecture.md`
- `.agent/docs/contracts/*`
- `.agent/docs/plans/*`
- `.agent/docs/roadmap/*`

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
5. `WEEK3_4_TASKS.md`
6. `GAP_ANALYSIS.md`

### 按需补传

7. `AUTH_ENV_CONTRACT.md`

适用场景：

- 如果你主要用 ChatGPT 做：
  - 方案讨论
  - 任务拆解
  - 文档协作
  - 架构/实现评审
  那么前 6 份通常够用。
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
- `WEEK3_4_TASKS.md`
  - 当前阶段任务边界、DoD 与执行顺序。
- `GAP_ANALYSIS.md`
  - 当前缺口和推荐演进顺序。
- `AUTH_ENV_CONTRACT.md`
  - 登录、JWT、环境变量和安全边界。

## 4. 使用约束

- 这里的文件是“上传副本 / 精简同步版”，不是主维护入口。
- 当原文档发生变化时，应优先更新原文，再同步这里。
- 若这里与原文冲突，以原文为准。

## 5. 一句话建议

- 把 `PROJECT_BRIEF.md` 当成 ChatGPT Projects 的默认入口。
- 把 `CURRENT_ARCHITECTURE.md` 和 `INDEXING_DECISION.md` 当成它判断“现在是什么、为什么这样做”的主依据。
- 把 `WEEK3_4_TASKS.md` 当成它判断“当前阶段应该做什么、不该做什么”的主依据。
