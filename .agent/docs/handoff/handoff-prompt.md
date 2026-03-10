# Knowject 交接 Prompt 模板（2026-03-10）

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
   - `.agent/docs/contracts/auth-contract.md`
   - `.agent/docs/plans/tasks-foundation-framework.md`
2. 只有在需要理解目标态或阶段路线时，再读：
   - `.agent/docs/roadmap/target-architecture.md`
3. 核对这些源码入口：
   - `apps/platform/src/app/navigation/routes.tsx`
   - `apps/platform/src/app/navigation/routeRedirects.tsx`
   - `apps/platform/src/app/layouts/components/AppSider.tsx`
   - `apps/platform/src/app/project/ProjectContext.tsx`
   - `apps/platform/src/app/project/project.storage.ts`
   - `apps/platform/src/app/project/project.catalog.ts`
   - `apps/platform/src/pages/project/project.mock.ts`
   - `apps/platform/src/pages/project/ProjectResourcesPage.tsx`
   - `apps/platform/src/pages/project/ProjectMembersPage.tsx`
   - `apps/api/src/app/create-app.ts`
   - `apps/api/src/modules/auth/*`
   - `apps/api/src/modules/members/*`
   - `apps/api/src/modules/projects/*`
   - `apps/api/src/modules/memberships/*`
   - `apps/api/src/routes/memory.ts`

在开始实施前，必须先明确以下结论：

- 当前项目列表、项目基础信息和成员 roster 已来自后端 `/api/projects*`，但概览 / 对话 / 资源仍部分依赖前端 Mock 与本地绑定。
- 后端已经落地 MongoDB、JWT、注册 / 登录、全局成员概览、最小项目 CRUD、成员接口、健康检查和 memory 演示接口。
- `/workspace`、`/home/project/*` 和旧 `knowledge|skills|agents` 项目路由都只是兼容入口。
- 项目资源页只负责消费项目已绑定的全局资产，全局资产页仍是治理壳层，占位交互未落地真实写操作。
- `knowject_project_pins` 当前承载前端置顶偏好，`knowject_project_resource_bindings` 当前承载前端资源绑定。
- `knowject_projects` 已退为历史本地 Mock 缓存键，当前只在首次刷新时作为一次性迁移源读取。
- 项目成员正式管理接口已经落地，前端成员页当前已切到正式后端 roster，全局成员页也已切到 `/api/members`。

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
- 在没有完成正式资源绑定 / 对话数据切换前，不要继续把更多真实业务逻辑堆进 `project.mock.ts` 和 `project.catalog.ts`。
```

## 人类接手 Prompt

```md
你现在接手 Knowject 仓库，请先用 15 到 20 分钟建立当前事实，再决定具体实现。

请按以下步骤操作：

1. 阅读：
   - `.agent/docs/handoff/handoff-guide.md`
   - `.agent/docs/current/architecture.md`
   - `.agent/docs/roadmap/gap-analysis.md`
   - 如果涉及基础框架阶段边界，再读 `.agent/docs/plans/tasks-foundation-framework.md`
   - 如果涉及登录或环境，再读 `.agent/docs/contracts/auth-contract.md`
2. 打开以下源码确认文档没有过时：
   - `apps/platform/src/app/navigation/routes.tsx`
   - `apps/platform/src/app/layouts/components/AppSider.tsx`
   - `apps/platform/src/app/project/project.storage.ts`
   - `apps/platform/src/pages/project/project.mock.ts`
   - `apps/platform/src/pages/project/ProjectMembersPage.tsx`
   - `apps/api/src/app/create-app.ts`
   - `apps/api/src/modules/auth/auth.service.ts`
   - `apps/api/src/modules/members/*`
   - `apps/api/src/modules/memberships/*`
3. 在动手前先写清楚：
   - 当前真实已完成到哪里
   - 本次任务准备只改哪些文件
   - 哪些数据仍是 mock
   - 哪些行为是兼容跳转，不是 canonical 设计
   - 需要同步更新哪些文档
4. 最小验证至少执行：
   - `pnpm check-types`

请始终记住：

- 当前最稳定的是信息架构、产品壳和项目主数据主链路；资源绑定、对话与 AI 能力仍未正式化。
- 当前 auth、全局成员概览、最小项目 CRUD、项目主数据和成员接口已经落地；剩余主要断层在资源绑定与会话数据链路。
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
