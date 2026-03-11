# Knowject 架构事实（2026-03-11）

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
- 当前产品主线：登录后产品壳、项目态页面、全局资产管理页、基础框架 API 基线。
- 当前项目态主数据流：项目列表、项目基础信息与成员 roster 来自后端 `/api/projects*`；概览 / 对话 / 资源仍部分依赖前端 Mock 与本地绑定数据。
- 当前最小宿主机开发拓扑：`platform + api + mongodb`。
- 当前容器化部署拓扑：
  - 本地：`platform + api + mongodb + chroma`
  - 线上：`caddy + platform + api + mongodb + chroma`
- 当前已经交付 `compose.yml`、`compose.local.yml`、`compose.production.yml` 作为 Docker Compose 基线。
- Docker 网络边界当前采用：公共基线里的 `app / data` 为 `internal`，`compose.local.yml` 额外挂载本地专用 `publish` 网络给 `api / mongo / chroma`，用于宿主机端口发布；生产编排不复用该网络。
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
    src/api/        auth / projects / members / memory 前端请求封装
    src/pages/      登录页、主页、成员页、项目页、全局资产页
  api/
    src/app/        Express 应用组装
    src/config/     环境变量加载与校验
    src/db/         MongoDB 连接与健康快照
    src/modules/    auth / members / projects / memberships 模块边界
    src/routes/     health / memory 当前接口
    src/middleware/ 请求上下文、404、统一错误处理
    src/server.ts   启动入口
packages/
  request/          Axios 请求能力封装
  ui/               通用 UI 组件
docker/
  api/              API 镜像构建与启动脚本
  platform/         前端镜像构建与 Nginx 反向代理配置
  mongo/init/       MongoDB 初始化脚本
  caddy/            线上 HTTPS 入口配置
  scripts/          本地 secrets 生成脚本
scripts/
  knowject.sh       常用命令统一入口
.agent/
  docs/
    current/architecture.md      当前事实源
    contracts/auth-contract.md   认证与环境实施契约
    plans/doc-iteration-handoff-plan.md  本轮文档执行计划
    handoff/handoff-guide.md     快速接手指南
    handoff/handoff-prompt.md    交接 Prompt 模板
    plans/tasks-foundation-framework.md  基础框架阶段任务归档
    plans/tasks-global-assets-foundation.md  全局资产阶段任务拆分
    roadmap/target-architecture.md  目标蓝图
    roadmap/gap-analysis.md      current vs target 对照
    design/                      品牌与视觉资料
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
- `/knowledge`：全局知识库管理页壳层。
- `/skills`：全局技能管理页壳层。
- `/agents`：全局智能体管理页壳层。
- `/members`：全局成员协作总览页，聚合当前账号可见项目中的成员信息。
- `/analytics`：全局分析页占位。
- `/settings`：全局设置页占位。
- `/project/:projectId/overview`：项目概览页。
- `/project/:projectId/chat`：项目对话页。
- `/project/:projectId/chat/:chatId`：项目对话详情页。
- `/project/:projectId/resources`：项目资源页。
- `/project/:projectId/members`：项目成员页。

### 4.2 兼容与重定向

- `/` 重定向到 `/home`。
- `/workspace` 重定向到 `/home`。
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
- `knowject_project_resource_bindings`：项目资源绑定。
- `knowject_projects`：历史本地 Mock 项目缓存键，当前仅作为一次性迁移源，不再作为项目主数据源。

### 5.2 鉴权与登录态

- 前端通过 `apps/platform/src/api/auth.ts` 调用 `POST /api/auth/register` 与 `POST /api/auth/login`。
- `/login` 页面当前已支持同页登录 / 注册模式切换，不新增 `/register` 路由。
- `/login` 页面可选记住用户名，并通过 `knowject_remembered_username` 回填下次登录表单。
- 登录成功或注册成功后会写入 `knowject_token` 与 `knowject_auth_user`，再由受保护路由守卫控制登录后访问。
- 当前 token 已切到正式 JWT，不再使用演示 token 前缀。
- 登录 / 注册请求体中的 `password` 保持原始口令语义，由 HTTPS 负责传输保护；服务端在落库前使用 `argon2id` 做哈希。

### 5.3 API 环境与数据库基线

- `apps/api` 读取仓库根 `.env.local` / `.env`，模板文件为根目录 `/.env.example`。
- 当前 API 已建立 MongoDB 连接管理基线，并已将用户与项目正式写模型接入 MongoDB；前端项目列表、项目基础信息与成员页当前直接消费这些正式接口。
- `GET /api/health` 会联动返回数据库状态与可选的 Chroma 心跳状态，因此服务可在依赖不可达时以 `degraded` 状态启动并提供诊断。
- 根 `scripts/knowject.sh` 已收口三类常用命令包装：`dev:*`（宿主机开发 + Docker 依赖）、`host:*`（兼容宿主机命令）和 `docker:*`（本地 / 线上部署与验收）。

### 5.4 项目状态与 Mock 资产

- `apps/platform/src/app/project/ProjectContext.tsx`
  - 通过 `/api/projects` 管理项目列表的增删改查、置顶和按 ID 查询。
- `apps/platform/src/app/project/project.storage.ts`
  - 管理 `knowject_project_pins` 与 `knowject_project_resource_bindings` 两类前端本地状态。
  - 在首次刷新时会读取旧 `knowject_projects`，把历史本地项目迁移到后端项目主链路，并补写 pin / 资源绑定。
  - 当前运行时 `ProjectSummary` 会把后端项目基础信息、成员 roster、本地 pin 偏好与资源绑定做前端只读合并。
- `apps/platform/src/app/project/project.catalog.ts`
  - 维护全局知识库、技能、智能体、成员基础档案等共享 Mock 目录。
- `apps/platform/src/pages/project/project.mock.ts`
  - 维护项目概览、对话、资源、成员协作快照等演示数据。
- `apps/platform/src/app/layouts/components/AppSider.tsx`
  - 当前项目创建 / 编辑流程提交 `name / description` 到后端，并继续维护本地知识库 / 技能 / 智能体绑定。

### 5.5 全局资产与项目资源分层

- 全局 `知识库 / 技能 / 智能体` 页面当前负责展示跨项目资产目录和治理壳层。
- 项目 `资源` 页当前只展示“该项目已绑定的资产”。
- 项目资源的实际来源仍是“前端本地资源绑定中记录的全局资产 ID”映射而来。
- 兼容跳转会临时落到 `/project/:projectId/resources?focus=*`；页面完成滚动定位后会回写 canonical URL `/project/:projectId/resources`。
- `apps/platform/src/pages/assets/GlobalAssetManagementPage.tsx` 中的“新建资产 / 引入到项目”仍为占位交互，只提示后续接入，不产生真实状态变更。
- 当前不存在项目私有知识库的真实持久化或索引流程；“项目资源分层”目前是信息架构和前端数据组织上的分层。

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
- `PATCH /api/projects/:projectId`
- `DELETE /api/projects/:projectId`
- `POST /api/projects/:projectId/members`
- `PATCH /api/projects/:projectId/members/:userId`
- `DELETE /api/projects/:projectId/members/:userId`
- `GET /api/memory/overview`
- `POST /api/memory/query`

### 6.2 当前接口职责

- `health`：返回应用状态、数据库状态、可选的向量存储状态和最小诊断信息。
- `auth/register`：创建用户、写入 `passwordHash`、签发 JWT 并返回登录态。
- `auth/login`：校验用户名与密码，签发 JWT 并返回登录态。
- `auth/users`：按用户名 / 姓名模糊搜索已有注册用户，供项目成员添加下拉候选使用。
- `members`：聚合当前用户可见项目中的成员基础信息、项目参与关系和最小权限摘要。
- `projects`：提供最小正式项目 CRUD，写入 MongoDB，并内嵌项目成员与 `admin / member` 角色。
- `memberships`：提供项目成员管理闭环，支持按用户名添加已有用户、修改项目级角色和移除成员。
- `memory/overview`：返回 Knowject 项目级记忆概览的演示数据。
- `memory/query`：基于本地 `DEMO_ITEMS` 做简单关键词匹配，返回演示检索结果。

### 6.3 当前鉴权约定

- `auth/users`、`projects`、`memberships` 与 `memory` 路由要求 `Authorization: Bearer <token>`。
- 服务端当前通过 JWT 中间件校验 `iss / aud / exp / sub / username`。
- 当前 API 已接入统一错误处理中间件，失败响应包含 `error` 与 `meta.requestId`。
- 当前已具备正式用户体系、`argon2id` 密码哈希、JWT、最小项目权限模型和成员管理接口。
- 生产环境下，`/api/auth/*` 与 `/api/memory/*` 会拒绝非 HTTPS 请求，并返回 `SECURE_TRANSPORT_REQUIRED`。
- `auth` 与 `memory` 响应默认附带 `Cache-Control: no-store`，避免敏感响应被缓存。
- 当前前端项目列表、项目基础信息与成员 roster 已切到 `/api/projects*`；会话刷新与资源绑定正式持久化仍未落地。

## 7. 模块职责

- `apps/platform`
  - 登录页、产品壳、路由、项目态页面、全局资产页壳层。
- `apps/api`
  - 本地联调与基础框架接口，当前已承担项目列表、项目基础信息与成员 roster 的正式主数据源。
  - 已具备 `config / db / middleware / modules` 基础骨架。
  - `modules/auth` 当前已承载用户模型、密码哈希、JWT、中间件和注册 / 登录接口。
  - `modules/members` 当前已承载全局成员聚合只读接口。
  - `modules/projects` 当前已承载项目模型、MongoDB 仓储、权限校验与 CRUD 接口。
  - `modules/memberships` 当前已承载项目成员增删改接口与最小角色规则。
- `packages/request`
  - 请求客户端、错误封装、去重、下载能力。
- `packages/ui`
  - 通用组件与 helper，当前已包含搜索面板能力。

## 8. 当前明确未落地能力

以下能力在认知总结或目标蓝图中出现过，但当前仓库未落地，不应视为现状：

- 基于 Chroma 的正式向量写入、检索与知识服务业务链路。
- SSE 流式对话链路与来源引用渲染。
- RBAC、成员邀请权限流、refresh token。
- 文档上传、Git 仓库接入、Figma 接入、代码解析与向量化。
- 真实的 Knowledge / Skill / Agent 创建、绑定、执行与调度能力。
- 项目私有知识库持久化、全局资产复用的正式后端流程。
- Zustand、React Query 等额外状态管理层。

## 9. 相关文档

- `.agent/docs/README.md`：文档索引、分类导航与维护边界。
- `.agent/docs/current/docker-usage.md`：Docker 当前拓扑、安全策略与部署边界。
- `.agent/docs/handoff/chatgpt-project-brief.md`：给 ChatGPT / 外部大模型的最小项目说明。
- `.agent/docs/contracts/chroma-decision.md`：Chroma 的角色定位、collection 命名与检索层边界说明。
- `.agent/docs/handoff/handoff-guide.md`：新协作者快速建立当前事实的入口。
- `.agent/docs/handoff/handoff-prompt.md`：把当前上下文继续交给下一位协作者的模板。
- `.agent/docs/roadmap/target-architecture.md`：目标蓝图与阶段能力。
- `.agent/docs/roadmap/gap-analysis.md`：现状与目标差距、风险和建议优先级。
- `.agent/docs/inputs/知项Knowject-项目认知总结-v2.md`：目标蓝图输入材料，不是当前事实源。
- `../../../docker/README.md`：Docker 本地 / 线上操作手册。
