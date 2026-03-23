# Knowject 架构事实（2026-03-20）

本文档只记录当前仓库已经落地并能被源码印证的事实，用于回答“现在是什么状态”。未来目标、路线设想和演进优先级请分别查看 `docs/roadmap/target-architecture.md` 与 `docs/roadmap/gap-analysis.md`。

## 1. 文档角色

- 权威级别：当前实现事实源。
- 适用范围：仓库结构、当前路由、当前数据来源、当前 API 边界、当前限制。
- 工程治理与协作规则的长期标准放在 `docs/standards/`；执行计划与里程碑记录仍以 `docs/plans/` 为准。
- 不包含内容：真实 RAG、完整 Skill 执行引擎、更重的 Agent runtime 等完整 AI 业务能力。

## 2. 当前基线

- 仓库形态：pnpm workspace + Turborepo Monorepo。
- 前端主应用：`apps/platform`，基于 React 19、Vite 7、Ant Design 6、Tailwind CSS 4。
- 本地 API：`apps/api`，基于 Express 4 + TypeScript + MongoDB Node.js Driver。
- 共享包：
  - `packages/request`：Axios 请求封装。
  - `packages/ui`：通用 UI 组件与 helper 包，仓库内已沉淀 `SearchPanel` 能力，但 `apps/platform` 当前主业务链路未直接消费该包。
- 当前产品主线：登录后产品壳、项目态页面、全局资产正式管理页、工作区设置中心、基础框架 API 基线。
- 当前项目态主数据流：项目列表、项目基础信息、成员 roster、项目资源绑定与项目对话读写链路来自后端 `/api/projects*`；后端项目对话当前同时提供同步消息写接口、`PATCH /api/projects/:projectId/conversations/:conversationId/messages/:messageId` 消息级 star metadata 接口，以及 `POST /api/projects/:projectId/conversations/:conversationId/messages/stream` SSE 流式写接口，并已抽出共享 `ConversationTurnService` / provider capability gate；前端对话页当前已正式接入“新建会话 + 改标题 + 删除线程 + 默认流式发送消息 + pending user bubble + draft assistant bubble + 停止生成 + 用户气泡 retry/edit/copy + 右侧消息 Rail + 当前会话内 starred / selection 模式 + Markdown 导出 + knowledge draft drawer + `done/error/cancel` 后 detail/list reconcile + assistant 最小 `sources` 展示”的链路，发送失败时会复用同一个 `clientRequestId` 并按服务端线程重新回读，历史消息 replay/edit 则会通过 `targetUserMessageId` 在同线程内裁掉后续 turn 再重跑，还会额外读取 `/api/settings` 对未配置或不可用的 LLM 做页内引导；knowledge draft drawer 当前会要求用户先选择已有项目私有知识库，再把整理出的 Markdown 文档上传到该知识库中，若项目尚无私有知识库，则会在聊天页内复用 `ProjectKnowledgeAccessModal` 先创建空知识库并自动回填。desktop rail 当前默认收起，通过显式按钮展开 / 收起；窄屏继续走 Drawer fallback。概览补充文案与成员协作快照仍依赖前端 Mock，项目资源与概览中的知识库 / Skill / Agent 元数据已切正式 `/api/knowledge`、`/api/skills`、`/api/agents`。
- 当前默认宿主机开发拓扑：`platform + api + indexer-py`；依赖服务推荐由 Docker 提供 `mongodb + chroma`。
- 当前容器化部署拓扑：
  - 本地：`platform + api + indexer-py + mongodb + chroma`
  - 线上：`caddy + platform + api + indexer-py + mongodb + chroma`
- 当前已经交付 `compose.yml`、`compose.local.yml`、`compose.production.yml` 作为 Docker Compose 基线。
- 当前仓库已在 `apps/indexer-py` 落地可运行 Python 索引服务，负责 `md / markdown / txt / pdf / docx / xlsx` 的解析、清洗、分块、OpenAI-compatible embedding，以及 `global_docs` 与项目私有 docs 的 Chroma 写删侧控制面；其中 `pdf` 当前仅支持可提取数字文本的文档，OCR/扫描件仍不支持。`docx / xlsx` 会按文档结构抽取段落/标题、表头/行信息并携带 chunk anchor 元数据。embedding client 现已按 provider 适配 batching 与错误前缀，其中阿里云 `/embeddings` 单次最多发送 `10` 条文本。文档级 rebuild、文档 / 知识库级向量 delete 与 diagnostics 已落地，知识库级 rebuild 仍由 Node 侧编排；`global_code` 仍只保留命名空间预留。
- Docker 网络边界当前采用：公共基线里的 `app / data` 为 `internal`，其中 `indexer-py` 仅接入内部 `app` 网络；`compose.local.yml` 额外挂载本地专用 `publish` 网络给 `api / mongo / chroma`，用于宿主机端口发布；生产编排不复用该网络。
- Docker 基线已把 API 与 `indexer-py` 绑定到共享 `knowledge_storage` 卷，并把容器内知识存储根目录固定为 `/var/lib/knowject/knowledge`。
- `.env.docker.local` 当前允许覆盖宿主机发布端口：`WEB_PORT`、`API_PUBLISHED_PORT`、`MONGO_PUBLISHED_PORT`、`CHROMA_PUBLISHED_PORT`；其中 API 容器内部监听端口固定为 `3001`。
- 当前固定镜像版本：
  - MongoDB：`mongo:8.2.5`
  - Chroma：`chromadb/chroma:1.5.5`
- 当前运行要求：仓库要求 Node.js >= 22、pnpm 10；若本机版本过低，`pnpm check-types` 会先被环境阻塞。

## 3. 目录结构

```text
apps/
  platform/
    src/app/        鉴权、布局、导航、项目上下文
    src/api/        auth / projects / members / knowledge / skills / agents / settings 前端请求封装
    src/pages/      登录页、主页、成员页、项目页、全局资产页
  api/
    src/app/        Express 应用组装
    src/config/     环境变量加载与校验
    src/db/         MongoDB 连接与健康快照
    src/lib/        请求上下文、加密与校验 helper
    src/modules/    auth / members / projects / memberships / knowledge / skills / agents / settings 模块边界
    src/routes/     health / memory 当前接口
    src/middleware/ 请求上下文、404、统一错误处理
    src/server.ts   启动入口
  indexer-py/
    app/main.py     FastAPI 索引控制面入口
    app/domain/indexing/runtime_config.py  chunk / supported-type / timeout 配置解析
    app/domain/indexing/parser.py  文档解析与清洗
    app/domain/indexing/chunking.py  分块与 chunk record 组装
    app/domain/indexing/embedding_client.py  embedding provider / batching / request 适配
    app/domain/indexing/chroma_client.py  Chroma collection / delete / upsert 适配
    app/domain/indexing/diagnostics.py  indexer / Chroma diagnostics 聚合
    app/domain/indexing/pipeline.py  索引 orchestration façade
    README.md       Python 索引运行时边界与运行说明
packages/
  request/          Axios 请求能力封装
  ui/               通用 UI 组件
docker/
  api/              API 镜像构建与启动脚本
  indexer-py/       Python indexer 镜像构建入口
  platform/         前端镜像构建与 Nginx 反向代理配置
  mongo/init/       MongoDB 初始化脚本
  caddy/            线上 HTTPS 入口配置
  scripts/          本地 secrets 生成脚本
scripts/
  knowject.sh       常用命令统一入口与命令分发器
  lib/              shell helper，按 env / compose / 端口探测分层
files/
  README.md         知识库模板总导航
  00-全局文档/      导航、元数据规范、术语、决策、变更日志模板
  01-产品规范库/    需求、PRD、交互、发布验收模板
  02-用户研究库/    访谈、画像、洞察模板
  03-市场与竞品库/  竞品、对标、市场机会模板
  04-项目决策库/    立项、会议、里程碑、风险模板
  05-技术协作库/    接口、数据字典、埋点、技术评审模板
  06-发布运营库/    灰度发布、上线公告、问题复盘模板
  07-架构设计库/    前端、后端、大模型/知识索引等独立架构设计文档
.codex/
  config.toml                   项目级 Codex 配置
  README.md                     Codex 入口与维护说明
  MIGRATION.md                  legacy `.agent` -> `.codex` 迁移规则与映射
  docs/
    README.md                   兼容 stub，主文档根已迁移到 `docs/`
  packs/chatgpt-projects/
    README.md                   ChatGPT Projects 上传包说明
    PROJECT_BRIEF.md            ChatGPT Projects 首读摘要
  skills/
    README.md                   兼容 stub（live Skill 根目录见 `.agents/skills/`）
.agents/
  skills/
    README.md                   项目级 Skill live 根目录说明
docs/
  README.md                     项目文档主入口（唯一文档根）
  current/                      当前事实文档
  contracts/                    实施契约与接口约束
  standards/                    长期工程治理标准
  plans/                        阶段计划与实施拆解
  handoff/                      交接与历史记录
  roadmap/                      目标蓝图与差距分析
  inputs/                       输入材料
  design/                       品牌与视觉资料
  templates/                    可复用模板
  exports/                      派生导出层（非事实源）
  superpowers/                  过程资产空间（非事实源）
```

## 3.1 当前导入别名约定

- `apps/platform` 内部允许使用：
  - `@app/*` -> `src/app/*`
  - `@api/*` -> `src/api/*`
  - `@pages/*` -> `src/pages/*`
  - `@styles/*` -> `src/styles/*`
- `apps/api` 内部允许使用：
  - `@app/*` -> `src/app/*`
  - `@config/*` -> `src/config/*`
  - `@db/*` -> `src/db/*`
  - `@lib/*` -> `src/lib/*`
  - `@middleware/*` -> `src/middleware/*`
  - `@modules/*` -> `src/modules/*`
  - `@routes/*` -> `src/routes/*`
  - `@types/*` -> `src/types/*`
- `packages/ui` 内部允许使用 `@ui/*` -> `src/*`。
- `packages/request` 内部允许使用 `@request/*` -> `src/*`。
- 跨 workspace 的共享能力继续通过包名消费：
  - `@knowject/ui`
  - `@knowject/request`
- 不允许跨 workspace 深引入其他包的 `src/*`。

## 4. 前端信息架构

### 4.1 Canonical 路由

- `/login`：登录页。
- `/home`：登录后默认首页，当前承载空态引导。
- `/knowledge`：全局知识库正式管理页，已接入知识库 CRUD、文档上传、文档级 retry / rebuild、知识库级 rebuild、diagnostics 展示与状态轮询。
- `/skills`：全局技能正式管理页，已接入 `/api/skills` 并支持自建、GitHub/URL 导入、编辑、预览、草稿/发布与删除；当前后端导入边界要求 HTTPS、受信任 GitHub/raw host，以及单文件 / 总字节 / 总文件数限制。
- `/agents`：全局智能体正式配置页，已接入 `agents / knowledge / skills` 正式接口。
- `/members`：全局成员协作总览页，聚合当前账号可见项目中的成员信息。
- `/analytics`：全局分析页占位。
- `/settings`：工作区设置中心，已接入 embedding / LLM / indexing / workspace 配置与在线测试；LLM provider 预设当前覆盖 `openai / gemini / aliyun / deepseek / moonshot / zhipu / custom`，并直接驱动项目对话 MVP。
- `/project/:projectId/overview`：项目概览页。
- `/project/:projectId/chat`：项目对话页。
- `/project/:projectId/chat/:chatId`：项目对话详情页。
- `/project/:projectId/resources`：项目资源页。
- `/project/:projectId/members`：项目成员页。

### 4.2 兼容与重定向

- `/` 重定向到 `/home`。
- `/project/:projectId` 重定向到 `/project/:projectId/overview`。
- `/project/:projectId/knowledge` 重定向到 `/project/:projectId/resources?focus=knowledge`。
- `/project/:projectId/skills` 重定向到 `/project/:projectId/resources?focus=skills`。
- `/project/:projectId/agents` 重定向到 `/project/:projectId/resources?focus=agents`。
- `/home/project/:projectId` 重定向到 `/project/:projectId/overview`。
- `/home/project/:projectId/chat` 与 `/home/project/:projectId/chat/:chatId` 重定向到新的项目对话路径。

### 4.3 布局与导航

- 登录后主布局由 `apps/platform/src/app/layouts/AuthedLayout.tsx` 提供，结构为“左侧全局侧栏 + 右侧内容区”。
- 左侧侧栏 `AppSider` 负责：
  - 品牌区。
  - 全局导航。
  - “我的项目”列表。
  - 项目创建、编辑、置顶、删除。
  - 当前账号展示与退出登录。
- 项目页布局由 `apps/platform/src/pages/project/ProjectLayout.tsx` 驱动，结构为“项目头部 + 项目内一级导航 + 页面内容区”。
- 项目内一级导航固定为：`概览`、`对话`、`资源`、`成员`。

## 5. 当前状态与数据来源

### 5.1 本地存储

- `knowject_token`：登录 token。
- `knowject_auth_user`：当前登录用户信息。
- `knowject_locale_guest`：未登录态 guest locale，本机语言偏好缓存。
- `knowject_remembered_username`：登录页“记住用户名”缓存。
- `knowject_project_pins`：项目置顶偏好。

### 5.2 鉴权与登录态

- 前端通过 `apps/platform/src/api/auth.ts` 调用 `POST /api/auth/register` 与 `POST /api/auth/login`。
- 前端当前还会通过 `PATCH /api/auth/me/preferences` 持久化账号级 `locale` 偏好。
- `/login` 页面当前已支持同页登录 / 注册模式切换，不新增 `/register` 路由。
- `/login` 页面当前已提供未登录态语言切换入口；guest locale 会写入 `knowject_locale_guest`，默认回退到 `en`。
- `/login` 页面可选记住用户名，并通过 `knowject_remembered_username` 回填下次登录表单。
- 登录成功或注册成功后会写入 `knowject_token` 与 `knowject_auth_user`，再由受保护路由守卫控制登录后访问；`knowject_auth_user` 当前已包含 `locale`。
- 登录态 locale 当前遵循“账号优先、guest 回退”规则：启动时优先读取 `auth.user.locale`，不存在时回退到 `knowject_locale_guest`；登录成功后会用服务端返回的 `result.user.locale` 接管当前 locale。
- 登录后左侧栏底部账号面板当前已提供 hover 展开的“语言”二级面板，切换后会立即更新前端 locale，并异步写回账号级偏好。
- 当前 token 已切到正式 JWT，不再使用演示 token 前缀。
- 登录 / 注册请求体中的 `password` 保持原始口令语义，由 HTTPS 负责传输保护；服务端在落库前使用 `argon2id` 做哈希。

### 5.3 API 环境与数据库基线

- `apps/api` 读取仓库根 `.env.local` / `.env`，模板文件为根目录 `/.env.example`；API runtime 当前 canonical secret / connection-string 键固定为 `MONGODB_URI`、`JWT_SECRET`、`SETTINGS_ENCRYPTION_KEY`，可选 secret 额外允许 `OPENAI_API_KEY` 走 `<NAME>_FILE`；Docker 编排会额外注入 `KNOWLEDGE_STORAGE_ROOT=/var/lib/knowject/knowledge` 与 `KNOWLEDGE_INDEXER_URL=http://indexer-py:8001`，知识库上传单文件上限当前固定为 `50 MB`；当前正式上传链路支持 `md / markdown / txt / pdf / docx / xlsx`，其中 `pdf` 仅支持可提取数字文本的文档（OCR/扫描件不支持）。宿主机推荐开发流会把 `MONGODB_URI_FILE`、`JWT_SECRET_FILE` 与 `SETTINGS_ENCRYPTION_KEY_FILE` 回写到 `.env.local`，并为 Docker API 派生 `docker/secrets/mongodb_uri.txt`；`docker/api/start-api.sh` 仍保留 `MONGO_*` 兼容 fallback，但仅作迁移窗口。
- `apps/api` 还会读取可选 `SKILLS_STORAGE_ROOT`；未配置时默认落到 `<workspace>/.knowject-storage/skills`，用于持久化自建 / 导入 Skill 的 bundle 文件。
- 宿主机默认开发流已把 `apps/indexer-py` 纳入 workspace `pnpm dev`，因此本地 `platform + api + indexer-py` 会一并启动；若单独跑 `api`，仍需额外启动 Python indexer 才能验证知识上传闭环。
- 当前 API 已建立 MongoDB 连接管理基线，并已将用户与项目正式写模型接入 MongoDB；前端项目列表、项目基础信息与成员页当前直接消费这些正式接口。
- `knowledge` 模块当前已在 MongoDB 中冻结 `knowledge_bases`、`knowledge_documents` 与 namespace 级 `knowledge_index_namespaces` 三组元数据集合模型，并已接入知识库 CRUD、文档上传记录写入、原始文件本地落盘、Node 后台触发 Python indexer、`global_docs` Chroma 写入、知识库 / 文档级 delete 控制面，以及统一知识检索 service；其中 `knowledge_bases` 当前已补齐 `scope=global|project` 与 `projectId` 作用域字段，全局列表默认只返回 global scope，项目级 `/api/projects/:projectId/knowledge*` 已开放私有知识的 `list / create / detail / upload` 路由，project scope 文档的 namespace key 仍是 `proj_{projectId}_docs`，并按 `projects/{projectId}/knowledge/...` 落盘。Node 侧知识域服务当前已收口为 `knowledge.service.ts` facade，内部拆为 `knowledge.service.{helpers,read,catalog,documents,rebuild,diagnostics,upload}.ts`；仓储层当前已收口为 `knowledge.repository.ts` facade，内部拆为 `knowledge.repository.{base,documents,namespace}.ts`，对外 API 保持不变。
- `settings` 模块当前已在 MongoDB 中落地 `workspace_settings` 单例集合，并通过 `SETTINGS_ENCRYPTION_KEY` 对 API Key 做 AES-256-GCM 加密存储；`GET /api/settings` 返回的是当前 effective config，而不是数据库原始值，`embedding / llm / indexing` 会标记 `source=database|environment`。其中保存的 LLM 配置会直接进入项目对话 runtime，环境侧默认 LLM model 当前为 `gpt-5.4`；`POST /api/settings/llm/test` 现已按 provider / model 选择最小兼容 payload，OpenAI `gpt-5*` 会发送 `max_completion_tokens`，其余兼容 provider 继续发送 `max_tokens`。`settings.service.ts` 当前保留 facade 角色，字段归一化/校验、section 组装与连通性测试已分别拆到 `settings.service.validation.ts`、`settings.service.sections.ts` 与 `settings.service.connection-test.ts`。
- `apps/indexer-py` 当前已切到 FastAPI + uv 基线，已提供 `POST /internal/v1/index/documents`、`POST /internal/v1/index/documents/{documentId}/rebuild`、`POST /internal/v1/index/documents/{documentId}/delete`、`POST /internal/v1/index/knowledge/{knowledgeId}/delete` 与 `GET /internal/v1/index/diagnostics` 五个内部控制面入口；非 `development` 默认关闭 `/docs`、`/redoc`、`/openapi.json`，`/internal/*` 在设置 `KNOWLEDGE_INDEXER_INTERNAL_TOKEN` 时启用 token 校验，且 `storagePath` 现在限制在 `KNOWLEDGE_STORAGE_ROOT` 下。当前仍隐藏兼容旧路径 `POST /internal/index-documents`，用于开发态 / 滚动重启期间的平滑过渡。其内部索引实现已拆成 `runtime_config / parser / chunking / embedding_client / chroma_client / diagnostics / pipeline` 七个模块，`pipeline.py` 当前只保留 orchestration façade 与兼容 wrapper。
- 开发环境下若缺少 `OPENAI_API_KEY`，知识库上传链路会退化到 deterministic 本地 embedding，并把文档元数据标记为 `local_dev / hash-1536-dev`；Node 侧统一知识检索也会复用同一套 deterministic 本地 query embedding，保证开发环境上传 / 检索闭环可用。生产与正式环境仍以真实 OpenAI-compatible embedding 为基线。
- `GET /api/health` 当前只暴露最小 public health surface：顶层 `status` 与 `checks.{app,database,vectorStore}.status`，状态统一为 `up/down`；`service / environment / timestamp / uptimeSeconds` 与数据库/向量存储的 `host / url / lastError` 等敏感明细不再在 public health 中返回。
- 当前 Chroma 已进入正式知识索引链路：`global_docs` 与项目私有 docs 的写侧索引由 `indexer-py` 负责，Node 侧统一知识检索 service 保留读侧 query 的架构例外；collection 逻辑已经从“固定 collection 名”升级为“namespace key + versioned collection + active pointer”模式，用于处理 embedding model 切换后的维度不兼容问题。Node 会把当前 effective embedding / indexing config 透传给 Python，模型切换后不要求重启服务，而是要求先执行 namespace 级全量重建；当前知识库级 rebuild 无论 fingerprint 是否变化，都会先写 staged/versioned collection，成功后再切换 active pointer。文档 / 知识库级向量 delete 现在优先走 Python 内部控制面，仅在旧版 indexer 缺少对应路由时回退到 Node 直连 Chroma；旧 collection 清理仍保留 Node 侧实现。`global_code` 当前只有 collection 预留，没有真实数据导入。
- 根 `scripts/knowject.sh` 当前作为命令分发器，统一暴露 `dev:*`（宿主机开发 + Docker 依赖）、`host:*`（兼容宿主机命令）和 `docker:*`（本地 / 线上部署与验收）三类入口；env sync、compose wrapper 与端口探测 helper 已拆到 `scripts/lib/knowject-*.sh`。

### 5.4 项目状态与 Mock 资产

- `apps/platform/src/app/project/ProjectContext.tsx`
  - 通过 `/api/projects` 管理项目列表的增删改查、置顶和按 ID 查询。
  - 组件初始化时会一次性清理已退役的 `knowject_projects` 与 `knowject_project_resource_bindings` 本地缓存墓碑。
  - 项目资源绑定写回当前走 partial patch，只发送调用方明确传入的 `knowledgeBaseIds / agentIds / skillIds`，不再从当前项目快照拼全量项目更新请求。
  - 当前运行时 `ProjectSummary` 会把后端项目基础信息、成员 roster、后端资源绑定与本地 pin 偏好合并成页面消费模型。
- `apps/platform/src/app/project/project.storage.ts`
  - 只管理 `knowject_project_pins` 本地偏好。
- `apps/platform/src/app/project/project.catalog.ts`
  - 维护成员基础档案；项目创建 / 编辑表单的资源选项已迁到 `useProjectResourceOptions.ts` 运行时拉取正式 `/api/knowledge`、`/api/skills` 与 `/api/agents`，此处只保留历史演示数据兼容；不再承担项目资源页的 agent 展示事实源。
- `apps/platform/src/pages/project/projectWorkspaceSnapshot.mock.ts`
  - 维护项目概览补充文案与成员协作快照；当前只作为演示补充层存在，不承担正式资源映射职责。
- `apps/platform/src/pages/project/projectResourceMappers.ts`
  - 维护项目资源展示映射；知识库 / Skill / Agent 元数据优先来自正式 `/api/knowledge`、`/api/projects/:projectId/knowledge`、`/api/skills`、`/api/agents`，未知资源绑定会返回占位项而不是静默过滤。
- `apps/platform/src/app/layouts/components/AppSider.tsx`
  - 当前只负责侧栏 shell、“我的项目”列表与项目创建 / 编辑 / 置顶 / 删除动作；项目表单已拆到 `ProjectFormModal.tsx`，知识库 / Skill 选项加载与“保留未知已选项”逻辑已下沉到 `useProjectResourceOptions.ts` 与 `projectResourceOptions.shared.ts`。
- `apps/platform/src/pages/project/ProjectLayout.tsx`
  - 进入项目页时会并行拉取 `/api/projects/:projectId/conversations`、`/api/knowledge`、`/api/projects/:projectId/knowledge`、`/api/skills` 与 `/api/agents`，为概览 / 对话 / 资源三页提供正式只读数据，并会对 `pending / processing` 的项目私有 knowledge 做最多 20 次、间隔 1500ms 的短轮询。
- `apps/platform/src/pages/project/ProjectChatPage.tsx`
  - 当前作为项目对话编排层；对话配置、详情读取、流式 turn、用户消息 `retry / edit / copy`、消息 Rail state / action、knowledge draft drawer，以及 create / rename / delete 动作已分别拆到 `useProjectChatSettings.ts`、`useProjectConversationDetail.ts`、`useProjectConversationTurn.ts`、`useProjectChatUserMessageActions.ts`、`useProjectConversationMessageRail.ts`、`useProjectConversationMessageActions.ts` 与 `useProjectChatActions.ts`。
  - `useProjectConversationTurn.ts` 当前承接默认 `messages/stream` 发送、`clientRequestId` 幂等复用、基于 `targetUserMessageId` 的同线程 replay/edit、optimistic turn 裁剪、pending user bubble、draft assistant bubble、停止生成，以及 `done / error / cancel` 后的 detail/list reconcile；`useProjectConversationTurn.helpers.ts` 负责 pending submission 对账与 optimistic replay message trim。
  - `projectChat.markdown.tsx`、`projectChatBubble.components.tsx` 与 `projectChat.clipboard.ts` 承担 markdown renderers、bubble message/footer、assistant sources 展示与复制 fallback；`projectChat.components.tsx` 当前只保留 conversation label，`projectChat.adapters.ts` 负责 bubble role config、message mapper 与线程右键菜单项，`components/ProjectConversationMessageRail.tsx` 与 `components/ProjectKnowledgeDraftDrawer.tsx` 分别承接右侧 Rail 壳层和知识草稿抽屉。
  - 页面继续通过 `/api/projects/:projectId/conversations/:conversationId` 读取详情，并额外读取 `/api/settings`；当 `llm.hasKey=false`、provider 不在支持集，或运行时返回可修复的 LLM 错误时，渲染页内提示并提供跳转 `/settings` 的入口。当前页面默认发送已切到流式 `messages/stream` 接口，同步 `messages` 接口保留为共享后端基线与回滚路径；消息 Rail 只作用于当前 conversation，可对 persisted message 做 star/unstar、滚动定位、共享 selection Markdown 导出，以及“选择已有项目私有知识库后上传 Markdown 文档；若目录为空，则先在聊天页内创建空知识库”的 knowledge draft 闭环。desktop rail 当前采用显式展开 / 收起，selection mode 会强制保持展开，drawer 关闭时保留 selection，保存成功后清空 selection。
- `apps/platform/src/index.css`
  - 当前已建立 Tailwind v4 theme token 基线，提供 `rounded-(panel/card/card-lg/shell/hero)`、`text-(caption/label/body/title/display-*)` 与 `shadow-(surface/card/float/shell/hero)` 等高频 token，并已承接第一批页面迁移。
- `apps/platform/src/app/providers/LocaleProvider.tsx`
  - 当前已作为平台 locale 单一事实源，负责 guest/account locale 选择、`i18next.changeLanguage(...)` 与登录态 `auth.user.locale` 同步。
- `apps/platform/src/app/providers/AntdProvider.tsx`
  - 当前会根据 locale 在 `en_US / zh_CN` 间切换 Ant Design locale。
- `apps/platform/src/i18n/*`
  - 当前已落地 `auth / navigation / pages / project / api-errors / common` 六组 namespace 资源；登录页、侧栏、global pages、`/knowledge`、`/skills`、`/agents`、`/settings` 与项目 `layout / overview / chat / resources / members` 主链路已切到 i18n 资源，project 域直接产出 UI 文案的 helper/toast/fallback 也已并入 `project` namespace。
- 根 `eslint.config.mjs`
  - 当前已对 `apps/platform/src/**/*.{ts,tsx}` 启用 type-aware ESLint，并新增 `@typescript-eslint/await-thenable` 与 `@typescript-eslint/no-floating-promises`；前端 fire-and-forget Promise 现在必须显式 `void`。

### 5.5 全局资产与项目资源分层

- 全局 `知识库 / 技能 / 智能体` 页面当前负责展示跨项目资产目录和治理入口；其中 `/knowledge`、`/skills` 与 `/agents` 已切正式接口。
- 项目 `资源` 页当前同时展示“该项目已绑定的全局资产”与“归属当前项目的私有知识”。
- 项目资源的实际来源已经切到后端项目模型中的 `knowledgeBaseIds / skillIds / agentIds`。
- 其中知识库、Skill 与 Agent 分组优先消费 `/api/knowledge`、`/api/skills`、`/api/agents` 的正式元数据；`/agents` 页面与项目资源页当前消费同一份正式 agent 目录。
- 当项目或成员聚合里出现未知的 `skills / agents` 资源 ID 时，前端当前会渲染“未知资源（{id}）”占位项，而不是静默丢失。
- 兼容跳转会临时落到 `/project/:projectId/resources?focus=*`；页面完成滚动定位后会回写 canonical URL `/project/:projectId/resources`。
- `apps/platform/src/pages/knowledge/KnowledgeManagementPage.tsx` 已接正式后端知识库接口，支持知识库 CRUD、文档上传、文档级 retry / rebuild、知识库级 rebuild、diagnostics 面板、状态展示和上传后的最小轮询；当前页面已收口为编排壳层，列表状态拆到 `useKnowledgeListState.ts`，详情头、文档 tab 与运维 tab 已拆到 `components/*`。
- 知识库上传链路现在会在上传入口对 multipart 文件名做 UTF-8 纠偏，避免中文文件名因浏览器 / multer 参数编码差异出现乱码。
- `apps/platform/src/pages/skills/SkillsManagementPage.tsx` 当前已作为 `/skills` 的正式管理页，支持 Skill 分组筛选、自建、GitHub/URL 导入、原生 `SKILL.md` 编辑与预览、草稿/发布，以及来源 provenance 展示。
- `apps/platform/src/pages/agents/AgentsManagementPage.tsx` 当前已作为 `/agents` 的正式配置页，支持创建、编辑、删除，以及知识库 / Skill 绑定表单。
- `apps/platform/src/pages/assets/components/GlobalAssetLayout.tsx` 与 `globalAsset.shared.ts` 当前承载 `/skills`、`/agents` 共用的 summary item、sidebar filter item、meta pill 与更新时间 formatter 等薄展示基元。
- `apps/platform/src/pages/settings/SettingsPage.tsx` 当前已作为 `/settings` 的正式设置中心，支持 embedding / LLM / indexing / workspace 四块配置，以及 Provider 切换后的 API Key 重输、模型连通性测试与 `Node -> indexer -> Chroma` 索引链路在线测试；LLM 当前统一按 `chat/completions` 兼容协议接入 `openai / gemini / aliyun / deepseek / moonshot / zhipu / custom` 七类 provider，`anthropic` 在补齐 provider-specific adapter 前不再暴露。当前页面已收口为编排壳层，状态加载/保存/测试逻辑拆到 `useSettingsPageController.ts`，tab 内容拆到 `components/Settings*Tab.tsx`，共享常量与 helper 拆到 `constants.ts`。
- `apps/platform/src/pages/assets/GlobalAssetManagementPage.tsx` 当前保留为历史壳层组件，未接入实际路由。
- 项目资源页的知识分组当前会并行消费 `/api/knowledge` 与 `/api/projects/:projectId/knowledge`：前者负责解析 `knowledgeBaseIds` 对应的全局绑定知识，后者负责项目私有知识目录；页面已收口为统一“接入知识库”入口，支持在项目内直接选择“引入全局知识库”或“新建项目私有知识库”。
- 项目资源页中的知识库卡片当前支持打开详情抽屉：全局绑定知识在项目中只读查看文档并允许解除绑定、跳转全局治理；项目私有知识则支持编辑、删除、上传文档、文档级 retry / rebuild / delete，以及 knowledge diagnostics / knowledge rebuild 的最小运维操作。抽屉 loading 只跟随详情/诊断请求，不再绑定目录轮询状态。

### 5.6 成员数据分层

- 全局成员基础档案维护在 `project.catalog.ts`。
- `/members` 当前已接入 `/api/members`，展示当前账号可见项目中的成员基础信息、项目参与关系与最小权限摘要。
- 项目成员的职责、状态、最近动作等协作快照维护在 `projectWorkspaceSnapshot.mock.ts`。
- `/project/:projectId/members` 当前已切到正式后端成员 roster 管理页。
- 页面支持按用户名 / 姓名模糊搜索已有用户，通过多选下拉框批量加入项目，并支持修改 `admin / member`、移除成员。
- 成员协作快照仍保留在 `projectWorkspaceSnapshot.mock.ts`，当前用于全局成员页与项目概览中的协作状态补充展示，不作为正式成员关系主数据源。

## 6. API 边界

### 6.1 现有接口

- `GET /api/health`
- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/users`
- `GET /api/members`
- `GET /api/projects`
- `POST /api/projects`
- `GET /api/projects/:projectId/conversations`
- `POST /api/projects/:projectId/conversations`
- `GET /api/projects/:projectId/conversations/:conversationId`
- `PATCH /api/projects/:projectId/conversations/:conversationId`
- `DELETE /api/projects/:projectId/conversations/:conversationId`
- `POST /api/projects/:projectId/conversations/:conversationId/messages`
- `POST /api/projects/:projectId/conversations/:conversationId/messages/stream`
- `PATCH /api/projects/:projectId`
- `DELETE /api/projects/:projectId`
- `POST /api/projects/:projectId/members`
- `PATCH /api/projects/:projectId/members/:userId`
- `DELETE /api/projects/:projectId/members/:userId`
- `GET /api/projects/:projectId/knowledge`
- `GET /api/projects/:projectId/knowledge/:knowledgeId`
- `POST /api/projects/:projectId/knowledge`
- `POST /api/projects/:projectId/knowledge/:knowledgeId/documents`
- `GET /api/knowledge`
- `POST /api/knowledge/search`
- `GET /api/knowledge/:knowledgeId`
- `POST /api/knowledge`
- `PATCH /api/knowledge/:knowledgeId`
- `DELETE /api/knowledge/:knowledgeId`
- `POST /api/knowledge/:knowledgeId/documents`
- `POST /api/knowledge/:knowledgeId/documents/:documentId/retry`
- `POST /api/knowledge/:knowledgeId/documents/:documentId/rebuild`
- `POST /api/knowledge/:knowledgeId/rebuild`
- `GET /api/knowledge/:knowledgeId/diagnostics`
- `DELETE /api/knowledge/:knowledgeId/documents/:documentId`
- `GET /api/skills`
- `GET /api/skills/:skillId`
- `POST /api/skills`
- `POST /api/skills/import`
- `PATCH /api/skills/:skillId`
- `DELETE /api/skills/:skillId`
- `GET /api/agents`
- `GET /api/agents/:agentId`
- `POST /api/agents`
- `PATCH /api/agents/:agentId`
- `DELETE /api/agents/:agentId`
- `GET /api/settings`
- `PATCH /api/settings/embedding`
- `PATCH /api/settings/llm`
- `PATCH /api/settings/indexing`
- `PATCH /api/settings/workspace`
- `POST /api/settings/embedding/test`
- `POST /api/settings/indexing/test`
- `POST /api/settings/llm/test`
- `GET /api/memory/overview`
- `POST /api/memory/query`

### 6.2 当前接口职责

- `health`：返回应用状态、数据库状态、可选的向量存储状态和最小诊断信息。
- `auth/register`：创建用户、写入 `passwordHash`、签发 JWT 并返回登录态。
- `auth/login`：校验用户名与密码，签发 JWT 并返回登录态。
- `auth/users`：按用户名 / 姓名模糊搜索已有注册用户，供项目成员添加下拉候选使用。
- `members`：聚合当前用户可见项目中的成员基础信息、项目参与关系和最小权限摘要。
- `projects`：提供最小正式项目 CRUD，写入 MongoDB，并内嵌项目成员与 `admin / member` 角色、项目资源绑定字段，以及项目对话列表 / 详情、标题更新、消息级 star metadata PATCH、删除线程、同步消息写入与 SSE 流式消息写入接口。
- `memberships`：提供项目成员管理闭环，支持按用户名添加已有用户、修改项目级角色和移除成员。
- `knowledge`：当前已提供知识库列表 / 详情 / 创建 / 编辑 / 删除接口、文档上传入口、单文档 retry / rebuild / delete、知识库级 rebuild、`GET /api/knowledge/:knowledgeId/diagnostics` 诊断接口，以及 `POST /api/knowledge/search` 统一知识检索接口；后端已冻结知识库 / 文档元数据模型与索引，并在上传时写入文档记录、初始化 `pending` 状态、落盘原始文件，再由 Node 在后台切到 `processing` 并触发 Python indexer，最终回写 `completed / failed`，同时把成功分块写入当前 namespace 的 active Chroma collection。上传单文件上限默认 `50 MB`，当前支持 `md / markdown / txt / pdf / docx / xlsx`；其中 `pdf` 仅支持可提取数字文本的文档（OCR/扫描件不支持），`docx / xlsx` 走结构感知抽取并写入对应 chunk anchor 元数据。`knowledge_bases` 现在已支持 `scope=global|project` 与 `projectId` owner 字段，全局 `/api/knowledge` 列表会显式过滤掉 project scope，`/api/projects/:projectId/knowledge*` 则承载项目私有知识的 `list / create / detail / upload`；project scope 文档的 namespace key 仍为 `proj_{projectId}_docs`，物理 collection 则会带 embedding fingerprint 后缀，并按 `projects/{projectId}/knowledge/{knowledgeId}/{documentId}/{documentVersionHash}/{fileName}` 落盘。删除项目时，服务端会先级联清理该项目的 project scope knowledge、原文件目录与当前 active collection 中的 Chroma 向量，避免孤儿资产；统一检索接口在返回结果前还会按 `knowledgeId / documentId` 回查 Mongo，只保留业务真相仍存在的命中。若 settings 中的 embedding provider / model / baseUrl 已变化，单文档 retry / rebuild 会被显式拦截，要求先执行知识库级全量重建；知识库级 rebuild 当前统一先写 staged/versioned collection，成功后才切换 active pointer，因此同 fingerprint rebuild 失败也不会破坏旧 active collection。Node 统一知识检索 service 当前保留读侧直连 Chroma query 的架构例外；collection init 与文档 / 知识库级向量 delete 已优先下沉到 Python 控制面，Node 仅对旧版 indexer 保留 404 回退直连 delete。当前文档 / 知识库删除若遇到向量清理失败，会直接返回 `502` 并停止继续删除 Mongo 记录与原始文件，避免继续制造脏状态；diagnostics 会按 best-effort 返回 collection / indexer 降级结果，不因下游不可达而整体失败，其中 `indexer.*` 表示 Python 运行时实际值，工作区期望值通过 `indexer.expected.*` 暴露。
- `skills`：当前已提供系统内置 Skill registry、Mongo 元数据仓储、bundle 文件存储、`SKILL.md` 解析、GitHub/URL 导入、列表 / 详情 / 创建 / 编辑 / 删除接口，以及 `draft / published` 生命周期、引用保护与 bindable 校验；项目与 Agent 当前只允许绑定系统内置或已发布的正式 Skill。当前导入边界已收紧到 HTTPS、受信任 GitHub/raw host，以及单文件 / 总字节 / 总文件数限制。其中 `search_documents` 的 handler 对齐服务端统一知识检索契约，`search_codebase / check_git_log` 当前仍是 contract-only 定义。
- `agents`：当前已提供 Agent 列表 / 详情 / 创建 / 编辑 / 删除接口，后端会校验 `boundKnowledgeIds` 与 `boundSkillIds` 的存在性，并只允许绑定系统内置或已发布的正式 Skill；`model` 当前固定由服务端写入 `server-default`。
- `settings`：当前已提供 `GET/PATCH/TEST /api/settings/*`，支持工作区 embedding / LLM / indexing / workspace 配置、服务端加密存储 API Key、effective config 读取层，以及对知识检索 / 索引链路的热生效配置透传；其中保存后的 LLM 配置会直接进入项目对话 runtime，`POST /api/settings/llm/test` 会统一校验当前 `chat/completions` 兼容 provider 的在线连通性，并按 provider / model 选择最小兼容 payload（OpenAI `gpt-5*` 使用 `max_completion_tokens`，其余兼容 provider 继续使用 `max_tokens`），`POST /api/settings/indexing/test` 会直接校验 `Node -> Python indexer -> Chroma` 当前诊断状态；环境侧默认 provider / model 当前为 `openai + gpt-5.4`。本期访问控制固定为“所有已登录用户可访问”。
- `memory/overview`：返回 Knowject 项目级记忆概览的演示数据。
- `memory/query`：基于本地 `DEMO_ITEMS` 做简单关键词匹配，返回演示检索结果。

### 6.3 当前鉴权约定

- `auth/users`、`projects`、`memberships`、`knowledge`、`skills`、`agents`、`settings` 与 `memory` 路由要求 `Authorization: Bearer <token>`。
- 服务端当前通过 JWT 中间件校验 `iss / aud / exp / sub / username`。
- 当前所有 JSON API 响应统一为 `code / message / data / meta`。
- API 请求当前已统一接受 `Accept-Language`，服务端会优先按该请求头协商 locale；若缺失，再回退到登录态用户的账号级 `locale`，最终回退到默认 `en`。
- 成功响应中，`HTTP 200` 默认映射为 `SUCCESS / 请求成功`，`HTTP 201` 默认映射为 `CREATED / 创建成功`。
- 失败响应统一返回 `data: null`，并继续沿用现有业务错误码；`meta` 当前固定包含 `requestId` 与 `timestamp`，仅在 `API_ERROR_EXPOSE_DETAILS=true` 时才返回 `meta.details`。
- success/error envelope 当前都会按 locale 输出 `message`；字段级 validation 详情也会在 `meta.details.fields` 中一起本地化，而不是只翻译顶层 `message`。
- `DELETE /api/projects/:projectId` 与 `DELETE /api/knowledge/:knowledgeId` 当前已从 `204 No Content` 调整为 `HTTP 200 + data:null`，以保持 envelope 一致性。
- 前端通过 `apps/platform/src/api/*` 在 API 层统一解包 `data`，页面层继续消费业务数据，不直接感知 envelope。
- 当前已具备正式用户体系、`argon2id` 密码哈希、JWT、最小项目权限模型和成员管理接口。
- 生产环境下，`/api/auth/*`、`/api/settings/*` 与 `/api/memory/*` 会拒绝非 HTTPS 请求，并返回 `SECURE_TRANSPORT_REQUIRED`。
- `auth`、`settings` 与 `memory` 响应默认附带 `Cache-Control: no-store`，避免敏感响应被缓存。
- 当前前端项目列表、项目基础信息、成员 roster、项目资源绑定与项目对话列表 / 详情已切到 `/api/projects*`；项目对话页当前默认已正式消费“新建会话 + 改标题 + 删除线程 + 消息级 star PATCH + 右侧消息 Rail + 当前会话内 selection Markdown 导出 + knowledge draft drawer + `messages/stream` 流式发送 + pending/draft bubble + stop generation + detail/list reconcile + assistant 回复 + sources”链路；后端同步与流式消息接口共享同一套 `ConversationTurnService`，流式事件类型冻结为 `ack / delta / done / error`。

## 7. 模块职责

- `apps/platform`
  - 登录页、产品壳、路由、项目态页面，以及已正式接线的 `/knowledge`、`/skills`、`/agents`、`/settings` 页面。
- `apps/api`
  - 当前已是 Express + MongoDB 的正式业务主链路基线，承载 `auth / members / projects / memberships / knowledge / skills / agents / settings / memory` 的对外 API。
  - 已具备 `config / db / middleware / modules` 基础骨架。
  - `src/lib` 当前承载 `request-auth`、`crypto` 与 `validation` 等跨模块复用 helper。
  - `modules/auth` 当前已承载用户模型、密码哈希、JWT、中间件和注册 / 登录接口。
  - `modules/members` 当前已承载全局成员聚合只读接口。
- `modules/projects` 当前已承载项目模型、MongoDB 仓储、资源绑定字段、项目对话 MVP（list / detail / create / rename / message star PATCH / delete / sync message / stream message + merged retrieval runtime）、权限校验与 CRUD 接口；其中 `projects.service.ts` 已回落为项目 CRUD + service 组装层，项目对话主链路已拆到 `project-conversation-service.ts`、`project-conversation-turn.service.ts`、`project-conversation-runtime.ts`、`project-conversation-provider.ts` 与 `project-conversation-capabilities.ts`。
  - `modules/memberships` 当前已承载项目成员增删改接口与最小角色规则。
- `modules/knowledge` 已落地 GA-06 元数据模型、集合索引、CRUD、文档上传入口、单文档 retry / rebuild / delete、知识库级 rebuild、Node -> Python 的解析 / 分块 / embedding / Chroma 写删闭环、knowledge diagnostics，以及 Node 侧统一知识检索逻辑；当前也已补齐 `scope / projectId` 的 owner 模型、namespace 级 active collection 状态、startup recovery 失败回写与项目成员可见性基线。
- `modules/settings` 已完成 `workspace_settings` 单例仓储、`/api/settings/*` 路由、AI API Key 加密存储、effective config 读取层与在线测试逻辑，其中索引配置页已补齐 indexer / Chroma 链路测试，`llm/test` 已按 provider / model 做最小兼容 payload 适配，环境侧默认 LLM model 固定为 `gpt-5.4`。
  - `modules/skills` 已完成 GA-09 Skill 资产治理闭环：系统内置 registry、Mongo 元数据、bundle 存储、GitHub/URL 导入、草稿/发布与正式 CRUD；`modules/agents` 已完成 GA-10 Mongo 正式模型、CRUD 与绑定校验。
  - 当前统一知识检索 service 已落地在 `knowledge` 模块，供后续 Skill / 对话链路复用。
- `apps/indexer-py`
  - 当前已落地 FastAPI 内部索引控制面，以及 `runtime_config / parser / chunking / embedding_client / chroma_client / diagnostics / pipeline` 七段式内部索引结构；其中 `pipeline.py` 已退回 orchestration façade，`md / markdown / txt / pdf / docx / xlsx` 解析、清洗、`1000 字符 / 200 重叠` 分块、OpenAI-compatible embedding、`global_docs` 与 `proj_{projectId}_docs` 的 Chroma 写入 / 删除逻辑，以及单文档 rebuild、文档 / 知识库级向量 delete 与 diagnostics 实现均已拆到对应专用模块。`pdf` 当前仅支持可提取数字文本的文档（OCR/扫描件不支持）；`docx / xlsx` 会保留 section/sheet/row 等结构元数据用于 chunk anchor。`embedding_client.py` 当前会按 provider 适配单次 batching 上限与错误前缀，阿里云 embedding 单批上限为 `10`；`chunkOverlap=0` 现在会按显式配置生效，Chroma collection cache 在 stale id/404 时会自动刷新并重试。
  - 当前明确不做 `global_code` 真实导入、知识库级 rebuild 内部入口和统一检索读侧；知识库级 rebuild 继续由 Node 业务层遍历文档编排。
- `packages/request`
  - 请求客户端、错误封装、去重、下载能力。
- `packages/ui`
  - 通用组件与 helper 包，当前前端主业务链路未直接依赖。

## 8. 当前明确未落地能力

以下能力在认知总结或目标蓝图中出现过，但当前仓库未落地，不应视为现状：

- 项目资源页内的知识原文预览 / 下载能力，以及全局绑定知识的项目内编辑能力。
- `global_code` 的真实 Git 导入、切分和索引写入。
- 系统级索引运维链路与知识库级批量内部入口。
- 更完整的来源引用渲染、原文定位，以及更细的流式恢复 / 观测能力。
- RBAC、成员邀请权限流、refresh token。
- Git 仓库接入、Figma 接入、代码解析与向量化。
- Skill / Agent 的执行与调度能力；当前 Knowledge 已完成后端 CRUD、上传入口、Chroma 写入与统一检索，`/skills` 与 `/agents` 也已完成正式管理页与后端治理 / CRUD，但尚未进入项目对话运行时。
- Zustand、React Query 等额外状态管理层。

## 9. 相关文档

- `.codex/README.md`：Codex 工作区入口与维护规则。
- `.codex/MIGRATION.md`：legacy `.agent` 收口到 `.codex` 的迁移映射与后续维护方式。
- `docs/README.md`：文档索引、分类导航与维护边界。
- `docs/standards/engineering-governance-overview.md`：长期工程治理与协作规则总览。
- `docs/standards/review-checklist.md`：工程治理评审清单与默认门禁。
- `docs/standards/code-structure-governance.md`：代码结构治理标准。
- `docs/standards/core-code-commenting.md`：核心代码注释标准。
- `docs/standards/config-security-governance.md`：配置与安全治理标准。
- `docs/standards/frontend-shared-abstractions.md`：前端共享抽象标准。
- `docs/standards/document-sync-governance.md`：文档同步治理标准。
- `../../files/README.md`：知识库模板总导航与推荐使用顺序。
- `docs/current/docker-usage.md`：Docker 当前拓扑、安全策略与部署边界。
- `docs/handoff/chatgpt-project-brief.md`：给 ChatGPT / 外部大模型的最小项目说明。
- `docs/contracts/chroma-decision.md`：Chroma 的角色定位、collection 命名与检索层边界说明。
- `docs/handoff/handoff-guide.md`：新协作者快速建立当前事实的入口。
- `docs/handoff/handoff-prompt.md`：把当前上下文继续交给下一位协作者的模板。
- `docs/roadmap/target-architecture.md`：目标蓝图与阶段能力。
- `docs/roadmap/gap-analysis.md`：现状与目标差距、风险和建议优先级。
- `docs/plans/tasks-index-ops-project-consumption.md`：Week 5-6 索引运维与项目层消费任务规划。
- `docs/inputs/知项Knowject-项目认知总结-v3.md`：最新目标蓝图输入材料，不是当前事实源。
- `../../docker/README.md`：Docker 命令入口与最小操作手册；当前拓扑和边界仍以 `docker-usage.md` 为准。
