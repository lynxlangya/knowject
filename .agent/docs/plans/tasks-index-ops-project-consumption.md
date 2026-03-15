# 索引运维与项目层消费开发任务（Week 5-6，规划拆解）

状态：截至 2026-03-15，Week 3-4 全局资产基础已完成；`IC-01`、`IC-02`、`IC-03`、`IC-04`、`IC-05`、`IC-06`、`IC-07`、`IC-09` 已完成，`IC-08` 保持 timebox 候选未纳入硬性 DoD；本文件当前同时承担“Week 5-6 任务清单 + 执行记录”角色。

本文件用于把 `.agent/docs/inputs/知项Knowject-项目认知总结-v3.md` 中的 `Week 5-6 索引运维 + 项目层消费`，结合当前已落地的 `knowledge / skills / agents / projects` 主链路事实，收敛成可执行、可排期、可验收的任务清单。

本阶段的核心取舍：优先补齐 `global_docs` 运维闭环、收口项目资源页正式消费，并把项目私有知识库做到“可创建 / 可上传 / 可索引 / 可展示”的最小 write-side 闭环；不提前把消息写入、SSE、来源引用、Skill runtime、`global_code` 真实导入一起推进。依据：当前最大的真实缺口在“索引可维护性 + 项目级知识模型”，而不是对话 runtime。

## 目标

Week 5-6 不是“把完整 AI 对话做出来”，而是让 Week 3-4 的全局资产底座进入“可维护、可在项目内正式消费”的下一阶段。

本阶段结束时，至少要交付以下 4 件事：

- `global_docs` 具备文档级 / 知识库级 rebuild 与最小 diagnostics，并与现有 `retry` / 状态机保持一致。
- `/project/:projectId/resources` 的 `agents` 元数据切到正式 `/api/agents`，删除项目资源页对本地 agent 目录的依赖。
- `knowledge` 模块扩展出项目级作用域，项目私有知识库具备“创建 -> 上传 -> 索引 -> 状态展示”的最小闭环。
- 文档格式扩展只在不阻塞前三项时推进；本阶段优先恢复 `pdf`，`docx / Word` 仅作为尾部候选，不列入硬性 DoD。

## 当前事实基线

### 当前事实真相源文件

- `.agent/docs/current/architecture.md`
- `.agent/docs/roadmap/gap-analysis.md`
- `.agent/docs/contracts/chroma-decision.md`
- `apps/api/src/modules/knowledge/*`
- `apps/api/src/modules/projects/*`
- `apps/indexer-py/app/api/routes/indexing.py`
- `apps/platform/src/pages/knowledge/*`
- `apps/platform/src/pages/project/*`

### 规划参考文件

- `.agent/docs/inputs/知项Knowject-项目认知总结-v3.md`
- `.agent/docs/roadmap/target-architecture.md`
- `.agent/docs/plans/tasks-global-assets-foundation.md`
- `.agent/docs/templates/PLANS.md`

### 当前已完成

- `knowledge` 已完成全局知识库 CRUD、文档上传、单文档 `retry / rebuild / delete`、知识库级 rebuild、diagnostics、Node -> Python 触发、`global_docs` Chroma 写入与统一检索。
- `skills` 已完成系统内置 + 自建 + GitHub/URL 导入的正式治理闭环。
- `agents` 已完成正式 CRUD、知识库 / Skill 绑定校验，与全局 `/agents` 管理页。
- 项目模型已正式持久化 `knowledgeBaseIds / skillIds / agentIds` 绑定，并打通项目对话列表 / 详情读链路。
- 项目私有 knowledge 已完成 `scope / projectId` 模型、项目级 `list / create / detail / upload` 路由、`proj_{projectId}_docs` 写侧与删除项目时的级联清理。
- `/knowledge` 已具备最小状态展示与上传后轮询，前端可以观察 `pending / processing / completed / failed` 变化；项目资源页也已能展示项目私有知识，并提供最小创建 / 上传入口。

### 当前明确未完成

- `pdf / docx` 还没有回到当前正式上传契约；当前只稳定支持 `md / markdown / txt`。
- 项目资源页中的 project knowledge 仍未接入 `rebuild / diagnostics` 运维入口。

### 当前不应重复立项

- 注册 / 登录、JWT、项目 CRUD、项目成员管理。
- `/knowledge`、`/skills`、`/agents` 的既有全局治理信息架构。
- 项目对话消息写入、SSE、来源引用与 Agent runtime。
- `global_code` 真实 Git 导入与项目级合并检索。

### 当前需要显式处理的边界

- `projects.knowledgeBaseIds` 当前已经承担“项目绑定的全局知识库”职责；项目私有知识库不应再简单复制一份 ID 回写到这个全局绑定数组里。
- 项目私有知识库在 Week 5-6 只做 write-side 与项目资源展示，不把“项目 + 全局合并检索”提前卷入。
- `agents` fallback 收口只针对项目资源消费链路，不扩到完整 Agent 对话 runtime。
- 索引运维能力本阶段只做到文档级 / 知识库级；系统级批量重建、自动补偿和全量巡检留到后续。
- 文档类型扩展要复用既有 Node / Python 分层；若 `pdf` 恢复阻塞主线，优先完成前三项，再把 `pdf` 顺延。

## 阶段完成定义（DoD）

- 对外正式 API 至少补齐以下 3 类能力：
  - 文档级 rebuild
  - 知识库级 rebuild
  - 知识库级 diagnostics
- `apps/indexer-py` 至少补齐与上述能力对应的内部入口或稳定 service contract，而不是只在注释里预留未来路径。
- `/knowledge` 页面能发起 document / knowledge rebuild，并看到 diagnostics 结果或最小运维状态。
- `/project/:projectId/resources` 中 `agents` 分组的元数据来自正式 `/api/agents`，项目资源页不再依赖 `project.catalog.ts` 的 agent 目录。
- `knowledge` 模块完成项目级 scope 扩展，至少能区分：
  - 全局知识库
  - 项目私有知识库
- 项目私有知识库最小闭环打通：
  - 在项目上下文中创建知识库
  - 上传 `md / markdown / txt`
  - 进入 `pending / processing / completed|failed` 状态流
  - 写入 `proj_{projectId}_docs` 或等价的项目级 collection 命名空间
  - 在项目资源页看到正式状态与文档数量
- 验证入口至少新增一项覆盖 Week 5-6 主链路的最小自动化验证，而不是只依赖手工联调。
- 文档同步至少覆盖：
  - `.agent/docs/current/architecture.md`
  - `.agent/docs/roadmap/target-architecture.md`
  - `.agent/docs/roadmap/gap-analysis.md`
  - `.agent/docs/README.md`
  - `.agent/docs/contracts/chroma-decision.md`（若 collection / metadata / rebuild 契约被冻结）
  - `apps/api/README.md`
  - `apps/platform/README.md`

## 明确不做

- 项目对话消息写入、SSE、来源引用渲染。
- 项目 + 全局知识库合并检索与 Chat runtime 接线。
- `global_code` 真实 Git 导入、代码切分与项目级合并检索。
- Skill runtime、Agent 调度链路、工具调用过程展示。
- 系统级批量 rebuild、自动补偿 worker、全量诊断看板。
- `docx / Word` 的稳定正式支持；若要尝试，只能作为不影响主线的尾部任务。

## 前置假设与阶段冻结决策

### C1. Week 5-6 顺序冻结（2026-03-15）

- 本阶段固定按“`global_docs` 运维闭环 -> 项目资源页正式消费收口 -> 项目私有知识库 write-side”顺序推进。
- 不允许把项目对话消息写入、SSE 或 runtime 插队为主线任务。

### C2. 项目私有知识库模型策略

- 推荐结论：继续复用 `knowledge` 模块，不新开一套平行的 `project-knowledge` 领域模型。
- 至少新增：
  - `scope`（`global` / `project`）
  - `projectId`（仅 `scope=project` 时必填）
- 原因：
  - 当前 `knowledge` 已经具备上传、状态机和统一检索 service。
  - 新开一套平行模块会复制状态机、上传约束与文档记录模型，风险高于收益。

### C3. 项目知识与全局绑定的边界

- 推荐结论：`projects.knowledgeBaseIds` 继续只表示“项目绑定的全局知识库”。
- 项目私有知识库通过 `knowledge.scope=project` + `projectId` 被项目资源页发现，不额外复制到全局绑定数组。
- 原因：
  - 避免“同一个项目知识既被 owner 关系表示，又被 binding 关系重复表示”的双写问题。

### C4. Collection 命名冻结

- 推荐结论：
  - `global_docs` 继续承载全局文档知识
  - `global_code` 继续只保留预留
  - `proj_{projectId}_docs` 作为项目私有文档 collection
  - `proj_{projectId}_code` 只预留，不在本阶段使用
- 原因：
  - Week 5-6 需要先把项目私有知识 write-side 跑通，但不应顺带把项目级 code pipeline 一起做掉。

### C5. 文档格式扩展策略

- 推荐结论：Week 5-6 最多只把 `pdf` 恢复为正式支持；`docx / Word` 不作为硬性里程碑。
- 原因：
  - `pdf` 是当前最有价值也最可控的补点。
  - `docx` 会引入额外解析依赖、边界处理和测试矩阵，容易挤压项目私有知识库主线。

### C6. 运维能力粒度

- 推荐结论：先补 document rebuild、knowledge rebuild 和 knowledge diagnostics。
- 不在本阶段推进：
  - 系统级批量 rebuild
  - 自动补偿守护
  - 全局运维看板
- 原因：
  - 当前最需要的是“能自助修复单个知识库 / 文档”，不是做整套运维平台。

## 推荐分层

- `apps/api`
  - 对外 API、鉴权、scope / project ownership 校验。
  - Knowledge 元数据、项目级 knowledge 查询与上传入口。
  - Rebuild / diagnostics 编排与业务状态回写。
- `apps/indexer-py`
  - 解析、清洗、chunk、embed、upsert、rebuild。
  - 诊断 storage / parser / embedding / collection 的最小健康信息。
- `apps/platform`
  - `/knowledge` 运维操作入口。
  - `/project/:projectId/resources` 的正式资源消费与项目私有知识最小管理入口。
- `Chroma`
  - 继续只做衍生索引层。
  - 全局 / 项目 collection 严格隔离，不混查。

## 计划接口与数据边界

### `global_docs` 运维边界

- Week 5-6 至少建议对外补齐：
  - `POST /api/knowledge/:knowledgeId/documents/:documentId/rebuild`
  - `POST /api/knowledge/:knowledgeId/rebuild`
  - `GET /api/knowledge/:knowledgeId/diagnostics`
- 内部 Python 接口建议对齐为：
  - `POST /internal/v1/index/documents/{documentId}/rebuild`
  - `POST /internal/v1/index/knowledge/{knowledgeId}/rebuild`
  - `GET /internal/v1/index/diagnostics`
- 允许最终落地时做路由名微调，但必须保持“Node 对外、Python 对内”的稳定分层。

### 项目私有知识边界

- 项目私有知识建议以项目路由为主入口，例如：
  - `GET /api/projects/:projectId/knowledge`
  - `POST /api/projects/:projectId/knowledge`
  - `POST /api/projects/:projectId/knowledge/:knowledgeId/documents`
- 若复用 `/api/knowledge` 顶层路由，也必须显式支持 `scope / projectId` 过滤，不能让前端靠本地筛选冒充项目隔离。

### 项目资源页 `agents` 边界

- 项目资源页只负责消费项目已绑定的 agent id，并从正式 `/api/agents` 解析元数据。
- `project.catalog.ts` 后续只保留成员档案和必要的演示残留，不再承担项目资源页的 agent 目录事实源。

## 推荐模块落位

- `apps/api/src/modules/knowledge/*`
- `apps/api/src/modules/projects/*`
- `apps/indexer-py/app/api/routes/indexing.py`
- `apps/indexer-py/app/services/*`
- `apps/platform/src/api/knowledge.ts`
- `apps/platform/src/pages/knowledge/*`
- `apps/platform/src/pages/project/*`
- `apps/platform/src/app/project/project.catalog.ts`
- `apps/platform/src/pages/project/project.mock.ts`

## 里程碑

### 里程碑 1（Week 5）· `global_docs` 运维闭环 + 项目资源页 agents 正式消费

- 目标：
  - 补齐 rebuild / diagnostics，对齐当前 `retry` 状态机。
  - 让项目资源页的 agents 摆脱本地 catalog fallback。
- 预期结果：
  - `/knowledge` 可发起知识库 / 文档 rebuild 并查看最小 diagnostics。
  - `/project/:projectId/resources` 的 agent 卡片来自 `/api/agents` 正式数据。
- 验证方式：
  - API / indexer 测试覆盖 rebuild / diagnostics contract。
  - 前端 typecheck + 项目资源页 smoke。

### 里程碑 2（Week 6）· 项目私有知识最小 write-side 闭环

- 目标：
  - 让项目拥有正式私有 knowledge source，而不是只有全局绑定。
- 预期结果：
  - 能在项目内创建私有知识库、上传 `md / txt`、看到索引状态。
  - 项目资源页能同时区分“绑定的全局知识”和“项目私有知识”。
  - 若排期允许，再恢复 `pdf` 正式支持。
- 验证方式：
  - 项目级 create / upload / index smoke。
  - collection 隔离验证。
  - 权限 / 可见性验证。

## 任务拆解

### IC-01 DONE（2026-03-15）· 冻结 Week 5-6 范围与 contract

- 目标：把 Week 5-6 的“主线 / 延后项 / collection 命名 / scope 语义”先定死，避免做到一半再回退。
- 输出：
  - 本任务文档定稿。
  - 项目私有 knowledge 作用域与绑定边界说明。
  - rebuild / diagnostics 对外 / 对内接口草案。
  - `pdf` 与 `docx` 的优先级结论。
- 依赖：无。
- 已完成记录：
  - 已冻结 Week 5-6 主线顺序为“`global_docs` 运维闭环 -> 项目资源页 `agents` 正式消费 -> 项目私有 knowledge write-side”，并明确把消息写入、SSE、来源引用与 runtime 排除在本任务之外。
  - 已冻结项目私有 knowledge 继续复用 `knowledge` 模块，以 `scope=global|project` 与 `projectId` 表达项目所有权，不新建平行领域模型。
  - 已冻结 `projects.knowledgeBaseIds` 继续只表示“项目绑定的全局知识库”，项目私有 knowledge 不复制回写到该绑定数组。
  - 已冻结 collection 命名：`global_docs`、`global_code`、`proj_{projectId}_docs`、`proj_{projectId}_code`；其中 Week 5-6 只允许真正落地 `proj_{projectId}_docs`。
  - 已冻结文档格式优先级：`pdf` 仅作为不阻塞主线的有条件恢复项，`docx / Word` 不进入 Week 5-6 硬性 DoD。
- 建议子任务：
  - 明确 `projects.knowledgeBaseIds` 与项目私有 knowledge 的关系。
  - 冻结 `proj_{projectId}_docs` collection 命名。
  - 冻结 Week 5-6 不做消息写入 / SSE / runtime。
- 验收：
  - 后续任务不再对“项目知识是 binding 还是 ownership”反复改口。
  - 团队对 `pdf` 是否属于硬性目标没有二义性。

### IC-02 DONE（2026-03-15）· 补齐 `global_docs` 的 rebuild / diagnostics 正式 API

- 目标：让当前最小索引闭环进入“可修复、可诊断”状态。
- 输出：
  - Node 对外 rebuild / diagnostics API。
  - Python 对内 rebuild / diagnostics 入口或等价 service contract。
  - 状态机与错误语义说明。
- 依赖：`IC-01`。
- 已完成记录：
  - `apps/api` 已补齐 `POST /api/knowledge/:knowledgeId/documents/:documentId/rebuild`、`POST /api/knowledge/:knowledgeId/rebuild`、`GET /api/knowledge/:knowledgeId/diagnostics`。
  - `apps/indexer-py` 已补齐 `POST /internal/v1/index/documents/{documentId}/rebuild` 与 `GET /internal/v1/index/diagnostics`，并继续保留旧写入口兼容。
  - Node diagnostics 已按 best-effort 降级：即使 Chroma collection 检查失败或 Python indexer 不可达，API 仍返回 `collection / indexer` 的降级状态，而不是整体 500。
  - 已补齐最小自动化验证：`apps/api` knowledge service 测试覆盖 rebuild / diagnostics，`apps/indexer-py` API 测试覆盖 rebuild / diagnostics。
- 建议子任务：
  - 明确 document rebuild 与 retry 的差异：retry 重跑失败 / 已终止文档，rebuild 可以强制重建现有 completed 文档。
  - 补 knowledge rebuild 的批量顺序与去重策略。
  - 诊断信息至少覆盖：原始文件是否存在、document 记录是否完整、最近索引时间、collection 命中情况、embedding 基线。
  - 顺手收口 Node 侧向量 delete 的过渡 TODO，避免运维语义继续分裂。
- 验收：
  - 单文档和整库都能触发稳定重建。
  - diagnostics 至少能回答“为什么这个知识库现在不可用”。

### IC-03 DONE（2026-03-15）· `/knowledge` 增加运维操作与状态可视化

- 目标：让 rebuild / diagnostics 不只停留在 API 层。
- 输出：
  - 文档级 rebuild 入口。
  - 知识库级 rebuild 入口。
  - diagnostics 展示区或抽屉。
- 依赖：`IC-02`。
- 已完成记录：
  - `apps/platform/src/api/knowledge.ts` 已补齐 document rebuild、knowledge rebuild 与 diagnostics 的正式前端 API 封装。
  - `/knowledge` 详情页已补齐文档级 `重建索引`、知识库级 `重建全部文档` 与 diagnostics 运维面板，不重做既有页面结构。
  - diagnostics 面板已展示 collection / indexer 运行态、待处理 / 失败 / 原文件缺失 / 处理卡住四类摘要，并在文档卡片上标识 `原文件缺失 / 处理卡住` 风险。
  - 当前页面继续复用最小轮询策略；发起 retry / rebuild 后会回到现有 `pending / processing / completed|failed` 状态流，不额外引入新的前端状态管理层。
- 建议子任务：
  - 在当前知识库详情视图内补操作入口，避免重做页面结构。
  - 明确 loading / success / error 反馈。
  - 保持最小轮询策略，不额外引入复杂状态库。
- 验收：
  - 用户可以从 `/knowledge` 自助完成最小运维闭环。

### IC-04 DONE（2026-03-15）· 收口项目资源页 `agents` fallback

- 目标：让项目资源页真正消费正式 agent 元数据。
- 输出：
  - 项目资源页 agent 数据改为 `/api/agents`。
  - `project.catalog.ts` 中面向资源页的 agent 目录删除或退役。
  - 未知 agent ID 仍保留占位项，而不是静默丢失。
- 依赖：`IC-01`。
- 已完成记录：
  - `ProjectLayout` 已并行拉取 `/api/agents`，并通过 project page context 下发给概览页与资源页。
  - `project.mock.ts` 已把 `agents` 资源映射切到正式 `agentsCatalog`，项目资源页与项目概览最近资源卡片不再读取本地 agent 目录。
  - 未知 agent ID 继续渲染“未知资源（{id}）”占位项，没有因为 catalog 缺项而静默丢失。
  - `project.catalog.ts` 当前只保留成员基础档案与项目表单演示选项，不再承担项目资源页的 agent 展示事实源。
- 建议子任务：
  - 让 `ProjectLayout` 或 project page context 并行拉取 `/api/agents`。
  - 保留现有页面结构和文案，不重做资源页信息架构。
  - 同步检查项目概览最近资源卡片是否仍依赖本地 agent 目录。
- 验收：
  - 项目资源页的 `agents` 卡片与全局 `/agents` 页面信息一致。
  - 本地 agent catalog 不再是项目资源展示的事实源。

### IC-05 DONE（2026-03-15）· 扩展 knowledge 模型支持项目级 scope

- 目标：为项目私有 knowledge 正式化提供最小可持续的数据结构。
- 输出：
  - `knowledge` 元数据新增 scope / project ownership 字段。
  - repository 索引策略与查询 filter 扩展。
  - 权限与可见性规则。
- 依赖：`IC-01`。
- 已完成记录：
  - `apps/api` 的 `knowledge_bases` 元数据模型已补齐 `scope=global|project` 与 `projectId` 字段，summary 响应同步返回 `scope / projectId`。
  - `KnowledgeRepository` 已补齐 `scope` 维度索引与全局 / 项目 filter；全局 `/api/knowledge` 列表当前只返回 `scope=global` 与历史 legacy 记录，不会被 project scope 污染。
  - `knowledge.service` 已补齐项目作用域可见性守卫：当知识库为 `scope=project` 时，详情、编辑、删除、上传、retry、rebuild 与 diagnostics 都要求当前用户属于对应项目。
  - diagnostics 的期望 collection 命名已改为读取 knowledge 自身的 `scope / projectId / sourceType`，为后续 `proj_{projectId}_docs` 写侧接入预留稳定 contract。
  - 已补齐最小自动化验证：knowledge service 测试覆盖全局列表过滤、legacy scope 归一化，以及 project scope detail 的可见 / 不可见场景。
- 建议子任务：
  - 只引入 `global / project` 两档 scope，不额外发明更多层级。
  - 确保 global knowledge 列表不被 project knowledge 污染。
  - 确保 project knowledge 在删除项目或校验权限时有明确 owner 关系。
- 验收：
  - 知识库模型能同时表达全局知识与项目私有知识，且查询不会串 scope。

### IC-06 DONE（2026-03-15）· 打通项目私有知识库 API 与索引写侧

- 目标：让项目内真正能拥有自己的知识资产。
- 输出：
  - 项目级 knowledge create / list / detail / upload API。
  - 项目级存储路径约定。
  - `proj_{projectId}_docs` 写侧 collection 接入。
- 依赖：`IC-05`。
- 已完成记录：
  - `apps/api` 已开放 `GET /api/projects/:projectId/knowledge`、`GET /api/projects/:projectId/knowledge/:knowledgeId`、`POST /api/projects/:projectId/knowledge`、`POST /api/projects/:projectId/knowledge/:knowledgeId/documents` 四个项目级 knowledge 路由。
  - 项目私有 knowledge 继续复用 `knowledge` 模块，不回写 `projects.knowledgeBaseIds`；项目路由只消费 `scope=project` 且 `projectId` 命中的知识库，不会把绑定的全局知识混入。
  - 项目私有 knowledge 当前固定只支持 `global_docs`；上传后会把原始文件落到 `projects/{projectId}/knowledge/{knowledgeId}/{documentId}/{documentVersionHash}/{fileName}`，并写入 Chroma `proj_{projectId}_docs`。
  - `projects.service` 已补齐删除项目时的 project scope knowledge 级联清理，避免留下孤儿知识记录、原始文件目录和 Chroma 向量。
  - 已补齐最小自动化验证：knowledge service 测试覆盖项目级 knowledge list / create / upload，projects service 测试覆盖项目删除时的 project knowledge cleanup hook。
- 建议子任务：
  - 复用现有上传、状态机和 Node -> Python 触发逻辑。
  - 项目级 collection 必须与 `global_docs` 严格隔离。
  - 先只支持 `md / markdown / txt`，不要和格式扩展绑死。
- 验收：
  - 能在项目维度完成创建、上传、索引与状态回显。
  - 项目私有 knowledge 不会误写到 `global_docs`。

### IC-07 DONE（2026-03-15）· 项目资源页接入项目私有知识展示与最小入口

- 目标：让项目私有 knowledge 在项目内可见、可用。
- 输出：
  - 项目资源页知识分组能同时展示“绑定的全局知识”和“项目私有知识”。
  - 最小创建 / 上传入口。
  - 状态标签与空态说明。
- 依赖：`IC-04`、`IC-06`。
- 已完成记录：
  - `ProjectLayout` 已新增项目私有知识目录加载与独立刷新入口，项目页上下文会同时下发全局知识目录与 `/api/projects/:projectId/knowledge` 返回的 project scope knowledge 列表。
  - `project.mock.ts` 已收口知识分组映射：项目资源页与项目概览最近资源卡片都会同时展示“绑定的全局知识”和“项目私有知识”，并通过 `source` 标签区分 `全局绑定 / 项目私有`。
  - `/project/:projectId/resources` 已补齐项目私有知识最小管理入口：可以在知识分组里创建项目知识库，并直接复用现有上传 / 文本录入模态框上传 `md / markdown / txt` 文档。
  - 项目私有知识卡片当前已展示最小 `indexStatus + documentCount`，并提供“上传文档”操作；全局绑定知识继续回到全局 `/knowledge` 页面治理，没有把两条职责重新混在一起。
  - `KnowledgeManagementPage` 的上传约束与文本文件生成逻辑已抽到共享 helper，避免全局知识页和项目资源页各自维护一份文件校验规则。
- 建议子任务：
  - 保持“治理在全局、消费在项目”的信息架构不变。
  - 私有 knowledge 只在当前项目可见，不透出到全局 `/knowledge`。
  - 若 UI scope 过大，优先做最小 modal / drawer，而不是再造一个全局知识页副本。
- 验收：
  - 项目成员能在项目内看见并维护属于当前项目的知识库最小闭环。

### IC-08 · 有条件恢复 `pdf` 正式支持

- 目标：在不拖慢主线的前提下，补回最有价值的一种文档格式。
- 输出：
  - `pdf` 解析适配。
  - 上传契约与前端文案恢复。
  - 最小 parser / pipeline 测试。
- 依赖：`IC-02`、`IC-06`。
- 建议子任务：
  - 先 timebox，最多占用 1-2 天。
  - 若 `pdf` 解析质量或稳定性未达标，立即回退到 backlog，不继续扩到 `docx`。
- 验收：
  - `pdf` 至少能在全局或项目私有 knowledge 其中一条正式链路上稳定跑通。
  - 若未达标，必须明确记录未纳入本阶段 DoD 的原因。

### IC-09 DONE（2026-03-15）· 验证、回归与文档同步

- 目标：确保 Week 5-6 的输出能被 Week 7-8 直接接住。
- 输出：
  - 最小自动化验证入口。
  - 文档同步记录。
  - 遗留问题与顺延项清单。
- 依赖：`IC-03`、`IC-07`；`IC-08` 视情况纳入。
- 已完成记录：
  - 仓库根已新增 `pnpm verify:index-ops-project-consumption`，统一执行 `apps/api` 中与项目知识 / 索引运维直接相关的测试、`apps/indexer-py` 全量测试，以及 `apps/platform` 类型检查。
  - 已实际执行 `pnpm verify:index-ops-project-consumption`：`apps/api` 54 个测试全部通过，`apps/indexer-py` 18 个测试全部通过，`apps/platform` 类型检查通过。
  - 本轮已同步更新 `.agent/docs/current/architecture.md`、`.agent/docs/roadmap/target-architecture.md`、`.agent/docs/roadmap/gap-analysis.md`、`.agent/docs/README.md`、`.agent/docs/handoff/handoff-guide.md`、`.agent/docs/handoff/handoff-prompt.md`、根 `README*` 与子系统 README，清理 Week 5-6 / Week 7-10 混写。
  - 已形成 Week 7-8 顺延项清单：消息写链路、项目 + 全局知识合并检索、来源引用、Skill runtime / Agent 编排，以及 project knowledge 的项目内 rebuild / diagnostics。
  - 关于“项目内创建知识库 -> 上传文档 -> 索引完成 -> 资源页可见”的验收，本轮采用“自动化 + 半自动”组合记录：后端 `knowledge.service / projects.service` 测试覆盖项目知识 `create / upload / collection / cleanup`，Python indexer 测试覆盖上传与索引链路，前端通过 `platform` 类型检查与资源映射 contract 保证 `resources` 页正式消费 project knowledge；当前仓库尚无浏览器级 E2E，因此这部分仍不是完整 UI 自动化。
- 建议子任务：
  - 为 rebuild / diagnostics 补 API 与 indexer 测试。
  - 为项目私有 knowledge 补 scope / collection 隔离测试。
  - 同步更新架构事实、目标蓝图、gap-analysis、docs 索引与子系统 README。
  - 记录哪些能力顺延到 Week 7-8 / Week 9-10。
- 验收：
  - 至少有一条“项目内创建知识库 -> 上传文档 -> 索引完成 -> 资源页可见”的自动或半自动验证记录。
  - 文档不再把 Week 5-6 和 Week 7-10 的能力混写。

## 推荐执行顺序（按工作日节奏）

### Week 5

- Day 1：
  - 完成 `IC-01`
  - 启动 `IC-02`
- Day 2-3：
  - 继续 `IC-02`
- Day 4：
  - 启动 `IC-03`
  - 启动 `IC-04`
- Day 5：
  - 完成 `IC-03`
  - 完成 `IC-04`
  - 做一次里程碑 1 验收

### Week 6

- Day 6：
  - 启动 `IC-05`
- Day 7-8：
  - 完成 `IC-05`
  - 启动 `IC-06`
- Day 9：
  - 继续 `IC-06`
  - 启动 `IC-07`
- Day 10：
  - 完成 `IC-07`
  - 按 timebox 决定是否启动 `IC-08`
- Day 11-12：
  - `IC-08`（若不满足条件则直接跳过）
  - 启动 `IC-09`
- Day 13-14：
  - 文档同步
  - 回归验证
  - 形成 Week 7-8 交接输入

## Week 7-8 的交接接口

Week 5-6 完成后，Week 7-8 应该直接复用以下产物，而不是重做一遍：

- `global_docs` 的 rebuild / diagnostics / retry 状态机和 API 语义。
- 项目资源页正式 `/api/agents` 消费链路。
- 项目私有 knowledge 的 scope / project ownership 模型。
- `proj_{projectId}_docs` collection 命名与最小上传 / 索引写侧。
- 项目资源页中“全局绑定知识 + 项目私有知识”的消费分层。

换句话说，Week 7-8 的对话核心不应重新定义知识资产，而应直接复用 Week 5-6 已经打通的 project knowledge write-side 和 ops baseline。

## 风险与止损

- 风险 1：rebuild / diagnostics 范围膨胀为整套运维平台
  - 止损：只做 document / knowledge 两级，不做 system-wide batch 与自动补偿。
- 风险 2：项目私有 knowledge 和全局 binding 双写冲突
  - 止损：项目私有 knowledge 只用 `scope + projectId` 表达 owner 关系，不复制到 `projects.knowledgeBaseIds`。
- 风险 3：`pdf` 恢复拖慢主线
  - 止损：`pdf` 只做 timebox 候选；主线未稳前不碰 `docx`。
- 风险 4：项目资源页顺手扩成完整资产治理页
  - 止损：继续保持“治理在全局，项目侧只做消费与最小入口”。
- 风险 5：rebuild 后状态与 diagnostics 不一致
  - 止损：先定义 diagnostics 字段，再做自动修复；不要让 UI 先于契约扩展。
- 风险 6：项目级 collection 命名和 metadata 过早过度设计
  - 止损：Week 5-6 只冻结 `proj_{projectId}_docs` 最小字段，复杂多集合检索策略延后到 Week 7-8。

## 最小验收清单

- [x] `/knowledge` 已支持 document / knowledge rebuild 与最小 diagnostics。
- [x] 项目资源页 `agents` 已切正式 `/api/agents` 元数据。
- [x] 项目私有 knowledge 已支持创建、上传、索引和状态展示。
- [x] 项目私有 knowledge 与全局 knowledge 不会串 scope / 串 collection。
- [x] 至少一项 Week 5-6 自动化验证已落地。
- [x] 文档已同步，不再把 `pdf / docx`、项目私有 knowledge、消息写入和 runtime 混成一个阶段。

## 一句话结论

Week 5-6 的正确打法不是“马上进入对话 runtime”，而是先把索引运维做成可维护的正式能力，再让项目层拥有真正的私有 knowledge 和正式 agent 消费链路。这样 Week 7-8 的对话核心才有稳定的 project knowledge 基座可接。
