# AGENTS.md

## 0. 继承关系

- 默认继承全局规则：`/Users/langya/.codex/AGENTS.md`。
- 本文件仅定义 Knowject 项目的覆盖规则与项目上下文补充。
- 全局规则与本文件不冲突时，按全局规则执行。

## 0.1 Root Governance（2026-03-21）

- `AGENTS.md` 仍是项目级长期指令入口。
- `docs/` 是唯一正式文档主源；truth surface 按目录边界管理。
- `docs/exports/` 是正在建立的派生导出目标根目录，不承担事实源职责；Task 4 前导出包 live 入口仍为 `.codex/packs/chatgpt-projects/*`。
- 项目级 Skill 根目录正在迁移到 `.agents/skills/`（Task 3 目标路径，当前任务尚未完成实际迁移）。
- `.codex/` 仅保留项目 Codex 配置与兼容说明，不再承载正式文档、导出包与 Skill 主内容。
- 取舍依据：优先单一真相源与可维护性，避免多入口并行导致漂移。

## 1. 当前项目架构（2026-03-21）

```text
apps/
  platform/  前端应用（React + Vite + Ant Design）
  api/       基础框架 API（Express + TypeScript）
  indexer-py/ Python 索引服务（FastAPI + uv，负责解析 / 分块 / 向量写删）
packages/
  request/   请求库（@knowject/request）
  ui/        UI 组件库（@knowject/ui）
docker/      本地与线上容器化基线（compose、构建、反代、初始化）
scripts/     仓库命令统一入口与 shell helper
files/       按知识库分类的 Markdown 文档库
docs/        项目文档主根目录（current/contracts/standards/plans/handoff/roadmap/...）
docs/exports/ 派生导出目标根目录（非事实源，Task 4 前 live 入口仍在 `.codex/packs/chatgpt-projects/*`）
.agents/skills/ 项目级 Skill 迁移目标路径（Task 3，当前未落地）
.codex/      项目 Codex 配置与兼容层（非文档主根目录）
```

## 2. 模块职责边界

- `apps/platform`：承载登录后产品壳、路由、鉴权状态、项目态页面与全局资产管理页；当前项目主数据、成员 roster、资源绑定，以及全局 `/knowledge`、`/skills`、`/agents` 管理页已接入正式后端，项目资源页中的知识库 / Skill / Agent 元数据已切正式 `/api/knowledge`、`/api/projects/:projectId/knowledge`、`/api/skills`、`/api/agents`，成员协作快照仍保留本地补充层；其中 `/settings`、`/knowledge` 与 `/project/:projectId/chat` 页面当前已按“页面编排壳层 + 状态 hooks/controller + 分区组件”分层，项目对话默认发送已切到正式 `messages/stream`。
- `apps/api`：提供 `health`、`auth`、`members`、`projects`、`memberships`、`knowledge`、`skills`、`agents`、`memory` 九组接口；其中 auth、projects、members、memberships、knowledge、skills、agents 已接入正式主链路，`projects` 模块当前已补齐共享 `ConversationTurnService`、provider capability gate 与 SSE `messages/stream` turn orchestration，`skills` 当前支持系统内置 + 自建 + GitHub/URL 导入的正式资产治理、草稿/发布与绑定校验，并已收紧到 HTTPS + 受信任 GitHub/raw host + 导入预算限制；`knowledge` 当前已把读侧检索结果回查 Mongo，并在向量清理失败时以 `502` 停止继续删除；`health` public surface 当前只返回最小 `up/down` 状态；`agents` 已支持正式 CRUD 与绑定校验，`memory` 保持系统 / 演示接口；`settings` 与 `knowledge` 模块当前已采用 facade + helper submodules 拆分 service / repository 内部职责，对外接口保持不变。
- `packages/request`：提供 HTTP 基础能力（拦截器、错误封装、去重、下载）。
- `packages/ui`：提供可复用 UI 组件；业务字段策略优先下沉到 helper，而不是堆积在页面层。
- `apps/indexer-py`：承载内部 Python 索引控制面，当前采用 FastAPI + uv，已提供 `md / txt` 解析、清洗、分块、embedding，以及文档 / 知识库级 Chroma 写删侧 HTTP 入口；`/internal/*` 当前支持可选 internal token 校验（仅在设置 `KNOWLEDGE_INDEXER_INTERNAL_TOKEN` 时启用），非 `development` 默认关闭 `/docs`、`/redoc`、`/openapi.json`，并把 `storagePath` 限制在 `KNOWLEDGE_STORAGE_ROOT` 下。

## 3. 当前产品信息架构（2026-03-10）

- 登录页路径为 `/login`；登录后默认落点为 `/home`。
- 登录后主布局采用“左侧全局侧栏 + 右侧内容区”；侧栏包含品牌区、全局导航、“我的项目”列表与添加入口。
- 平台主导航固定为：`/home`、`/knowledge`、`/skills`、`/agents`、`/members`、`/analytics`、`/settings`。
- 项目页 canonical 路由为 `/project/:projectId/*`，子路由固定为：
  - `/project/:projectId/overview`
  - `/project/:projectId/chat`
  - `/project/:projectId/chat/:chatId`
  - `/project/:projectId/resources`
  - `/project/:projectId/members`
- `/project/:projectId` 必须重定向到 `/project/:projectId/overview`。
- 旧路径 `/project/:projectId/knowledge|skills|agents` 仅做兼容跳转，统一跳转到 `/project/:projectId/resources?focus=*`。
- 旧路径 `/home/project/*` 仅做兼容跳转，不作为业务 canonical。
- 项目内一级导航固定为：`概览`、`对话`、`资源`、`成员`。
- 资产分为两层：`全局资产` 与 `项目资源`。

## 4. 状态与数据来源约定

- 鉴权 token 统一存储在 `localStorage`，键为 `knowject_token`。
- 项目列表统一由 `apps/platform/src/app/project/ProjectContext.tsx` 管理，运行时主数据来自 `/api/projects`；组件初始化时会一次性清理已退役的 `knowject_projects` 与 `knowject_project_resource_bindings`。
- 项目资源绑定更新当前通过 `PATCH /api/projects/:projectId` 走 partial patch，只发送调用方明确传入的 `knowledgeBaseIds / agentIds / skillIds`，不再从当前项目快照拼全量 `UpdateProjectRequest`。
- `apps/platform/src/app/project/project.catalog.ts` 维护成员聚合所需的共享 Mock 档案；项目创建 / 编辑表单的资源选项已经迁到 `useProjectResourceOptions.ts` 运行时拉取正式 `/api/knowledge`、`/api/skills`、`/api/agents`，这里不再承担表单资源事实源。
- `apps/platform/src/app/project/project.storage.ts` 仅负责 `knowject_project_pins` 置顶偏好的本地持久化。
- `apps/platform/src/pages/project/projectWorkspaceSnapshot.mock.ts` 负责项目概览补充文案与成员协作快照；它只承载演示补充层，不作为正式成员关系主数据源。
- `apps/platform/src/pages/project/projectResourceMappers.ts` 负责项目资源展示映射；知识库 / Skill / Agent 元数据优先来自正式 `/api/knowledge`、`/api/projects/:projectId/knowledge`、`/api/skills`、`/api/agents`，未知资源 ID 会渲染占位项而不是静默丢失。
- `apps/api` 已经承载 auth、项目主数据、成员关系、知识库、Skill 资产治理与 Agent 配置正式接口；当前仍保留演示性质的部分主要是 `memory` 与项目概览 / 资源相关的前端 Mock 补充数据。

## 5. 开发与文档同步约束

- 新增业务页面默认放在 `apps/platform/src/pages`。
- 新增正式业务后端接口默认按模块放在 `apps/api/src/modules/*`，并在 `apps/api/src/app/create-app.ts` 统一挂载 `/api/*` 路由；`health`、`memory` 这类系统 / 演示路由可继续放在 `apps/api/src/routes`。
- 涉及品牌文本必须使用：`知项 · Knowject` 与 `让项目知识，真正为团队所用。`
- Tailwind 类名必须使用 canonical 写法：`!` 重要标记使用后缀形式（如 `mb-1!`），禁止前缀形式（如 `!mb-1`）。
- 涉及以下变化时，必须同步检查并更新文档：
  - 路由、重定向、页面命名变化：同步 `README.md`、`docs/current/architecture.md`、相关子模块 README。
  - Mock 数据源、示例路径、存储键变化：同步 `docs/current/architecture.md`、相关 README、必要时同步 `AGENTS.md`。
  - Docker / compose / 端口暴露 / secrets / 容器网络变化：同步 `README.md`、`docs/current/architecture.md`、`docker/README.md`、`apps/api/README.md`。
  - 仓库级命令包装或脚本入口变化：同步 `README.md`、`docker/README.md`、`docs/current/architecture.md`、必要时同步本文件。
  - Root governance、工程治理 `standards/`、导出映射或 Skill 根目录变化：同步 `AGENTS.md`、`.codex/README.md`、`.codex/MIGRATION.md`、`docs/README.md`，必要时同步 `docs/exports/README.md`；导出包 active 引用切换在 Task 4 落地后执行，Skill 根目录 active 引用切换在 Task 3 落地后执行。
  - 工程治理规则、协作规范或评审清单变化（`docs/standards/*`）：同步 `docs/README.md`、必要时同步 `docs/current/architecture.md` 与本文件，避免入口与事实源漂移。
  - 模块边界、目录结构、协作规则变化：同步本文件、`.codex/README.md`、`.codex/MIGRATION.md` 与 `docs/current/architecture.md`。

## 6. 页面与组件分层约定

- 登录页采用“编排 + 视图组件 + 常量配置”分层：`LoginPage.tsx` 只做状态/副作用/提交流程，`components/*` 只做展示，`constants.ts` 维护动画与文案常量。
- `SettingsPage.tsx` 采用“页面壳层 + controller hook + tab components + constants”分层。
- `KnowledgeManagementPage.tsx` 采用“页面壳层 + 列表状态 hook + sidebar/detail tab components + domain hooks”分层。
- `ProjectChatPage.tsx` 采用“页面壳层 + settings/detail/turn/actions hooks + adapters/components”分层。
- `SearchPanel` 字段渲染与显示策略沉淀到 `packages/ui/src/components/SearchPanel/searchPanel.helpers.tsx`，主组件仅保留状态编排与事件处理。
- `apps/api/src/modules/settings/settings.service.ts` 与 `apps/api/src/modules/knowledge/knowledge.service.ts` 保持 facade；复杂逻辑下沉到 helper 子模块。

## 7. 文档与协作入口

- `README.md`：仓库总入口与阅读导航。
- `docs/README.md`：文档主根目录与 truth surface 边界入口。
- `docs/current/architecture.md`：项目结构、路由矩阵、数据来源、兼容策略事实源。
- `docs/exports/README.md`：导出包目录说明（派生，不是事实源）。
- `.codex/README.md`：Codex 配置与兼容层入口说明。
- `.codex/MIGRATION.md`：迁移文档历史归档入口（stub）。
- `apps/platform/README.md`、`apps/api/README.md`：前后端子系统职责边界。

## 8. 提交信息协作约定

- 当任务已达到可提交状态，且用户明确要求“生成 commit 记录 / 提交信息”，或表达“我来提交代码”的意图时，默认将提交信息草案作为交付物的一部分一并给出。
- 提交信息必须遵循全局 commit 规范，至少提供标题，以及 `Why`、`What`、`Validation`、`Risk` 四段正文；不得写入未执行的验证或未确认的结论。
- 若当前工作区包含多个单一目的改动，优先按变更边界拆分为多个 commit 草案，并说明推荐的提交顺序；不要为了凑一个提交而混合无关改动。
- 若存在未完成验证、既有阻塞或潜在回滚点，必须在提交草案中如实说明；除非用户明确要求直接提交，否则默认只生成草案，不执行 `git commit`。
