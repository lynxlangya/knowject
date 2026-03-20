# Knowject 文档索引

`.codex/docs/` 是 Knowject 当前唯一的项目文档根目录，用于统一收敛“事实、规划、交接、契约、设计、输入材料与模板”。

补充说明：`.codex/packs/chatgpt-projects/` 是面向 ChatGPT Projects 的上传副本目录，属于派生包，不替代 `.codex/docs/` 的主文档职责。

迁移说明：`.agent/` 已废弃，仅保留历史说明与兼容提示；后续禁止继续在 `.agent/*` 新增主内容、主文档或主上传包。

本次收敛的目标不是单纯挪文件，而是把文档入口、分类和维护边界一起稳定下来，避免后续继续出现“知道有文档，但不知道该去哪里找”的问题。

## 1. 分类结构

```text
.codex/docs/
  README.md                     文档总索引
  current/
    architecture.md            当前事实源
    docker-usage.md            Docker 使用现状
    docker-operation-checklist.md Docker 操作清单
  contracts/
    auth-contract.md           认证与环境契约
    chat-contract.md           项目对话 API 契约（Week 7-8 草案）
    chroma-decision.md         Chroma 角色与实施边界
  roadmap/
    target-architecture.md     目标蓝图
    gap-analysis.md            current vs target 差距分析
  standards/
    engineering-governance-overview.md 长期工程治理总纲
    review-checklist.md        工程治理评审清单
  plans/
    doc-iteration-handoff-plan.md
    tasks-foundation-framework.md
    tasks-global-assets-foundation.md
    tasks-index-ops-project-consumption.md
    tasks-chat-core-week7-8.md
    tasks-chat-sse-streaming-refactor.md
    tasks-chat-ant-design-x-migration.md
    tasks-project-chat-message-rail.md
    tasks-project-chat-knowledge-draft-selection.md
    tasks-project-chat-knowledge-draft-selection-implementation.md
    tasks-platform-frontend-refactor.md
    tasks-engineering-governance-foundation.md
    tasks-engineering-governance-foundation-implementation.md
    tasks-service-indexing-refactor.md
    settings-page-task.md
  handoff/
    handoff-guide.md
    chatgpt-project-brief.md
    handoff-prompt.md
  inputs/
    知项Knowject-项目认知总结-v2.md
    知项Knowject-项目认知总结-v3.md
  design/
    ...
  templates/
    PLANS.md
```

## 2. 阅读顺序

### 快速接手当前工作

1. 先读 `.codex/docs/handoff/handoff-guide.md`
2. 再读 `.codex/docs/current/architecture.md`
3. 然后读 `.codex/docs/roadmap/gap-analysis.md`
4. 若当前要推进对话核心，直接读 `.codex/docs/plans/tasks-chat-core-week7-8.md`
5. 若当前要冻结对话接口与响应 shape，再读 `.codex/docs/contracts/chat-contract.md`
6. 若当前要把项目对话正式切到 `SSE / HTTP streaming`、统一 turn orchestration、取消语义与 direct replace，直接读 `.codex/docs/plans/tasks-chat-sse-streaming-refactor.md`
7. 若当前只需要回看对话页 Ant Design X 组件迁移、`XMarkdown` 接入和早期 SSE UI 草稿，再读 `.codex/docs/plans/tasks-chat-ant-design-x-migration.md`
8. 若当前要推进项目对话页右侧消息 Rail、消息加星、Markdown 导出与知识草稿沉淀，再读 `.codex/docs/plans/tasks-project-chat-message-rail.md`
9. 若当前要把项目知识草稿改成“必须选择已有项目私有知识库；无私有知识库时先在聊天页内创建空知识库”，再读 `.codex/docs/plans/tasks-project-chat-knowledge-draft-selection.md`
10. 若当前要按已确认设计直接执行项目知识草稿私有知识库选择改造，再读 `.codex/docs/plans/tasks-project-chat-knowledge-draft-selection-implementation.md`
11. 涉及工程治理的设计背景、标准体系的设计与演进台账（而非当前生效的规则正文）时，再读 `.codex/docs/plans/tasks-engineering-governance-foundation.md`；当前治理规则以 `.codex/docs/standards/*` 为准
12. 涉及当前工程治理规则与评审要求时，先读 `.codex/docs/standards/engineering-governance-overview.md`，再按需读 `.codex/docs/standards/review-checklist.md` 与对应专题标准
13. 涉及把治理设计正式落成 `.codex/docs/standards/`、同步 `AGENTS.md` / `.codex/README.md` / `.codex/MIGRATION.md` / `current/architecture.md`，以及让现有专项计划引用这些标准时，再读 `.codex/docs/plans/tasks-engineering-governance-foundation-implementation.md`
14. 涉及前端结构治理、知识库域抽离、`ProjectLayout` / `project.mock.ts` / `ProjectChatPage` / `AppSider` 边界重构，以及 Tailwind v4 治理顺序时，再读 `.codex/docs/plans/tasks-platform-frontend-refactor.md`
15. 涉及 Node 服务端、Python indexer、MongoDB / Chroma 状态机、项目对话 runtime 或 Docker 契约重构顺序时，再读 `.codex/docs/plans/tasks-service-indexing-refactor.md`；若要直接承接当前批次，优先看第十节验证基线与第十二节进度
16. 涉及 Week 5-6 已完成基线、顺延项与 Week 7-8 交接接口时，再读 `.codex/docs/plans/tasks-index-ops-project-consumption.md`
17. 只有在需要判断 Week 7-10 目标态与边界时，再读 `.codex/docs/roadmap/target-architecture.md`
18. 涉及工作区设置中心、effective AI config、安全边界或 `/api/settings/*` 时，再读 `.codex/docs/plans/settings-page-task.md`
19. 涉及认证与环境时，再读 `.codex/docs/contracts/auth-contract.md`
20. 涉及 Chroma、知识索引、namespace / collection 命名、metadata 或检索 service 边界时，再读 `.codex/docs/contracts/chroma-decision.md`
21. 涉及基础框架阶段范围与完成记录时，再读 `.codex/docs/plans/tasks-foundation-framework.md`
22. 涉及 Week 3-4 全局资产阶段拆分时，再读 `.codex/docs/plans/tasks-global-assets-foundation.md`
23. 涉及 Docker、MongoDB 本地联调方式或部署现状时，再读 `.codex/docs/current/docker-usage.md`
24. 需要直接执行本地登录、后端调用、Navicat 连接、Chroma 查看或开发 / 验收模式切换时，再读 `.codex/docs/current/docker-operation-checklist.md`
25. 需要直接执行容器启动、TLS 入口或私有化部署命令时，再读 `docker/README.md`；如果要判断当前 Docker 拓扑、端口、安全边界或 secrets 契约，仍以 `.codex/docs/current/docker-usage.md` 为准
26. 需要给 ChatGPT / 外部大模型快速建立当前上下文时，先读 `.codex/docs/handoff/chatgpt-project-brief.md`
27. 如果需要一组可直接上传到 ChatGPT Projects 的副本文件，读 `.codex/packs/chatgpt-projects/README.md`
28. 需要把任务交给下一位 AI 或人类时，使用 `.codex/docs/handoff/handoff-prompt.md`

补充说明：

- 当前仓库已新增 `.codex/docs/plans/tasks-chat-core-week7-8.md` 与 `.codex/docs/contracts/chat-contract.md`。
- 当前仓库已新增 `.codex/docs/plans/tasks-chat-sse-streaming-refactor.md`，用于承接项目对话 `SSE / HTTP streaming`、统一 turn orchestration、取消语义、协议扩展位与 direct replace 的正式执行计划。
- 当前仓库已新增 `.codex/docs/plans/tasks-chat-ant-design-x-migration.md`，用于承接对话页 Ant Design X 组件迁移、`XMarkdown` 接入与 SSE UI 演进计划，不与已落地的 chat-core 主链路台账混写。
- 当前仓库已新增 `.codex/docs/plans/tasks-project-chat-message-rail.md`，用于承接项目对话页右侧消息 Rail、消息加星、共享选择模式导出，以及知识草稿 drawer 的正式执行计划。
- 当前仓库已新增 `.codex/docs/plans/tasks-project-chat-knowledge-draft-selection.md`，用于承接“知识草稿必须选择已有项目私有知识库；无私有知识库时先在聊天页内创建空知识库”的后续交互调整设计。
- 当前仓库已新增 `.codex/docs/plans/tasks-project-chat-knowledge-draft-selection-implementation.md`，用于承接该交互调整的正式实施步骤、测试入口与文档同步清单。
- 当前仓库已新增 `.codex/docs/plans/tasks-platform-frontend-refactor.md`，用于承接前端结构治理、知识库域抽离、项目数据编排边界与 Tailwind v4 治理顺序，不与 `current/` 事实文档混写。
- 当前仓库已新增 `.codex/docs/plans/tasks-engineering-governance-foundation.md`，用于承接长期工程治理机制设计、五个标准包、例外机制、评审清单与后续 `standards/` 目录的落点规划，不与具体实施步骤混写。
- 当前仓库已新增 `.codex/docs/plans/tasks-engineering-governance-foundation-implementation.md`，用于承接治理设计的正式落地顺序，包括创建 `.codex/docs/standards/`、同步入口文档，以及让既有专项计划引用新的治理标准。
- 当前仓库已新增 `.codex/docs/plans/tasks-service-indexing-refactor.md`，用于承接 Node 服务端、Python indexer、MongoDB / Chroma 状态机、项目对话 runtime 与 Docker 契约的跨模块重构顺序；该计划当前已完成 Milestone 0 + 1 + 2 + 3 + 4 + 5 + 6。直接承接时优先看第十二节中的 Milestone 6 收尾记录，再按相邻专题计划或 handoff 继续后续工作。
- 当前迭代重点请优先以这十份计划为主，再结合 `.codex/docs/roadmap/gap-analysis.md`、`.codex/docs/plans/tasks-index-ops-project-consumption.md` 的 Week 7-8 交接接口，以及 `.codex/docs/handoff/handoff-guide.md` 的继续开发顺序判断。

### 理解产品现状与目标

1. 先读 `.codex/docs/current/architecture.md`
2. 再读 `.codex/docs/roadmap/target-architecture.md`
3. 最后读 `.codex/docs/roadmap/gap-analysis.md`

如果只需要快速判断当前仓库状态，只读 `.codex/docs/current/architecture.md` 即可。

## 3. 分类索引

| 分类     | 目录                    | 主要文件                                                                                                                                                                 | 适合回答的问题                                                                |
| -------- | ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------- |
| 当前事实 | `.codex/docs/current`   | `architecture.md`、`docker-usage.md`、`docker-operation-checklist.md`                                                                                                    | 现在的路由、数据来源、模块边界、API / Docker 边界，以及该怎么操作             |
| 实施契约 | `.codex/docs/contracts` | `auth-contract.md`、`chat-contract.md`、`chroma-decision.md`                                                                                                            | MongoDB、JWT、密码哈希、注册登录、项目对话 API、Node / Python / Chroma 分层与检索约束怎么定 |
| 路线蓝图 | `.codex/docs/roadmap`   | `target-architecture.md`、`gap-analysis.md`                                                                                                                              | 产品最终想做成什么、现在差多少、先补什么                                      |
| 工程标准 | `.codex/docs/standards` | `engineering-governance-overview.md`、`review-checklist.md`                                                                                                              | 工程治理规则如何分级、默认门禁是什么、遇到例外如何评审与落盘                  |
| 阶段计划 | `.codex/docs/plans`     | `doc-iteration-handoff-plan.md`、`tasks-foundation-framework.md`、`tasks-global-assets-foundation.md`、`tasks-index-ops-project-consumption.md`、`tasks-chat-core-week7-8.md`、`tasks-chat-sse-streaming-refactor.md`、`tasks-chat-ant-design-x-migration.md`、`tasks-project-chat-message-rail.md`、`tasks-project-chat-knowledge-draft-selection.md`、`tasks-project-chat-knowledge-draft-selection-implementation.md`、`tasks-platform-frontend-refactor.md`、`tasks-engineering-governance-foundation.md`、`tasks-engineering-governance-foundation-implementation.md`、`tasks-service-indexing-refactor.md`、`settings-page-task.md` | 已完成阶段怎么收口、顺延项怎么接、当前迭代顺序与 DoD 如何判断                 |
| 接手交接 | `.codex/docs/handoff`   | `handoff-guide.md`、`chatgpt-project-brief.md`、`handoff-prompt.md`                                                                                                      | 新协作者、ChatGPT 或外部模型如何快速建立事实并继续推进                        |
| 输入材料 | `.codex/docs/inputs`    | `知项Knowject-项目认知总结-v2.md`、`知项Knowject-项目认知总结-v3.md`                                                                                                     | 认知总结原文是什么，哪些内容需要吸收为正式文档                                |
| 设计资料 | `.codex/docs/design`    | 品牌与视觉资料                                                                                                                                                           | 品牌表达、图标、字标、视觉方向是什么                                          |
| 模板     | `.codex/docs/templates` | `PLANS.md`                                                                                                                                                               | 复杂任务、迁移和高风险变更该如何写执行计划                                    |

## 4. 目录边界补充

- `current/` vs `roadmap/`
  - `current/` 只写已落地、能被源码或运行基线印证的事实。
  - `roadmap/` 只写目标态、差距分析与阶段建议；不要把目标能力回写成当前事实。
- `plans/` vs `handoff/`
  - `plans/` 存结构化执行计划、DoD、阶段记录与任务拆解。
  - `handoff/` 存接手顺序、上下文交接与下一位协作者的最小说明；不要把长期任务规划只写在 `handoff/`。
- `standards/` vs `plans/`
  - `standards/` 存长期工程治理与协作规则（默认门禁、例外机制、评审清单与文档同步矩阵）；不写“本轮要怎么做”的执行步骤。
  - `plans/` 仍是执行计划层；如果规则需要落地为具体任务、或需要记录阶段性推进顺序与验证/回滚，就写到对应 `plans/*`。
- `inputs/`
  - 这里只存上游输入材料、认知原稿和非最终决策文档。
  - `inputs/` 不是事实源，也不是目标蓝图；其中有价值的结论应被吸收到 `current/`、`contracts/`、`roadmap/` 或 `plans/`。
- `design/`
  - 允许同时存在 `md / html / png`，前提是它们服务于同一设计工作流：`md` 解释理念，`html` 承载可编辑预览，`png` 保留导出结果。
  - 若未来设计资产数量明显增加，应优先补 `design/README.md` 或按主题拆子目录，而不是把所有二进制文件平铺。
- `templates/`
  - 这里只放可复用模板，不放正在执行的计划、阶段记录或一次性草稿。
  - 若模板数量长期仍只有 1 个，不必为“更标准”重命名目录；当前命名成本低于迁移收益。

## 5. 维护边界

- 更新 `.codex/docs/current/architecture.md`
  - 路由、重定向、页面命名变化。
  - 项目数据来源、localStorage 键、Mock 组织方式变化。
  - 模块职责边界、API 边界、当前运行基线变化。
- 更新 `.codex/docs/current/docker-usage.md`
  - Docker 使用边界、MongoDB 联调方式、最小服务拓扑发生变化。
  - 新增或删除 `Dockerfile`、`docker-compose`、容器化部署脚本。
  - 部署现状从“规划”变为“已交付”或发生明显收缩。
- 更新 `.codex/docs/contracts/auth-contract.md`
  - 基础框架阶段的环境变量、JWT、密码哈希、注册登录契约发生变化。
  - 错误响应格式、状态码语义或安全边界发生变化。
- 更新 `.codex/docs/contracts/chat-contract.md`
  - 项目对话 read/write 接口、响应 shape、来源引用字段或错误语义发生变化。
  - 前端 `projects` API wrapper 与后端 `projects` 模块的对话契约发生变化。
- 更新 `.codex/docs/contracts/chroma-decision.md`
  - Chroma 的角色定位、MongoDB / Chroma 分工、collection 命名或 metadata 设计原则发生变化。
  - Node / Python 索引分层、检索 service 边界、删除 / 重建 / 去重策略发生变化。
  - Week 3-4 与 Week 5-8 的检索分层边界发生变化。
- 更新 `.codex/docs/standards/*.md`
  - 工程治理规则（目录边界、代码结构、注释、配置与安全、文档同步、前端共享抽象）发生变化。
  - 评审清单、例外机制或规则分级口径发生变化，或新增/删除/重命名标准文档。
  - 入口文档（`AGENTS.md`、`.codex/README.md`、`.codex/MIGRATION.md`、`.codex/docs/README.md`、`current/architecture.md`）的同步清单发生变化。
- 更新 `.codex/docs/roadmap/target-architecture.md`
  - 产品三层架构定义变化。
  - Knowledge / Skill / Agent 定义变化。
  - MVP / 第二阶段 / 第三阶段目标变化。
  - 重要待决策项被确认或被废弃。
- 更新 `.codex/docs/roadmap/gap-analysis.md`
  - 当前事实和目标蓝图之间的主要差距发生变化。
  - 优先级、风险判断或阶段性建议发生明显调整。
  - 关键 git 演进节点需要补充新的里程碑。
- 更新 `.codex/docs/plans/doc-iteration-handoff-plan.md`
  - 需要补充新的文档迭代范围、里程碑或验证结果。
  - 本轮计划已完成，需要记录结果总结与残余风险。
- 更新 `.codex/docs/plans/tasks-foundation-framework.md`
  - 基础框架阶段的任务范围、顺序、依赖关系或 DoD 发生变化。
  - 基础框架阶段状态从“进行中”变为“已完成 / 延后 / 拆到下一阶段”时，需同步更新完成记录与边界。
- 更新 `.codex/docs/plans/tasks-global-assets-foundation.md`
  - Week 3-4 全局资产阶段的范围、顺序、依赖关系或 DoD 发生变化。
  - 已确认的前置决策、阶段取舍或风险止损策略发生变化。
  - 阶段状态从“待启动”变为“进行中 / 已完成 / 延后”时，需同步更新。
- 更新 `.codex/docs/plans/tasks-index-ops-project-consumption.md`
  - Week 5-6 索引运维与项目层消费阶段的范围、顺序、依赖关系或 DoD 发生变化。
  - 项目私有知识库 scope、namespace key / versioned collection 契约、rebuild / diagnostics 边界发生变化。
  - 阶段状态从“待启动”变为“进行中 / 已完成 / 延后”时，需同步更新。
- 更新 `.codex/docs/plans/tasks-chat-core-week7-8.md`
  - 项目对话消息写链路、项目级合并检索、最小来源引用的范围、顺序、DoD 或止损边界发生变化。
  - 对话数据落位、路由族、LLM 调用边界或验证入口发生变化。
- 更新 `.codex/docs/plans/tasks-chat-sse-streaming-refactor.md`
  - 项目对话的 `SSE / HTTP streaming` 契约、统一 turn orchestration、前端流式 controller / `useXChat` 适配策略、取消语义、provider stream capability、reconcile 策略或 direct replace 决策发生变化。
  - 该计划从“待启动”进入“进行中 / 已完成 / 延后”，或 DoD、风险、回滚策略发生变化。
- 更新 `.codex/docs/plans/tasks-chat-ant-design-x-migration.md`
  - 对话页 Ant Design X 组件替换、`XMarkdown` 接入、`useXChat`、并行 SSE 路由或 stream reconcile 策略发生变化。
  - 里程碑 1 / 里程碑 2 的边界、任务拆解、DoD、依赖或回滚策略发生变化。
  - 若该计划从“待启动”进入“进行中 / 已完成 / 延后”，需同步更新状态与完成记录。
- 更新 `.codex/docs/plans/tasks-project-chat-message-rail.md`
  - 项目对话页右侧消息 Rail 的范围、状态机、消息加星契约、导出语义、knowledge draft flow、DoD 或回滚策略发生变化。
  - Rail 所依赖的前后端文件边界、测试入口或“当前 conversation only”约束发生变化。
- 更新 `.codex/docs/plans/tasks-project-chat-knowledge-draft-selection.md`
  - 项目知识草稿“必须选择已有项目私有知识库”的交互、默认选择策略、聊天页内复用创建 modal 的方式、测试边界或回滚策略发生变化。
  - 该调整从“待实现设计”进入“进行中 / 已完成 / 延后”时，需同步更新状态与结论。
- 更新 `.codex/docs/plans/tasks-project-chat-knowledge-draft-selection-implementation.md`
  - 该交互调整的实施步骤、测试命令、文档同步清单或回滚策略发生变化。
  - 若实施阶段新增或删减文件边界、拆分任务顺序或验证方式，需同步更新。
- 更新 `.codex/docs/plans/tasks-platform-frontend-refactor.md`
  - 前端结构治理的阶段顺序、知识库域抽离边界、`ProjectLayout` / `project.mock.ts` / `ProjectChatPage` / `AppSider` 拆分范围发生变化。
  - Tailwind canonical class 清理与 token 化顺序、验证基线、风险或回滚策略发生变化。
  - 若该计划从“待启动”进入“进行中 / 已完成 / 延后”，需同步更新状态与完成记录。
- 更新 `.codex/docs/plans/tasks-engineering-governance-foundation.md`
  - 长期工程治理总纲、五个标准包模板、规则分级、例外机制、评审清单或文档落点规划发生变化。
  - 第一阶段主线不再是“代码结构治理”，或规范型治理准备升级为自动化门禁时，需同步更新。
- 更新 `.codex/docs/plans/tasks-engineering-governance-foundation-implementation.md`
  - `standards/` 目录结构与职责边界、入口文档同步范围、既有专项计划的标准引用方式或本轮验证方式发生变化。
  - 若治理基础设施的实施范围从“文档与规则落地”扩大到自动化门禁或脚本巡检，也需同步更新。
- 更新 `.codex/docs/plans/tasks-service-indexing-refactor.md`
  - Node 服务端、Python indexer、MongoDB / Chroma 状态机、项目对话 runtime 或 Docker 契约的重构顺序、任务拆解、DoD、验证基线或回滚策略发生变化。
  - 新的执行批次已经完成、延期、拆分或被降级为候选时，需同步更新状态与决策记录。
- 更新 `.codex/docs/plans/settings-page-task.md`
  - 工作区设置中心的访问阶段、字段契约、前后端交互或 effective config 规则发生变化。
  - `/api/settings/*` 的安全边界、provider 支持范围、知识索引联动方式发生变化。
  - 该文档已兼具“实施计划 + 当前契约”作用，变更时要避免继续保留待开发语态。
- 更新 `.codex/docs/handoff/handoff-guide.md`
  - 当前最重要的接手路径、阅读顺序、继续开发建议发生变化。
  - 有新的业务事实容易被误读，需要显式提醒接手者。
- 更新 `.codex/docs/handoff/chatgpt-project-brief.md`
  - 需要给 ChatGPT / 外部大模型提供新的项目快照时。
  - 当前事实、模块边界、运行方式或“哪些仍是 Mock”发生明显变化时。
- 更新 `.codex/packs/chatgpt-projects/*`
  - 当 `.codex/docs/current/*`、`.codex/docs/contracts/*`、`.codex/docs/plans/*` 中被上传包引用的原文发生变化时。
  - 需要同步更新 `.codex/packs/chatgpt-projects/README.md` 与受影响的派生副本，避免 ChatGPT Projects 上传包与事实源漂移。
- 更新 `.codex/docs/handoff/handoff-prompt.md`
  - 接手 Prompt 中引用的关键文档、源码入口或输出格式发生变化。
  - 交接方式需要从“阅读事实”调整为“执行某一类任务”。
- 更新 `.codex/docs/templates/PLANS.md`
  - 执行计划模板结构、里程碑格式、验证项或回滚项需要调整。
- 更新根 `README.md`
  - 文档入口、目录结构或对外阅读顺序发生变化。

## 6. 使用规则

- 关于“当前是什么”的判断，以 `.codex/docs/current/architecture.md` 和源码为准。
- 关于“Docker 现在怎么用、哪些还没交付”的判断，以 `.codex/docs/current/docker-usage.md` 为准。
- 关于“Docker 该执行哪些命令、入口怎么分流”的判断，以 `docker/README.md` 为准。
- 关于“怎么最快接手当前工作”的判断，以 `.codex/docs/handoff/handoff-guide.md` 为准。
- 关于“给 ChatGPT / 外部大模型最小必要上下文”的判断，以 `.codex/docs/handoff/chatgpt-project-brief.md` 为准。
- 关于“给 ChatGPT Projects 上传哪组副本、这些副本是否已同步”的判断，以 `.codex/packs/chatgpt-projects/README.md` 与对应派生文件为准，但若与 `.codex/docs/*` 冲突，始终以后者为准。
- 关于“未来要做什么”的判断，以 `.codex/docs/roadmap/target-architecture.md` 为准。
- 关于“为什么现在不这么写、下一步先做什么”的判断，以 `.codex/docs/roadmap/gap-analysis.md` 为准。
- 关于“如何把上下文交给下一位协作者”的判断，以 `.codex/docs/handoff/handoff-prompt.md` 为准。
- 关于“基础框架阶段先拆哪些任务”的判断，以 `.codex/docs/plans/tasks-foundation-framework.md` 为准。
- 关于“全局资产阶段先拆哪些任务、执行顺序和 DoD 怎么定”的判断，以 `.codex/docs/plans/tasks-global-assets-foundation.md` 为准。
- 关于“Week 5-6 先补哪些索引运维能力、项目层消费和项目私有知识如何落地”的判断，以 `.codex/docs/plans/tasks-index-ops-project-consumption.md` 为准。
- 关于“Week 7-8 项目对话写链路、项目级合并检索与最小来源引用该按什么顺序推进”的判断，以 `.codex/docs/plans/tasks-chat-core-week7-8.md` 为主，再结合 `.codex/docs/roadmap/gap-analysis.md` 与 `.codex/docs/plans/tasks-index-ops-project-consumption.md` 的 Week 7-8 交接接口。
- 关于“项目对话何时、如何正式切到 `SSE / HTTP streaming`、统一 turn orchestration、取消语义与 direct replace”的判断，以 `.codex/docs/plans/tasks-chat-sse-streaming-refactor.md` 为准。
- 关于“对话页 Ant Design X 组件迁移、assistant Markdown 渲染、并行 SSE UI 演进与 `useXChat` 接线顺序”的判断，以 `.codex/docs/plans/tasks-chat-ant-design-x-migration.md` 为准。
- 关于“项目对话页右侧消息 Rail、消息加星、共享选择模式导出，以及 knowledge draft drawer 该如何分步落地”的判断，以 `.codex/docs/plans/tasks-project-chat-message-rail.md` 为准。
- 关于“项目知识草稿是否必须选择已有项目私有知识库、没有私有知识库时如何在聊天页内补建空知识库”的判断，以 `.codex/docs/plans/tasks-project-chat-knowledge-draft-selection.md` 为准。
- 关于“项目知识草稿私有知识库选择改造应按什么顺序实施、先写哪些测试、最后同步哪些文档”的判断，以 `.codex/docs/plans/tasks-project-chat-knowledge-draft-selection-implementation.md` 为准。
- 关于“前端结构治理、知识库域共享抽离、项目数据编排、`project.mock.ts` 边界收口，以及 Tailwind v4 重构顺序”的判断，以 `.codex/docs/plans/tasks-platform-frontend-refactor.md` 为准。
- 关于“长期工程治理总纲、五个标准包、例外机制、评审清单与 `standards/` 目录应如何落地”的判断，以 `.codex/docs/plans/tasks-engineering-governance-foundation.md` 为准。
- 关于“长期工程治理设计应按什么顺序正式落到 `standards/`、哪些入口文档必须同步、以及现有专项计划应如何引用治理标准”的判断，以 `.codex/docs/plans/tasks-engineering-governance-foundation-implementation.md` 为准。
- 关于“Node 服务端、Python indexer、MongoDB / Chroma 状态机、项目对话 runtime 与 Docker 契约的跨模块重构顺序”的判断，以 `.codex/docs/plans/tasks-service-indexing-refactor.md` 为准。
- 关于“基础框架阶段的环境变量和认证协议具体怎么实现”的判断，以 `.codex/docs/contracts/auth-contract.md` 为准。
- 关于“项目对话 create conversation / create message、来源引用字段和 envelope shape 应该长什么样”的判断，以 `.codex/docs/contracts/chat-contract.md` 为准。
- 关于“Chroma 应该放在哪一层、Node 与 Python 如何分工、collection 怎么命名、metadata 与检索 service 如何分层”的判断，以 `.codex/docs/contracts/chroma-decision.md` 为准。
- `.codex/docs/inputs/知项Knowject-项目认知总结-v3.md` 是当前最新的认知总结输入材料，但仍不是当前事实源；引用其中内容时，必须先判断它属于已落地事实、目标态还是待决策。
- `.codex/docs/inputs/知项Knowject-项目认知总结-v2.md` 保留为历史输入材料，用于回看阶段演进，不作为最新规划依据。

## 7. 当前结论

- 当前仓库已经进入“前后端基础框架已接通、局部能力仍依赖 Mock”的阶段，而不是单纯“前端壳层 + 演示 API”。
- 基础框架阶段已经完成；后端已具备 `auth`、`members`、最小项目 CRUD 与成员接口，前端项目列表、项目基础信息、成员 roster 与全局成员概览也已切到后端接口。
- 当前剩余的主要 Mock 仍集中在项目概览补充层、协作快照补充层，以及更完整的来源引用渲染。
- 全局 `/skills` 已从“只读目录”升级为正式 Skill 资产治理链路；后续若再变更 Skill 来源、生命周期或绑定规则，需要同步 `.codex/docs/current/architecture.md`、handoff 文档与 `.codex/packs/chatgpt-projects/*` 上传副本。
- Week 5-6 当前已经收口到正式基线：`/knowledge` rebuild / diagnostics、项目资源页正式 `agents` 消费，以及项目知识的全局绑定 / 项目私有双层消费都已落地；项目资源页现已补齐统一“接入知识库”入口、知识库详情抽屉，以及项目私有知识的最小运维动作。继续迭代时应直接以 `.codex/docs/plans/tasks-index-ops-project-consumption.md` 的完成记录和顺延项为准。
- Week 7 当前也已落地 `/settings` 工作区设置中心与 `/api/settings/*` 链路；后续若继续改 AI 配置来源、权限模型或索引重建语义，必须同时核对 `.codex/docs/plans/settings-page-task.md`、`.codex/docs/contracts/auth-contract.md` 与 `.codex/docs/contracts/chroma-decision.md`。
- 当前迭代重点已经从“全局资产正式化 / 索引运维收口”推进到“更完整的来源引用渲染与流式体验收口”；`CC-03` 的后端对话写链路、项目级 merged retrieval 与最小 `sources`、`messages/stream` SSE 基线，以及聊天页默认流式发送都已落地，继续开发时应优先结合 Week 7-8 文档进入对话体验增强阶段。
- 当前若正式推进项目对话流式替换、统一 turn orchestration、取消语义与 direct replace，应优先以 `.codex/docs/plans/tasks-chat-sse-streaming-refactor.md` 为主，而不是继续沿用旧的同步交互默认路径。
- 对话体验增强阶段已新增独立计划 `.codex/docs/plans/tasks-chat-ant-design-x-migration.md`，专门承接 Ant Design X UI 统一、`XMarkdown` 接入与并行 SSE UI 演进，避免与 chat-core 主链路台账混写。
- 目标蓝图已经形成，但大量 AI、数据层和部署能力还未进入实现阶段。
- 现在所有项目文档已统一收口到 `.codex/docs/`；后续若再新增项目级文档，应优先纳入这里的既有分类，而不是在仓库根部重新散落新入口。
