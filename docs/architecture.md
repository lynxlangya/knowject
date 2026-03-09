# Knowject 架构事实（2026-03-09）

本文档记录当前仓库中已经落地的结构、路由、数据来源与兼容策略。若代码与其他说明不一致，以这里和对应源码为准。

## 1. 总览

- Knowject 采用 Monorepo 结构，当前由 `apps/platform`、`apps/api`、`packages/request`、`packages/ui` 四个主要工作区组成。
- `apps/platform` 是当前产品壳与交互主入口，但项目态内容仍主要依赖前端本地 Mock 数据与 `localStorage`。
- `apps/api` 提供本地联调与演示接口，重点覆盖健康检查、登录和项目记忆查询，不承担项目页的实时数据源职责。

## 2. 目录结构

```text
apps/
  platform/
    src/app/        路由、布局、鉴权、项目状态
    src/api/        前端 API 封装
    src/pages/      登录页、主页、项目态页面、全局资产页
  api/
    src/routes/     health / auth / memory 路由
    src/server.ts   Express 入口
packages/
  request/          Axios 请求封装
  ui/               通用 UI 组件
docs/
  architecture.md   当前架构事实源
  design/           品牌与视觉资料
```

## 3. 前端运行模型

### 3.1 路由矩阵

- `/login`：登录页。
- `/home`：登录后的默认首页，当前只承载空态引导。
- `/project/:projectId/overview`：项目概览页。
- `/project/:projectId/chat`：项目对话页。
- `/project/:projectId/chat/:chatId`：项目对话详情页。
- `/project/:projectId/resources`：项目资源页，只展示项目已接入的全局资产。
- `/project/:projectId/members`：项目成员页。
- `/knowledge`、`/skills`、`/agents`：全局资产管理页。
- `/members`、`/analytics`、`/settings`：全局占位页。

### 3.2 兼容与重定向

- `/` 重定向到 `/home`。
- `/workspace` 重定向到 `/home`。
- `/project/:projectId` 重定向到 `/project/:projectId/overview`。
- `/project/:projectId/knowledge|skills|agents` 重定向到 `/project/:projectId/resources?focus=*`。
- `/home/project/:projectId/*` 旧路径重定向到 `/project/:projectId/*`。
- 旧的项目工作台页实现已退出 canonical 路由，不再作为当前信息架构的一部分。

### 3.3 布局与导航

- 登录后布局由 `apps/platform/src/app/layouts/AuthedLayout.tsx` 驱动，结构为“左侧全局侧栏 + 右侧内容区”。
- 左侧侧栏由 `apps/platform/src/app/layouts/components/AppSider.tsx` 提供，负责：
  - 品牌区展示
  - 全局导航切换
  - “我的项目”列表
  - 项目创建弹框入口
  - 退出登录
- 顶部全局 Header 当前不作为登录后主导航入口。

## 4. 前端状态与数据来源

### 4.1 本地存储

- `knowject_token`：登录成功后的 Bearer Token。
- `knowject_projects`：项目列表持久化数据，包含项目基础信息、项目说明、置顶状态与展示顺序。

### 4.2 项目态数据

- `apps/platform/src/app/project/ProjectContext.tsx`
  - 提供项目列表读写、按 ID 查找、项目创建 / 编辑 / 置顶 / 删除能力。
- `apps/platform/src/app/project/project.storage.ts`
  - 定义默认项目与 `localStorage` 读写，并兼容置顶字段缺省值回填。
- `apps/platform/src/app/project/project.catalog.ts`
  - 定义全局知识库、技能、智能体、成员等共享 Mock 资产。
- `apps/platform/src/pages/project/project.mock.ts`
  - 定义项目概览、对话、资源、成员等演示数据。

### 4.3 全局态与项目态分层

- 全局 `知识库 / 技能 / 智能体` 页面负责展示跨项目资产目录与治理入口。
- 项目内 `资源` 页只负责展示项目已接入的全局资产，不承担资产创建与版本治理职责。
- 当前“新建资产”“引入到项目”等按钮仍为占位行为，尚未接入真实后端流程。

## 5. API 边界

### 5.1 现有接口

- `GET /api/health`
- `POST /api/auth/login`
- `GET /api/memory/overview`
- `POST /api/memory/query`

### 5.2 鉴权约定

- 登录接口返回 `knowject-token-*` 形式的 token。
- `memory` 路由要求请求头携带 `Authorization: Bearer <token>`。
- Bearer Token 的前缀校验发生在 `apps/api/src/routes/memory.ts`。

### 5.3 当前边界

- `apps/api` 目前是本地联调与演示 API，不是项目态页面的主要数据提供方。
- `apps/platform/src/api` 中的 `auth` 与 `memory` 封装面向演示接口，项目概览、对话、资源、成员等内容仍来自前端本地 Mock。

## 6. 模块职责

- `apps/platform`：页面、路由、鉴权状态、项目态编排、全局资产管理页。
- `apps/api`：演示接口与本地联调入口。
- `packages/request`：Axios 请求能力封装。
- `packages/ui`：通用 UI 组件与 helper。

## 7. 文档索引

- `README.md`：仓库协作总入口。
- `apps/platform/README.md`：前端职责、路由与数据来源说明。
- `apps/api/README.md`：接口与演示边界说明。
- `docs/design/*`：品牌与视觉资料。
