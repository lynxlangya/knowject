# Knowject Frontend (`apps/platform`)

前端采用 React + Vite + Ant Design，当前职责是提供登录后产品壳、项目态页面与全局资产管理页。

## 当前路由

- `/login`：登录页。
- `/home`：登录后默认首页。
- `/project/:projectId/overview`：项目概览。
- `/project/:projectId/chat`、`/project/:projectId/chat/:chatId`：项目对话。
- `/project/:projectId/resources`：项目资源。
- `/project/:projectId/members`：项目成员。
- `/knowledge`、`/skills`、`/agents`：全局资产管理页。
- `/workspace`：兼容入口，重定向到 `/home`。

## 布局与职责

- 登录后主布局为“左侧全局侧栏 + 右侧内容区”。
- 左侧侧栏负责品牌区、全局导航、“我的项目”列表、项目创建 / 编辑 / 置顶 / 删除与退出登录。
- 项目态四个一级页固定为：`概览`、`对话`、`资源`、`成员`。
- 全局 `知识库 / 技能 / 智能体` 页面负责资产治理壳层；项目内 `资源` 页只展示项目已接入的资产。

## 数据来源

- `src/app/project/project.storage.ts`：`knowject_project_pins`、`knowject_project_resource_bindings` 的本地持久化，以及旧 `knowject_projects` 的一次性迁移读取。
- `src/app/project/project.catalog.ts`：全局资产与成员 Mock 源。
- `src/pages/project/project.mock.ts`：项目概览、对话、资源、成员演示数据。
- `src/api`：登录、项目、成员与记忆查询接口封装；项目列表、项目基础信息与成员 roster 已接入真实后端。

## 核心目录

- `src/app/auth`：鉴权 token 管理。
- `src/app/guards`：受保护路由守卫。
- `src/app/layouts`：登录后布局与侧栏。
- `src/app/navigation`：路由、路径构建与兼容重定向。
- `src/app/project`：项目状态、共享类型、Mock 资产目录。
- `src/api`：前端 API 封装（auth / projects / memory）。
- `src/pages`：登录页、主页、项目页、全局资产页。

## 开发

```bash
pnpm --filter platform dev
pnpm --filter platform check-types
pnpm --filter platform build
```
