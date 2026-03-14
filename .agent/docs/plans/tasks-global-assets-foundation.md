# 全局资产基础开发任务（Week 3-4，规划拆解）

状态：截至 2026-03-14，GA-01、GA-02、GA-03、GA-04、GA-05、GA-06、GA-07 已完成，GA-08 待启动；本文件当前同时承担“Week 3-4 任务清单 + 完成记录”角色。

本文件用于把 `.agent/docs/inputs/知项Knowject-项目认知总结-v2.md` 中的 `Week 3-4 全局资产基础`，结合当前已完成的基础框架事实，收敛成可执行、可排期、可验收的任务清单。

本阶段的核心取舍：优先建立“全局知识库 / 全局技能 / 全局智能体”的正式数据骨架与最短可运行闭环，不提前把项目私有知识库、对话主链路、SSE、完整 Agent 调度一起做完。依据：当前仓库最大的空白在资产正式化，而不是壳层或路由本身。

## 目标

Week 3-4 不是“把所有 AI 能力一次做完”，而是在已完成的 `auth / projects / members` 基线上，补出后续 Week 5-8 能继续生长的全局资产底座。

本阶段结束时，至少要交付以下 4 件事：

- 全局知识库具备正式元数据模型、文档上传、Node 触发 Python 索引、解析 / 分块 / 向量化、索引状态展示的最短闭环。
- Chroma 与后端建立 Node + Python 分层接入基线，`global_docs` 可写可查，`global_code` 至少完成命名空间和数据契约预留。
- 全局技能具备最小注册体系，先落地 3 个内置 Skill 的标准化定义，不急着开放复杂自建能力。
- 全局智能体具备正式配置模型，可绑定知识库和 Skill，并能在全局资产页完成基本管理。

## 当前事实基线

### 当前事实真相源文件

- `.agent/docs/current/architecture.md`
- `apps/platform/src/pages/assets/GlobalAssetManagementPage.tsx`
- `apps/platform/src/app/project/project.catalog.ts`
- `apps/platform/src/app/project/project.storage.ts`
- `apps/api/src/app/create-app.ts`
- `apps/api/src/modules/auth/*`
- `apps/api/src/modules/projects/*`
- `apps/api/src/routes/memory.ts`

### 规划参考文件

- `.agent/docs/contracts/chroma-decision.md`
- `.agent/docs/roadmap/gap-analysis.md`
- `.agent/docs/roadmap/target-architecture.md`
- `.agent/docs/plans/tasks-foundation-framework.md`

### 当前已完成

- 基础框架阶段已完成：
  - MongoDB 基线、注册 / 登录、JWT、中间件、项目 CRUD、成员管理都已落地。
  - 项目列表、项目基础信息、项目成员 roster 与全局成员概览已切到正式后端接口。
- 全局资产层已有前端壳层：
  - `/knowledge`
  - `/skills`
  - `/agents`
- GA-01 已完成：
  - Week 3-4 范围、里程碑、实现边界和 Node / Python / MongoDB / Chroma 分层契约已冻结到正式文档。
- GA-02 已完成：
  - `apps/api` 已建立 `knowledge / skills / agents` 三组最小模块骨架，并挂载 `/api/knowledge`、`/api/skills`、`/api/agents` 鉴权占位接口。
  - Python 索引运行时目录已冻结为 `apps/indexer-py`，当前已落地职责与集成边界说明。
- GA-03 已完成：
  - `knowledge` 模块已落地 `knowledge_bases` 与 `knowledge_documents` 元数据模型、状态枚举与 Mongo 索引策略。
  - `GET /api/knowledge` 已切到正式列表 response shape，不再返回 GA-02 阶段的占位 meta。
- GA-04 已完成：
  - `knowledge` 模块已提供知识库列表 / 详情 / 创建 / 编辑 / 删除接口。
  - 文档上传入口已接入，支持 `md / txt / pdf` 三种格式的最小上传闭环，并把原始文件落到本地存储。
- GA-05 已完成：
  - `apps/indexer-py` 已落地 FastAPI + `uv` 内部索引控制面，当前固定通过 `POST /internal/v1/index/documents` 触发 `md / txt` 解析、清洗与 `1000 / 200` 分块。
  - `knowledge` 上传链路已接入 `pending -> processing -> completed|failed` 状态流，业务状态仍由 Node 统一回写 MongoDB。
  - `pdf` 当前会明确回写 `failed` 与 `errorMessage`，不假装支持。
  - Docker Compose 基线已补 `indexer-py` 服务与共享知识存储卷，避免容器内上传后找不到原始文件。
- GA-06 已完成：
  - 已打通 `global_docs` 的 OpenAI-compatible embedding、Chroma collection 初始化、向量写入、按知识库过滤查询与知识库删除联动清理。
  - 已由 Node 侧补统一知识检索 service，并提供 `POST /api/knowledge/search` 作为正式检索入口。
  - 已完成 `global_code` collection 初始化与命名空间预留，但没有做真实代码导入。
- GA-07 已完成：
  - `/knowledge` 已切到正式后端接口，前端新增 `knowledge` API client，并补齐知识库列表、创建、编辑、删除、文档上传与状态展示。
  - 页面已补空态 / 加载态 / 错误态，以及上传后的最小轮询，能观察 `pending / processing / completed / failed` 状态变化。
- 全局资产当前仍是部分前端 Mock：
  - `/knowledge` 已切正式接口并补状态视图。
  - `project.catalog.ts` 仍提供 `skills / agents` 目录与项目资源映射所需的过渡数据。
  - `GlobalAssetManagementPage.tsx` 当前仍服务 `skills / agents`，保留占位按钮，不产生真实写路径。
- 项目资源绑定已正式写回后端项目模型：
  - `projects` 集合当前已持久化 `knowledgeBaseIds / agentIds / skillIds`
  - `knowject_project_resource_bindings` 已退为历史本地数据迁移缓存
- 项目对话读链路已接入正式项目接口：
  - `GET /api/projects/:projectId/conversations`
  - `GET /api/projects/:projectId/conversations/:conversationId`
- `memory` 路由当前只是“项目记忆查询演示接口”，不能直接当正式知识检索服务。

### 当前明确未完成

- 后端已建立 `knowledge / skills / agents` 正式模块骨架；其中 `knowledge` 已具备真实元数据模型、CRUD、上传入口、`global_docs` Chroma 写入、统一检索与前端正式状态视图。
- 当前还没有 `global_code` 真实导入、项目私有知识库，以及 Skill / Agent 正式资产能力。
- `apps/indexer-py` 已具备可运行的 FastAPI 内部索引控制面，并已实现 embedding、Chroma upsert / delete；但对外可见的重建 / retry / diagnostics 接口仍未补齐。
- 没有全局 Skill 注册表、执行契约和内置 Skill 清单。
- 没有全局 Agent 的正式存储、CRUD、绑定校验与前端表单。

### 当前不应重复立项

- 登录页、JWT、项目 CRUD、项目成员管理。
- `/knowledge`、`/skills`、`/agents` 的页面路由壳层。
- 项目私有知识库、项目对话消息写入、SSE、来源引用、完整 Agent 调度。

### 当前需要显式处理的边界

- `ProjectSummary` 现已是“后端正式项目基础信息 + 后端资源绑定 + 前端本地 pin”的消费模型；后续不应再把资源绑定重新拆回前端本地状态。
- 全局资产页已经有壳层，因此本阶段应优先“接正式数据”，不要再重做一套页面结构。
- 认知文档里提到 `global_docs / global_code`；但真实 Git 仓库接入和代码切分属于 Week 5-6，本阶段只应完成 `global_code` 的集合预留与契约，不应把代码接入强行塞进 Week 3-4。

## 阶段完成定义（DoD）

- 后端新增正式的全局资产模块边界：
  - `knowledge`
  - `skills`
  - `agents`
- 冻结独立 Python 索引运行时边界：
  - 推荐目录名 `apps/indexer-py`
  - Node 触发方式固定为本地 HTTP 服务
  - 状态回写方式固定为 Node 独占写入
- 环境变量与运行时配置能够支撑：
  - MongoDB 中保存资产元数据
  - Chroma 中保存向量索引
  - embedding provider 与 embedding model（OpenAI + `text-embedding-3-small`）
  - 本地文件存储保存上传原件或处理中间文件
  - Node API 与 Python indexer 的最小连接 / 触发契约
- 全局知识库最短闭环打通：
  - 创建知识库
  - 上传文档
  - 进入 `pending / processing / completed / failed` 状态流
  - Node 创建文档记录、保存文件并触发 Python
  - Python 完成解析、清洗、分块、向量化与 Chroma 写入
  - 能从 UI 看到状态、文档数和最近更新时间
- Chroma 正式接入：
  - `global_docs` 可完成写入、删除、重建
  - `global_code` 已建立集合命名与 metadata 约定
- 全局 Skill 最小闭环打通：
  - 能稳定列出 3 个内置 Skill
  - 每个 Skill 有统一 metadata、参数定义和执行器标识
  - 暂不要求接入真实对话链路
- 全局 Agent 最小闭环打通：
  - 创建 / 编辑 / 列表 / 详情
  - 绑定知识库与 Skill
  - 校验所绑定的资产必须存在
- 至少具备一个服务端可复用的知识检索 service 或最小诊断查询入口，供 `search_documents` 与后续对话链路复用，而不是让 Skill 直接拼底层 Chroma 查询。
- 前端 `/knowledge`、`/skills`、`/agents` 页面以正式接口为主；若保留过渡层，必须明确剩余 Mock 边界和删除条件。
- 文档同步完成，至少包含：
  - `README.md`（如入口或环境变量发生变化）
  - `.agent/docs/README.md`
  - `.agent/docs/current/architecture.md`
  - `.agent/docs/contracts/auth-contract.md`（如环境变量或运行契约发生变化）
  - `.agent/docs/contracts/chroma-decision.md`（如 Chroma 角色、collection、metadata 或检索边界发生变化）
  - `.agent/docs/roadmap/gap-analysis.md`
  - `apps/api/README.md`
  - `apps/platform/README.md`
  - `/.env.example`（如新增或修改环境变量）

## 明确不做

- 项目私有知识库与项目 Git 仓库接入。
- 项目资源绑定进一步扩展与项目内消费编排增强（基础持久化已完成，不在本阶段作为新增目标）。
- 对话会话模型、消息存储、SSE 流式输出、来源引用展示。
- LLM 自主调用 Skill 的编排链路。
- Skill 的公网引入、复杂自建 Skill、代码执行型 Skill 沙箱。
- 模型可配置 UI。
- 完整 `docker-compose` 交付文件本体。

## 前置假设与阶段冻结决策

以下内容默认作为“推荐推进假设”；其中已在 2026-03-13 明确确认的部分，直接视为本阶段冻结决策执行，不再反复摇摆。

### C1. 已冻结实施决策（2026-03-13）

- Node -> Python 触发方式：
  - 固定为 Node 调 Python 本地 HTTP 服务。
  - 若早期实现暂时借用 CLI / 子进程，只能作为内部适配细节，不能暴露成长期业务契约。
- 业务状态回写归口：
  - MongoDB 中的知识库 / 文档业务状态统一由 Node/Express 回写。
  - Python 只返回处理结果，不直接写业务主状态表。
- Embedding 基线：
  - provider 固定为 OpenAI。
  - model 固定为 `text-embedding-3-small`。
- 文件保留策略：
  - 原始上传文件长期保留，直到文档被删除或被新版本替换。
  - 中间产物成功后清理，失败时保留 `72 小时 ~ 7 天` 供诊断。
- 重试 / 重建粒度：
  - Week 3-4 先交付 `retry document`、`rebuild document`、`rebuild knowledge`。
  - 系统级批量重建延后到 Week 5-6 以后。

### D1. Skill MVP 范围

- 推荐结论：Week 3-4 只落地“内置 Skill 注册表 + 3 个内置 Skill 定义”，不开放用户自建 Skill。
- 原因：
  - 本阶段重点是把数据骨架和绑定关系立住。
  - 自建 Skill 会立刻引入参数编辑、执行安全、校验和权限问题，超出两周最小闭环。

### D2. 文档接入格式

- 推荐结论：首批只支持 `md / txt / pdf`。
- 原因：
  - `docx`、网页抓取、仓库克隆会显著放大解析复杂度。
  - 先把“上传 - 解析 - 分块 - 向量化 - 状态反馈”跑通，后续再补格式。

### D3. 向量化运行方式

- 推荐结论：MVP 阶段使用单进程异步任务模型，不引入额外队列系统。
- 原因：
  - 当前仓库还没有 worker / job queue 基础设施。
  - 两周目标应优先落在可运行闭环，而不是分布式执行架构。
  - 这条判断适用于“Node 触发 Python indexer”的最小闭环，不等于把索引逻辑继续塞回 Node。

### D4. `global_code` 的实现边界

- 推荐结论：只完成集合初始化、metadata 结构和删除 / 重建能力，不接入真实 Git 管道。
- 原因：
  - 代码接入已经被原始路线图放到 Week 5-6。
  - 如果本阶段强做代码管道，会挤占知识库闭环和 Agent 配置的完成度。

### D5. Agent 默认模型策略

- 推荐结论：模型先在服务端固定，不做前端可配置；Agent 表单保留 `model` 字段扩展位，但 UI 可不开放。
- 原因：
  - 与认知文档“模型可配置第二阶段”一致。
  - 可以避免 Week 3-4 把模型接入问题扩散成新的主任务。

### D6. Embedding Provider、Python Indexer 与环境契约

- 推荐结论：GA-05 / GA-06 直接按已冻结的 embedding provider 方案和最小环境变量契约推进，不再把 provider 选择留到编码中途。
- 原因：
  - Chroma 只是向量存储，不解决 embedding 生成本身。
  - 若 provider、SDK 和环境变量未先锁定，Week 3-4 的“向量化 / 可写可查”会停留在口号层。
- 本阶段至少冻结：
  - Chroma 连接配置
  - embedding provider 配置（OpenAI）
  - embedding model 配置（`text-embedding-3-small`）
  - provider 凭证注入方式
  - 本地文件存储根目录
  - Node API 到 Python indexer 的触发方式（本地 HTTP 服务）
  - Python indexer 到 Node / MongoDB 的状态同步方式（结果交回 Node，由 Node 统一回写状态）
- 具体角色边界、collection 命名、metadata 设计原则与检索 service 分层，以 `.agent/docs/contracts/chroma-decision.md` 为准。

## 推荐分层

- `apps/api`
  - 对外正式 API。
  - 鉴权、权限、知识库 CRUD、文档记录、上传入口、状态查询。
  - 统一知识检索 service。
  - 触发 Python indexer。
  - 接收 / 同步索引结果状态。
- `apps/indexer-py`
  - Python 独立索引服务 / worker / CLI。
  - 负责 parse / clean / chunk / embed / upsert / delete / rebuild / retry / diagnostics。
- MongoDB
  - 只存业务主数据与索引状态，不存向量。
- Chroma
  - 只存 chunk embeddings 与 metadata。

## 计划接口与数据边界

### 全局知识库边界

- MongoDB 保存：
  - 知识库元数据
  - 文档元数据
  - 索引状态
  - 失败原因
  - `documentVersionHash`
  - `embeddingProvider`
  - `embeddingModel`
  - `lastIndexedAt`
  - `retryCount`
- Chroma 保存：
  - 文档 chunk 向量
  - chunk metadata（`knowledgeId / documentId / source / chunkIndex / type` 等）
- 本阶段只做“全局文档知识库”正式闭环；代码知识库先保留集合契约，不落地真实导入流程。

### 全局 Skill 边界

- Skill 本阶段先视为“标准化能力定义”，不要求对话层实际接入。
- Week 3-4 默认优先采用“代码 registry + 只读接口”的最小落地方式，不强行引入可编辑的 Skill 持久化后台。
- 内置 Skill 先固定为：
  - `search_codebase`
  - `check_git_log`
  - `search_documents`
- `search_codebase` 与 `check_git_log` 允许先完成 metadata + executor contract，不要求立即对真实项目仓库开放执行入口。
- `search_documents` 需要复用统一的知识检索 service 或最小诊断查询入口，以证明 Skill 能挂到正式知识库；不应由 Skill 自己直接操作底层向量存储或直连 Chroma。

### 全局 Agent 边界

- Agent 本质是配置，不是对话。
- 本阶段只要求：
  - 存储名称、描述、`systemPrompt`
  - 绑定知识库、绑定 Skill
  - 列表 / 详情 / 编辑
- 不要求：
  - 会话内真正调度
  - 工具调用过程展示
  - SSE 对话集成

## 推荐模块落位

以下为建议新增位置，用于保持与当前仓库结构一致：

- `apps/api/src/modules/knowledge/*`
- `apps/api/src/modules/skills/*`
- `apps/api/src/modules/agents/*`
- `apps/api/src/lib/chroma/*` 或 `apps/api/src/integrations/chroma/*`
- `apps/indexer-py/*`（推荐）
- `apps/platform/src/api/knowledge.ts`
- `apps/platform/src/api/skills.ts`
- `apps/platform/src/api/agents.ts`
- `apps/platform/src/pages/knowledge/*`
- `apps/platform/src/pages/skills/*`
- `apps/platform/src/pages/agents/*`

若后续实际落位与这里不同，优先保持“模块边界清晰”而不是死守目录名。

## 里程碑

### 里程碑 1（Week 3）· 全局知识库最短闭环

- 目标：
  - 打通“知识库元数据 + 文档上传 + Node 保存文件并触发 Python + Python 解析分块与 Chroma 写入 + 状态展示”。
- 预期结果：
  - 用户能在 `/knowledge` 看到真实知识库列表。
  - 新建知识库后可上传文档，并看到处理状态变化。
  - 至少一个文档类型能完整走通到 `completed`。
- 验证方式：
  - API 级手动 / 自动 smoke。
  - 前端最小上传与状态展示联调。
  - Chroma 中能看到写入结果。

### 里程碑 2（Week 4）· Skill / Agent 正式配置化

- 目标：
  - 建立全局 Skill 注册表与全局 Agent 配置闭环。
- 预期结果：
  - `/skills` 能展示 3 个内置 Skill。
  - `/agents` 能创建并编辑全局 Agent，完成知识库与 Skill 绑定。
  - 后端已具备 Week 5-8 可复用的正式资产模型。
- 验证方式：
  - Agent 绑定校验。
  - Skill 列表与查询。
  - 前端表单 + 后端 CRUD 联调。

## 任务拆解

### GA-01 DONE（2026-03-13）· 冻结 Week 3-4 范围与契约

- 目标：把阶段边界、数据模型最小字段和完成标准先锁住，避免实现过程中持续改口。
- 输出：
  - Week 3-4 的任务文档定稿。
  - 资产实体最小字段清单。
  - 环境变量新增清单。
  - 基础依赖与技术选型短名单。
  - Node / Python / Chroma / MongoDB 的职责边界说明。
  - 已冻结的 5 个实施决策落盘。
- 依赖：无。
- 已完成记录：
  - 已冻结 Week 3-4 只推进里程碑 1 的任务顺序：`GA-02 -> GA-03 -> GA-04 -> GA-05 -> GA-06 -> GA-07`。
  - 已冻结 Node 管业务、Python 管索引、MongoDB 管主数据、Chroma 管索引层的职责边界。
  - 已冻结 Node 调 Python 本地 HTTP、Node 独占业务状态回写、OpenAI + `text-embedding-3-small`、`global_docs / global_code` 集合边界等关键实施决策。
- 子任务：
  - 明确本阶段只做“全局资产正式化”，不把项目层和对话层提前卷入。
  - 冻结 3 个内置 Skill 名称与职责边界。
  - 冻结文档接入格式首批支持范围。
  - 冻结 `global_docs / global_code` 的集合命名和 metadata 基础字段。
  - 把本轮已确认的触发方式、状态回写、embedding 基线、文件保留、重试 / 重建粒度写入正式文档。
- 验收：
  - 所有人对“这两周做什么 / 不做什么”没有二义性。
  - 后续任务都能引用本文件，不再以认知文档原文直接作为实施说明。

### GA-02 DONE（2026-03-13）· 建立后端全局资产模块骨架

- 目标：让 `apps/api` 从当前的 `auth / projects / members`，扩展到能承载资产正式开发的模块结构。
- 输出：
  - `knowledge / skills / agents` 三个模块入口。
  - 路由挂载、service、repository、types 的最小骨架。
  - 统一错误语义和鉴权接入。
  - Python indexer 目录 / 服务边界与集成边界说明。
- 依赖：`GA-01`。
- 已完成记录：
  - 已在 `apps/api` 新增 `knowledge / skills / agents` 三组 `router / service / repository / types` 最小骨架。
  - 已在 `create-app.ts` 挂载 `/api/knowledge`、`/api/skills`、`/api/agents`，并统一复用现有 `requireAuth`。
  - 已新增 `apps/indexer-py/README.md`，固定 Python 索引运行时目录与 Node / Python 集成边界说明。
  - 已通过最小验证，确认三组模块接口可被应用挂载且 `knowledge` 占位接口可走现有鉴权链路访问。
- 建议子任务：
  - 参考 `projects` 模块模式建立三组模块目录。
  - 在 `create-app.ts` 挂载 `/api/knowledge`、`/api/skills`、`/api/agents`。
  - 统一使用现有 `requireAuth`，不另起新的鉴权机制。
  - 为后续文件上传、统一知识检索 service 与 Python indexer 触发预留 service 层扩展点。
  - 确定 `apps/indexer-py` 的职责说明、触发接口与回写契约，不要求此任务一次写完全部能力。
- 验收：
  - 3 组路由都能以最小占位响应工作。
  - 模块目录不把知识库、Skill、Agent 逻辑混写到 `memory` 路由里。
  - 文档里已经能看出“业务主链路在 Node，索引处理链路在 Python”。

### GA-03 DONE（2026-03-13）· 设计并落地全局知识库元数据模型

- 目标：先把“知识库是什么”在 MongoDB 里定清楚。
- 输出：
  - 全局知识库集合模型。
  - 文档记录集合模型，或知识库内嵌文档记录策略。
  - 索引状态枚举与更新时间字段。
- 依赖：`GA-02`。
- 已完成记录：
  - 已在 `knowledge.types.ts` 中冻结知识库与文档记录的 Mongo 主数据字段、状态枚举、embedding 基线字段与 response shape。
  - 已在 `knowledge.repository.ts` 中落地 `knowledge_bases` 与 `knowledge_documents` 集合访问、名称 / 创建者 / 更新时间 / 状态等索引策略。
  - 已明确 `usedByProjects` 当前不进入 Mongo 主数据模型，继续作为后续项目绑定正式化后的派生字段处理。
  - 已让 `GET /api/knowledge` 返回正式列表 shape，并在读取时确保两组元数据集合索引存在。
- 推荐最小字段：
  - 知识库：`id / name / description / sourceType / indexStatus / documentCount / chunkCount / maintainer / createdBy / createdAt / updatedAt`
  - 文档：`id / knowledgeId / fileName / mimeType / storagePath / status / chunkCount / documentVersionHash / embeddingProvider / embeddingModel / lastIndexedAt / retryCount / errorMessage / uploadedBy / uploadedAt / processedAt`
- 建议子任务：
  - 明确 `usedByProjects` 当前是否保留为派生字段，而非直接手写。
  - 补 Mongo 索引：名称、创建者、更新时间。
  - 明确 `pending / processing / completed / failed` 状态流的写入时机。
  - 明确列表接口与详情接口返回 shape。
- 验收：
  - 知识库与文档记录字段能支撑上传、状态展示、重试、重建和后续项目绑定。
  - 不把 Chroma 里的向量数据误存进 Mongo 元数据表。

### GA-04 DONE（2026-03-13）· 打通知识库 CRUD 与文档上传入口

- 目标：让 `/knowledge` 真正从“展示目录”变成“可操作资产页”。
- 输出：
  - 知识库列表 / 创建 / 编辑 / 删除接口。
  - 文档上传接口。
  - 上传大小、格式、错误返回约束。
- 依赖：`GA-03`。
- 已完成记录：
  - 已落地 `GET /api/knowledge/:knowledgeId`、`POST /api/knowledge`、`PATCH /api/knowledge/:knowledgeId`、`DELETE /api/knowledge/:knowledgeId`、`POST /api/knowledge/:knowledgeId/documents`。
  - 上传阶段已由 Node 创建文档记录，初始化 `pending` 状态，并按 `knowledgeId/documentId/documentVersionHash/` 组织原始文件存储。
  - 当前上传入口只支持 `md / txt / pdf`，并通过 `50 MB` 限制、空文件校验和格式校验给出明确错误。
  - 当前上传成功后只完成主数据写入与文件落盘，不触发 Python indexer；这部分继续留给 `GA-05`。
- 建议子任务：
  - 先完成知识库 CRUD，再接上传，避免把文件入口和实体创建耦在一起。
  - 上传阶段由 Node 立即创建文档记录，状态初始化为 `pending`。
  - Node 保存文件到本地存储，并按 `knowledgeId/documentId/documentVersionHash/` 组织原始文件。
  - Node 在成功落盘后触发 Python indexer；若触发失败，必须保留可诊断状态与错误信息。
  - 对空文件、不支持格式、超限文件给出明确错误。
  - 原始文件长期保留；中间产物成功后清理，失败时按 `72 小时 ~ 7 天` 窗口保留。
- 验收：
  - 前端可以创建知识库并上传至少一种支持格式的文件。
  - 上传后能在列表或详情里看到文档记录和初始状态。

### GA-05 DONE（2026-03-13）· 落地文档解析、清洗、分块与状态机

- 目标：把“上传成功”推进到“可索引”。
- 输出：
  - Python indexer 的最小执行入口。
  - 文档解析器选择与适配层。
  - 文本清洗与 chunking 逻辑。
  - `pending -> processing -> completed|failed` 状态流。
- 依赖：`GA-04`。
- 已完成记录：
  - 已在 `apps/indexer-py` 落地 FastAPI + `uv` 控制面，当前入口整理为 `app/main.py`、`app/api/routes/*` 与 `app/domain/indexing/pipeline.py`，并固定通过 `POST /internal/v1/index/documents` 提供 `md / txt` 最小解析能力。
  - 已按 `1000 字符 / 200 重叠 / 保留段落边界优先` 实现文本清洗与 chunking。
  - 已让 `POST /api/knowledge/:knowledgeId/documents` 返回初始 `pending`，再由 Node 后台推进到 `processing` 并调用 Python indexer。
  - 已由 Node 统一回写 `completed / failed`、`chunkCount`、`processedAt`、`lastIndexedAt`、`errorMessage` 与知识库聚合 `indexStatus`。
  - 已明确 `pdf` 当前不进入稳定支持范围，而是回写 `failed` 和可诊断错误信息。
- 建议子任务：
  - 先保证 `md / txt` 稳定跑通，再补 `pdf`。
  - 分块遵循认知文档给出的 `1000 字符 / 200 重叠 / 保留段落边界`。
  - 解析失败时记录 `errorMessage`，不要静默吞错。
  - 由 Python 主导 parse / clean / chunk / embed 前的处理中间链路；Node 只负责触发、状态同步和业务约束。
  - 处理逻辑先采用单机异步任务模型，不引入外部队列。
  - Python 处理完成后通过内部 HTTP 回调或同步响应把结果交回 Node，由 Node 统一更新 MongoDB 状态。
  - 明确服务重启或任务中断后的恢复策略：长时间停留在 `processing` 的记录如何转为 `failed` 或允许重试。
  - 用 `retryCount`、`documentVersionHash`、`lastIndexedAt` 支撑重试与恢复。
- 验收：
  - 上传后状态能从 `pending` 进入 `processing` 再到 `completed` 或 `failed`。
  - 至少一种文档格式能由 Python indexer 产生稳定 chunk 结果。

### GA-06 DONE（2026-03-13）· 接入 Chroma 与 `global_docs` / `global_code` 命名空间

- 目标：把解析出来的 chunk 进入正式向量基础设施。
- 输出：
  - Chroma 初始化与访问封装。
  - 集合初始化逻辑。
  - `global_docs` 写入 / 删除能力（重建接口延后）。
  - `global_code` 集合预留和 metadata 约定。
  - Node 统一知识检索 service 接入。
- 依赖：`GA-05`。
- 已完成记录：
  - 已在 Python indexer 中补 OpenAI-compatible embedding 生成、Chroma collection 获取 / 创建、按 `documentId` 先删后写的 `global_docs` upsert 逻辑。
  - 已在 Node 侧补 Chroma collection 初始化，启动时自动确保 `global_docs / global_code` 命名空间存在。
  - 已在 `knowledge` 模块中补 `POST /api/knowledge/search`，统一通过服务端知识检索 service 生成 query embedding 并查询 Chroma。
  - 已让 `DELETE /api/knowledge/:knowledgeId` 在删除 Mongo 主数据与原始文件前，先清理对应 Chroma 向量记录。
  - 已通过 smoke 验证 `global_docs` 写入、按知识库过滤查询、知识库删除联动清理三条最小链路。
  - 本轮刻意未做 `retry document / rebuild document / rebuild knowledge` 正式接口，保持当前 GA 的最小闭环，避免和 GA-07 前端接线并行扩 scope。
- 建议子任务：
  - 直接按已冻结的 OpenAI + `text-embedding-3-small` 跑通 `global_docs` 写入，不再在本阶段并行比较多 provider。
  - 为 Node 读侧检索与 Python 写侧索引分别明确 Chroma 访问边界。
  - 新增 Chroma 环境变量、embedding 环境变量与连接检测口径。
  - 为 chunk metadata 统一字段：
    - `knowledgeId`
    - `documentId`
    - `type`
    - `source`
    - `chunkIndex`
    - `chunkId`
  - 删除知识库或删除文档时，联动清理对应向量。
  - 为知识检索封装服务端可复用入口，供 `search_documents` Skill 和后续对话链路共用。
  - 先交付 `retry document`、`rebuild document`、`rebuild knowledge` 三类操作，系统级批量重建延后。
  - 明确文档重建 / 重试时的去重策略，避免重复 chunk 多次写入同一知识库。
  - 明确 Python 失败时的回写策略，以及 Node 对失败状态的对外响应语义。
  - 在 health 或诊断接口里暴露 Chroma 最小状态。
- 验收：
  - `global_docs` 能完成新增、删除、按知识库过滤查询。
  - `global_code` 已完成集合初始化，不与文档集合混用。
  - 同一文档重复重建不会造成重复向量无限累积。
  - `search_documents` 没有直连底层 Chroma，而是复用统一知识检索 service。

### GA-07 DONE（2026-03-13）· 前端 `/knowledge` 接正式接口并补齐状态视图

- 目标：把现有全局知识库壳层接到正式后端，而不是继续读 Mock。
- 输出：
  - 前端 `knowledge` API client。
  - 列表、创建、编辑、上传、状态展示。
  - 空态 / 加载态 / 错误态。
- 依赖：`GA-04`、`GA-05`、`GA-06`。
- 已完成记录：
  - 已新增 `apps/platform/src/api/knowledge.ts`，统一封装 `GET /api/knowledge`、`GET /api/knowledge/:knowledgeId`、`POST /api/knowledge`、`PATCH /api/knowledge/:knowledgeId`、`DELETE /api/knowledge/:knowledgeId` 与 `POST /api/knowledge/:knowledgeId/documents`。
  - 已把 `apps/platform/src/pages/knowledge/KnowledgePage.tsx` 从通用 Mock 壳层切到专用 `KnowledgeManagementPage.tsx`，补齐知识库列表、详情、创建、编辑、删除与文档上传闭环。
  - 已补文档状态标签、知识库聚合状态、文档数量、分块数量、最近更新时间，以及最小轮询逻辑，用于观察 `pending / processing / completed / failed`。
  - 已明确 `global_code` 只展示预留状态与说明，不假装支持真实代码上传；`skills / agents` 继续留在现有壳层，避免本轮扩 scope。
- 建议子任务：
  - 保留现有全局资产信息架构与视觉语义，不扩散到 `skills / agents`。
  - 把“新建资产”按钮变成真实知识库创建流程。
  - 补文档处理状态标签、文档数量、最近更新时间。
  - 若上传后需轮询状态，先做最小轮询，不引入全局状态管理库。
- 验收：
  - `/knowledge` 页面能够从正式接口读写知识库。
  - 用户能在 UI 上观察到上传与索引状态变化。

### GA-08 TODO · 建立全局 Skill 注册表与 3 个内置 Skill 定义

- 目标：先把 Skill 从“概念”落为“正式可绑定资产”。
- 输出：
  - Skill registry 模型（首版可为代码注册表）。
  - Skill 列表接口。
  - 3 个内置 Skill 的标准化定义。
- 依赖：`GA-02`、`GA-06`。
- 推荐最小字段（对外暴露 shape，不强绑定持久化形态）：
  - `id / name / description / type / source / handler / parametersSchema / status`
- 推荐内置 Skill：
  - `search_codebase`
  - `check_git_log`
  - `search_documents`
- 建议子任务：
  - 先把“定义”与“执行”分离：本阶段必须有 registry，不要求完整 runtime。
  - `search_documents` 复用 GA-06 产出的知识检索 service 或最小查询入口。
  - 对 `search_codebase`、`check_git_log` 先保留 executor contract 和参数结构。
- 验收：
  - `/api/skills` 能稳定返回 3 个内置 Skill。
  - 每个 Skill 都有可供 Agent 绑定的稳定 ID 和基础 schema。

### GA-09 TODO · 前端 `/skills` 接正式数据并标记内置能力

- 目标：让 Skill 页从“静态卡片”升级为“正式资产目录”。
- 输出：
  - 前端 `skills` API client。
  - 内置 Skill 列表视图。
  - 类型、来源、可用状态展示。
- 依赖：`GA-08`。
- 建议子任务：
  - 维持现有页面壳层，替换数据源。
  - 对内置 Skill 明确标注“系统内置”，避免用户误以为可任意编辑。
  - 若本阶段不开放新建按钮，则把 CTA 改成说明态而不是假按钮。
- 验收：
  - `/skills` 页面不再依赖 `project.catalog.ts` 的 Mock Skill 数据。
  - 页面展示的信息能支撑 Agent 绑定选择。

### GA-10 TODO · 落地全局 Agent 模型与 CRUD

- 目标：让 Agent 成为正式可管理的配置实体。
- 输出：
  - Agent 集合模型。
  - Agent 列表 / 创建 / 编辑 / 删除 / 详情接口。
  - 绑定知识库与 Skill 的引用校验。
- 依赖：`GA-03`、`GA-08`。
- 推荐最小字段：
  - `id / name / description / systemPrompt / boundSkillIds / boundKnowledgeIds / model / status / createdBy / createdAt / updatedAt`
- 建议子任务：
  - 先只支持绑定已存在的全局知识库和内置 Skill。
  - 在 service 层做引用存在性校验。
  - `systemPrompt` 先以纯文本存储，不在本阶段引入模板 DSL。
- 验收：
  - Agent 能完成创建、编辑和删除。
  - 绑定不存在的 Skill 或知识库时会返回明确错误。

### GA-11 TODO · 前端 `/agents` 接正式接口并完成绑定表单

- 目标：让全局智能体页具备真正的配置能力，而不是只展示目录。
- 输出：
  - 前端 `agents` API client。
  - Agent 列表视图。
  - 创建 / 编辑表单。
  - 绑定知识库与 Skill 的多选交互。
- 依赖：`GA-07`、`GA-09`、`GA-10`。
- 建议子任务：
  - 复用现有资产壳层，但 Agent 页需要新增表单抽屉或弹窗。
  - 绑定列表应直接消费正式 `knowledge / skills` 接口。
  - 先不开放项目级覆盖配置。
- 验收：
  - `/agents` 页面可完成“创建 Agent -> 绑定知识库 / Skill -> 列表回显”闭环。

### GA-12 TODO · 集成验证、回归检查与文档同步

- 目标：确保 Week 3-4 的输出能被 Week 5-6 直接接住，而不是只跑通了一次演示。
- 输出：
  - 最小 smoke 测试或验证脚本。
  - 文档更新。
  - 遗留问题清单。
- 依赖：`GA-07`、`GA-09`、`GA-11`。
- 建议子任务：
  - 补至少一类后端模块级测试：知识库 CRUD / 上传状态 / Agent 绑定校验。
  - 增加 Node / Python / Chroma 三层联调验证：上传、触发、状态回写、删除、重建、失败重试。
  - 补前端最小类型检查与主要交互 smoke。
  - 同步更新 `.agent/docs/current/architecture.md`、`.agent/docs/roadmap/gap-analysis.md`、相关 README。
  - 记录哪些能力被有意识延后到 Week 5-6 / Week 7-8。
- 验收：
  - 有最小自动验证，不只依赖人工点点点。
  - 至少有一条“前端上传 -> Node 建记录并触发 Python -> Chroma 写入 -> Node 查询”的闭环验证记录。
  - 文档里不会再把新实现和目标蓝图混写。

## 推荐执行顺序（按工作日节奏）

### Week 3

- Day 1：
  - 完成 `GA-01`
  - 启动 `GA-02`
- Day 2：
  - 完成 `GA-02`
  - 启动 `GA-03`
- Day 3：
  - 完成 `GA-03`
  - 启动 `GA-04`
- Day 4：
  - 继续 `GA-04`
  - 启动 `GA-05`
- Day 5：
  - 完成 `GA-05`
  - 启动 `GA-06`
- Day 6：
  - 完成 `GA-06`
  - 启动 `GA-07`
- Day 7：
  - 完成 `GA-07`
  - 做一次里程碑 1 验收

### Week 4

- Day 8：
  - 启动 `GA-08`
- Day 9：
  - 完成 `GA-08`
  - 启动 `GA-09`
- Day 10：
  - 完成 `GA-09`
  - 启动 `GA-10`
- Day 11：
  - 继续 `GA-10`
  - 启动 `GA-11`
- Day 12：
  - 完成 `GA-11`
  - 启动 `GA-12`
- Day 13-14：
  - 文档同步
  - 回归验证
  - 形成 Week 5-6 的交接输入

## Week 5-6 的交接接口

Week 3-4 完成后，Week 5-6 应该直接复用以下产物，而不是重做一遍：

- 全局知识库稳定 ID 与列表接口。
- 全局 Skill 稳定 ID 与 registry。
- 全局 Agent 稳定 ID 与绑定关系。
- Node/Express 与 Python indexer 的分层边界。
- Chroma 集合命名与 metadata 约定。
- 知识库索引状态机。

换句话说，Week 5-6 的“项目引入全局资产”，前提不是重新定义资产，而是复用本阶段已经立住的资产模型。

## 风险与止损

- 风险 1：上传解析链路拖慢整个阶段
  - 止损：先保证 `md / txt`，把 `pdf` 作为次优先补齐。
- 风险 2：Chroma 集成超预期复杂
  - 止损：先把 `global_docs` 跑通，`global_code` 只保留集合预留；若 OpenAI 凭证、Python indexer 或 Chroma 依赖在 Week 3 中段仍未稳定，里程碑 1 先降级为“元数据 + 上传 + 状态流 + Python 接口骨架”闭环。
- 风险 3：Node 与 Python 职责边界漂移
  - 止损：固定“Node 管业务状态与对外 API，Python 管索引处理链路”，任何跨边界实现都必须回看 `chroma-decision.md`。
- 风险 4：Skill 范围膨胀
  - 止损：只做 3 个内置 Skill；不开放用户自建。
- 风险 5：Agent 页面想一步到位做成对话入口
  - 止损：本阶段明确 Agent 只是配置资产，不做会话运行。
- 风险 6：前端为了兼容旧 Mock 而双轨过久
  - 止损：每个页面切正式数据后，及时删除对应 Mock 依赖，避免“看起来接了 API，实际上还混着旧数据”。

## 最小验收清单

- [x] `/knowledge` 已接正式接口，至少支持创建知识库和上传文档。
- [x] 至少一种文档类型能走完“上传、Node 建记录、Python 解析 / 分块 / 向量化、状态更新”。
- [x] Chroma `global_docs` 已实际写入数据。
- [ ] `/skills` 已展示正式 Skill 列表，且包含 3 个内置 Skill。
- [ ] `/agents` 已支持创建并绑定知识库 / Skill。
- [x] 后端具备 `knowledge / skills / agents` 三组正式模块。
- [x] `search_documents` 通过统一知识检索 service 查询，而不是直连 Chroma。
- [x] 至少完成一项自动化验证。
- [x] 文档已同步，不再把目标态写成现状。

## 一句话结论

Week 3-4 的正确打法不是“马上做完整 AI 对话”，而是先把全局资产正式化：知识库先跑通最短索引闭环，Skill 先立 registry，Agent 先立配置模型。这样 Week 5-8 才有稳定地基可接。
