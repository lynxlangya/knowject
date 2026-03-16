# Knowject 架构事实（2026-03-16）

本文档只记录当前仓库已经落地并能被源码印证的事实，用于回答“现在是什么状态”。未来目标、路线设想和演进优先级请分别查看 `.agent/docs/roadmap/target-architecture.md` 与 `.agent/docs/roadmap/gap-analysis.md`。
截至 2026-03-11，`.agent/docs/plans/tasks-foundation-framework.md` 中定义的基础框架阶段（`BF-01` ~ `BF-10`）已经完成。

## 1. 文档角色

- 权威级别：当前实现事实源。
- 适用范围：仓库结构、当前路由、当前数据来源、当前 API 边界、当前限制。
- 不包含内容：真实 RAG、SSE、Skill 执行引擎等完整 AI 业务能力。

## 2. 当前基线

- 仓库形态：pnpm workspace + Turborepo Monorepo。
- 前端主应用：`apps/platform`，基于 React 19、Vite 7、Ant Design 6、Tailwind CSS 4。
- 本地 API：`apps/api`，基于 Express 4 + TypeScript + MongoDB Node.js Driver。
- 共享包：
  - `packages/request`：Axios 请求封装。
  - `packages/ui`：通用 UI 组件，当前已包含 `SearchPanel` 及其 helper 分层。
- 当前产品主线：登录后产品壳、项目态页面、全局资产正式管理页、工作区设置中心、基础框架 API 基线。
- 当前项目态主数据流：项目列表、项目基础信息、成员 roster、项目资源绑定与项目对话读链路来自后端 `/api/projects*`；概览补充文案与成员协作快照仍依赖前端 Mock，项目资源与概览中的知识库 / Skill / Agent 元数据已切正式 `/api/knowledge`、`/api/skills`、`/api/agents`。
- 当前默认宿主机开发拓扑：`platform + api + indexer-py`；依赖服务推荐由 Docker 提供 `mongodb + chroma`。
- 当前容器化部署拓扑：
  - 本地：`platform + api + indexer-py + mongodb + chroma`
  - 线上：`caddy + platform + api + indexer-py + mongodb + chroma`
- 当前已经交付 `compose.yml`、`compose.local.yml`、`compose.production.yml` 作为 Docker Compose 基线。
- 当前仓库已在 `apps/indexer-py` 落地可运行 Python 索引服务，负责 `md / txt` 的解析、清洗、分块、OpenAI-compatible embedding 与 `global_docs` Chroma 写入；`global_code` 仍只保留命名空间预留。
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
    src/api/        auth / projects / members / knowledge / settings 前端请求封装
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
    app/domain/indexing/pipeline.py  文档解析、清洗与分块逻辑
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
  knowject.sh       常用命令统一入口
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
.agent/
  docs/
    current/architecture.md      当前事实源
    contracts/auth-contract.md   认证与环境实施契约
    plans/doc-iteration-handoff-plan.md  本轮文档执行计划
    handoff/handoff-guide.md     快速接手指南
    handoff/handoff-prompt.md    交接 Prompt 模板
    plans/tasks-foundation-framework.md  基础框架阶段任务归档
    plans/tasks-global-assets-foundation.md  全局资产阶段任务拆分
    plans/tasks-index-ops-project-consumption.md  Week 5-6 任务拆分
    roadmap/target-architecture.md  目标蓝图
    roadmap/gap-analysis.md      current vs target 对照
    design/                      品牌与视觉资料
  gpt/
    README.md                   ChatGPT Projects 上传包说明
    PROJECT_BRIEF.md            ChatGPT Projects 首读摘要
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
- `/skills`：全局技能正式管理页，已接入 `/api/skills` 并支持自建、GitHub/URL 导入、编辑、预览、草稿/发布与删除。
- `/agents`：全局智能体正式配置页，已接入 `agents / knowledge / skills` 正式接口。
- `/members`：全局成员协作总览页，聚合当前账号可见项目中的成员信息。
- `/analytics`：全局分析页占位。
- `/settings`：工作区设置中心，已接入 embedding / LLM / indexing / workspace 配置与在线测试。
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
- `knowject_remembered_username`：登录页“记住用户名”缓存。
- `knowject_project_pins`：项目置顶偏好。

### 5.2 鉴权与登录态

- 前端通过 `apps/platform/src/api/auth.ts` 调用 `POST /api/auth/register` 与 `POST /api/auth/login`。
- `/login` 页面当前已支持同页登录 / 注册模式切换，不新增 `/register` 路由。
- `/login` 页面可选记住用户名，并通过 `knowject_remembered_username` 回填下次登录表单。
- 登录成功或注册成功后会写入 `knowject_token` 与 `knowject_auth_user`，再由受保护路由守卫控制登录后访问。
- 当前 token 已切到正式 JWT，不再使用演示 token 前缀。
- 登录 / 注册请求体中的 `password` 保持原始口令语义，由 HTTPS 负责传输保护；服务端在落库前使用 `argon2id` 做哈希。

### 5.3 API 环境与数据库基线

- `apps/api` 读取仓库根 `.env.local` / `.env`，模板文件为根目录 `/.env.example`；Docker 编排会额外注入 `KNOWLEDGE_STORAGE_ROOT=/var/lib/knowject/knowledge` 与 `KNOWLEDGE_INDEXER_URL=http://indexer-py:8001`，知识库上传单文件上限当前固定为 `50 MB`；当前正式上传链路支持 `md / markdown / txt`，界面文案统一推荐 `.md / .txt`。宿主机推荐开发流会把 `MONGODB_URI_FILE`、`JWT_SECRET_FILE` 与 `SETTINGS_ENCRYPTION_KEY_FILE` 回写到 `.env.local`，以复用 `docker/secrets/` 中的本地密钥文件。
- `apps/api` 还会读取可选 `SKILLS_STORAGE_ROOT`；未配置时默认落到 `<workspace>/.knowject-storage/skills`，用于持久化自建 / 导入 Skill 的 bundle 文件。
- 宿主机默认开发流已把 `apps/indexer-py` 纳入 workspace `pnpm dev`，因此本地 `platform + api + indexer-py` 会一并启动；若单独跑 `api`，仍需额外启动 Python indexer 才能验证知识上传闭环。
- 当前 API 已建立 MongoDB 连接管理基线，并已将用户与项目正式写模型接入 MongoDB；前端项目列表、项目基础信息与成员页当前直接消费这些正式接口。
- `knowledge` 模块当前已在 MongoDB 中冻结 `knowledge_bases`、`knowledge_documents` 与 namespace 级 `knowledge_index_namespaces` 三组元数据集合模型，并已接入知识库 CRUD、文档上传记录写入、原始文件本地落盘、Node 后台触发 Python indexer、`global_docs` Chroma 写入，以及统一知识检索 service；其中 `knowledge_bases` 当前已补齐 `scope=global|project` 与 `projectId` 作用域字段，全局列表默认只返回 global scope，项目级 `/api/projects/:projectId/knowledge*` 已开放私有知识的 `list / create / detail / upload` 路由，project scope 文档的 namespace key 仍是 `proj_{projectId}_docs`，并按 `projects/{projectId}/knowledge/...` 落盘。
- `settings` 模块当前已在 MongoDB 中落地 `workspace_settings` 单例集合，并通过 `SETTINGS_ENCRYPTION_KEY` 对 API Key 做 AES-256-GCM 加密存储；`GET /api/settings` 返回的是当前 effective config，而不是数据库原始值，`embedding / llm / indexing` 会标记 `source=database|environment`。
- `apps/indexer-py` 当前已切到 FastAPI + uv 基线，已提供 `POST /internal/v1/index/documents`、`POST /internal/v1/index/documents/{documentId}/rebuild` 与 `GET /internal/v1/index/diagnostics` 三个内部控制面入口，并开放 `/docs`、`/redoc`、`/openapi.json` 作为内部文档入口；当前仍隐藏兼容旧路径 `POST /internal/index-documents`，用于开发态 / 滚动重启期间的平滑过渡。
- 开发环境下若缺少 `OPENAI_API_KEY`，知识库上传链路会退化到 deterministic 本地 embedding，并把文档元数据标记为 `local_dev / hash-1536-dev`；Node 侧统一知识检索也会复用同一套 deterministic 本地 query embedding，保证开发环境上传 / 检索闭环可用。生产与正式环境仍以真实 OpenAI-compatible embedding 为基线。
- `GET /api/health` 会联动返回数据库状态与可选的 Chroma 心跳状态，因此服务可在依赖不可达时以 `degraded` 状态启动并提供诊断。
- 当前 Chroma 已进入正式知识索引链路：`global_docs` 与项目私有 docs 的写侧索引由 `indexer-py` 负责，Node 侧统一知识检索 service 保留读侧 query 的架构例外；collection 逻辑已经从“固定 collection 名”升级为“namespace key + versioned collection + active pointer”模式，用于处理 embedding model 切换后的维度不兼容问题。Node 会把当前 effective embedding / indexing config 透传给 Python，模型切换后不要求重启服务，而是要求先执行 namespace 级全量重建。向量删除与旧 collection 清理当前仍保留 Node 侧过渡实现，后续再完全收口到 Python 内部控制面。`global_code` 当前只有 collection 预留，没有真实数据导入。
- 根 `scripts/knowject.sh` 已收口三类常用命令包装：`dev:*`（宿主机开发 + Docker 依赖）、`host:*`（兼容宿主机命令）和 `docker:*`（本地 / 线上部署与验收）。

### 5.4 项目状态与 Mock 资产

- `apps/platform/src/app/project/ProjectContext.tsx`
  - 通过 `/api/projects` 管理项目列表的增删改查、置顶和按 ID 查询。
  - 组件初始化时会一次性清理已退役的 `knowject_projects` 与 `knowject_project_resource_bindings` 本地缓存墓碑。
  - 当前运行时 `ProjectSummary` 会把后端项目基础信息、成员 roster、后端资源绑定与本地 pin 偏好合并成页面消费模型。
- `apps/platform/src/app/project/project.storage.ts`
  - 只管理 `knowject_project_pins` 本地偏好。
- `apps/platform/src/app/project/project.catalog.ts`
  - 维护成员基础档案，以及项目创建 / 编辑表单仍在使用的演示资源选项；不再承担项目资源页的 agent 展示事实源。
- `apps/platform/src/pages/project/project.mock.ts`
  - 维护项目概览补充文案、成员协作快照，以及项目资源展示映射；知识库 / Skill / Agent 元数据优先来自正式 `/api/knowledge`、`/api/skills`、`/api/agents`，未知资源绑定会返回占位项而不是静默过滤。
- `apps/platform/src/app/layouts/components/AppSider.tsx`
  - 当前项目创建 / 编辑流程会把 `name / description / knowledgeBaseIds / skillIds / agentIds` 一并提交到后端项目模型。
- `apps/platform/src/pages/project/ProjectLayout.tsx`
  - 进入项目页时会并行拉取 `/api/projects/:projectId/conversations`、`/api/knowledge`、`/api/projects/:projectId/knowledge`、`/api/skills` 与 `/api/agents`，为概览 / 对话 / 资源三页提供正式只读数据。
- `apps/platform/src/pages/project/ProjectChatPage.tsx`
  - 对话详情通过 `/api/projects/:projectId/conversations/:conversationId` 读取；输入框当前保持禁用，消息写路径尚未落地。

### 5.5 全局资产与项目资源分层

- 全局 `知识库 / 技能 / 智能体` 页面当前负责展示跨项目资产目录和治理入口；其中 `/knowledge`、`/skills` 与 `/agents` 已切正式接口。
- 项目 `资源` 页当前同时展示“该项目已绑定的全局资产”与“归属当前项目的私有知识”。
- 项目资源的实际来源已经切到后端项目模型中的 `knowledgeBaseIds / skillIds / agentIds`。
- 其中知识库、Skill 与 Agent 分组优先消费 `/api/knowledge`、`/api/skills`、`/api/agents` 的正式元数据；`/agents` 页面与项目资源页当前消费同一份正式 agent 目录。
- 当项目或成员聚合里出现未知的 `skills / agents` 资源 ID 时，前端当前会渲染“未知资源（{id}）”占位项，而不是静默丢失。
- 兼容跳转会临时落到 `/project/:projectId/resources?focus=*`；页面完成滚动定位后会回写 canonical URL `/project/:projectId/resources`。
- `apps/platform/src/pages/knowledge/KnowledgeManagementPage.tsx` 已接正式后端知识库接口，支持知识库 CRUD、文档上传、文档级 retry / rebuild、知识库级 rebuild、diagnostics 面板、状态展示和上传后的最小轮询。
- 知识库上传链路现在会在上传入口对 multipart 文件名做 UTF-8 纠偏，避免中文文件名因浏览器 / multer 参数编码差异出现乱码。
- `apps/platform/src/pages/skills/SkillsManagementPage.tsx` 当前已作为 `/skills` 的正式管理页，支持 Skill 分组筛选、自建、GitHub/URL 导入、原生 `SKILL.md` 编辑与预览、草稿/发布，以及来源 provenance 展示。
- `apps/platform/src/pages/agents/AgentsManagementPage.tsx` 当前已作为 `/agents` 的正式配置页，支持创建、编辑、删除，以及知识库 / Skill 绑定表单。
- `apps/platform/src/pages/settings/SettingsPage.tsx` 当前已作为 `/settings` 的正式设置中心，支持 embedding / LLM / indexing / workspace 四块配置，以及 Provider 切换后的 API Key 重输与在线测试交互。
- `apps/platform/src/pages/assets/GlobalAssetManagementPage.tsx` 当前保留为历史壳层组件，未接入实际路由。
- 项目资源页的知识分组当前会并行消费 `/api/knowledge` 与 `/api/projects/:projectId/knowledge`：前者负责解析 `knowledgeBaseIds` 对应的全局绑定知识，后者负责项目私有知识目录；页面已收口为统一“接入知识库”入口，支持在项目内直接选择“引入全局知识库”或“新建项目私有知识库”。
- 项目资源页中的知识库卡片当前支持打开详情抽屉：全局绑定知识在项目中只读查看文档并允许解除绑定、跳转全局治理；项目私有知识则支持编辑、删除、上传文档、文档级 retry / rebuild / delete，以及 knowledge diagnostics / knowledge rebuild 的最小运维操作。

### 5.6 成员数据分层

- 全局成员基础档案维护在 `project.catalog.ts`。
- `/members` 当前已接入 `/api/members`，展示当前账号可见项目中的成员基础信息、项目参与关系与最小权限摘要。
- 项目成员的职责、状态、最近动作等协作快照维护在 `project.mock.ts`。
- `/project/:projectId/members` 当前已切到正式后端成员 roster 管理页。
- 页面支持按用户名 / 姓名模糊搜索已有用户，通过多选下拉框批量加入项目，并支持修改 `admin / member`、移除成员。
- 成员协作快照仍保留在 `project.mock.ts`，当前用于全局成员页与项目概览中的协作状态补充展示，不作为正式成员关系主数据源。

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
- `GET /api/projects/:projectId/conversations/:conversationId`
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
- `POST /api/settings/llm/test`
- `GET /api/memory/overview`
- `POST /api/memory/query`

### 6.2 当前接口职责

- `health`：返回应用状态、数据库状态、可选的向量存储状态和最小诊断信息。
- `auth/register`：创建用户、写入 `passwordHash`、签发 JWT 并返回登录态。
- `auth/login`：校验用户名与密码，签发 JWT 并返回登录态。
- `auth/users`：按用户名 / 姓名模糊搜索已有注册用户，供项目成员添加下拉候选使用。
- `members`：聚合当前用户可见项目中的成员基础信息、项目参与关系和最小权限摘要。
- `projects`：提供最小正式项目 CRUD，写入 MongoDB，并内嵌项目成员与 `admin / member` 角色、项目资源绑定字段，以及项目对话只读列表 / 详情接口。
- `memberships`：提供项目成员管理闭环，支持按用户名添加已有用户、修改项目级角色和移除成员。
- `knowledge`：当前已提供知识库列表 / 详情 / 创建 / 编辑 / 删除接口、文档上传入口、单文档 retry / rebuild / delete、知识库级 rebuild、`GET /api/knowledge/:knowledgeId/diagnostics` 诊断接口，以及 `POST /api/knowledge/search` 统一知识检索接口；后端已冻结知识库 / 文档元数据模型与索引，并在上传时写入文档记录、初始化 `pending` 状态、落盘原始文件，再由 Node 在后台切到 `processing` 并触发 Python indexer，最终回写 `completed / failed`，同时把成功分块写入当前 namespace 的 active Chroma collection。上传单文件上限默认 `50 MB`，当前支持 `md / markdown / txt`；`pdf` 已从前后端上传契约中移除，待 `indexer-py` 正式覆盖后再恢复。`knowledge_bases` 现在已支持 `scope=global|project` 与 `projectId` owner 字段，全局 `/api/knowledge` 列表会显式过滤掉 project scope，`/api/projects/:projectId/knowledge*` 则承载项目私有知识的 `list / create / detail / upload`；project scope 文档的 namespace key 仍为 `proj_{projectId}_docs`，物理 collection 则会带 embedding fingerprint 后缀，并按 `projects/{projectId}/knowledge/{knowledgeId}/{documentId}/{documentVersionHash}/{fileName}` 落盘。删除项目时，服务端会先级联清理该项目的 project scope knowledge、原文件目录与当前 active collection 中的 Chroma 向量，避免孤儿资产；统一检索接口在 `knowledgeId` 指向 project scope knowledge 时也会自动切到对应 namespace 的 active collection，并使用 namespace 记录的 active embedding config 生成 query embedding。若 settings 中的 embedding provider / model / baseUrl 已变化，单文档 retry / rebuild 会被显式拦截，要求先执行知识库级全量重建；知识库级 rebuild 会在指纹失配时升级为 namespace 级全量重建，写入新的 versioned collection 成功后再切换 active pointer。Node 统一知识检索 service 当前保留读侧直连 Chroma query 的架构例外；collection init 已下沉到 Python 写侧保证，向量 delete 的正式 Python 内部接口仍待补齐，因此代码里暂保留过渡期直连 delete TODO。单文档删除会尽量联动清理原始文件与 Chroma chunk；diagnostics 会按 best-effort 返回 collection / indexer 降级结果，不因下游不可达而整体失败。
- `skills`：当前已提供系统内置 Skill registry、Mongo 元数据仓储、bundle 文件存储、`SKILL.md` 解析、GitHub/URL 导入、列表 / 详情 / 创建 / 编辑 / 删除接口，以及 `draft / published` 生命周期、引用保护与 bindable 校验；项目与 Agent 当前只允许绑定系统内置或已发布的正式 Skill。其中 `search_documents` 的 handler 对齐服务端统一知识检索契约，`search_codebase / check_git_log` 当前仍是 contract-only 定义。
- `agents`：当前已提供 Agent 列表 / 详情 / 创建 / 编辑 / 删除接口，后端会校验 `boundKnowledgeIds` 与 `boundSkillIds` 的存在性，并只允许绑定系统内置或已发布的正式 Skill；`model` 当前固定由服务端写入 `server-default`。
- `settings`：当前已提供 `GET/PATCH/TEST /api/settings/*`，支持工作区 embedding / LLM / indexing / workspace 配置、服务端加密存储 API Key、effective config 读取层，以及对知识检索 / 索引链路的热生效配置透传。本期访问控制固定为“所有已登录用户可访问”。
- `memory/overview`：返回 Knowject 项目级记忆概览的演示数据。
- `memory/query`：基于本地 `DEMO_ITEMS` 做简单关键词匹配，返回演示检索结果。

### 6.3 当前鉴权约定

- `auth/users`、`projects`、`memberships`、`knowledge`、`skills`、`agents`、`settings` 与 `memory` 路由要求 `Authorization: Bearer <token>`。
- 服务端当前通过 JWT 中间件校验 `iss / aud / exp / sub / username`。
- 当前所有 JSON API 响应统一为 `code / message / data / meta`。
- 成功响应中，`HTTP 200` 默认映射为 `SUCCESS / 请求成功`，`HTTP 201` 默认映射为 `CREATED / 创建成功`。
- 失败响应统一返回 `data: null`，并继续沿用现有业务错误码；`meta` 当前固定包含 `requestId` 与 `timestamp`，仅在 `API_ERROR_EXPOSE_DETAILS=true` 时才返回 `meta.details`。
- `DELETE /api/projects/:projectId` 与 `DELETE /api/knowledge/:knowledgeId` 当前已从 `204 No Content` 调整为 `HTTP 200 + data:null`，以保持 envelope 一致性。
- 前端通过 `apps/platform/src/api/*` 在 API 层统一解包 `data`，页面层继续消费业务数据，不直接感知 envelope。
- 当前已具备正式用户体系、`argon2id` 密码哈希、JWT、最小项目权限模型和成员管理接口。
- 生产环境下，`/api/auth/*`、`/api/settings/*` 与 `/api/memory/*` 会拒绝非 HTTPS 请求，并返回 `SECURE_TRANSPORT_REQUIRED`。
- `auth`、`settings` 与 `memory` 响应默认附带 `Cache-Control: no-store`，避免敏感响应被缓存。
- 当前前端项目列表、项目基础信息、成员 roster、项目资源绑定与项目对话列表 / 详情已切到 `/api/projects*`；会话消息写入、来源引用与检索融合仍未落地。

## 7. 模块职责

- `apps/platform`
  - 登录页、产品壳、路由、项目态页面，以及已正式接线的 `/knowledge`、`/skills`、`/agents`、`/settings` 页面。
- `apps/api`
  - 本地联调与基础框架接口，当前已承担项目列表、项目基础信息与成员 roster 的正式主数据源。
  - 已具备 `config / db / middleware / modules` 基础骨架。
  - `src/lib` 当前承载 `request-auth`、`crypto` 与 `validation` 等跨模块复用 helper。
  - `modules/auth` 当前已承载用户模型、密码哈希、JWT、中间件和注册 / 登录接口。
  - `modules/members` 当前已承载全局成员聚合只读接口。
  - `modules/projects` 当前已承载项目模型、MongoDB 仓储、资源绑定字段、项目对话只读接口、权限校验与 CRUD 接口。
  - `modules/memberships` 当前已承载项目成员增删改接口与最小角色规则。
- `modules/knowledge` 已落地 GA-06 元数据模型、集合索引、CRUD、文档上传入口、单文档 retry / rebuild / delete、知识库级 rebuild、Node -> Python 的解析 / 分块 / embedding / Chroma 写入闭环、knowledge diagnostics，以及 Node 侧统一知识检索逻辑；当前也已补齐 `scope / projectId` 的 owner 模型、namespace 级 active collection 状态与项目成员可见性基线。
  - `modules/settings` 已完成 `workspace_settings` 单例仓储、`/api/settings/*` 路由、AI API Key 加密存储、effective config 读取层与在线测试逻辑。
  - `modules/skills` 已完成 GA-09 Skill 资产治理闭环：系统内置 registry、Mongo 元数据、bundle 存储、GitHub/URL 导入、草稿/发布与正式 CRUD；`modules/agents` 已完成 GA-10 Mongo 正式模型、CRUD 与绑定校验。
  - 当前统一知识检索 service 已落地在 `knowledge` 模块，供后续 Skill / 对话链路复用。
- `apps/indexer-py`
  - 当前已落地 FastAPI 内部索引控制面、`md / txt` 解析、清洗、`1000 字符 / 200 重叠` 分块、OpenAI-compatible embedding、`global_docs` Chroma 写入 / 删除逻辑，以及单文档 rebuild 与 diagnostics 内部入口。
  - 当前明确不做 `global_code` 真实导入、知识库级 rebuild 内部入口和统一检索读侧。
- `packages/request`
  - 请求客户端、错误封装、去重、下载能力。
- `packages/ui`
  - 通用组件与 helper，当前已包含搜索面板能力。

## 8. 当前明确未落地能力

以下能力在认知总结或目标蓝图中出现过，但当前仓库未落地，不应视为现状：

- 项目资源页内的知识原文预览 / 下载能力，以及全局绑定知识的项目内编辑能力。
- `global_code` 的真实 Git 导入、切分和索引写入。
- 系统级索引运维链路、知识库级批量内部入口，以及 Python delete 控制面正式化。
- 项目对话消息写入、SSE 流式输出与来源引用渲染。
- RBAC、成员邀请权限流、refresh token。
- Git 仓库接入、Figma 接入、代码解析与向量化。
- Skill / Agent 的执行与调度能力；当前 Knowledge 已完成后端 CRUD、上传入口、Chroma 写入与统一检索，`/skills` 与 `/agents` 也已完成正式管理页与后端治理 / CRUD，但尚未进入项目对话运行时。
- Zustand、React Query 等额外状态管理层。

## 9. 相关文档

- `.agent/docs/README.md`：文档索引、分类导航与维护边界。
- `../../../files/README.md`：知识库模板总导航与推荐使用顺序。
- `.agent/docs/current/docker-usage.md`：Docker 当前拓扑、安全策略与部署边界。
- `.agent/docs/handoff/chatgpt-project-brief.md`：给 ChatGPT / 外部大模型的最小项目说明。
- `.agent/docs/contracts/chroma-decision.md`：Chroma 的角色定位、collection 命名与检索层边界说明。
- `.agent/docs/handoff/handoff-guide.md`：新协作者快速建立当前事实的入口。
- `.agent/docs/handoff/handoff-prompt.md`：把当前上下文继续交给下一位协作者的模板。
- `.agent/docs/roadmap/target-architecture.md`：目标蓝图与阶段能力。
- `.agent/docs/roadmap/gap-analysis.md`：现状与目标差距、风险和建议优先级。
- `.agent/docs/plans/tasks-index-ops-project-consumption.md`：Week 5-6 索引运维与项目层消费任务规划。
- `.agent/docs/inputs/知项Knowject-项目认知总结-v3.md`：最新目标蓝图输入材料，不是当前事实源。
- `../../../docker/README.md`：Docker 本地 / 线上操作手册。
