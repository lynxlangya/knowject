# Knowject 的 Chroma 决策说明书（项目版）

状态：部分实施（截至 2026-03-11，Chroma 已作为 Docker 基础设施与健康诊断目标接入，但正式知识索引链路仍未落地）；当前事实仍以 `.agent/docs/current/architecture.md` 为准，本文件负责固定 Knowject 使用 Chroma 的角色定位、阶段边界与实现约束。

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

- 当前仓库的最小宿主机开发拓扑仍是：`platform + api + mongodb`。
- 当前容器化部署拓扑已包含：`platform + api + mongodb + chroma`。
- 当前 `apps/api` 已具备正式的 `auth / members / projects / memberships` 基础框架，但 `memory` 仍是演示接口。
- 当前全局 `知识库 / 技能 / 智能体` 页面仍主要是管理壳层，尚未形成正式资产数据链路。
- 当前仓库已经接入但仍停留在基础设施层：
  - Chroma 容器、持久化卷与 API 健康诊断
- 当前仓库尚未正式接入：
  - embedding provider
  - 文档上传后的真实索引链路
  - 统一知识检索 service
- 当前阶段（Week 3-4）的核心任务是“全局资产正式化”，不是一次做完整 AI 对话系统。

## 3. 核心决策摘要

- Chroma 在 Knowject 中只承担“知识索引层 / 检索层”职责，不承担主数据库职责。
- MongoDB 继续作为业务主数据存储；Chroma 只保存 chunk 向量与检索 metadata。
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

## 5. Chroma 在 Knowject 中的角色边界

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

## 6. MongoDB 与 Chroma 的分工

| 层      | 存储内容                                                                                     | 原因                                                           |
| ------- | -------------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| MongoDB | 知识库元数据、文档记录、索引状态、失败原因、Skill / Agent 绑定关系、项目关系、权限、对话历史 | 属于正式业务主数据，需要事务边界、状态管理、权限校验和关系查询 |
| Chroma  | chunk 向量、检索 metadata、按知识库 / 文档过滤所需的最小字段                                 | 属于索引与召回层，需要面向语义检索优化                         |

补充约束：

- MongoDB 是主数据源，Chroma 是衍生索引层。
- Chroma 中的向量和 metadata 可以重建；MongoDB 中的业务主数据不应因索引重建而丢失。
- 后续若更换 embedding provider 或 chunk 策略，应优先重建 Chroma，而不是迁移业务主库。

## 7. Collection 命名与隔离策略

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

## 8. 当前阶段实施边界（Week 3-4）

### 本阶段要做

- 建立 `knowledge` 模块与 Chroma client 骨架。
- 跑通全局知识库的：
  - 元数据模型
  - 文档上传
  - 文档解析
  - 分块
  - 向量化
  - 状态展示
- 跑通 `global_docs` 的：
  - 写入
  - 删除
  - 重建
  - 最小诊断
- 抽一层统一知识检索 service，供 `search_documents` 和后续对话链路复用。

### 本阶段不做

- `global_code` 的真实 Git 导入与代码切分。
- 项目私有知识库正式写入。
- 项目级合并检索。
- 会话模型、SSE、来源引用 UI、Agent 运行时调度。
- Skill 直接对接底层 Chroma。

### 为什么这样切

- 当前阶段的根任务是“先把全局资产做成正式资产”，不是“先把 AI 主链路做得很全”。
- 如果在 Week 3-4 同时铺开 `global_docs + global_code + project_docs + chat + agent runtime`，范围会立即失控。

## 9. 统一知识检索服务边界

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

## 10. Metadata 设计原则

### Week 3-4 必需字段

- `knowledgeId`
- `documentId`
- `type`
- `source`
- `chunkIndex`
- `chunkId`

### 建议字段（优先考虑）

- `documentVersionHash`
  - 用于文档重建、重试和去重。
- `sectionTitle` 或 `headingPath`
  - 用于来源引用展示和调试定位。

### 未来扩展字段（Week 5-6 再定）

- `scope`
- `projectId`

### 设计原则

- 必需字段先服务于“可检索、可删除、可重建、可诊断”。
- 建议字段优先服务于“去重”和“来源展示”。
- 扩展字段等项目级检索真正启动后再冻结，避免为未来需求过度设计当前 schema。

## 11. 删除、重建、去重策略

### 固定原则

- 所有写入 Chroma 的正式链路，都必须同时具备删除、重建和重试能力。
- 文档重建不能造成重复 chunk 无限累积。

### 推荐策略

- 以 `documentId` 作为重建边界。
- 以 `documentVersionHash` 作为版本判定或去重依据。
- 若版本判定尚未稳定，至少保证“重建前先清理旧索引，再写新索引”。

### 必须覆盖的场景

- 删除知识库。
- 删除单个文档。
- 同一文档内容更新后重建。
- 处理中断后重试。
- embedding provider 或 chunk 策略变化后的批量重建。

## 12. 运行依赖与前置假设

本节固定的是“依赖类别与冻结顺序”，不是全部具体变量名。

### 必须先冻结

- embedding provider
- Chroma 连接方式
- 本地文件存储根目录
- 异步处理模型（当前推荐单进程异步任务）

### 环境变量类别

- Chroma 连接配置
- embedding provider 配置
- embedding model 配置
- provider 凭证
- 本地文件存储路径

### 当前判断

- Week 3-4 开始正式编码前，必须先冻结 provider 与最小环境契约。
- 在 provider 未冻结前，不应承诺“真正向量化写入已可交付”。

## 13. 健康检查与诊断策略

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

## 14. 风险与止损

### 风险 1：embedding provider 长时间未冻结

- 影响：Chroma 接入做完也无法形成真正向量化闭环。
- 止损：里程碑 1 先降级为“元数据 + 上传 + 解析 + 状态流”闭环，暂缓真实向量写入。

### 风险 2：`global_code` 提前膨胀

- 影响：真实 Git 导入、切分和增量更新会迅速吞掉 Week 3-4 的时间预算。
- 止损：本阶段只保留 `global_code` 的 collection 和 metadata 契约，不写真实接入。

### 风险 3：Skill 直接耦合底层 Chroma

- 影响：检索逻辑散落，多入口不一致，后续难以维护。
- 止损：强制所有文档检索能力统一经过知识检索 service。

### 风险 4：metadata 过早过度设计

- 影响：任务卡看起来很完整，但最短闭环迟迟起不来。
- 止损：Week 3-4 先冻结必需字段和少量建议字段，其余扩展项延后。

### 风险 5：只做写入，不做删除 / 重建 / 去重

- 影响：索引很快污染，后面无法稳定迭代。
- 止损：把删除、重建、去重和诊断纳入同一阶段验收，而不是后补。

## 15. 对 Week 5-8 的约束接口

Week 3-4 完成后，后续阶段应直接复用以下产物，而不是重新定义：

- collection 命名约定。
- `global_docs` 的写入 / 删除 / 重建链路。
- 统一知识检索 service。
- 最小 metadata 结构。
- 基于 `documentId` / `documentVersionHash` 的去重思路。

后续阶段可以扩展，但不应推翻：

- “MongoDB 存主数据，Chroma 存检索索引”的分工。
- “文档与代码分 collection、全局与项目分 collection”的隔离策略。
- “Skill 不直连底层 Chroma”的服务分层。

## 16. 最终结论

- Chroma 在 Knowject 中只做检索层，不做主数据库。
- 当前阶段先打通 `global_docs`，不要让 `global_code` 抢占主链路。
- MongoDB 管业务主数据，Chroma 管 chunk 向量和检索 metadata。
- Skill 与未来对话链路统一复用知识检索 service，不直接操作底层 Chroma。
- Week 3-4 的 Chroma 接入必须从第一天就支持删除、重建、去重与诊断。
- 更复杂的项目级 metadata 与多集合融合策略，放到 Week 5-6 再冻结。
