# Knowject 项目说明（给 ChatGPT / 外部大模型）

> 目的：用最小必要上下文，让 ChatGPT 在不了解仓库历史的前提下，也能快速判断“现在已经做到了什么、还没做到什么、改动时应该注意什么”。  
> 若本文件与源码或 `.agent/docs/current/architecture.md` 冲突，以源码和 `architecture.md` 为准。

## 1. 项目是什么

- `知项 · Knowject` 是一个围绕“项目知识真正为团队所用”的协作产品。
- 当前仓库是 monorepo，核心由三部分组成：
  - `apps/platform`：React + Vite + Ant Design 前端
  - `apps/api`：Express + TypeScript 后端
  - `apps/indexer-py`：FastAPI + `uv` 的内部 Python 索引控制面
- 当前阶段不是纯 Demo，也不是完整 AI 产品；更准确地说，是“前后端基础框架已接通，局部业务仍依赖 Mock”。

## 2. 当前已经落地的事实

- 登录页 `/login` 已接通正式注册 / 登录接口：
  - `POST /api/auth/register`
  - `POST /api/auth/login`
- 后端已落地：
  - MongoDB 连接与健康诊断
  - `argon2id` 密码哈希
  - JWT 鉴权
  - 全局成员概览 `GET /api/members`
  - 项目最小 CRUD `GET/POST/PATCH/DELETE /api/projects`
  - 项目成员管理 `/api/projects/:projectId/members*`
  - 用户搜索 `GET /api/auth/users`
  - 知识库 CRUD、文档上传、状态推进与统一检索
  - Skill registry 只读接口与 Agent 正式 CRUD / 绑定
  - `memory/overview` 与 `memory/query` 演示接口
- Python indexer 已落地：
  - FastAPI + `uv` 基线
  - `GET /health`
  - `POST /internal/v1/index/documents`
  - 隐藏兼容旧路径 `POST /internal/index-documents`
  - `/docs`、`/redoc`、`/openapi.json`
- 前端项目列表、项目基础信息、成员 roster、项目资源绑定、项目对话列表 / 详情与全局成员页已经切到正式后端接口。
- `/knowledge`、`/skills`、`/agents` 已接正式后端接口；其中 `/skills` 为系统内置只读目录，`/agents` 已支持创建、编辑、删除与知识库 / Skill 绑定。

## 3. 当前信息架构

- 登录后默认落点：`/home`
- 主导航固定为：
  - `/home`
  - `/knowledge`
  - `/skills`
  - `/agents`
  - `/members`
  - `/analytics`
  - `/settings`
- 项目 canonical 路由固定为：
  - `/project/:projectId/overview`
  - `/project/:projectId/chat`
  - `/project/:projectId/chat/:chatId`
  - `/project/:projectId/resources`
  - `/project/:projectId/members`
- 以下路径只是兼容入口，不应继续当成主设计扩展：
  - `/workspace`
  - `/home/project/*`
  - `/project/:projectId/knowledge|skills|agents`

## 4. 当前数据来源与状态分层

- 正式后端主链路：
  - 登录 / 注册
  - 项目主数据
  - 项目成员关系
  - 全局成员概览
  - 项目资源绑定
  - 项目对话列表 / 详情读链路
  - 知识库 CRUD、上传、状态推进与统一检索
- 仍主要依赖前端本地 / Mock：
  - 项目概览页内容
  - 对话消息演示数据
  - 项目资源消费态中 `skills / agents` 的目录 fallback
- 当前关键本地状态：
  - `knowject_token`：登录 token
  - `knowject_project_pins`：项目置顶偏好
  - `knowject_project_resource_bindings`：历史项目资源绑定迁移缓存
  - `knowject_projects`：历史本地 Mock 项目缓存，仅用于一次性迁移

## 5. Docker 与运行方式

- 推荐日常开发流：
  - 宿主机运行 `platform + api + indexer-py`
  - Docker 只托管 `mongo + chroma`
  - 常用命令：`pnpm dev:init`、`pnpm dev:up`
- 完整 Docker 联调 / 验收：
  - `pnpm docker:local:init`
  - `pnpm docker:local:up`
- 线上 Compose 基线：
  - `compose.yml`
  - `compose.production.yml`
  - `caddy` 负责 HTTPS 入口
- 宿主机开发流若不走 Docker，请先安装 `uv`，因为 `apps/indexer-py` 当前通过 `uv run` 启动。
- 当前 MongoDB 是正式主数据库；Chroma 已进入 `global_docs` 的正式最小索引 / 检索闭环，`global_code` 仍只保留命名空间预留。

## 6. 环境与配置要点

- API 运行时按 `.env` → `.env.local` 顺序加载环境变量。
- 所有字符串型变量支持 `<NAME>_FILE`，适合 Docker secrets。
- 同一份 env 文件里不要同时定义 `NAME` 和 `NAME_FILE`。
- 本地 Docker 可改的是宿主机发布端口：
  - `WEB_PORT`
  - `API_PUBLISHED_PORT`
  - `MONGO_PUBLISHED_PORT`
  - `CHROMA_PUBLISHED_PORT`
- API 容器内部监听端口固定为 `3001`。
- `KNOWLEDGE_INDEXER_URL` 默认回落到 `http://127.0.0.1:8001`。
- Chroma 心跳路径默认为 `/api/v2/heartbeat`，可通过 `CHROMA_HEARTBEAT_PATH` 覆盖。

## 7. 当前明确还没落地的能力

- Skill / Agent 执行闭环，以及项目资源页 `skills / agents` fallback 收口
- 单文档 retry / delete 已落地；`global_docs` 的 rebuild / diagnostics 与知识库级重建接口仍未落地
- `global_code` 真实导入与项目级合并检索
- 对话消息写入、流式消息链路、来源引用渲染
- refresh token、组织级 RBAC、邀请链接、密码找回

## 8. 给 ChatGPT 的工作约束

- 不要把 `.agent/docs/roadmap/target-architecture.md` 当成当前已实现事实。
- 不要把项目概览 / 对话 / 资源页误判为已经完全切到后端。
- 改动以下内容时，必须同步文档：
  - 路由 / 重定向 / 页面命名
  - localStorage 键
  - 环境变量 / secrets / Docker 拓扑
  - API 边界 / 鉴权约定
- 若这些改动会影响外部模型上传包，也要同步 `.agent/gpt/*`
- 优先做最小可行改动，不要为了“未来扩展”平白引入新抽象。

## 9. 推荐最小阅读顺序

1. `.agent/docs/current/architecture.md`
2. `.agent/docs/contracts/auth-contract.md`
3. `.agent/docs/current/docker-usage.md`
4. `.agent/docs/current/docker-operation-checklist.md`
5. `README.md`

## 10. 关键源码入口

- `apps/platform/src/app/navigation/routes.tsx`
- `apps/platform/src/app/layouts/components/AppSider.tsx`
- `apps/platform/src/app/project/ProjectContext.tsx`
- `apps/platform/src/app/project/project.storage.ts`
- `apps/platform/src/pages/project/project.mock.ts`
- `apps/api/src/app/create-app.ts`
- `apps/api/src/config/env.ts`
- `apps/api/src/modules/auth/*`
- `apps/api/src/modules/knowledge/*`
- `apps/api/src/modules/projects/*`
- `apps/api/src/modules/memberships/*`
- `apps/api/src/routes/health.ts`
- `apps/indexer-py/app/main.py`
- `apps/indexer-py/app/domain/indexing/pipeline.py`

## 11. 一句话总结

当前 Knowject 最稳定的是信息架构、鉴权、项目主数据、成员链路，以及全局 `/knowledge`、`/skills`、`/agents` 的正式管理页；当前最大的断层仍是项目对话消息写侧、项目资源页 `skills / agents` fallback 与索引运维能力。
