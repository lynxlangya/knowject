# Knowject 架构事实（2026-03-10）

本文档只记录当前仓库已经落地并能被源码印证的事实，用于回答“现在是什么状态”。未来目标、路线设想和演进优先级请分别查看 `docs/target-architecture.md` 与 `docs/gap-analysis.md`。

## 1. 文档角色

- 权威级别：当前实现事实源。
- 适用范围：仓库结构、当前路由、当前数据来源、当前 API 边界、当前限制。
- 不包含内容：MongoDB、Chroma、SSE、docker-compose、JWT、真实 RAG、Skill 执行引擎等未落地能力。

## 2. 当前基线

- 仓库形态：pnpm workspace + Turborepo Monorepo。
- 前端主应用：`apps/platform`，基于 React 19、Vite 7、Ant Design 6、Tailwind CSS 4。
- 本地 API：`apps/api`，基于 Express 4 + TypeScript。
- 共享包：
  - `packages/request`：Axios 请求封装。
  - `packages/ui`：通用 UI 组件，当前已包含 `SearchPanel` 及其 helper 分层。
- 当前产品主线：登录后产品壳、项目态页面、全局资产管理页、本地演示 API。
- 当前项目态主数据流：前端本地 Mock + `localStorage`，不是后端数据库。
- 已验证基线：2026-03-10 已执行 `pnpm check-types` 与 `pnpm build` 并通过；前端构建仍有既有 chunk size warning。

## 3. 目录结构

```text
apps/
  platform/
    src/app/        鉴权、布局、导航、项目上下文
    src/api/        auth / memory 前端请求封装
    src/pages/      登录页、主页、项目页、全局资产页
  api/
    src/routes/     health / auth / memory 演示接口
    src/server.ts   Express 入口
packages/
  request/          Axios 请求能力封装
  ui/               通用 UI 组件
docs/
  architecture.md         当前事实源
  target-architecture.md  目标蓝图
  gap-analysis.md         current vs target 对照
  design/                 品牌与视觉资料
```

## 4. 前端信息架构

### 4.1 Canonical 路由

- `/login`：登录页。
- `/home`：登录后默认首页，当前承载空态引导。
- `/knowledge`：全局知识库管理页壳层。
- `/skills`：全局技能管理页壳层。
- `/agents`：全局智能体管理页壳层。
- `/members`：全局成员页占位。
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
- `knowject_projects`：项目列表及项目基础配置。

### 5.2 鉴权与登录态

- 前端通过 `apps/platform/src/api/auth.ts` 调用 `POST /api/auth/login`。
- 登录成功后会写入 token 和当前用户信息，再由受保护路由守卫控制登录后访问。
- 当前 token 只是本地演示 token，不是正式 JWT。

### 5.3 项目状态与 Mock 资产

- `apps/platform/src/app/project/ProjectContext.tsx`
  - 管理项目列表的增删改查、置顶和按 ID 查询。
- `apps/platform/src/app/project/project.storage.ts`
  - 定义默认项目与 `knowject_projects` 的读写逻辑。
- `apps/platform/src/app/project/project.catalog.ts`
  - 维护全局知识库、技能、智能体、成员基础档案等共享 Mock 目录。
- `apps/platform/src/pages/project/project.mock.ts`
  - 维护项目概览、对话、资源、成员协作快照等演示数据。

### 5.4 全局资产与项目资源分层

- 全局 `知识库 / 技能 / 智能体` 页面当前负责展示跨项目资产目录和治理壳层。
- 项目 `资源` 页当前只展示“该项目已绑定的资产”。
- 项目资源的实际来源仍是“项目配置中记录的全局资产 ID”映射而来。
- 当前不存在项目私有知识库的真实持久化或索引流程；“项目资源分层”目前是信息架构和前端数据组织上的分层。

### 5.5 成员数据分层

- 全局成员基础档案维护在 `project.catalog.ts`。
- 项目成员的职责、状态、最近动作等协作快照维护在 `project.mock.ts`。
- 成员页当前已经表达“基础身份 + 项目协作信息”的两层结构，但数据仍为前端 mock。

## 6. API 边界

### 6.1 现有接口

- `GET /api/health`
- `POST /api/auth/login`
- `GET /api/memory/overview`
- `POST /api/memory/query`

### 6.2 当前接口职责

- `health`：返回服务状态和时间戳。
- `auth/login`：校验 `username` 与 `password` 是否存在，返回演示 token 和基础用户信息。
- `memory/overview`：返回 Knowject 项目级记忆概览的演示数据。
- `memory/query`：基于本地 `DEMO_ITEMS` 做简单关键词匹配，返回演示检索结果。

### 6.3 当前鉴权约定

- `memory` 路由要求 `Authorization: Bearer <token>`。
- 服务端只校验 token 是否以 `knowject-token-` 开头。
- 当前没有用户体系、权限模型、数据库持久化和会话管理。

## 7. 模块职责

- `apps/platform`
  - 登录页、产品壳、路由、项目态页面、全局资产页壳层。
- `apps/api`
  - 本地联调与演示接口，不直接承担项目页面主数据源。
- `packages/request`
  - 请求客户端、错误封装、去重、下载能力。
- `packages/ui`
  - 通用组件与 helper，当前已包含搜索面板能力。

## 8. 当前明确未落地能力

以下能力在认知总结或目标蓝图中出现过，但当前仓库未落地，不应视为现状：

- MongoDB、Chroma 或其他正式数据存储与向量检索基础设施。
- SSE 流式对话链路与来源引用渲染。
- JWT、RBAC、成员邀请权限流。
- 文档上传、Git 仓库接入、Figma 接入、代码解析与向量化。
- 真实的 Knowledge / Skill / Agent 创建、绑定、执行与调度能力。
- 项目私有知识库持久化、全局资产复用的正式后端流程。
- docker-compose 私有化部署方案。
- Zustand、React Query 等额外状态管理层。

## 9. 相关文档

- `docs/README.md`：文档导航与维护边界。
- `docs/target-architecture.md`：目标蓝图与阶段能力。
- `docs/gap-analysis.md`：现状与目标差距、风险和建议优先级。
- `docs/知项Knowject-项目认知总结-v2.md`：目标蓝图输入材料，不是当前事实源。
