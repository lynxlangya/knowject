# AGENTS.md

## 0. 继承关系

- 默认继承全局规则：`/Users/langya/.codex/AGENTS.md`。
- 本文件仅定义 Knowject 项目的覆盖规则与项目上下文补充。
- 全局规则与本文件不冲突时，按全局规则执行。

## 1. 当前项目架构（2026-03-09）

```text
apps/
  platform/  前端应用（React + Vite + Ant Design）
  api/       本地联调与演示 API（Express + TypeScript）
packages/
  request/   请求库（@knowject/request）
  ui/        UI 组件库（@knowject/ui）
docs/
  architecture.md   当前架构事实源
  design/           品牌与视觉设计资料
.agent/
  PLANS.md          复杂任务执行计划模板
```

## 2. 模块职责边界

- `apps/platform`：承载登录后产品壳、路由、鉴权状态、项目态页面与全局资产管理页；当前主要由本地 Mock 数据和 `localStorage` 驱动。
- `apps/api`：提供 `health`、`auth`、`memory` 三组本地联调与演示接口，不直接作为项目态页面的数据主源。
- `packages/request`：提供 HTTP 基础能力（拦截器、错误封装、去重、下载）。
- `packages/ui`：提供可复用 UI 组件；业务字段策略优先下沉到 helper，而不是堆积在页面层。
- `docs`：沉淀当前架构、品牌和设计资料；`docs/architecture.md` 是项目结构与路由事实的主文档。

## 3. 当前产品信息架构（2026-03-09）

- 登录页路径为 `/login`；登录后默认落点为 `/home`。
- `/workspace` 仅保留为兼容入口，必须重定向到 `/home`。
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
- 项目内 `资源` 页只展示项目已接入的全局资产；全局 `知识库 / 技能 / 智能体` 页面负责资产治理、版本与复用，不承载项目内编排。

## 4. 状态与数据来源约定

- 鉴权 token 统一存储在 `localStorage`，键为 `knowject_token`。
- 项目列表统一由 `apps/platform/src/app/project/ProjectContext.tsx` 管理，并持久化到 `localStorage`，键为 `knowject_projects`。
- `apps/platform/src/app/project/project.catalog.ts` 维护全局知识库、技能、智能体、成员等共享 Mock 资产源。
- `apps/platform/src/app/project/project.storage.ts` 负责默认项目与项目持久化。
- `apps/platform/src/pages/project/project.mock.ts` 负责项目概览、对话、资源、成员等页面的演示数据。
- `apps/api` 当前只提供演示接口能力；项目态页面的主数据流仍来自前端本地 Mock，而不是后端 API。

## 5. 开发与文档同步约束

- 新增业务页面默认放在 `apps/platform/src/pages`。
- 新增后端接口默认放在 `apps/api/src/routes`，并保持 `/api/*` 路由前缀。
- 涉及品牌文本必须使用：`知项 · Knowject` 与 `让项目知识，真正为团队所用。`
- Tailwind 类名必须使用 canonical 写法：`!` 重要标记使用后缀形式（如 `mb-1!`），禁止前缀形式（如 `!mb-1`）。
- 涉及以下变化时，必须同步检查并更新文档：
  - 路由、重定向、页面命名变化：同步 `README.md`、`docs/architecture.md`、相关子模块 README。
  - Mock 数据源、示例路径、存储键变化：同步 `docs/architecture.md`、相关 README、必要时同步 `AGENTS.md`。
  - 模块边界、目录结构、协作规则变化：同步本文件与 `docs/architecture.md`。

## 6. 页面与组件分层约定

- 登录页采用“编排 + 视图组件 + 常量配置”分层：
  - `apps/platform/src/pages/login/LoginPage.tsx` 仅负责状态、副作用与提交流程。
  - `apps/platform/src/pages/login/components/*` 负责纯展示结构。
  - `apps/platform/src/pages/login/constants.ts` 维护动画、文案、样式常量与本地存储工具函数。
- `SearchPanel` 的字段渲染与显示策略统一沉淀到 `packages/ui/src/components/SearchPanel/searchPanel.helpers.tsx`，主组件仅保留状态编排与事件处理。
- 全局 `知识库 / 技能 / 智能体` 页面优先复用 `apps/platform/src/pages/assets/GlobalAssetManagementPage.tsx` 的共享壳层；项目内 `资源` 页只负责展示项目已接入资产。

## 7. 文档与协作入口

- `README.md`：面向仓库协作者的总入口，说明当前定位、启动方式、信息架构与文档索引。
- `docs/architecture.md`：项目结构、路由矩阵、数据来源、兼容策略的事实源。
- `docs/design/*`：品牌与视觉设计资料。
- `apps/platform/README.md`、`apps/api/README.md`：分别说明前端与 API 子系统的当前职责与边界。
- `.agent/PLANS.md`：复杂功能、迁移或高风险任务的执行计划模板。

## 8. 提交信息协作约定

- 当任务已达到可提交状态，且用户明确要求“生成 commit 记录 / 提交信息”，或表达“我来提交代码”的意图时，默认将提交信息草案作为交付物的一部分一并给出。
- 提交信息必须遵循全局 commit 规范，至少提供标题，以及 `Why`、`What`、`Validation`、`Risk` 四段正文；不得写入未执行的验证或未确认的结论。
- 若当前工作区包含多个单一目的改动，优先按变更边界拆分为多个 commit 草案，并说明推荐的提交顺序；不要为了凑一个提交而混合无关改动。
- 若存在未完成验证、既有阻塞或潜在回滚点，必须在提交草案中如实说明；除非用户明确要求直接提交，否则默认只生成草案，不执行 `git commit`。
