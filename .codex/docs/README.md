# Compatibility Notice

This location is now compatibility-only.

The primary project documentation root is [docs/README.md](../../docs/README.md).

Please update old references from `.codex/docs/*` to `docs/*`.
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
