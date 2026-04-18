# Docs Index

`docs/` 是 Knowject 的正式文档主源。默认不要把 `.claude/*`、`docs/exports/*` 或历史 handoff 归档当成事实主源。

## 默认阅读顺序

1. 根 `AGENTS.md`
2. `docs/current/architecture.md`
3. 与任务直接相关的 `docs/current/*`、`docs/contracts/*`
4. 必要时再读 `docs/standards/*`、`docs/plans/*`、`docs/roadmap/*`

## 目录职责

### `current/`

- 当前已落地事实。
- 只写今天能被源码、运行态和正式配置证明的现状。
- 入口：
  - [Current Architecture](./current/architecture.md)
  - [Project Chat Sources](./current/project-chat-sources.md)
  - [Current Skills Governance](./current/skills-governance.md)
  - [Docker Usage](./current/docker-usage.md)
  - [Docker Operation Checklist](./current/docker-operation-checklist.md)

### `contracts/`

- 接口、协议和跨边界约束。
- 入口：
  - [Contracts Index](./contracts/README.md)
  - [Auth Contract](./contracts/auth-contract.md)
  - [Chat Contract](./contracts/chat-contract.md)
  - [Chroma Decision](./contracts/chroma-decision.md)
  - [Skills Contract](./contracts/skills-contract.md)

### `standards/`

- 长期工程治理规则，不写阶段性实施步骤。
- 适合结构治理、文档同步、安全、评审标准。

### `plans/`

- 跨步骤、跨模块或高回归风险任务的执行计划。
- 只负责“怎么推进”，不替代 current facts。

### `handoff/`

- 交接、接手提示和历史迁移说明。
- 历史 handoff 不反向定义当前事实。

### `roadmap/`

- 目标态、gap 和阶段优先级。
- 只描述目标和差距，不描述已经落地的事实。

### `exports/`

- 派生导出层，不承担事实源职责。
- 当前 live 导出入口是 `docs/exports/chatgpt-projects/*`。

### `templates/`

- 可复用模板，例如 Prompt、Plans 模板。
- 不保存当前实现事实。

### `design/`

- 品牌与静态设计资产说明。

### `inputs/`

- 原始输入材料、认知总结、研究输入。
- 仅供参考，不作为当前事实源。
