# AGENTS.md

## 0. 继承关系

- 默认继承全局规则：`/Users/langya/.codex/AGENTS.md`。
- 本文件仅定义 Knowject 项目的覆盖规则与项目上下文补充。
- 全局规则与本文件不冲突时，按全局规则执行。

## 1. 当前项目架构（2026-03-15）

```text
apps/
  platform/  前端应用（React + Vite + Ant Design）
  api/       基础框架 API（Express + TypeScript）
  indexer-py/ Python 索引服务（FastAPI + uv 内部控制面，负责解析 / 分块 / Chroma 写侧）
packages/
  request/   请求库（@knowject/request）
  ui/        UI 组件库（@knowject/ui）
docker/
  api/       API 容器构建与启动脚本
  indexer-py/ Python indexer 容器构建入口
  platform/  前端容器构建与 Nginx 入口
  mongo/     MongoDB 初始化脚本
  caddy/     线上 HTTPS 入口
scripts/     常用命令统一入口
.agent/
  docs/
    current/        当前事实与架构文档
    contracts/      实施契约
    roadmap/        目标蓝图与 gap 分析
    plans/          阶段任务与文档计划
    handoff/        接手与交接文档
    inputs/         输入材料与认知原稿
    design/         品牌与视觉设计资料
  gpt/              ChatGPT Projects 上传副本（派生包，不是事实源）
    templates/      模板与计划骨架
```

## 2. 模块职责边界

- `apps/platform`：承载登录后产品壳、路由、鉴权状态、项目态页面与全局资产管理页；当前项目主数据、成员 roster、资源绑定，以及全局 `/knowledge`、`/skills`、`/agents` 管理页已接入正式后端，项目资源页中的知识库 / Skill / Agent 元数据已切正式 `/api/knowledge`、`/api/projects/:projectId/knowledge`、`/api/skills`、`/api/agents`，成员协作快照仍保留本地补充层。
- `apps/api`：提供 `health`、`auth`、`members`、`projects`、`memberships`、`knowledge`、`skills`、`agents`、`memory` 九组接口；其中 auth、projects、members、memberships、knowledge、skills、agents 已接入正式主链路，`skills` 当前支持系统内置 + 自建 + GitHub/URL 导入的正式资产治理、草稿/发布与绑定校验，`agents` 已支持正式 CRUD 与绑定校验，`memory` 保持系统 / 演示接口。
- `packages/request`：提供 HTTP 基础能力（拦截器、错误封装、去重、下载）。
- `packages/ui`：提供可复用 UI 组件；业务字段策略优先下沉到 helper，而不是堆积在页面层。
- `apps/indexer-py`：承载内部 Python 索引控制面，当前采用 FastAPI + uv，已提供 `md / txt` 解析、清洗、分块、embedding 与 Chroma 写侧 HTTP 入口。
- `docker`：提供本地 / 线上容器化部署基线，包括 compose 编排、`api / indexer-py / platform` 镜像构建、Mongo 初始化与 HTTPS 入口。
- `scripts`：提供仓库级常用命令包装，优先承接启动、检查、Docker 运维等重复操作。
- `.agent/docs`：项目文档统一根目录；`.agent/docs/current/architecture.md` 是项目结构与路由事实的主文档。
- `.agent/gpt`：给 ChatGPT Projects 使用的上传副本目录；内容来自 `.agent/docs` 与项目规则的派生同步，不作为新的事实源。

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
- 全局 `知识库 / 技能 / 智能体` 页面负责跨项目资产治理、目录、版本与复用。
- 项目内 `资源` 页负责展示和编排当前项目的知识、技能与智能体，并区分“绑定的全局知识”与“项目私有知识”；它只承载项目内消费态和最小入口，不承担全局治理职责。

## 4. 状态与数据来源约定

- 鉴权 token 统一存储在 `localStorage`，键为 `knowject_token`。
- 项目列表统一由 `apps/platform/src/app/project/ProjectContext.tsx` 管理，运行时主数据来自 `/api/projects`；组件初始化时会一次性清理已退役的 `knowject_projects` 与 `knowject_project_resource_bindings`。
- `apps/platform/src/app/project/project.catalog.ts` 维护成员聚合所需的共享 Mock 档案，以及项目创建 / 编辑表单仍在使用的演示资源选项；不再作为项目资源页的 agent 展示事实源。
- `apps/platform/src/app/project/project.storage.ts` 仅负责 `knowject_project_pins` 置顶偏好的本地持久化。
- `apps/platform/src/pages/project/project.mock.ts` 负责项目概览、资源展示映射与成员协作快照；知识库 / Skill / Agent 元数据优先来自正式 `/api/knowledge`、`/api/projects/:projectId/knowledge`、`/api/skills`、`/api/agents`，未知资源 ID 会渲染占位项而不是静默丢失。
- 项目资源数据当前由“项目绑定的全局资产 + 项目私有知识”共同组成；知识库、Skill 与 Agent 元数据优先来自正式 `/api/knowledge`、`/api/projects/:projectId/knowledge`、`/api/skills`、`/api/agents`。
- `apps/api` 已经承载 auth、项目主数据、成员关系、知识库、Skill 资产治理与 Agent 配置正式接口；当前仍保留演示性质的部分主要是 `memory` 与项目概览 / 资源相关的前端 Mock 补充数据。

## 5. 开发与文档同步约束

- 新增业务页面默认放在 `apps/platform/src/pages`。
- 新增正式业务后端接口默认按模块放在 `apps/api/src/modules/*`，并在 `apps/api/src/app/create-app.ts` 统一挂载 `/api/*` 路由；`health`、`memory` 这类系统 / 演示路由可继续放在 `apps/api/src/routes`。
- 涉及品牌文本必须使用：`知项 · Knowject` 与 `让项目知识，真正为团队所用。`
- Tailwind 类名必须使用 canonical 写法：`!` 重要标记使用后缀形式（如 `mb-1!`），禁止前缀形式（如 `!mb-1`）。
- 涉及以下变化时，必须同步检查并更新文档：
  - 路由、重定向、页面命名变化：同步 `README.md`、`.agent/docs/current/architecture.md`、相关子模块 README。
  - Mock 数据源、示例路径、存储键变化：同步 `.agent/docs/current/architecture.md`、相关 README、必要时同步 `AGENTS.md`。
  - Docker / compose / 端口暴露 / secrets / 容器网络变化：同步 `README.md`、`.agent/docs/current/docker-usage.md`、`.agent/docs/current/architecture.md`、`docker/README.md`、`apps/api/README.md`。
  - 仓库级命令包装或脚本入口变化：同步 `README.md`、`docker/README.md`、`.agent/docs/current/architecture.md`、必要时同步本文件。
  - 模块边界、目录结构、协作规则变化：同步本文件与 `.agent/docs/current/architecture.md`。

## 6. 页面与组件分层约定

- 登录页采用“编排 + 视图组件 + 常量配置”分层：
  - `apps/platform/src/pages/login/LoginPage.tsx` 仅负责状态、副作用与提交流程。
  - `apps/platform/src/pages/login/components/*` 负责纯展示结构。
  - `apps/platform/src/pages/login/constants.ts` 维护动画、文案、样式常量与本地存储工具函数。
- `SearchPanel` 的字段渲染与显示策略统一沉淀到 `packages/ui/src/components/SearchPanel/searchPanel.helpers.tsx`，主组件仅保留状态编排与事件处理。
- 全局 `知识库 / 技能 / 智能体` 页面当前分别由 `KnowledgeManagementPage.tsx`、`SkillsManagementPage.tsx` 与 `AgentsManagementPage.tsx` 承载；`GlobalAssetManagementPage.tsx` 保留为历史壳层组件，项目内 `资源` 页只负责展示和编排当前项目资源。

## 7. 文档与协作入口

- `README.md`：面向仓库协作者的总入口，说明当前定位、启动方式、信息架构与文档索引。
- `.agent/docs/current/architecture.md`：项目结构、路由矩阵、数据来源、兼容策略的事实源。
- `.agent/gpt/README.md`：ChatGPT Projects 上传包说明与推荐上传顺序。
- `.agent/docs/design/*`：品牌与视觉设计资料。
- `apps/platform/README.md`、`apps/api/README.md`：分别说明前端与 API 子系统的当前职责与边界。
- `.agent/docs/templates/PLANS.md`：复杂功能、迁移或高风险任务的执行计划模板。

## 8. 提交信息协作约定

- 当任务已达到可提交状态，且用户明确要求“生成 commit 记录 / 提交信息”，或表达“我来提交代码”的意图时，默认将提交信息草案作为交付物的一部分一并给出。
- 提交信息必须遵循全局 commit 规范，至少提供标题，以及 `Why`、`What`、`Validation`、`Risk` 四段正文；不得写入未执行的验证或未确认的结论。
- 若当前工作区包含多个单一目的改动，优先按变更边界拆分为多个 commit 草案，并说明推荐的提交顺序；不要为了凑一个提交而混合无关改动。
- 若存在未完成验证、既有阻塞或潜在回滚点，必须在提交草案中如实说明；除非用户明确要求直接提交，否则默认只生成草案，不执行 `git commit`。
