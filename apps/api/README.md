# Knowject API (`apps/api`)

`apps/api` 当前是基础框架阶段已经收口的本地开发 API 基线，使用 Express + TypeScript 实现。
截至 2026-03-15，服务端已经落下 `config / db / lib / modules / middleware` 的服务骨架，并接入 MongoDB、用户模型、`argon2id`、JWT、登录 / 注册接口、全局成员概览、最小项目 CRUD、项目资源绑定字段、项目对话只读接口、成员管理接口，以及成员添加用的已有用户搜索接口；项目列表、项目基础信息、资源绑定、对话读链路、成员 roster 与全局成员页已切到后端。Week 3-4 的 `knowledge / skills / agents` 也已建立正式模块边界，其中 `knowledge` 已完成 Mongo 元数据模型、知识库 CRUD、文档上传入口、Node -> Python 的解析 / 分块 / 状态回写、文档级 / 知识库级 rebuild、diagnostics，以及 `global_docs` 的 Chroma 写入与统一检索闭环；`skills` 已升级为“系统内置 + 自建 + GitHub/URL 导入”的正式资产模块，支持 CRUD、导入预览、草稿/发布、引用保护与绑定校验，`agents` 已完成正式模型、CRUD 和绑定校验。

## 当前接口

- `GET /api/health`
  - 返回应用状态、数据库状态与可选的 Chroma 心跳诊断信息。
- `POST /api/auth/register`
  - 接收 `username`、`password`、`name`。
  - 注册成功后以统一响应壳返回 JWT 与基础用户信息。
- `POST /api/auth/login`
  - 接收 `username` 和 `password`。
  - 以统一响应壳返回 JWT 与基础用户信息。
- `GET /api/auth/users`
  - 需要 `Authorization: Bearer <token>`。
  - 按 `username / name` 模糊搜索已有注册用户，供项目成员添加下拉候选使用。
- `GET /api/members`
  - 需要 `Authorization: Bearer <token>`。
  - 聚合当前登录用户可见项目中的成员基础信息、项目参与关系和最小权限摘要，供全局成员页使用。
- `GET /api/projects`
  - 需要 `Authorization: Bearer <token>`。
  - 只返回当前用户参与的项目。
- `POST /api/projects`
  - 需要 `Authorization: Bearer <token>`。
  - 接收 `name`、`description`、可选 `knowledgeBaseIds / agentIds / skillIds`，创建者自动成为项目 `admin`。
  - 其中 `skillIds` 只允许绑定系统内置或已发布的正式 Skill。
  - 创建时会为项目补一条默认对话，供项目对话读链路返回最小可用上下文。
- `GET /api/projects/:projectId/conversations`
  - 需要 `Authorization: Bearer <token>`。
  - 返回当前项目可见的对话列表摘要：`id / projectId / title / updatedAt / preview`。
- `GET /api/projects/:projectId/conversations/:conversationId`
  - 需要 `Authorization: Bearer <token>`。
  - 返回当前项目单条对话详情与消息列表；当前仅提供只读能力，不支持消息写入。
- `PATCH /api/projects/:projectId`
  - 需要 `Authorization: Bearer <token>`。
  - 只允许项目级 `admin` 更新项目基础信息与 `knowledgeBaseIds / agentIds / skillIds` 资源绑定字段。
  - 若 `skillIds` 中包含草稿或不存在的 Skill，会返回显式绑定校验错误。
- `DELETE /api/projects/:projectId`
  - 需要 `Authorization: Bearer <token>`。
  - 只允许项目级 `admin` 删除项目。
  - 删除成功后返回 `HTTP 200`，`data` 为 `null`。
- `POST /api/projects/:projectId/members`
  - 需要 `Authorization: Bearer <token>`。
  - 只允许项目级 `admin` 按用户名添加已注册用户。
- `PATCH /api/projects/:projectId/members/:userId`
  - 需要 `Authorization: Bearer <token>`。
  - 只允许项目级 `admin` 修改成员的 `admin / member` 角色。
- `DELETE /api/projects/:projectId/members/:userId`
  - 需要 `Authorization: Bearer <token>`。
  - 只允许项目级 `admin` 移除成员，并保证项目至少保留一位 `admin`。
  - 若移除的是当前登录用户本人，响应会返回 `project: null` 与 `removedCurrentUser: true`，前端据此退出当前项目上下文。
- `GET /api/knowledge`
  - 需要 `Authorization: Bearer <token>`。
  - 返回知识库列表的正式 summary shape：`id / name / description / sourceType / indexStatus / documentCount / chunkCount / maintainerId / createdBy / createdAt / updatedAt`。
  - 当前若没有数据，返回 `total: 0` 与空数组；首次访问时会确保 `knowledge_bases` 与 `knowledge_documents` 的索引存在。
- `GET /api/knowledge/:knowledgeId`
  - 需要 `Authorization: Bearer <token>`。
  - 返回知识库详情以及当前知识库下的文档记录列表。
- `POST /api/knowledge`
  - 需要 `Authorization: Bearer <token>`。
  - 接收 `name`、`description`、可选 `sourceType`，创建知识库；`sourceType` 默认是 `global_docs`。
- `PATCH /api/knowledge/:knowledgeId`
  - 需要 `Authorization: Bearer <token>`。
  - 更新知识库的 `name` 与 `description`。
- `DELETE /api/knowledge/:knowledgeId`
  - 需要 `Authorization: Bearer <token>`。
  - 删除知识库、对应文档记录、当前知识库的本地原始文件目录，以及 `global_docs / global_code` 中对应的向量记录。
  - 删除成功后返回 `HTTP 200`，`data` 为 `null`。
- `POST /api/knowledge/:knowledgeId/documents`
  - 需要 `Authorization: Bearer <token>`。
  - 使用 `multipart/form-data` 上传单个文件，字段名固定为 `file`。
  - 当前只支持 `md / markdown / txt`，单文件上限为 `50 MB`。
  - 上传成功后会先创建文档记录并返回 `pending`，随后由 Node 在后台切到 `processing` 并触发 Python indexer。
  - Node 当前调用 Python FastAPI 内部入口 `POST /internal/v1/index/documents`。
  - 若开发态 Python indexer 仍停在旧进程，Node 会自动回退兼容 `POST /internal/index-documents`，避免重启顺序造成 `txt/md` 上传直接 404。
  - 当前稳定链路会把 `md / markdown / txt` 推进到 `completed` 并写回 `chunkCount / processedAt / lastIndexedAt`；`pdf` 已从前后端上传契约中移除，待 `indexer-py` 正式覆盖后再统一加回。
  - 原始文件会按 `knowledgeId/documentId/documentVersionHash/fileName` 落到本地存储。
  - `md / markdown / txt` 成功处理后会由 Python indexer 生成 OpenAI-compatible embeddings 并写入 Chroma `global_docs` collection。
  - 完整 Docker 编排会通过内部 `indexer-py` 服务和共享知识存储卷推进这条链路；默认 `pnpm dev` 也会一并启动本地 `indexer-py`，若单独运行 `pnpm --filter api dev`，仍需额外启动 `pnpm --filter indexer-py dev`。
  - 开发环境下若缺少 `OPENAI_API_KEY`，Node 会把文档记录标记为 `embeddingProvider=local_dev`、`embeddingModel=hash-1536-dev`，Python indexer 会使用 deterministic 本地 embedding 写入 Chroma，保证上传状态流可用；正式检索与生产环境仍应使用真实 OpenAI-compatible embedding 配置。
- `POST /api/knowledge/:knowledgeId/documents/:documentId/retry`
  - 需要 `Authorization: Bearer <token>`。
  - 对 `failed / completed` 文档重新入队索引；若文档仍处于 `pending / processing`，返回冲突错误，避免并发重复触发。
  - 响应返回 `HTTP 200`，`data` 为 `null`；前端应继续通过详情刷新或轮询观察后续状态。
- `POST /api/knowledge/:knowledgeId/documents/:documentId/rebuild`
  - 需要 `Authorization: Bearer <token>`。
  - 对单个已落库文档执行 rebuild；Node 会优先调用 Python 内部 `POST /internal/v1/index/documents/:documentId/rebuild`，若开发态 indexer 仍停留在旧版本，再回退兼容旧写入口。
  - 若文档当前仍处于 `pending / processing`，返回冲突错误，避免并发重复触发。
- `POST /api/knowledge/:knowledgeId/rebuild`
  - 需要 `Authorization: Bearer <token>`。
  - 对当前知识库下全部文档批量重新入队 rebuild。
  - 若知识库内没有文档，或仍有文档处于 `pending / processing`，会直接返回显式冲突 / 空重建错误，避免批量任务与现有索引状态互相覆盖。
- `GET /api/knowledge/:knowledgeId/diagnostics`
  - 需要 `Authorization: Bearer <token>`。
  - 返回知识库当前期望 collection、文档状态摘要、原始文件缺失情况、长时间 `processing` 卡住的文档，以及 Python indexer 运行态诊断。
  - 该接口按 best-effort 降级：即使 Chroma 或 Python indexer 不可达，仍返回 `collection / indexer` 的降级结果，而不是整体 500。
- `DELETE /api/knowledge/:knowledgeId/documents/:documentId`
  - 需要 `Authorization: Bearer <token>`。
  - 删除单个文档记录、本地原始文件目录，并尝试清理对应 Chroma 向量。
  - 若删除发生在后台索引过程中，服务端会在最终状态回写缺失时继续尝试补做孤儿 chunk 清理，尽量避免留下脏向量。
  - 删除成功后返回 `HTTP 200`，`data` 为 `null`。
- `POST /api/knowledge/search`
  - 需要 `Authorization: Bearer <token>`。
  - 接收 `query`、可选 `knowledgeId`、可选 `sourceType`、可选 `topK`。
  - 当前默认搜索 `global_docs`，通过服务端统一知识检索 service 生成 query embedding 并查询 Chroma。
  - `global_code` 当前只有 collection 预留，没有真实数据导入；若切到 `global_code`，通常返回空结果。
- `GET /api/skills`
  - 需要 `Authorization: Bearer <token>`。
  - 返回系统内置与用户管理 Skill 的统一列表，支持 `source / lifecycleStatus / bindable` 过滤。
  - 当前对外稳定字段为 `id / slug / name / description / type / source / origin / handler / parametersSchema / runtimeStatus / lifecycleStatus / bindable / importProvenance / createdAt / updatedAt / publishedAt`。
- `GET /api/skills/:skillId`
  - 需要 `Authorization: Bearer <token>`。
  - 返回单个 Skill 的完整详情，包括 `skillMarkdown` 与 bundle 文件清单。
- `POST /api/skills`
  - 需要 `Authorization: Bearer <token>`。
  - 接收原生 `SKILL.md` 创建自建 Skill；服务端会校验 frontmatter，并默认创建为 `draft`。
- `POST /api/skills/import`
  - 需要 `Authorization: Bearer <token>`。
  - 支持 `github` 与原始 Markdown `url` 两种导入模式。
  - 传 `dryRun=true` 时只返回解析预览，不落库；正式导入后会保留来源 provenance，但导入结果视为当前系统自有资产。
- `PATCH /api/skills/:skillId`
  - 需要 `Authorization: Bearer <token>`。
  - 支持更新 `skillMarkdown`、frontmatter 元数据和 `lifecycleStatus`；系统内置 Skill 不可编辑。
  - 若已发布 Skill 仍被项目或 Agent 引用，则不允许回退到 `draft`。
- `DELETE /api/skills/:skillId`
  - 需要 `Authorization: Bearer <token>`。
  - 删除非系统内置 Skill，并清理对应 bundle 存储目录。
  - 若 Skill 仍被项目或 Agent 引用，会直接拒绝删除，避免留下脏绑定。
- `GET /api/agents`
  - 需要 `Authorization: Bearer <token>`。
  - 返回全局 Agent 正式列表：`id / name / description / systemPrompt / boundSkillIds / boundKnowledgeIds / model / status / createdBy / createdAt / updatedAt`。
- `GET /api/agents/:agentId`
  - 需要 `Authorization: Bearer <token>`。
  - 返回单个 Agent 详情。
- `POST /api/agents`
  - 需要 `Authorization: Bearer <token>`。
  - 接收 `name`、可选 `description`、`systemPrompt`、可选 `boundSkillIds / boundKnowledgeIds / status`。
  - `boundSkillIds` 只允许绑定系统内置或已发布的正式 Skill。
  - 当前 `model` 固定由服务端写入 `server-default`，不开放请求侧覆盖。
- `PATCH /api/agents/:agentId`
  - 需要 `Authorization: Bearer <token>`。
  - 支持更新 `name / description / systemPrompt / boundSkillIds / boundKnowledgeIds / status`。
  - 更新绑定时同样会校验 Skill 是否存在且可绑定。
- `DELETE /api/agents/:agentId`
  - 需要 `Authorization: Bearer <token>`。
  - 删除成功后返回 `HTTP 200`，`data` 为 `null`。
- `GET /api/memory/overview`
  - 需要 `Authorization: Bearer <token>`。
  - 返回项目简介与统计信息。
- `POST /api/memory/query`
  - 需要 `Authorization: Bearer <token>`。
  - 返回基于本地 `DEMO_ITEMS` 的演示检索结果。

统一响应约定：

- 当前所有 JSON 响应统一为 `code / message / data / meta` 四层结构。
- 成功响应默认规则：
  - `HTTP 200` -> `code: SUCCESS`，`message: 请求成功`
  - `HTTP 201` -> `code: CREATED`，`message: 创建成功`
- 失败响应统一为：
  - `data: null`
  - `code` 继续沿用现有业务错误码，如 `VALIDATION_ERROR`、`NOT_FOUND`、`AUTH_TOKEN_INVALID`
  - `message` 直接展示错误信息
- `meta` 当前固定包含 `requestId` 与 `timestamp`；仅在 `API_ERROR_EXPOSE_DETAILS=true` 时才会额外返回 `meta.details`。
- 前端当前通过 `apps/platform/src/api/*` 在 API 层统一解包 `data`，页面层不直接消费 envelope。
- `projects`、`memberships` 与 `memory` 路由当前都已切到正式 JWT 鉴权中间件。
- 生产环境下，`/api/auth/*` 与 `/api/memory/*` 必须通过 HTTPS 访问；不安全传输会被拒绝。
- `auth` 与 `memory` 响应默认携带 `Cache-Control: no-store`，避免敏感响应被中间层缓存。

## 当前边界

- 这是本地联调与基础框架接口；项目列表、项目基础信息、项目资源绑定、项目对话读链路、成员 roster 与全局成员概览已由它提供正式数据源。
- 项目概览中的补充展示文案、成员协作快照，以及 `agents` 资源目录 fallback 仍主要由 `apps/platform` 本地 Mock 驱动；项目侧 Skill 展示已切正式 `/api/skills`。
- `memory` 路由中的返回结果用于演示“项目记忆查询”流程，不代表正式检索服务接口设计。
- `projects` 已落地最小项目模型与 CRUD，并补齐 `knowledgeBaseIds / agentIds / skillIds` 三类资源绑定字段，以及 `GET /api/projects/:projectId/conversations*` 只读接口。
- `knowledge` 当前已完成 Mongo 元数据模型、集合索引、知识库 CRUD、文档上传入口、单文档 retry / rebuild / delete、知识库级 rebuild、Node 触发 Python indexer、`pending -> processing -> completed|failed` 状态回写、knowledge diagnostics，以及 `global_docs` 的 Chroma 写入和统一知识检索 service；前端 `/knowledge` 已正式接线。
- `skills` 当前已完成正式 Skill 资产仓储、`SKILL.md` 解析、GitHub/URL 导入、草稿/发布、详情读取、引用保护与绑定校验；`agents` 已完成 Mongo 正式模型、CRUD 和绑定校验。
- 当前已经有真实用户注册、登录、JWT 鉴权、全局成员概览、项目 CRUD、项目资源绑定、项目对话读链路、知识库正式检索、知识索引运维基础接口、Skill 资产管理与 Agent CRUD；仍未落地的是项目对话消息写入、项目资源页 `agents` fallback 收口、`global_code` 真实导入，以及更深的 Skill / Agent 运行时编排链路。
- 当前宿主机默认开发拓扑为 `platform + api + indexer-py`，依赖服务按推荐流由 Docker 托管 `mongodb + chroma`。
- 若要单独调试 API 上传链路，仍需要额外运行本地 `indexer-py + chroma`。
- 仓库已交付 Docker Compose 基线，可在容器内运行 `api + indexer-py + mongodb + chroma`，并通过 `platform / caddy` 进入完整部署拓扑。
- 当前 Chroma 已进入正式知识索引链路：`global_docs` 的 collection 生命周期与写侧索引由 `indexer-py` 负责，Node 保留统一检索 service 的读侧 query 例外；向量删除的正式内部接口仍待 `indexer-py` 补齐，当前代码保留了过渡期直连 delete TODO。`global_code` 只完成命名空间预留。
- Week 3-4 的推荐演进路径是：`apps/api` 继续负责业务主链路与对外 API，Python 独立索引运行时负责解析、分块、向量写入、重建与诊断，具体边界以 [`.agent/docs/contracts/chroma-decision.md`](/Users/langya/Documents/CodeHub/ai/knowject/.agent/docs/contracts/chroma-decision.md) 为准。
- Docker 公共基线中的 `app / data` 网络默认保持 `internal`；本地若要从宿主机直接访问 API，则通过 `compose.local.yml` 额外挂载 `publish` 网络完成端口发布。
- Docker 当前使用方式与部署边界见 [`.agent/docs/current/docker-usage.md`](/Users/langya/Documents/CodeHub/ai/knowject/.agent/docs/current/docker-usage.md)。
- Docker 操作手册见 [`docker/README.md`](/Users/langya/Documents/CodeHub/ai/knowject/docker/README.md)。

## 当前环境约定

- 环境变量模板位于仓库根 [`.env.example`](/Users/langya/Documents/CodeHub/ai/knowject/.env.example)。
- 本地真实值应放在仓库根 `.env.local`。
- 运行时按 `.env` → `.env.local` 顺序加载；`.env.local` 可覆盖低优先级同族键，但同一份 env 文件不要同时定义 `NAME` 和 `NAME_FILE`。
- Docker 本地 / 线上模板分别位于 [`.env.docker.local.example`](/Users/langya/Documents/CodeHub/ai/knowject/.env.docker.local.example) 与 [`.env.docker.production.example`](/Users/langya/Documents/CodeHub/ai/knowject/.env.docker.production.example)。
- 最小必需变量：
  - `PORT`
  - `APP_NAME`
  - `CORS_ORIGIN`
  - `MONGODB_URI`
  - `MONGODB_DB_NAME`
  - `JWT_SECRET`
  - `JWT_EXPIRES_IN`
  - `JWT_ISSUER`
  - `JWT_AUDIENCE`
  - `ARGON2_MEMORY_COST`
  - `ARGON2_TIME_COST`
  - `ARGON2_PARALLELISM`
  - `API_ERROR_EXPOSE_DETAILS`
  - `API_ERROR_INCLUDE_STACK`
- 所有字符串型变量都支持 `<NAME>_FILE` 形式，适用于 Docker secrets。
- 若最终生效环境里同时出现 `NAME` 和 `NAME_FILE`，服务会直接启动失败；推荐只保留高优先级来源中的一个。
- 容器化部署里，API 容器内部监听端口固定为 `3001`；宿主机发布端口由 `compose.local.yml` 中的 `API_PUBLISHED_PORT` 控制。
- Docker 基线默认会把 `KNOWLEDGE_STORAGE_ROOT` 固定到共享卷路径 `/var/lib/knowject/knowledge`，并把 `KNOWLEDGE_INDEXER_URL` 指向内部服务 `http://indexer-py:8001`。
- 可选 Chroma 变量：
  - `CHROMA_URL`
  - `CHROMA_HEARTBEAT_PATH`
  - `CHROMA_TENANT`
  - `CHROMA_DATABASE`
  - `CHROMA_TIMEOUT_MS`
- 可选知识索引变量：
  - `KNOWLEDGE_STORAGE_ROOT`
  - `KNOWLEDGE_INDEXER_URL`
  - `KNOWLEDGE_INDEXER_TIMEOUT_MS`
- 可选 Skill 资产存储变量：
  - `SKILLS_STORAGE_ROOT`
- 可选 OpenAI embedding 变量：
  - `OPENAI_API_KEY`
  - `OPENAI_BASE_URL`
  - `OPENAI_EMBEDDING_MODEL`
  - `OPENAI_TIMEOUT_MS`
- 当前 embedding provider、本地文件存储、Node / Python 触发、Chroma namespace 与统一检索环境契约已经进入代码基线；生产环境仍需要真实 OpenAI 凭证才能完成正式向量化。
- 认证和环境的详细实施合同见 [.agent/docs/contracts/auth-contract.md](/Users/langya/Documents/CodeHub/ai/knowject/.agent/docs/contracts/auth-contract.md)。

## 关键文件

- `src/server.ts`：启动入口、MongoDB 预连接与优雅关闭。
- `src/app/create-app.ts`：统一路由挂载、中间件组装。
- `src/config/env.ts`：环境变量加载与校验。
- `src/lib/chroma-health.ts`：Chroma 心跳诊断。
- `src/lib/request-auth.ts`：统一读取必需的 `authUser` 请求上下文。
- `src/lib/validation.ts`：字段校验、必填字段错误与字符串读取 helper。
- `src/db/mongo.ts`：MongoDB 连接管理与健康快照。
- `src/modules/auth/*`：用户模型、密码哈希、JWT、中间件和注册 / 登录接口。
- `src/modules/members/*`：全局成员聚合只读接口，按当前用户可见项目汇总成员概览。
- `src/modules/projects/*`：项目模型、MongoDB 仓储、资源绑定字段、只读项目对话接口、权限校验和 CRUD 接口。
- `src/modules/memberships/*`：项目成员增删改接口与最小角色规则。
- `src/modules/knowledge/*`：全局知识库元数据模型、Mongo 仓储、CRUD、详情接口、文档上传入口、retry / rebuild / diagnostics、后台状态推进、Chroma 统一检索 service 与 Python indexer 触发。
- `src/modules/knowledge/knowledge.search.ts`：统一知识检索 service、collection 诊断、Python indexer 健康探活，以及当前过渡期的向量删除适配；Node 直连 Chroma 读侧 query 在这里作为架构例外保留。
- `src/modules/skills/*`：全局 Skill 模块，当前已提供系统内置 Skill registry、Mongo 元数据仓储、bundle 文件存储、`SKILL.md` 解析、GitHub/URL 导入、草稿/发布、引用保护与正式 CRUD 接口；其中 `search_documents` 复用服务端统一知识检索契约。
- `src/modules/agents/*`：全局 Agent 模块，当前已提供 Mongo 正式模型、CRUD、引用校验与最小测试。
- `src/routes/health.ts`：健康检查。
- `src/routes/memory.ts`：记忆概览与检索演示接口，当前已复用 JWT 中间件。
- `src/middleware/*`：请求上下文、404、统一错误处理。
- `../indexer-py/app/main.py`：FastAPI 应用入口、异常处理与路由注册。
- `../indexer-py/app/domain/indexing/pipeline.py`：`md / txt` 解析、清洗、`1000 / 200` 分块、OpenAI-compatible embedding 与 Chroma upsert/delete 逻辑。
- `../indexer-py/app/core/runtime_env.py`：Python indexer 对仓库根 `.env / .env.local` 的最小环境加载能力。
- `../indexer-py/README.md`：Python 索引服务目录边界、运行方式与 Node / Python 集成约束说明。

## 开发

```bash
pnpm --filter api dev
pnpm --filter indexer-py dev
pnpm --filter api test
pnpm --filter api check-types
pnpm --filter api build
# 仓库根最小验证入口
pnpm verify:global-assets-foundation
```
