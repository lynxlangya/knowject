# 基础框架开发任务（Week 1-2）

## 目标

把 `docs/知项Knowject-项目认知总结-v2.md` 中的 `Week 1-2 基础框架` 收敛为一份可直接拆票执行的任务清单，但严格以当前仓库事实为修正输入。  
本阶段的本质不是“重新初始化前后端”，而是在现有前端壳层和演示 API 的基础上，补齐真正进入产品开发所需的认证、项目主数据、项目成员关系和运行约定。

## 当前事实基线

- 真相源文件：
  - `docs/architecture.md`
  - `docs/target-architecture.md`
  - `apps/platform/src/app/navigation/routes.tsx`
  - `apps/platform/src/app/layouts/components/AppSider.tsx`
  - `apps/platform/src/pages/login/LoginPage.tsx`
  - `apps/api/src/server.ts`
  - `apps/api/src/routes/auth.ts`
  - `apps/api/src/routes/memory.ts`
- 当前已存在：
  - 前端 Monorepo、登录页、登录后产品壳、项目侧栏、项目页 canonical 路由。
  - `apps/api` 演示服务和 `health / auth / memory` 三组接口。
  - 前端项目列表创建 / 编辑 / 删除 / 置顶交互，但数据来自 `localStorage + Mock`。
- 当前明确未完成：
  - 用户注册、真实 JWT 鉴权、正式后端用户体系。
  - 项目正式持久化、项目成员关系、项目级角色模型。
  - MongoDB 接入与运行环境契约。
- 当前不应重复立项：
  - 前端初始化、Monorepo 初始化、全局资产系统、RAG / Skill / Agent、SSE 对话链路。
- 当前需要显式处理的结构冲突：
  - `ProjectSummary` 仍混合了项目主数据、资产绑定字段和前端展示偏好字段。
  - 项目成员页当前使用 `owner / product / design / frontend / backend / marketing` 这类展示型 mock 角色，不是基础框架阶段的正式权限模型。

## 基础框架完成定义

- 后端具备正式的 `auth / projects / memberships / config` 四个边界清晰的基础模块。
- 服务端完成 MongoDB 结构化存储基线，`GET /api/health` 能反映应用与数据库可用状态。
- 认证层具备注册、登录、JWT 校验中间件和统一错误返回。
- 项目层具备项目 CRUD 和项目级成员管理，角色只支持 `admin / member`。
- 前端 `/login` 页面支持同页登录 / 注册切换，不新增 `/register` 路由。
- 前端项目列表与项目基础信息不再以 `knowject_projects` 作为主数据源；主数据改由后端 API 提供。
- 基础框架阶段的环境变量、接口样例、`docker-compose` 服务拓扑规划和阶段 DoD 有文档沉淀。

## 明确不做

- 全局知识库上传、Git 仓库接入、Chroma、RAG、Skill 执行、Agent 编排。
- SSE 流式对话链路与来源引用。
- 邀请链接、邮件通知、外部 OAuth、密码找回。
- 分析看板、Figma 接入、MCP、Electron。
- 可运行的 `docker-compose` 编排文件本体。
- 更复杂的全局 RBAC 或组织级权限模型。

## 计划接口与数据边界

### 认证边界

- 基础框架阶段新增最小认证接口集合：
  - `POST /api/auth/register`
  - `POST /api/auth/login`
- 契约统一：
  - `register` 请求体：`{ username, password, name }`
  - `login` 请求体：`{ username, password }`
  - 两个接口成功响应统一为：`{ token, user: { id, username, name } }`
  - `register` 成功后直接返回登录态，不额外设计“注册成功后再登录”的分叉流程。
- 错误语义统一：
  - 参数错误：`400`
  - 用户名重复：`409`
  - 用户不存在或密码错误：`401`
- 前端入口约定：
  - 继续使用 `/login` 作为唯一认证入口。
  - 登录 / 注册通过同页模式切换完成，不新增独立 `/register` 路由。
  - token 继续存 `knowject_token`，用户信息继续存 `knowject_auth_user`。

### 持久化与运行边界

- 基础框架阶段的正式后端主线只引入 MongoDB 作为结构化存储。
- MongoDB 连接层采用官方驱动方案，避免在基础框架阶段引入额外 ORM / ODM 抽象。
- 本阶段需要明确的环境变量：
  - `PORT`
  - `MONGODB_URI`
  - `JWT_SECRET`
  - `JWT_EXPIRES_IN`
  - `CORS_ORIGIN`
- `GET /api/health` 在本阶段扩展为：
  - 应用进程状态
  - 数据库连接状态
  - 当前环境的最小诊断信息

### 项目与成员边界

- 基础框架阶段的正式项目模型只承载：
  - `id`
  - `name`
  - `description`
  - `ownerId`
  - `members[]`
  - `createdAt`
  - `updatedAt`
- 项目成员关系直接内嵌在项目文档内，不单独拆成员关系集合。
- 正式权限模型只定义项目级：
  - `admin`
  - `member`
- 项目创建者自动成为第一个 `admin`。
- 当前成员页里的 `owner / product / design / frontend / backend / marketing` 继续视为展示型 mock，不进入本阶段正式后端权限模型。

### 项目接口边界

- 基础框架阶段新增最小项目接口集合：
  - `GET /api/projects`
  - `POST /api/projects`
  - `PATCH /api/projects/:projectId`
  - `DELETE /api/projects/:projectId`
- 权限约定：
  - 所有项目接口都要求登录。
  - `GET /api/projects` 只返回当前用户参与的项目。
  - `POST /api/projects` 允许已登录用户创建项目。
  - `PATCH /api/projects/:projectId` 和 `DELETE /api/projects/:projectId` 只允许项目级 `admin`。
- 前端兼容策略：
  - `isPinned` 继续作为前端本地展示偏好，不进入基础框架阶段的正式后端项目模型。
  - `knowledgeBaseIds / skillIds / agentIds` 不纳入本阶段正式项目写模型。
  - 前端若仍需兼容当前 `ProjectSummary` 形状，应在前端适配层补空数组，而不是把这些字段塞回后端模型。

### 项目成员接口边界

- 基础框架阶段新增最小项目成员接口集合：
  - `POST /api/projects/:projectId/members`
  - `PATCH /api/projects/:projectId/members/:userId`
  - `DELETE /api/projects/:projectId/members/:userId`
- 约定：
  - 新增成员请求体：`{ username, role }`
  - 角色修改请求体：`{ role }`
  - 新增成员只允许已注册用户加入项目，不设计邀请 token 或邮件链路。
  - 成员管理操作只允许项目级 `admin` 执行。

### 前端收口边界

- `AppSider` 中的项目创建 / 编辑表单在本阶段必须收敛到项目基础信息：
  - 保留：项目名称、项目说明
  - 移出本阶段正式写路径：知识库、技能、智能体绑定字段
- 成员管理不继续塞在项目创建弹框中，而是迁移到 `/project/:projectId/members` 页面下的最小管理入口。
- `/project/:projectId/members` 路由继续保留，但本阶段只要求最小成员 roster 管理视图：
  - 显示成员用户名 / 名称
  - 显示项目级角色 `admin / member`
  - 支持添加、改角色、移除
- `/project/:projectId/overview`、`/chat`、`/resources` 的页面路由与壳层保留；除项目基础信息外，其余内容在本阶段可继续使用 mock。

## 任务拆解

### BF-01 DONE（2026-03-10）· 后端基础骨架收口

- 目标：把 `apps/api` 从演示接口入口收口成可承载正式开发的基础服务骨架。
- 输出：
  - 明确 `auth / projects / memberships / config` 四个边界。
  - 统一路由挂载、错误处理中间件、配置读取入口。
  - 为后续 MongoDB 和 JWT 接入预留清晰目录和模块位置。
- 依赖：无。
- 已完成记录：
  - 已新增 `src/app/create-app.ts`、`src/config/env.ts`、`src/middleware/*`、`src/modules/auth|projects|memberships/*`。
  - `auth` 登录接口已迁移到 `modules/auth`；`projects` 与 `memberships` 已建立模块边界占位。
- 验收：
  - 继续能从单一 `server.ts` 启动服务。
  - 新增模块边界后，不再把认证、项目和配置逻辑混在演示路由里。

### BF-02 DONE（2026-03-10）· MongoDB 基线

- 目标：为基础框架阶段建立唯一正式结构化存储基线。
- 输出：
  - MongoDB 连接层。
  - 环境变量读取和校验。
  - `GET /api/health` 对数据库状态的联动。
  - 本地开发环境对 MongoDB 的运行约定。
- 依赖：`BF-01`。
- 已完成记录：
  - 已接入 `mongodb` 官方驱动和根目录 `/.env.example` 契约。
  - 已新增 `src/db/mongo.ts`，并让 `GET /api/health` 返回应用状态、数据库状态和最小诊断信息。
  - 已验证数据库不可达时服务仍可启动，health 返回 `degraded`。
- 验收：
  - 应用能在有 / 无数据库连接两种状态下给出明确诊断。
  - MongoDB 成为后续用户和项目数据的唯一正式存储入口。

### BF-03 DONE（2026-03-10）· Auth 领域模型

- 目标：落地最小用户模型、密码存储和 JWT 校验能力。
- 输出：
  - 用户集合模型：`username / name / passwordHash / createdAt / updatedAt`。
  - 密码哈希与校验逻辑。
  - JWT 签发与鉴权中间件。
  - 认证上下文注入方式，供后续项目接口复用。
- 依赖：`BF-02`。
- 已完成记录：
  - 已新增 `users` 集合模型、`username` 唯一索引和 `argon2id` 哈希 / 校验逻辑。
  - 已新增 JWT 签发、解析与 `requireAuth` 中间件。
  - `memory` 路由已切到正式 JWT 鉴权，而不是演示 token 前缀。
- 验收：
  - 用户名唯一。
  - 服务端能从 JWT 中稳定解析出当前用户身份。
  - 后续项目接口不再依赖演示 token 前缀判断。

### BF-04 DONE（2026-03-10）· Auth API

- 目标：让注册 / 登录成为可直接被前端调用的正式接口。
- 输出：
  - `POST /api/auth/register`
  - `POST /api/auth/login`
  - 统一错误返回和状态码约定。
- 依赖：`BF-03`。
- 已完成记录：
  - 已落地 `POST /api/auth/register` 与 `POST /api/auth/login`。
  - 已落地 `400 / 401 / 409 / 500` 的统一错误语义与 envelope。
  - 已验证注册成功、重复用户名、登录成功、错误密码四类核心场景。
- 验收：
  - 注册成功返回统一登录态契约。
  - 登录成功返回统一登录态契约。
  - 重复用户名、错误密码、非法参数都有确定的返回语义。

### BF-05 DONE（2026-03-10）· 前端认证接入

- 目标：复用现有 `/login` 页面，接入注册 / 登录双模式和正式 JWT 契约。
- 输出：
  - `/login` 页面的登录 / 注册模式切换。
  - 对应的前端 auth API 封装。
  - 登录成功、注册成功后的统一存储与跳转流程。
- 依赖：`BF-04`。
- 已完成记录：
  - `/login` 已支持登录 / 注册双模式切换，不新增 `/register` 路由。
  - 登录成功与注册成功都已写入 `knowject_token`、`knowject_auth_user` 并跳转 `/home`。
  - 401 自动回跳、`RequireAuth` 本地状态校验、`记住用户名` 文案已同步收口。
- 验收：
  - 不新增 `/register` 路由。
  - 登录和注册都能落到现有登录后壳层。
  - 现有 `knowject_token`、`knowject_auth_user` 存储策略继续可用。

### BF-06 TODO · Project 领域模型

- 目标：建立基础框架阶段最小可用的正式项目模型。
- 输出：
  - 项目集合模型。
  - 项目内嵌成员结构。
  - 项目级 `admin / member` 权限规则。
  - 当前用户参与项目的查询规则。
- 依赖：`BF-03`。
- 验收：
  - 项目创建者自动成为 `admin`。
  - 后端项目模型不再混入 `isPinned`、资产绑定数组和展示型协作角色。
  - 项目权限边界可支撑 CRUD 和成员管理。

### BF-07 TODO · Project CRUD API

- 目标：让项目列表和项目基础信息具备正式后端读写能力。
- 输出：
  - `GET /api/projects`
  - `POST /api/projects`
  - `PATCH /api/projects/:projectId`
  - `DELETE /api/projects/:projectId`
  - 面向前端的项目响应适配约定。
- 依赖：`BF-06`。
- 验收：
  - 当前用户只能看到自己参与的项目。
  - 项目级 `admin` 能更新 / 删除项目。
  - 前端可基于接口结果恢复当前侧栏项目列表能力。

### BF-08 TODO · 既有用户加入项目

- 目标：完成“已有注册用户加入项目并分配 `admin / member` 角色”的最小闭环。
- 输出：
  - `POST /api/projects/:projectId/members`
  - `PATCH /api/projects/:projectId/members/:userId`
  - `DELETE /api/projects/:projectId/members/:userId`
  - `/project/:projectId/members` 页面的最小成员管理入口。
- 依赖：`BF-06`、`BF-07`。
- 验收：
  - 项目级 `admin` 可以按用户名添加已有用户。
  - 项目级 `admin` 可以修改角色、移除成员。
  - 不引入邀请 token、邀请邮件或外部通知链路。

### BF-09 TODO · 前端项目数据源切换

- 目标：把项目主数据从 `localStorage + Mock` 切换到正式后端 API，同时保住现有 canonical 路由和产品壳层。
- 输出：
  - `ProjectContext` 从本地主数据源切到 API 驱动。
  - `isPinned` 从项目实体中拆出，保留为前端本地偏好。
  - 项目创建 / 编辑弹框收敛为项目基础信息表单。
  - 项目成员页切到最小 roster 管理视图。
- 依赖：`BF-05`、`BF-07`、`BF-08`。
- 验收：
  - `knowject_projects` 不再作为项目主数据源。
  - 创建 / 编辑项目不再把知识库、技能、智能体绑定字段写入后端。
  - 现有 `/home` 与 `/project/:projectId/*` 路由体系保持不变。

### BF-10 TODO · 基础文档与运行约定

- 目标：把基础框架阶段真正需要的运行契约和交付标准写清楚。
- 输出：
  - 环境变量清单。
  - 注册 / 登录 / 项目 / 成员接口样例。
  - 基础框架阶段 DoD。
  - `docker-compose` 服务拓扑规划稿。
- 依赖：`BF-02`、`BF-04`、`BF-07`、`BF-08`。
- 验收：
  - 文档明确 `docker-compose` 只做规划，不是本阶段可运行交付。
  - 文档明确本阶段最小服务拓扑为 `api + mongodb`。
  - 后续开发者只看文档即可搭起基础框架阶段的本地开发前置条件。

## 周节奏建议

### Week 1

- 聚焦 `BF-01` 到 `BF-04`。
- 目标：
  - 收口后端骨架。
  - 建好 MongoDB 基线。
  - 完成用户模型、JWT 校验和注册 / 登录接口。
- 周末验收：
  - 后端已经不再停留在纯演示 `auth`。
  - 前端可以开始接正式认证接口，不再依赖演示 token 语义。

### Week 2

- 聚焦 `BF-05` 到 `BF-10`。
- 目标：
  - 前端认证接入。
  - 项目模型、项目 CRUD、项目成员管理落地。
  - 项目主数据切到后端。
  - 文档、环境变量和运行约定补齐。
- 周末验收：
  - 现有产品壳已经能用真实登录态和真实项目主数据工作。
  - 后续全局资产、RAG、Skill、Agent 能基于这套基础继续叠加。

## 主要风险与阻塞

- 当前成员页的 rich mock 协作卡片与基础框架阶段的 `admin / member` 权限模型并不一致。
  - 处理方式：本阶段先切到最小 roster 管理视图，把 rich 协作快照留到后续阶段恢复。
- 当前项目创建弹框包含知识库、技能、智能体和成员字段，超出了基础框架正式后端范围。
  - 处理方式：本阶段只保留项目基础信息，成员管理迁到成员页，资产绑定明确延后。
- 当前 `ProjectSummary` 同时承担项目实体、展示偏好和资产绑定字段。
  - 处理方式：前端切 API 时同步拆分实体数据与本地 UI 偏好。
- 当前没有一键本地基础设施编排。
  - 处理方式：本阶段先把 `api + mongodb` 的服务拓扑和环境契约写清楚，不把 `docker-compose` 本体作为阻塞项。
- JWT、MongoDB 和前端现有壳层切换会带来一次集中联调成本。
  - 处理方式：严格按 `BF-01` 到 `BF-10` 的依赖顺序推进，不并发启动资产系统和对话系统。
