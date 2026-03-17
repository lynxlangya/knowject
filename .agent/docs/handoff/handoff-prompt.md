# Knowject 交接 Prompt 模板（2026-03-17）

## 使用方式

- 适用场景：
  - 你准备把当前工作交给下一位 AI
  - 你要把仓库和当前上下文交给新同学
  - 你希望下一位协作者先建立事实，再继续实现
- 使用原则：
  - 先交当前事实，再交目标任务
  - 先交文档入口，再交代码入口
  - 不把目标蓝图写成已落地能力

## AI 接手 Prompt

```md
你现在接手仓库 `/Users/langya/Documents/CodeHub/ai/knowject`。

你的第一目标不是立刻写代码，而是在不臆测的前提下建立当前事实，并基于当前事实继续推进任务。

请严格按以下顺序执行：

1. 先读这些文档：
   - `.agent/docs/handoff/handoff-guide.md`
   - `.agent/docs/current/architecture.md`
   - `.agent/docs/roadmap/gap-analysis.md`
   - `.agent/docs/plans/tasks-index-ops-project-consumption.md`
   - `.agent/docs/contracts/chroma-decision.md`
2. 只有在需要理解目标态或阶段路线时，再读：
   - `.agent/docs/roadmap/target-architecture.md`
   - `.agent/docs/plans/settings-page-task.md`
3. 核对这些源码入口：
   - `apps/platform/src/app/navigation/routes.tsx`
   - `apps/platform/src/app/navigation/routeRedirects.tsx`
   - `apps/platform/src/app/layouts/components/AppSider.tsx`
   - `apps/platform/src/app/project/ProjectContext.tsx`
   - `apps/platform/src/app/project/project.storage.ts`
   - `apps/platform/src/app/project/project.catalog.ts`
   - `apps/platform/src/pages/project/ProjectLayout.tsx`
   - `apps/platform/src/pages/project/ProjectChatPage.tsx`
   - `apps/platform/src/pages/project/project.mock.ts`
   - `apps/platform/src/pages/project/ProjectResourcesPage.tsx`
   - `apps/platform/src/pages/project/ProjectMembersPage.tsx`
   - `apps/platform/src/pages/skills/SkillsManagementPage.tsx`
   - `apps/platform/src/pages/agents/AgentsManagementPage.tsx`
   - `apps/api/src/app/create-app.ts`
   - `apps/api/src/modules/auth/*`
   - `apps/api/src/modules/members/*`
   - `apps/api/src/modules/projects/*`
   - `apps/api/src/modules/memberships/*`
   - `apps/api/src/modules/skills/*`
   - `apps/api/src/modules/agents/*`
   - `apps/api/src/routes/memory.ts`

在开始实施前，必须先明确以下结论：

- 当前项目列表、项目基础信息、成员 roster、项目资源绑定、项目私有知识目录和项目对话列表 / 详情已来自后端 `/api/projects*` 与 `/api/projects/:projectId/knowledge*`，但概览补充文案、成员协作快照仍依赖前端补充层。
- 后端已经落地 MongoDB、JWT、注册 / 登录、全局成员概览、最小项目 CRUD、成员接口、健康检查和 memory 演示接口。
- `/workspace`、`/home/project/*` 和旧 `knowledge|skills|agents` 项目路由都只是兼容入口。
- 项目资源页当前同时消费项目已绑定的全局资产和项目私有知识；知识库与 Skill / Agent 元数据优先来自 `/api/knowledge`、`/api/projects/:projectId/knowledge`、`/api/skills`、`/api/agents`。知识库分组现已补齐统一“接入知识库”弹层和知识库详情抽屉：全局绑定知识在项目内只读查看文档并允许解除绑定，项目私有知识则支持编辑、删除、上传文档和最小 diagnostics / rebuild 运维；全局 `/skills` 已支持自建、GitHub/URL 导入、编辑、预览、草稿/发布与删除，`/agents` 已有正式 CRUD / 绑定表单。
- `knowject_project_pins` 当前承载前端置顶偏好，`knowject_project_resource_bindings` 已退为历史资源绑定迁移缓存。
- `knowject_projects` 已退为历史本地 Mock 缓存键，当前只在首次刷新时作为一次性迁移源读取。
- 项目成员正式管理接口已经落地，前端成员页当前已切到正式后端 roster，全局成员页也已切到 `/api/members`。
- `GET /api/projects/:projectId/conversations` 与 `GET /api/projects/:projectId/conversations/:conversationId` 当前只提供只读链路；消息写入、项目 + 全局知识合并检索与最小来源引用尚未实现。
- 当前仓库没有单独新增 `Week 7-8` 计划文档；判断当前执行顺序时，应直接结合 `gap-analysis`、`tasks-index-ops-project-consumption.md` 的 Week 7-8 交接接口，以及 `handoff-guide.md`。

你的输出必须先包含：

- `Current Facts`
- `Assumptions`
- `Files To Touch`
- `Risks`
- `Validation`

执行约束：

- 以最小可行改动推进，不做未来抽象，不为了“显得完整”引入新层级。
- 改路由、数据来源、localStorage 键、API 边界或文档角色时，必须同步更新 `.agent/docs/current/architecture.md` 和 `.agent/docs/README.md`，必要时更新 `README.md` 与 `.agent/docs/contracts/auth-contract.md`。
- 不要把 `.agent/docs/roadmap/target-architecture.md` 中的目标能力表述成当前现状。
- 在没有完成正式消息写入、项目级合并检索，以及 Skill / Agent 运行时前，不要继续把更多真实业务逻辑堆进 `project.mock.ts` 和 `project.catalog.ts`。
- 当前如果要推进对话核心，默认顺序是：消息写链路 -> 项目 + 全局知识合并检索 -> 最小来源引用；`SSE`、Skill / Agent runtime 后置。
```

## 人类接手 Prompt

```md
你现在接手 Knowject 仓库，请先用 15 到 20 分钟建立当前事实，再决定具体实现。

请按以下步骤操作：

1. 阅读：
   - `.agent/docs/handoff/handoff-guide.md`
   - `.agent/docs/current/architecture.md`
   - `.agent/docs/roadmap/gap-analysis.md`
   - `.agent/docs/plans/tasks-index-ops-project-consumption.md`
   - 如果涉及登录或环境，再读 `.agent/docs/contracts/auth-contract.md`
   - 如果涉及检索分层或合并检索边界，再读 `.agent/docs/contracts/chroma-decision.md`
2. 打开以下源码确认文档没有过时：
   - `apps/platform/src/app/navigation/routes.tsx`
   - `apps/platform/src/app/layouts/components/AppSider.tsx`
   - `apps/platform/src/app/project/project.storage.ts`
   - `apps/platform/src/pages/project/ProjectLayout.tsx`
   - `apps/platform/src/pages/project/ProjectChatPage.tsx`
   - `apps/platform/src/pages/project/project.mock.ts`
   - `apps/platform/src/pages/project/ProjectMembersPage.tsx`
   - `apps/api/src/app/create-app.ts`
   - `apps/api/src/modules/auth/auth.service.ts`
   - `apps/api/src/modules/members/*`
   - `apps/api/src/modules/projects/*`
   - `apps/api/src/modules/memberships/*`
   - `apps/api/src/modules/skills/*`
   - `apps/api/src/modules/agents/*`
3. 在动手前先写清楚：
   - 当前真实已完成到哪里
   - 本次任务准备只改哪些文件
   - 哪些数据仍是 mock
   - 哪些行为是兼容跳转，不是 canonical 设计
   - 需要同步更新哪些文档
   - 当前仓库没有单独 Week 7-8 计划文档时，你将以哪几份文档组合判断优先级
4. 最小验证至少执行：
   - `pnpm verify:global-assets-foundation`
   - `pnpm verify:index-ops-project-consumption`
   - `pnpm check-types`
   - `pnpm lint`
   - `pnpm test`

请始终记住：

- 当前最稳定的是信息架构、产品壳、项目主数据、项目资源绑定、全局知识库 / 技能 / 智能体管理页、索引运维基线，以及项目私有 knowledge 最小闭环；消息写入与 AI 运行时仍未正式化。
- 当前 auth、全局成员概览、最小项目 CRUD、项目资源绑定、项目对话只读接口、Knowledge / Skill / Agent 全局资产接口、项目私有 knowledge 接口与成员接口已经落地；剩余主要断层在消息写入、项目级合并检索、Skill / Agent 运行时与检索融合链路。
- 当前若推进对话核心，默认不把 `SSE`、Skill / Agent runtime 与更重的 AI 框架一起打包进首轮实现。
- 如果你的改动影响路由、主数据来源、认证契约或存储键，文档必须同步更新。
```

## 交接时建议补充的 5 个字段

- `当前任务目标`
- `本次明确不做`
- `已验证结果`
- `遗留风险`
- `下一步最推荐动作`

## 一句话模板

把这句话加在你的交接消息开头，能显著降低误解：

> 请先根据 `.agent/docs/handoff/handoff-guide.md` 建立当前事实，再开始修改代码；不要把蓝图文档当成现状。
