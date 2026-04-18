# Knowject 项目说明（给 ChatGPT / 外部大模型，2026-03-19）

> 目的：用最小必要上下文，让 ChatGPT 在不了解仓库历史的前提下，也能快速判断“现在已经做到了什么、还没做到什么、改动时应该注意什么”。  
> 若本文件与源码或 `docs/current/architecture.md` 冲突，以源码和 `architecture.md` 为准。

## 1. 项目是什么

- `知项 · Knowject` 是一个围绕“项目知识真正为团队所用”的协作产品。
- 当前仓库是 monorepo，核心由三部分组成：
  - `apps/platform`：React + Vite + Ant Design 前端
  - `apps/api`：Express + TypeScript 后端
  - `apps/indexer-py`：FastAPI + `uv` 的内部 Python 索引控制面
- 当前阶段不是纯 Demo，也不是完整 AI 产品；更准确地说，是“前后端主链路、索引运维基线、项目私有 knowledge 最小闭环、工作区设置中心，以及项目对话前后端 MVP 与默认流式发送都已接通，更完整的来源引用渲染、流式恢复体验与 Skill / Agent runtime 仍待补齐”。

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
  - 工作区设置中心 `GET/PATCH/TEST /api/settings/*`
  - Skill 正式资产 CRUD / 导入 / 草稿发布 / 绑定校验，以及 Agent 正式 CRUD / 绑定
  - `memory/overview` 与 `memory/query` 演示接口
- Python indexer 已落地：
  - FastAPI + `uv` 基线
  - `GET /health`
  - `POST /internal/v1/index/documents`
  - `POST /internal/v1/index/documents/:documentId/rebuild`
  - `POST /internal/v1/index/documents/:documentId/delete`
  - `POST /internal/v1/index/knowledge/:knowledgeId/delete`
  - `GET /internal/v1/index/diagnostics`
  - 隐藏兼容旧路径 `POST /internal/index-documents`
  - `/docs`、`/redoc`、`/openapi.json`
- 前端项目列表、项目基础信息、成员 roster、项目资源绑定、项目对话列表 / 详情与全局成员页已经切到正式后端接口。
- `/api/projects/:projectId/conversations*` 当前已经具备后端读写链路：可以新建会话、追加 user message、执行项目级 merged retrieval、生成 assistant 回复，并通过 `messages/stream` 返回最小流式事件与最终 `sources` 引用。
- `ProjectChatPage` 已正式消费这条会话链路，并会在发送前读取 `/api/settings` 作为 LLM 运行时门禁；默认发送已切到 `messages/stream`，消息写入支持 `clientRequestId` 幂等重试，OpenAI `gpt-5*` 连接测试也已按后端要求改用 `max_completion_tokens`。
- `/knowledge`、`/skills` 已接正式后端接口；其中 `/skills` 已支持原生 `SKILL.md` 自建、GitHub/URL 导入、编辑、预览、草稿/发布与删除。`/agents` 相关后端能力仍在仓库内，但独立全局路由与项目内 Agent 入口在第一版当前暂时隐藏。
- `/settings` 已接正式后端接口，支持 embedding / LLM / indexing / workspace 配置、在线测试与服务端加密存储 API Key；本期访问控制先按“登录即可访问”处理。
- 项目创建 / 编辑弹层里的知识库 / Skill 选项都已切到正式 API；Agent 相关入口在第一版当前暂时隐藏。`project.catalog.ts` 只保留成员基础档案，原 `project.mock.ts` 已拆为 `projectWorkspaceSnapshot.mock.ts` 与 `projectResourceMappers.ts`。

## 3. 当前信息架构

- 登录后默认落点：`/home`
- 主导航固定为：
  - `/home`
  - `/knowledge`
  - `/skills`
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
  - 项目对话列表 / 详情读写链路
  - 知识库 CRUD、上传、状态推进与统一检索
  - 工作区设置中心与 effective AI config
- 仍主要依赖前端本地 / Mock：
  - 项目概览页内容
  - 更完整的来源引用渲染
  - 项目成员协作快照与部分概览补充层
- 当前关键本地状态：
  - `knowject_token`：登录 token
  - `knowject_auth_user`：当前登录用户快照
  - `knowject_remembered_username`：登录页“记住用户名”缓存
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
- 当前 MongoDB 是正式主数据库；Chroma 已进入正式知识索引链路，但物理 collection 已改为 versioned naming，并通过 namespace active pointer 切换，`global_code` 仍只保留命名空间预留。

## 6. 环境与配置要点

- API 运行时按 `.env` → `.env.local` 顺序加载环境变量。
- 当前推荐的 `<NAME>_FILE` 只保留给 secret / connection-string 键：`MONGODB_URI_FILE`、`JWT_SECRET_FILE`、`SETTINGS_ENCRYPTION_KEY_FILE`，以及可选的 `OPENAI_API_KEY_FILE`。
- 同一份 env 文件里不要同时定义 `NAME` 和 `NAME_FILE`。
- `SETTINGS_ENCRYPTION_KEY`（或 `SETTINGS_ENCRYPTION_KEY_FILE`）现在是 API 启动必需项，用于工作区设置页 API Key 的服务端加密。
- 本地 Docker 可改的是宿主机发布端口：
  - `WEB_PORT`
  - `API_PUBLISHED_PORT`
  - `MONGO_PUBLISHED_PORT`
  - `CHROMA_PUBLISHED_PORT`
- API 容器内部监听端口固定为 `3001`。
- `KNOWLEDGE_INDEXER_URL` 默认回落到 `http://127.0.0.1:8001`。
- Chroma 心跳路径默认为 `/api/v2/heartbeat`，可通过 `CHROMA_HEARTBEAT_PATH` 覆盖。
- embedding 配置读取规则是“数据库优先，缺失时 fallback 到环境变量”；但知识搜索和重建必须读取 namespace 当前 active embedding config，而不是直接用“最新 settings”去猜。
- 知识库级 rebuild 当前无论 fingerprint 是否变化，都会先写 staged/versioned target collection，成功后才切换 active pointer；diagnostics 里 `indexer.*` 是 Python 运行时实际值，工作区期望值通过 `indexer.expected.*` 单独暴露。

## 7. 当前明确还没落地的能力

- Skill / Agent 执行闭环
- 项目知识原文的预览 / 下载能力
- `global_code` 真实导入与项目级合并检索
- 更完整的来源引用渲染
- 更细的流式恢复 / 观测能力
- refresh token、组织级 RBAC、邀请链接、密码找回

## 7.1 当前迭代重点

- 当前仓库已新增：
  - `docs/plans/tasks-chat-core-week7-8.md`
  - `docs/contracts/chat-contract.md`
- 当前如果要继续推进对话核心，默认顺序是：
  - 更完整的来源引用渲染与流式体验收口
  - Skill / Agent runtime 后置
- 判断当前优先级时，优先看：
  - `docs/plans/tasks-chat-core-week7-8.md`
  - `docs/contracts/chat-contract.md`
  - `docs/roadmap/gap-analysis.md`
  - `docs/plans/tasks-index-ops-project-consumption.md`
  - `docs/handoff/handoff-guide.md`

## 8. 给 ChatGPT 的工作约束

- 不要把 `docs/roadmap/target-architecture.md` 当成当前已实现事实。
- 不要把项目概览 / 对话 / 资源页误判为已经完全切到后端。
- 不要把 `project.catalog.ts` 误判为仍承担项目表单资源选项事实源；当前项目创建 / 编辑弹层里的知识库 / Skill 选项来自正式 API，Agent 入口在第一版暂时隐藏。
- 改动以下内容时，必须同步文档：
  - 路由 / 重定向 / 页面命名
  - localStorage 键
  - 环境变量 / secrets / Docker 拓扑
  - API 边界 / 鉴权约定
- 若这些改动会影响外部模型上传包，也要同步 `docs/exports/chatgpt-projects/*`
- 优先做最小可行改动，不要为了“未来扩展”平白引入新抽象。

## 9. 推荐最小阅读顺序

1. `docs/current/architecture.md`
2. `docs/contracts/auth-contract.md`
3. `docs/current/docker-usage.md`
4. `docs/current/docker-operation-checklist.md`
5. `README.md`

## 10. 关键源码入口

- `apps/platform/src/app/navigation/routes.tsx`
- `apps/platform/src/app/layouts/components/AppSider.tsx`
- `apps/platform/src/app/layouts/components/ProjectFormModal.tsx`
- `apps/platform/src/app/project/ProjectContext.tsx`
- `apps/platform/src/app/project/project.storage.ts`
- `apps/platform/src/app/project/useProjectResourceOptions.ts`
- `apps/platform/src/pages/project/ProjectLayout.tsx`
- `apps/platform/src/pages/project/ProjectChatPage.tsx`
- `apps/platform/src/pages/project/projectWorkspaceSnapshot.mock.ts`
- `apps/platform/src/pages/project/projectResourceMappers.ts`
- `apps/platform/src/api/settings.ts`
- `apps/api/src/app/create-app.ts`
- `apps/api/src/config/ai-config.ts`
- `apps/api/src/config/env.ts`
- `apps/api/src/modules/auth/*`
- `apps/api/src/modules/knowledge/*`
- `apps/api/src/modules/projects/*`
- `apps/api/src/modules/projects/project-conversation-service.ts`
- `apps/api/src/modules/projects/project-conversation-runtime.ts`
- `apps/api/src/modules/memberships/*`
- `apps/api/src/routes/health.ts`
- `apps/indexer-py/app/main.py`
- `apps/indexer-py/app/api/routes/indexing.py`
- `apps/indexer-py/app/domain/indexing/runtime_config.py`
- `apps/indexer-py/app/domain/indexing/pipeline.py`

## 11. 一句话总结

当前 Knowject 最稳定的是信息架构、鉴权、项目主数据、成员链路、`/knowledge` 的索引运维基线、`/settings` 的工作区配置中心、项目私有 knowledge 最小闭环，以及项目对话前后端 MVP 与默认流式发送；当前最大的断层已经切换到更完整的来源引用渲染、流式恢复体验与 Skill / Agent 运行时。
