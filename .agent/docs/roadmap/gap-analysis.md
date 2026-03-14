# Knowject 现状与目标差距分析（2026-03-14）

本文档用于回答“当前仓库离目标蓝图还有多远、先补哪里最划算”。判断基于三类证据：当前代码设计、现有文档、关键 git 演进记录。

## 1. 关键结论

- 当前仓库已经完成产品信息架构、前端壳层、项目主数据切换和后端基础框架的第一轮收敛，并开始进入“前后端主链路已接通、AI 能力待补齐”阶段。
- 当前最清晰、最有价值的已落地能力是：
  - 登录后产品壳。
  - 项目与全局资产的页面分层。
  - 项目成员协作信息展示结构。
  - 前端本地 Mock 的组织边界。
  - `apps/api` 的配置、MongoDB、健康检查基础骨架。
  - 用户注册 / 登录、`argon2id`、JWT 与前端 `/login` 双模式入口。
- 与目标蓝图之间的最大断层不在 UI，而在项目对话写链路、项目资源正式消费收口、Skill / Agent 运行时，以及检索链路运维能力。
- 当前 RAG 基线已不再停留在概念层：`/knowledge`、Node -> Python indexer、`global_docs` Chroma 写入，以及 `POST /api/knowledge/search` 已形成最小正式闭环。
- 因此后续开发不应继续把“最小知识链路未落地”当作主要阻塞，而应把重点转到项目对话消息写链路、项目资源页 `skills / agents` fallback 收口、重建 / 重试 / 观测能力，以及 Skill / Agent 运行时。

## 2. 关键演进脉络

- `36835ed`（2026-03-05）
  - 初始化 Monorepo、平台前端、演示 API、共享包与基础品牌资产。
  - 含义：项目从一开始就以“前端壳层 + 演示 API”起步，而非完整后端系统。
- `009ad1f`（2026-03-09）
  - 将项目态页面从旧工作台形态拆成概览、对话、资源、成员四页，并引入当前 canonical 路由体系。
  - 含义：产品信息架构开始稳定，项目页模型从单页工作台转向多页协作结构。
- `3d747c6`（2026-03-09）
  - 新增 `.agent/docs/current/architecture.md` 与子系统 README，第一次把“当前事实”显式沉淀下来。
  - 含义：文档治理开始从零散说明转向正式事实源。
- `dd59806`（2026-03-09）
  - 成员页从占位名片墙升级为协作视图，并区分全局成员档案和项目协作快照。
  - 含义：前端数据模型开始体现“基础档案 vs 项目态信息”的分层意识。
- `5682e7c`（2026-03-09）
  - 审计路由和文档，删除部分与当前架构不一致的内容。
  - 含义：开始主动清理“实现已经变了、文档没跟上”的问题。
- `3d9101b`（2026-03-10）
  - 新增 `.agent/docs/inputs/知项Knowject-项目认知总结-v2.md`，系统化提出全局层 / 项目层 / 对话层三层蓝图。
  - 含义：产品目标和技术蓝图已经被清晰表达，但尚未与当前事实完全分离。

## 3. 六个核心 gap

### 3.1 信息架构

- 当前状态
  - 路由、布局、全局导航、项目内四页结构已经稳定。
  - 项目资源与全局资产的职责边界已在前端表达清楚。
- 目标状态
  - 在稳定信息架构上承载真实资产引入、项目私有知识库、可用的 Agent 对话入口和成员协作。
- 证据来源
  - `apps/platform/src/app/navigation/routes.tsx`
  - `apps/platform/src/app/navigation/routeRedirects.tsx`
  - `apps/platform/src/pages/project/ProjectLayout.tsx`
  - `009ad1f`
  - `3d9101b`
- 风险
  - 如果后续继续在信息架构层反复改名或改层级，会冲掉刚形成的文档与认知稳定性。
- 建议优先级
  - P1，保持稳定，不轻易再大改。
- 下一步动作
  - 以当前 canonical 路由为基础推进真实能力，不再回退到旧 `/home/project/*` 或其他过渡命名。

### 3.2 前端状态模型

- 当前状态
  - 项目列表、项目基础信息、成员 roster、项目资源绑定，以及项目对话列表 / 详情已切到后端接口。
  - 剩余仍依赖前端本地状态和 Mock 的，主要是项目概览补充文案、成员协作快照，以及 `skills / agents` 目录 fallback。
  - 前端已经形成“正式项目模型 + 全局目录 fallback + 项目协作快照”的数据组织雏形。
- 目标状态
  - 项目、资产、成员、对话应来自正式后端与持久化存储。
  - 前端只保留必要的本地 UI 状态，不再承担业务主数据源职责。
- 证据来源
  - `apps/platform/src/app/project/ProjectContext.tsx`
  - `apps/platform/src/app/project/project.storage.ts`
  - `apps/platform/src/app/project/project.catalog.ts`
  - `apps/platform/src/pages/project/project.mock.ts`
  - `dd59806`
- 风险
  - 如果在剩余的协作快照、概览补充层和 `skills / agents` fallback 上继续堆功能，后续迁到正式后端的成本会迅速升高。
- 建议优先级
  - P0，最值得尽早切换。
- 下一步动作
  - 基于已完成的项目主数据、资源绑定和对话读链路，优先补消息写路径，再逐步替换协作快照与 `skills / agents` fallback 等剩余前端入口数据源。

### 3.3 后端与数据层

- 当前状态
  - `apps/api` 当前已暴露 `health / auth / members / projects / memberships / knowledge / skills / agents / memory` 九组接口。
  - 已经建立 `config / db / modules / middleware` 骨架，并接入 MongoDB、用户模型、`argon2id`、JWT 与统一响应 envelope。
  - 已有正式项目模型、项目内嵌成员结构、最小项目 CRUD、项目资源绑定字段、项目对话只读接口和成员管理接口；`knowledge` 也已完成 Mongo 元数据、上传、Node -> Python 索引、`global_docs` Chroma 写入 / 删除和统一检索。
- 当前真正未落地的仍是项目对话消息写入 / 正式存储、项目资源页 `skills / agents` 正式消费切换，以及知识链路的重建 / 重试 / 诊断完善。
- 目标状态
  - 需要完整承载用户、项目、成员、对话、知识资产、Skill 配置、Agent 配置的正式后端。
  - 需要结构化数据存储和向量检索基础设施，并明确“Node 管业务主链路，Python 管索引处理链路”的运行时分层。
- 证据来源
  - `apps/api/src/server.ts`
  - `apps/api/src/config/env.ts`
  - `apps/api/src/db/mongo.ts`
  - `apps/api/src/modules/auth/*`
  - `apps/api/src/routes/memory.ts`
  - `.agent/docs/roadmap/target-architecture.md`
  - `36835ed`
- 风险
  - 如果后端继续扩项目与 AI 能力，而前端仍长期保留协作快照、概览补充层与 `skills / agents` fallback，仓库会停留在“主链路已收口、补充层仍割裂”的中间态。
- 建议优先级
  - P0，与前端状态切换同级。
- 下一步动作
- 项目模型、资源绑定、会话读链路、成员接口、全局知识索引闭环，以及全局 `skills / agents` 正式管理页已经落地；下一步应优先补会话 / 消息主数据、项目资源页 `skills / agents` fallback 收口，以及 `retry / rebuild / diagnostics` 这些索引运维缺口。

### 3.4 AI / RAG / Skill / Agent

- 当前状态
  - `memory/query` 仍是演示式关键词匹配。
- `knowledge` 已进入正式基线，具备知识库 CRUD、文档上传、Python indexer、`global_docs` Chroma 写入与统一检索；`skills` 已完成内置 registry 与正式目录页，`agents` 已完成 Mongo 正式模型、CRUD、绑定校验与正式配置页。
  - 当前已经有最小统一知识检索 service，但它主要服务全局文档知识库；项目对话虽然已有正式只读接口，但还没有接入真实消息写入、检索上下文和 Agent 编排主链路。
- 目标状态
  - 文档与代码可索引。
  - 项目对话可检索上下文、调用技能、展示来源和工具过程。
  - Agent 可基于项目上下文进行角色化推理。
- 证据来源
  - `apps/api/src/routes/memory.ts`
  - `apps/platform/src/app/project/project.catalog.ts`
  - `.agent/docs/inputs/知项Knowject-项目认知总结-v2.md`
  - `3d9101b`
- 风险
  - 如果在 `global_docs` 还没补齐重建 / 重试 / 诊断和项目级消费入口时，直接跳到完整 Agent 编排，容易在检索质量、工具边界和接口设计上一次性失控。
- 建议优先级
  - P0，但应拆阶段推进。
- 下一步动作
- 建议按“补齐 `global_docs` 的 retry / rebuild / diagnostics -> 让项目对话与项目资源消费复用统一检索 service -> 收口项目资源页 `skills / agents` fallback -> 再推进 Skill runtime 与 Agent 编排”顺序推进，而不是一次性并发铺开所有目标态能力。

### 3.5 部署与运维

- 当前状态
  - 当前仓库可本地 `pnpm dev`、`pnpm test`、`pnpm check-types`、`pnpm build`，API 包级测试与 Python `uv run pytest` 也已可独立执行。
  - 根目录已经有 `/.env.example`，并交付 `compose.yml / compose.local.yml / compose.production.yml`、`scripts/knowject.sh`、`indexer-py + mongodb + chroma` 的本地 / 线上风格编排基线。
- 当前仍缺少的是更细的运行监控、CI 持续化与回滚策略；`pnpm verify:global-assets-foundation` 已补上 Week 3-4 的最小统一验证入口，但还没有纳入持续集成。
- 目标状态
  - 具备可复现的本地 / 服务器部署方案，支持数据库、向量库和后端服务联动。
- 证据来源
  - 根 `package.json`
  - `pnpm-workspace.yaml`
  - `turbo.json`
  - `.agent/docs/inputs/知项Knowject-项目认知总结-v2.md`
- 风险
  - 如果后续继续扩项目资源、对话和 Agent 能力，但验证入口、运行观测和回滚策略没有同步补齐，开发环境和演示环境仍会迅速分叉。
- 建议优先级
  - P2，在项目级正式链路继续扩展前尽快补齐。
- 下一步动作
- 在继续扩项目资源、对话与 Agent 能力前，先把现有统一验证入口纳入 CI / automation，并补健康诊断和回滚说明，避免“功能前进了，运维基线没跟上”。

### 3.6 文档治理

- 当前状态
  - `.agent/docs/current/architecture.md`、README、AGENTS、认知总结同时存在，之前有部分事实和目标态混写。
  - 本轮已经把 `.agent/docs/` 内文档角色重新拆开。
- 目标状态
  - 当前事实、目标蓝图、差距分析三份核心文档各司其职。
  - 协作者能快速判断“该看哪份文档回答什么问题”。
- 证据来源
  - `.agent/docs/README.md`
  - `.agent/docs/current/architecture.md`
  - `.agent/docs/roadmap/target-architecture.md`
  - `5682e7c`
  - 本轮文档重构
- 风险
  - 如果后续改代码只改 README 不改事实源，或者直接拿认知总结当实现依据，文档很快会再次失真。
- 建议优先级
  - P1，需要持续执行。
- 下一步动作
  - 后续任何路由、数据源、架构边界调整，先更新 `.agent/docs/current/architecture.md`；产品目标变化再更新 `.agent/docs/roadmap/target-architecture.md`。

## 4. 推荐开发顺序

1. 稳住当前信息架构，不再做大的页面和路由反复。
2. 基于已落地的最小正式项目、资源绑定与会话读链路，优先继续收口最关键的前端 Mock 入口。
3. 优先补项目对话消息写路径，以及项目资源页 `skills / agents` 正式消费切换。
4. 在 `global_docs` 已落地的基础上，补齐 `retry / rebuild / diagnostics`，再推进 `global_code`、项目级知识消费、Skill 执行与 Agent 编排。
5. 在项目级正式链路继续扩展前，补 smoke、观测和回滚说明，避免部署与验证能力滞后。

## 5. 当前最值得避免的误区

- 把目标蓝图文档当成当前实现说明。
- 在前端 Mock 数据体系上继续堆过多业务细节。
- 在没有正式领域模型前先做复杂 AI 编排。
- 为未来可能用到的库和抽象提前过度设计。
- 为了“显得完整”过早承诺数据库、向量库、部署和权限方案的具体实现。

## 6. 使用方式

- 想看当前真实状态：读 `.agent/docs/current/architecture.md`。
- 想看最终想做成什么：读 `.agent/docs/roadmap/target-architecture.md`。
- 想决定下一个迭代该做什么：先看本文，再落执行计划。
