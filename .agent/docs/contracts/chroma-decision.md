# Knowject 的 Chroma 决策说明书（项目版）

状态：部分实施（截至 2026-03-14，`global_docs` 已打通 Node -> Python FastAPI 控制面 -> OpenAI-compatible embedding -> Chroma 写入与 Node 统一检索闭环；`global_code` 仍只做 collection 预留，重建 / retry / 项目级检索仍未落地）；当前事实仍以 `.agent/docs/current/architecture.md` 为准，本文件负责固定 Knowject 使用 Chroma 的角色定位、阶段边界与推荐实现约束。

## 1. 文档目标

- 回答 3 个问题：
  - Knowject 为什么需要 Chroma。
  - Chroma 在项目里应该放在哪一层。
  - Week 3-4 到 Week 5-8 应如何渐进落地。
- 不回答 3 个问题：
  - 当前仓库已经把 Chroma 实现到了哪一步。
  - 最终 Agent 编排和对话体验长什么样。
  - embedding provider、模型和部署方式的全部细节。
- 与其他文档的关系：
  - 当前事实以 `.agent/docs/current/architecture.md` 为准。
  - Week 3-4 的阶段计划以 `.agent/docs/plans/tasks-global-assets-foundation.md` 为准。
  - 长期目标以 `.agent/docs/roadmap/target-architecture.md` 为准。
- 本文件的作用，是把“Chroma 到底做什么、不做什么”先钉住，避免后续实现时角色漂移。

## 2. 当前事实基线

- 当前仓库的宿主机默认开发拓扑是：`platform + api + indexer-py`，推荐再配合 Docker 托管 `mongodb + chroma`。
- 当前容器化部署拓扑已包含：`platform + api + indexer-py + mongodb + chroma`。
- 当前 `apps/api` 已具备正式的 `auth / members / projects / memberships` 基础框架，但 `memory` 仍是演示接口。
- 当前全局 `知识库` 页面已形成正式最小数据闭环；`技能 / 智能体` 页面仍主要是管理壳层。
- 当前仓库已经正式接入：
  - Chroma 容器、持久化卷与 API 健康诊断
  - `apps/indexer-py` FastAPI + `uv` 内部索引控制面
  - OpenAI-compatible embedding 配置
  - 文档上传后的 `global_docs` 真实索引链路
  - Node 侧统一知识检索 service
  - 非版本化运维探活 `GET /health`
  - 版本化内部写侧入口 `POST /internal/v1/index/documents`
- 当前仓库尚未正式接入：
  - `global_code` 真实导入链路
  - 项目私有知识库写入与检索
  - 文档 / 知识库级重建与 retry API
- 当前阶段（Week 3-4）的核心任务是“全局资产正式化”，不是一次做完整 AI 对话系统。

## 3. 核心决策摘要

- Chroma 在 Knowject 中只承担“知识索引层 / 检索层”职责，不承担主数据库职责。
- MongoDB 继续作为业务主数据存储；Chroma 只保存 chunk 向量与检索 metadata。
- `apps/api` 继续承担业务主链路；当前已与独立 Python FastAPI 索引控制面分层协作，由后者承担 parse / clean / chunk / embed / upsert / delete 等写侧索引职责。
- 自 2026-03-13 起，Week 3-4 的 Node -> Python 触发方式冻结为“Node 调 Python 本地 HTTP 服务”；若实现初期暂时用 CLI，只能作为内部过渡细节，不能暴露为长期业务契约。
- 自 2026-03-13 起，MongoDB 中的业务状态只允许由 Node/Express 回写；Python 不直接写业务主状态表。
- 自 2026-03-13 起，Week 3-4 的 embedding 基线冻结为 OpenAI provider + `text-embedding-3-small`。
- 原始上传文件需要长期保留，直到文档被删除或被新版本替换；处理中间产物采用短期保留策略。
- Week 3-4 只要求把 `global_docs` 跑通，`global_code` 只做集合预留与契约，不做真实代码导入。
- 文档和代码必须分 collection，全局和项目必须分 collection，不能混存。
- Skill 不应直接操作底层 Chroma；统一通过服务端知识检索 service 访问索引层。
- Chroma 接入从第一天就要支持删除、重建、去重与诊断，不能只做到“能写进去”。

## 4. 为什么选择 Chroma

### Decision

- 选择 Chroma 作为 Knowject 当前阶段的向量检索基础设施。

### Why

- Knowject 需要一个能承接文档 / 代码 chunk 向量与 metadata 检索的专用层，用于后续 RAG、来源引用和项目级合并检索。
- MongoDB 擅长承载业务主数据，但不适合同时承担高频向量召回和检索过滤主职责。
- 当前阶段最需要的是“可渐进落地的索引底座”，而不是一个包办对话、权限和编排的 AI 中枢。

### Now

- Chroma 当前只服务于全局知识库正式化的最短闭环。

### Later

- 当项目私有知识库、对话链路和 Skill / Agent 编排逐步落地后，Chroma 再扩展为更完整的检索基础设施，但仍不升级为主数据库。

## 5. 为什么本阶段推荐 Python 负责索引链路

### 固定判断

- 推荐用 Python 负责“索引前处理 + 向量写入”链路，但这不是“全仓切 Python”。
- 该决策不等于 TypeScript 不能连接 Chroma；真正决定分层的原因，是 Knowject 的复杂度主要在索引前处理链路，而不是单纯发一个 Chroma 请求。

### 为什么不是让 Node 全包

- 文档解析、文本清洗、chunking、批处理重建、失败重试与诊断，才是 Knowject 索引链路的复杂部分。
- 这些环节更依赖成熟的 Python 文档处理生态、清洗与切分工具，以及 embedding provider 的快速适配能力。
- 若把全部索引细节都塞进 `apps/api`，业务主链路、索引重建和诊断逻辑会过早耦合到同一个运行时里。

### 为什么也不是全仓切 Python

- Knowject 当前已经有稳定的 `apps/api` 业务主链路基线：鉴权、项目、成员、错误语义和环境管理都在这里。
- 知识库 CRUD、文档记录、上传入口、状态查询、Skill / Agent 绑定与统一知识检索 API，仍然更适合留在 Node/Express。
- 本阶段要解决的是“索引链路如何专业化”，不是推翻当前正式后端。

## 6. 推荐运行时分层

下表描述的是推荐分层；其中 `apps/indexer-py` 的 FastAPI + `uv` 基线已经落地，其余能力仍按阶段渐进补齐。

| 层 / 运行时 | 推荐职责 | 本阶段边界 |
| ----------- | -------- | ---------- |
| `apps/api` | 对外正式 API、鉴权、权限、知识库 CRUD、文档记录、上传入口、状态查询、统一知识检索 service、触发索引任务、同步索引结果状态 | 保持业务主链路，不承接复杂解析 / 分块 / 重建细节 |
| `apps/indexer-py`（已落地基线） | Python 独立索引控制面 / worker；当前已采用 FastAPI + `uv`，负责 parse / clean / chunk / embed / upsert / delete，并为 rebuild / retry / diagnostics 预留命名空间 | 本阶段已落为最小独立运行时，不要求一上来做分布式队列 |
| MongoDB | 知识库元数据、文档记录、索引状态、失败原因、绑定关系、权限与其他业务主数据 | 主数据源，不存向量 |
| Chroma | chunk embeddings 与检索 metadata | 衍生索引层，可重建，不承担业务主库职责 |

补充约束：

- `apps/api` 可以保留读侧 Chroma 查询适配层，用于 `searchDocuments()` 一类统一检索 service。
- Python 负责写侧索引链路，不要求 Skill、前端或业务模块直接感知 Chroma 细节。
- Node 调 Python 的首版契约固定为本地 HTTP；仅当后续吞吐、隔离或部署方式改变时，才允许升级为队列模型。
- 当前内部写侧入口固定为 `POST /internal/v1/index/documents`；`GET /health` 保持非版本化，供 Docker / Compose 探活使用。
- MongoDB 中的知识库 / 文档状态迁移、`retryCount`、`lastIndexedAt`、`errorMessage` 等业务字段，统一由 Node 写入。
- 后续如果实现形式不是独立常驻服务，也至少要保持“Node 管业务、Python 管索引”的职责边界不变。

## 7. Chroma 在 Knowject 中的角色边界

### Chroma 负责

- 保存知识库 chunk 的 embedding。
- 保存知识检索所需的最小 metadata。
- 支撑：
  - 文档检索
  - 后续来源引用
  - 后续项目级合并检索

### Chroma 不负责

- 用户、项目、权限、成员关系。
- 知识库 / Skill / Agent 的主数据。
- 对话历史、消息内容和业务状态流。
- Agent 调度逻辑、Skill 执行逻辑和 LLM 推理本身。

### 决策理由

- 这样可以把“索引问题”和“业务问题”分层处理，避免后续删除、回滚、重建、权限与引用关系全部耦进同一套存储。

## 8. MongoDB 与 Chroma 的分工

| 层      | 存储内容                                                                                     | 原因                                                           |
| ------- | -------------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| MongoDB | 知识库元数据、文档记录、索引状态、失败原因、Skill / Agent 绑定关系、项目关系、权限、对话历史 | 属于正式业务主数据，需要事务边界、状态管理、权限校验和关系查询 |
| Chroma  | chunk 向量、检索 metadata、按知识库 / 文档过滤所需的最小字段                                 | 属于索引与召回层，需要面向语义检索优化                         |

补充约束：

- MongoDB 是主数据源，Chroma 是衍生索引层。
- Chroma 中的向量和 metadata 可以重建；MongoDB 中的业务主数据不应因索引重建而丢失。
- 后续若更换 embedding provider 或 chunk 策略，应优先重建 Chroma，而不是迁移业务主库。

## 9. Collection 命名与隔离策略

固定命名约定：

- 全局知识库：
  - `global_docs`
  - `global_code`
- 项目知识库：
  - `proj_{projectId}_docs`
  - `proj_{projectId}_code`

固定隔离规则：

- 文档与代码不能混存到同一 collection。
- 全局资产与项目私有资产不能混存到同一 collection。
- collection 命名不是展示层约定，而是检索边界的一部分。

当前阶段要求：

- Week 3-4 正式跑通 `global_docs`。
- Week 3-4 只为 `global_code` 建立集合命名、metadata 契约和删除 / 重建边界。
- `proj_{projectId}_*` 只作为后续阶段接口预留，本阶段不落地真实写入链路。

## 10. 当前阶段实施边界（Week 3-4）

### 本阶段要做

- 在 `apps/api` 建立 `knowledge` 模块、上传入口、文档记录和统一知识检索 service 骨架。
- 冻结 Python 索引运行时的目录命名、触发方式和状态回写契约。
- 跑通全局知识库的：
  - 元数据模型
  - 文档上传
  - Node 保存文件与触发索引任务
  - Python 文档解析
  - Python 文本清洗与分块
  - Python 向量化与 Chroma 写入
  - 状态展示
- 跑通 `global_docs` 的：
  - 写入
  - 删除
  - 重建
  - 最小诊断
- 抽一层统一知识检索 service，供 `search_documents` 和后续对话链路复用，并保持 Skill 不直连底层 Chroma。

### 本阶段不做

- `global_code` 的真实 Git 导入与代码切分。
- 项目私有知识库正式写入。
- 项目级合并检索。
- 会话模型、SSE、来源引用 UI、Agent 运行时调度。
- Skill 直接对接底层 Chroma。

### 为什么这样切

- 当前阶段的根任务是“先把全局资产做成正式资产”，不是“先把 AI 主链路做得很全”。
- 如果在 Week 3-4 同时铺开 `global_docs + global_code + project_docs + chat + agent runtime`，范围会立即失控。

## 11. 推荐调用链（最小闭环）

本阶段至少要在文档层冻结下面这条最小闭环：

1. 用户通过前端上传文档。
2. `apps/api` 创建 knowledge/document 元数据记录。
3. 文档状态初始化为 `pending`。
4. Node 保存文件到本地存储。
5. Node 调用 Python 本地 HTTP 服务触发 indexer。
6. Python 完成解析、清洗、分块、embedding、写入 Chroma。
7. Python 通过内部回调或响应把结果交回 Node，由 Node 统一回写 `processing / completed / failed`。
8. Node 的统一知识检索 service 查询 Chroma 并返回标准结果。
9. `search_documents` Skill 只能调用统一知识检索 service，不能自己直连 Chroma。

固定约束：

- 回写状态时，MongoDB 中的文档记录是唯一可信状态源。
- Python 侧即便直接写 Chroma，也不应跳过 Node 的状态同步入口。
- Node 是 MongoDB 业务状态的唯一写入者；Python 不直接更新知识库 / 文档状态表。
- 任何“只写向量、不回写状态”的实现，都不算完成本阶段闭环。

## 12. 统一知识检索服务边界

下文用 `searchDocuments()` 指代统一知识检索 service；这是职责名，不是强制函数名。

### Decision

- Skill、后续对话链路、未来项目级合并检索，统一复用同一层服务端知识检索能力。

### 最小职责

- 接收 query 与检索范围。
- 选择 collection 或集合组合。
- 执行 metadata 过滤。
- 做统一排序、阈值裁剪和结果收敛。
- 返回后续可用于来源引用的标准结果结构。

### 不该做的事

- 不把 LLM 调用逻辑塞进检索 service。
- 不把 Skill runtime 逻辑塞进检索 service。
- 不让 `search_documents` Skill 自己拼装底层 Chroma 查询细节。

### 理由

- 这样可以保证 Skill、对话链路和未来调试工具用的是同一套检索逻辑，避免排序、过滤、阈值和来源结构各写一套。

## 13. Metadata 与状态机建议

### Chroma metadata 必需字段

- `knowledgeId`
- `documentId`
- `type`
- `source`
- `chunkIndex`
- `chunkId`

### 文档记录状态机

- 最少覆盖：
  - `pending`
  - `processing`
  - `completed`
  - `failed`
- 状态职责：
  - `pending`：记录已创建，但索引链路尚未实际执行或尚未成功派发。
  - `processing`：Python 已接手处理，正在解析 / 分块 / 向量化 / 写入。
  - `completed`：Chroma 写入完成，且状态已回写 MongoDB。
  - `failed`：处理失败，需要依赖 `errorMessage` 和 `retryCount` 诊断或重试。

### 文档记录建议字段

- `documentVersionHash`
  - 用于文档重建、去重和内容变更判定。
- `embeddingProvider`
  - 用于说明该文档当前索引使用的 provider；Week 3-4 固定为 `openai`。
- `embeddingModel`
  - 用于后续批量重建和诊断；Week 3-4 固定为 `text-embedding-3-small`。
- `lastIndexedAt`
  - 用于判断索引是否新鲜，以及恢复 / 重试边界。
- `retryCount`
  - 用于限制无限重试，并给诊断接口提供最小上下文。
- `errorMessage`
  - 用于保留最近一次失败原因。
- `sectionTitle` 或 `headingPath`
  - 用于来源引用展示和调试定位。

### 未来扩展字段（Week 5-6 再定）

- `scope`
- `projectId`

### 设计原则

- 必需字段先服务于“可检索、可删除、可重建、可诊断”。
- 建议字段优先服务于“去重、重试、重建、诊断和来源展示”。
- 扩展字段等项目级检索真正启动后再冻结，避免为未来需求过度设计当前 schema。

## 14. 删除、重建、去重策略

### 固定原则

- 所有写入 Chroma 的正式链路，都必须同时具备删除、重建和重试能力。
- 文档重建不能造成重复 chunk 无限累积。

### 推荐策略

- 以 `documentId` 作为重建边界。
- 以 `documentVersionHash` 作为版本判定或去重依据。
- 若版本判定尚未稳定，至少保证“重建前先清理旧索引，再写新索引”。

### Week 3-4 优先交付粒度

- `retry document`
  - 处理 `failed` 或超时卡住的单文档。
- `rebuild document`
  - 用于手工重建单文档，不要求波及整个知识库。
- `rebuild knowledge`
  - 用于 embedding provider、model 或 chunk 策略变化后的知识库级全量重建。
- 系统级批量重建
  - 明确延后到 Week 5-6 以后，不放进本阶段 MVP。

### 必须覆盖的场景

- 删除知识库。
- 删除单个文档。
- 同一文档内容更新后重建。
- 处理中断后重试。
- embedding provider 或 chunk 策略变化后的批量重建。

## 15. 运行依赖与环境契约

本节固定的是“依赖类别与冻结顺序”，不是全部具体变量名。

### 必须先冻结

- embedding provider
- Chroma 连接方式
- 本地文件存储根目录
- Node 到 Python 的触发方式
- Python 到 Node / MongoDB 的状态同步方式
- 异步处理模型（当前推荐单进程异步任务）

### 最小环境变量类别

- Chroma 连接配置
- embedding provider 配置
- embedding model 配置
- provider 凭证
- 本地文件存储路径
- Python indexer 与 Node API 的连接 / 触发配置
- Python indexer 的回写或状态同步配置

### 当前判断

- 以上依赖已在 2026-03-13 完成第一轮决策冻结；后续编码应直接按该契约推进，而不是重新讨论分层。
- 当前冻结值：
  - provider：OpenAI
  - embedding model：`text-embedding-3-small`
  - Node -> Python：本地 HTTP 服务
  - 业务状态回写：Node 独占写入权

### 已冻结触发方式

- Week 3-4 首版固定为：Node 调 Python 本地 HTTP 服务。
- 若实现初期为了抢通链路而临时使用 CLI / 子进程，该方式只能藏在 Python 适配层后面，不能成为长期接口契约。
- 只有在吞吐、隔离或部署方式明确要求时，才允许升级到队列模型。

### 文件存储与保留策略

- 推荐目录组织：
  - `knowledgeId/documentId/documentVersionHash/`
- 原始上传文件：
  - 长期保留，直到文档被删除或被新版本替换。
- 处理中间产物：
  - 成功后立即清理。
  - 失败时短期保留，窗口固定为 `72 小时 ~ 7 天`，供诊断使用。
- 设计理由：
  - 原始文件是索引重建的可信输入，不能只依赖 Chroma 中的衍生数据。

### 最小失败回退策略

- 若 Python indexer 不可用，Node 不应把文档错误标成 `completed`。
- 触发失败时，文档至少应保留在 `pending` 或转入 `failed`，并写清 `errorMessage`。
- 索引失败不应阻塞业务主 API 的鉴权、知识库元数据 CRUD 和列表查询。
- 若 provider、模型或 chunk 策略变更，优先走“批量重建索引”，而不是改写业务主数据。

## 16. 健康检查与诊断策略

### 分层原则

- 应用健康、MongoDB 健康、Chroma 诊断分层表达，不混成一个黑盒状态。

### 当前建议

- API 服务本身不应因为 Chroma 暂时不可用而直接无法启动。
- Chroma 状态应作为：
  - `health` 中的可降级组件状态，或
  - 独立诊断入口
    二选一落地。

### 最小诊断项

- Chroma 是否可连通。
- collection 是否存在。
- 最近一次写入 / 重建是否成功。
- 是否存在长时间停留在 `processing` 的知识库或文档记录。
- Python indexer 是否可触发，或最近一次任务回写是否成功。

## 17. 风险与止损

### 风险 1：embedding provider 已冻结，但凭证 / 配额 / 网络未就绪

- 影响：Chroma 接入做完也无法形成真正向量化闭环。
- 止损：里程碑 1 先降级为“元数据 + 上传 + 解析 + 状态流”闭环，暂缓真实向量写入。

### 风险 2：`global_code` 提前膨胀

- 影响：真实 Git 导入、切分和增量更新会迅速吞掉 Week 3-4 的时间预算。
- 止损：本阶段只保留 `global_code` 的 collection 和 metadata 契约，不写真实接入。

### 风险 3：Skill 直接耦合底层 Chroma

- 影响：检索逻辑散落，多入口不一致，后续难以维护。
- 止损：强制所有文档检索能力统一经过知识检索 service。

### 风险 4：Node 与 Python 边界不清

- 影响：要么 `apps/api` 继续吞掉全部索引复杂度，要么业务状态被散落到 Python 里，最终两边都不稳定。
- 止损：固定“Node 管业务状态与对外 API，Python 管索引处理链路”的边界，任何越界实现都需要单独评审。

### 风险 5：metadata 过早过度设计

- 影响：任务卡看起来很完整，但最短闭环迟迟起不来。
- 止损：Week 3-4 先冻结必需字段和少量建议字段，其余扩展项延后。

### 风险 6：只做写入，不做删除 / 重建 / 去重

- 影响：索引很快污染，后面无法稳定迭代。
- 止损：把删除、重建、去重和诊断纳入同一阶段验收，而不是后补。

## 18. 对 Week 5-8 的约束接口

Week 3-4 完成后，后续阶段应直接复用以下产物，而不是重新定义：

- collection 命名约定。
- `global_docs` 的写入 / 删除 / 重建链路。
- 统一知识检索 service。
- Node 与 Python 的索引分层边界。
- 最小 metadata 结构。
- 基于 `documentId` / `documentVersionHash` 的去重思路。

后续阶段可以扩展，但不应推翻：

- “MongoDB 存主数据，Chroma 存检索索引”的分工。
- “文档与代码分 collection、全局与项目分 collection”的隔离策略。
- “Skill 不直连底层 Chroma”的服务分层。

## 19. 最终结论

- Chroma 在 Knowject 中只做检索层，不做主数据库。
- `apps/api` 继续承担业务主链路；推荐新增 Python 独立索引服务承担解析、清洗、分块、向量写入、删除、重建、重试与诊断。
- 当前阶段先打通 `global_docs`，不要让 `global_code` 抢占主链路。
- MongoDB 管业务主数据，Chroma 管 chunk 向量和检索 metadata。
- Skill 与未来对话链路统一复用知识检索 service，不直接操作底层 Chroma。
- 采用 Python 不是因为 TypeScript 不能连 Chroma，而是因为 Knowject 的复杂度主要在索引前处理链路。
- Week 3-4 的 Chroma 接入必须从第一天就支持删除、重建、去重与诊断。
- 更复杂的项目级 metadata 与多集合融合策略，放到 Week 5-6 再冻结。
