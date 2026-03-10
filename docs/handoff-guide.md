# Knowject 快速接手指南（2026-03-10）

## 目标

让新接手的 AI 或人类协作者在 15 分钟内建立正确事实，不把目标蓝图误当成当前实现，也不遗漏这轮已经落地的新业务逻辑。

## 先记住 4 个判断

1. 当前事实以 `docs/architecture.md` 和源码为准，不以蓝图文档为准。
2. 当前产品主线仍是“前端产品壳 + 本地 Mock + 演示 API”。
3. 后端已经完成 auth 基线，但项目主数据还没有切到数据库。
4. canonical 路由已经稳定，兼容路由只做跳转，不应再回退成业务主入口。

## 10 到 15 分钟阅读顺序

1. 先读 `docs/architecture.md`
2. 再读 `docs/gap-analysis.md`
3. 涉及登录、JWT、环境变量时读 `docs/auth-contract.md`
4. 只有需要理解目标态时，再读 `docs/target-architecture.md`
5. 最后核对以下源码入口：
   - `apps/platform/src/app/navigation/routes.tsx`
   - `apps/platform/src/app/navigation/routeRedirects.tsx`
   - `apps/platform/src/app/layouts/components/AppSider.tsx`
   - `apps/platform/src/app/project/ProjectContext.tsx`
   - `apps/platform/src/app/project/project.storage.ts`
   - `apps/platform/src/app/project/project.catalog.ts`
   - `apps/platform/src/pages/project/project.mock.ts`
   - `apps/platform/src/pages/project/ProjectResourcesPage.tsx`
   - `apps/api/src/app/create-app.ts`
   - `apps/api/src/modules/auth/*`
   - `apps/api/src/routes/memory.ts`

## 当前业务逻辑的最小事实包

### 1. 登录与鉴权

- `/login` 已经不是纯 UI 演示页，而是正式接入 `POST /api/auth/register` 和 `POST /api/auth/login` 的认证入口。
- 登录页采用同页登录 / 注册模式切换，不新增 `/register` 路由。
- 登录成功后会写入：
  - `localStorage['knowject_token']`
  - `localStorage['knowject_auth_user']`
- “记住用户名”会写入 `localStorage['knowject_remembered_username']`。
- `/api/auth/*` 与 `/api/memory/*` 在生产环境要求 HTTPS，并附带 `Cache-Control: no-store`。

### 2. 信息架构与路由

- 登录后默认落点是 `/home`。
- canonical 项目路由固定为：
  - `/project/:projectId/overview`
  - `/project/:projectId/chat`
  - `/project/:projectId/chat/:chatId`
  - `/project/:projectId/resources`
  - `/project/:projectId/members`
- 兼容入口：
  - `/workspace` -> `/home`
  - `/home/project/*` -> `/project/:projectId/*`
  - `/project/:projectId/knowledge|skills|agents` -> `/project/:projectId/resources?focus=*`
- `resources?focus=*` 只是兼容跳转的临时定位参数；页面滚动到目标分组后会回写 canonical URL。

### 3. 项目数据模型和前端状态

- 项目列表由 `ProjectContext` 管理，并持久化在 `knowject_projects`。
- 当前 `ProjectSummary` 同时承载两类信息：
  - 项目基础字段：`id / name / description / createdAt / isPinned`
  - 前端资源绑定字段：`knowledgeBaseIds / memberIds / agentIds / skillIds`
- 这意味着当前项目创建 / 编辑弹框不仅在改项目基础信息，也在改“项目绑定了哪些全局资产和成员”的前端 mock 配置。
- `isPinned` 目前只是前端展示偏好，不是后端模型事实。

### 4. 项目页与全局资产页

- 项目页的 `概览 / 对话 / 资源 / 成员` 四页都还主要依赖 `project.mock.ts` 和 `project.catalog.ts`。
- 项目 `资源` 页只消费“当前项目已绑定的全局资产”，不是全局治理入口。
- 全局 `知识库 / 技能 / 智能体` 页面已经有治理壳层，但“新建资产 / 引入到项目”仍是占位交互，没有真实数据写入。
- 成员数据现在分两层：
  - 全局成员基础档案在 `project.catalog.ts`
  - 项目成员协作快照在 `project.mock.ts`

### 5. 后端当前边界

- `apps/api` 现在的正式落地部分是：
  - MongoDB 连接与 health 诊断
  - 用户注册 / 登录
  - `argon2id` 密码哈希
  - JWT 鉴权中间件
  - `memory/overview` 与 `memory/query` 演示接口
- `projects` 和 `memberships` 只建立了模块边界，正式 CRUD 还没做。
- 因此当前项目页内容不能被误写成“后端已接管”。

## 如果你要继续开发，先按这个顺序推进

1. 保持当前 canonical 路由和信息架构稳定，不再做大幅重命名。
2. 先补 `projects / memberships` 的正式后端模型和接口。
3. 再把前端 `knowject_projects` 主数据源逐步切换到后端。
4. 最后再考虑真实 Knowledge / Skill / Agent 数据结构和对话链路。

这个顺序的理由很简单：当前最大断层不在 UI，而在正式项目主数据和权限主线。

## 这一轮文档迭代做了什么

- 补齐了 `docs/architecture.md` 里遗漏的新业务事实：
  - 记住用户名缓存
  - 项目本地模型中的资源绑定字段
  - `resources?focus=*` 的兼容定位逻辑
  - 全局资产页占位交互现状
- 新增了三份文档：
  - `docs/doc-iteration-handoff-plan.md`
  - `docs/handoff-guide.md`
  - `docs/handoff-prompt.md`
- 更新了 `docs/README.md` 和根 `README.md`，把“事实 / 接手 / 交接”入口收口到 `docs/`。

## 接手后最容易犯的错

- 把 `docs/target-architecture.md` 当成当前实现说明。
- 忽略 `knowject_projects` 里其实还混着资源绑定字段，直接按正式后端模型理解前端行为。
- 看到 `/api/projects` 模块边界就误判“项目 CRUD 已完成”。
- 把 `/project/:projectId/resources?focus=*` 当成新的 canonical 设计，而不是兼容跳转。
- 在没有正式项目数据模型前，继续往 `project.mock.ts` 和 `project.catalog.ts` 里堆更多业务逻辑。

## 文档同步规则

- 路由、重定向、页面命名、localStorage 键、主数据来源变化：
  - 先改 `docs/architecture.md`
  - 再改 `docs/README.md`
  - 必要时改根 `README.md`
- JWT、认证、环境变量、安全边界变化：
  - 同步 `docs/auth-contract.md`
- 目标态、阶段规划、蓝图边界变化：
  - 同步 `docs/target-architecture.md` 与 `docs/gap-analysis.md`
- 需要把工作继续交给下一位协作者：
  - 更新 `docs/handoff-guide.md`
  - 视情况更新 `docs/handoff-prompt.md`

## 最小验证

```bash
pnpm check-types
```

如果你要接着改业务代码，建议再补：

```bash
pnpm build
```

## 一句话结论

现在最重要的不是“继续美化壳层”，而是让接手者清楚：前端壳层已经稳定，auth 已落地，项目主数据主线还没真正进入后端。
