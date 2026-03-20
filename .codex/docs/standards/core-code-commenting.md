# 核心代码中文注释标准

## 1. 目标

- 用中文意图注释让复杂业务流程、状态机、幂等路径与边界约束“一眼看懂为什么这么写”，避免 reviewer 反复问“这个 branch 何时触发”“这个 error 谁处理”。
- 与结构治理标准同步推动：让注释为结构治理之外的修改提供解释，让后续重构/执行可借助注释理解当前决策，而不是把判断权交给单个维护者。

## 2. 适用范围

- 核心业务文件（例如项目对话、知识服务、项目配置的大文件），尤其是目前结构治理重点关注的对象。
- 任何涉及状态机、diagnostics/recovery/summary、retry/rollback、配置策略、跨模块 handshake 或安全边界的 helper 或 controller。
- 纯展示、样式常量、template helper 等可免注释，仅在需要说明意图或防止误用时补。

## 3. 必须补注释的场景

- 当复杂分支顺序会直接影响业务结果（如权限 → visibility → namespace state），必须说明为何不能调整顺序，防止以后错序改动。
- 状态机、恢复、补偿、回滚逻辑（retry queue、channel 状态迁移、summary 增量更新、index/recovery gating）需要说明当前状态如何流转、何时失败/重试、哪些分支算完成。
- 跨模块 handshake 或安全边界：多个入口复用同一个 helper/adapter 来调用其它服务、校验 token、维护权限时，须标明各入口的语义、依赖 contract 以及允许的安全边界。
- 兼容性/legacy 行为必须写明“此处不能随意改”，并解释为何要保持旧路径（如 legacy rebuild、旧 recovery best-effort、迁移门槛）。
- 看似 Display 但实际触发 domain flow 的片段（例如配置表单驱动后台状态、UI 操作引发复合 issue）需要声明“它在页面/组件里但承担真实 domain 责任”。

## 4. 注释写法要求

- 以“为什么这样写”+“边界/不可改”为核心，避免机械描述；例如：
  ```tsx
  // namespaceState 必须先完成授权再标记 pending，否则会破坏 compare-and-set 的幂等语义。
  ```
- 指出哪些字段/异常属于 contract（如 `knowledge.documents.rebuildRequired` 不能直接重置、某个 composants 的 `onCreateIssue` 必须先处理成功状态再清除 pending）。
- 以中文为主，必要时以 domain 英文术语（“compare-and-set”、“pending worker”）确保意思准确。
- 把注释放在函数/分支/return 等关键节点，避免每行都泛注；多层逻辑可以用区块注释（`/** ... */`）概述整体意图。

## 5. 禁止写法

- 不要写“简单复述代码”的注释，如 `// 增加计数`，也不要在每个 `const` 前加“// 这个常量定义了…”。
- 不要用注释掩盖可以通过 helper/rename/refactor 消除的复杂性。
- 避免英文/双语注释只是翻译；主导语言为中文，必要时加英文术语辅助说明。
- 注释不能替代 TODO/plan；治理计划应写在 `.codex/docs/plans/`，注释只说明当前行为与边界。

## 6. 允许例外

- 紧急回归补丁或微小 UI 文案改动可暂时不补注释，但要在 review note/plan 中说明“当前跳过中文注释，后续补齐”并留代办。
- 非核心文件或纯展示/样式调整即使增加行数也可以不加注释，前提是不涉及 domain flow。
- 注释会过于冗长或重复治理概要内容时，可引用 `engineering-governance-overview.md` 说明意图由外部标准控制。

## 7. 文档同步要求

- 触发注释标准的场景（如 `knowledge.repository` 的状态分层、`ProjectChatPage` 的 domain logic）必须在 `.codex/docs/plans/` 中说明“为什么要注释”“是否待拆 helper”“是否有例外”。
- 注释若解释兼容性/安全约束，应在 `AGENTS.md` 或 `.codex/docs/standards/engineering-governance-overview.md` 中同步提及相关约束。
- 注释与结构治理互为反馈：对 core 文件的语义补充若影响架构现状，需考虑是否也要同步 `.codex/docs/current/architecture.md`，防止注释与事实文档脱节。
