# Knowject Frontend (`apps/platform`)

前端采用 React + Vite + Ant Design，当前职责是提供登录后产品壳、项目态页面与全局资产管理页；截至 2026-03-14，基础框架阶段已完成认证接入、项目主数据接入、项目成员 roster 管理、项目资源绑定正式写回、项目对话读链路接入、全局成员协作总览接入，以及知识库 / 技能 / 智能体正式管理页接线。

## 当前路由

- `/login`：登录页。
- `/home`：登录后默认首页。
- `/project/:projectId/overview`：项目概览。
- `/project/:projectId/chat`、`/project/:projectId/chat/:chatId`：项目对话。
- `/project/:projectId/resources`：项目资源。
- `/project/:projectId/members`：项目成员。
- `/knowledge`、`/skills`、`/agents`：全局资产管理页。
- `/members`：全局成员协作总览页。
- `/analytics`、`/settings`：全局占位页。

## 布局与职责

- 登录后主布局为“左侧全局侧栏 + 右侧内容区”。
- 左侧侧栏负责品牌区、全局导航、“我的项目”列表、项目创建 / 编辑 / 置顶 / 删除与退出登录。
- 项目态四个一级页固定为：`概览`、`对话`、`资源`、`成员`。
- 全局 `知识库 / 技能 / 智能体` 页面负责资产治理；其中 `/knowledge`、`/skills` 与 `/agents` 已切到正式后端接口。
- 项目 `成员` 页当前支持按用户名 / 姓名模糊搜索已有用户，并通过多选下拉框批量加入项目。
- 全局 `成员` 页当前聚合“当前账号可见项目”中的成员基础信息、参与项目、协作快照与权限摘要。

## 数据来源

- `src/app/project/ProjectContext.tsx`：项目列表与项目快照的运行时主状态源；组件初始化时会一次性清理已退役的 `knowject_project_resource_bindings` 与 `knowject_projects`。
- `src/app/project/project.storage.ts`：仅负责 `knowject_project_pins` 的本地持久化。
- `src/app/project/project.catalog.ts`：项目资源页所需的 `skills / agents` 目录 fallback 与成员基础档案 Mock 源。
- `src/pages/project/project.mock.ts`：项目概览补充文案、成员协作快照，以及项目资源页的展示 fallback；当 `skills / agents` 绑定了未知 ID 时，会渲染占位项而不是静默丢失。
- `src/api`：登录、项目、项目对话、成员、知识库、技能、智能体接口封装，以及统一错误提取 helper；项目列表、项目基础信息、项目资源绑定、项目对话读链路、全局成员概览、成员 roster、全局知识库、全局技能目录与全局智能体管理页已接入真实后端。
- `src/api/*` 当前统一按 `ApiEnvelope<T>` 调用后端，并在 API 层解包 `data`；页面层继续消费原有业务对象，不直接感知 `code / message / meta`。
- `/knowledge` 主要消费 `GET /api/knowledge`、`GET /api/knowledge/:knowledgeId`、`POST /api/knowledge`、`PATCH /api/knowledge/:knowledgeId`、`DELETE /api/knowledge/:knowledgeId` 与 `POST /api/knowledge/:knowledgeId/documents`；当前正式上传链路支持 `md / markdown / txt`，界面文案统一推荐 `.md / .txt`。
- `/project/:projectId/chat` 主要消费 `GET /api/projects/:projectId/conversations` 与 `GET /api/projects/:projectId/conversations/:conversationId`；当前输入框仍保持禁用，等待正式消息写路径。
- `/project/:projectId/resources` 主要消费后端项目模型中的 `knowledgeBaseIds / skillIds / agentIds`；其中知识库元数据优先来自 `/api/knowledge`，`skills / agents` 仍用本地目录 fallback，未知资源会展示占位卡片。
- `/members` 主要消费 `GET /api/members`；`/project/:projectId/members` 主要消费 `GET /api/auth/users` 与 `/api/projects/:projectId/members*`。

## 核心目录

- `src/app/auth`：鉴权 token 管理。
- `src/app/guards`：受保护路由守卫。
- `src/app/layouts`：登录后布局与侧栏。
- `src/app/navigation`：路由、路径构建与兼容重定向。
- `src/app/project`：项目状态、共享类型、Mock 资产目录。
- `src/api`：前端 API 封装（auth / projects / members / knowledge / skills / agents）与错误 helper，其中成员添加候选复用 `GET /api/auth/users`，并统一在此层完成 response envelope 解包。
- `src/pages`：登录页、主页、项目页、全局资产页。

## 开发

```bash
pnpm --filter platform dev
pnpm --filter platform check-types
pnpm --filter platform build
# 仓库根最小验证入口
pnpm verify:global-assets-foundation
```
