# Knowject 当前架构事实（ChatGPT Projects 上传版）

状态：2026-03-14
来源：基于 `.agent/docs/current/architecture.md` 精简同步。  
定位：这是当前事实副本，只回答“现在是什么状态”。

## 1. 当前基线

- 仓库形态：pnpm workspace + Turborepo monorepo
- 前端：`apps/platform`，React 19 + Vite 7 + Ant Design 6 + Tailwind CSS 4
- 后端：`apps/api`，Express 4 + TypeScript + MongoDB Node.js Driver
- 当前产品主线：
  - 登录后产品壳
  - 项目态页面
  - 全局资产管理页壳层
  - 基础框架 API 基线

## 2. 当前服务拓扑

### 宿主机默认开发拓扑

- `platform + api + indexer-py`
- 推荐再配合 Docker 托管 `mongodb + chroma`

### 容器化部署拓扑

- 本地：`platform + api + indexer-py + mongodb + chroma`
- 线上：`caddy + platform + api + indexer-py + mongodb + chroma`

### 当前已知事实

- Chroma 已进入正式知识索引链路，而不只是健康诊断层。
- 仓库里已经有独立 Python 索引服务代码，目录为 `apps/indexer-py`。
- `apps/indexer-py` 当前已切到 FastAPI + `uv` 基线，主内部写侧入口固定为 `POST /internal/v1/index/documents`，并开放 `/docs`、`/redoc`、`/openapi.json` 作为内部控制面文档入口；当前仍隐藏兼容旧路径 `POST /internal/index-documents`。
- `/knowledge` 已接正式后端接口，支持知识库 CRUD、文档上传、状态展示和最小轮询。
- `global_docs` 已打通最小文档索引闭环；`global_code` 仍只保留命名空间与检索契约。

## 3. 当前目录结构重点

- `apps/platform`
  - 鉴权、布局、导航、项目上下文、页面
- `apps/api`
  - app/config/db/modules/routes/middleware/server
- `apps/indexer-py`
  - Python FastAPI 内部索引控制面
  - `md / txt` parse / clean / chunk / embedding / Chroma upsert
- `packages/request`
  - Axios 请求能力封装
- `packages/ui`
  - 通用 UI 组件
- `.agent/docs`
  - 正式项目文档根目录
- `.agent/gpt`
  - 给 ChatGPT Projects 的上传副本目录

## 4. 当前前端信息架构

### 全局路由

- `/login`
- `/home`
- `/knowledge`
- `/skills`
- `/agents`
- `/members`
- `/analytics`
- `/settings`

### 项目路由

- `/project/:projectId/overview`
- `/project/:projectId/chat`
- `/project/:projectId/chat/:chatId`
- `/project/:projectId/resources`
- `/project/:projectId/members`

### 兼容入口

- `/workspace` -> `/home`
- `/project/:projectId` -> `/project/:projectId/overview`
- `/project/:projectId/knowledge|skills|agents` -> `/project/:projectId/resources?focus=*`
- `/home/project/*` -> `/project/:projectId/*`

## 5. 当前数据来源

### 已切到后端

- 项目列表
- 项目基础信息
- 项目成员 roster
- 项目资源绑定
- 项目对话列表 / 详情读链路
- 全局成员概览
- `/knowledge` 正式后端接口

### 仍主要依赖前端 Mock / 本地状态

- 项目概览
- 项目对话消息
- 项目资源消费态中的 `skills / agents` fallback
- 全局资产治理页中 `skills / agents` 的真实写操作

### 当前关键 localStorage

- `knowject_token`
- `knowject_auth_user`
- `knowject_remembered_username`
- `knowject_project_pins`
- `knowject_project_resource_bindings`（历史迁移缓存）
- `knowject_projects`（历史 Mock 迁移缓存）

## 6. 当前 API 边界

### 已有接口

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
- `GET /api/knowledge`
- `GET /api/knowledge/:knowledgeId`
- `POST /api/knowledge`
- `PATCH /api/knowledge/:knowledgeId`
- `DELETE /api/knowledge/:knowledgeId`
- `POST /api/knowledge/:knowledgeId/documents`
- `POST /api/knowledge/search`
- `GET /api/memory/overview`
- `POST /api/memory/query`

### 当前职责

- `auth`：注册 / 登录 / 用户搜索
- `members`：全局成员概览
- `projects`：项目 CRUD
- `memberships`：项目成员增删改
- `knowledge`：知识库 CRUD、文档上传、状态推进、统一知识检索 service
- `memory/*`：演示接口，不是正式知识检索服务
- Node 内部当前优先调用 Python `POST /internal/v1/index/documents`，开发态兼容回退旧路径 `POST /internal/index-documents`

## 7. 当前明确未落地能力

- `skills / agents` 正式模块
- 单文档 retry / delete 已落地；`global_docs` 的 rebuild / diagnostics 与知识库级重建仍未落地
- SSE 流式对话链路与来源引用
- 项目私有知识库持久化
- `global_code` 真实导入与项目级合并检索

## 8. 当前事实判断规则

- 如果这里与源码冲突，以源码为准。
- 如果这里与 `.agent/docs/current/architecture.md` 冲突，以后者为准。
- 不要把目标蓝图、任务计划或推荐实现路径误写成当前实现状态。
