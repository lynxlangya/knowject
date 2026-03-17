# Knowject 快速接手指南（2026-03-17）

## 目标

让新接手的 AI 或人类协作者在 15 分钟内建立正确事实，不把目标蓝图误当成当前实现，也不遗漏这轮已经落地的新业务逻辑。

## 先记住 4 个判断

1. 当前事实以 `.agent/docs/current/architecture.md` 和源码为准，不以蓝图文档为准。
2. 当前产品主线已经进入“前后端基础框架、索引运维基线、项目私有 knowledge 最小闭环与工作区设置中心都已接通，当前迭代重点是项目对话写链路与项目级合并检索”的阶段，而不是单纯“前端产品壳 + 演示 API”。
3. 后端已经完成 auth、members、最小项目 CRUD 和成员接口，前端项目列表、项目基础信息、成员 roster 与全局成员概览也已切到数据库接口。
4. canonical 路由已经稳定，兼容路由只做跳转，不应再回退成业务主入口。

补充一条：

- 当前仓库没有单独新增 `Week 7-8` 计划文档；需要判断当前执行顺序时，直接组合阅读 `.agent/docs/roadmap/gap-analysis.md`、`.agent/docs/plans/tasks-index-ops-project-consumption.md` 中的“Week 7-8 的交接接口”，以及本文的继续开发顺序。

## 10 到 15 分钟阅读顺序

1. 先读 `.agent/docs/current/architecture.md`
2. 再读 `.agent/docs/roadmap/gap-analysis.md`
3. 再读 `.agent/docs/plans/tasks-index-ops-project-consumption.md`
4. 只有在需要判断 Week 7-10 目标边界时，再读 `.agent/docs/roadmap/target-architecture.md`，重点看 `5.3 Week 7-8 对话核心`
5. 涉及 Chroma、namespace、metadata 与检索分层时读 `.agent/docs/contracts/chroma-decision.md`
6. 涉及工作区设置中心、effective AI config 或 `/api/settings/*` 时读 `.agent/docs/plans/settings-page-task.md`
7. 涉及登录、JWT、环境变量时读 `.agent/docs/contracts/auth-contract.md`
8. 如果是要给 ChatGPT / 外部模型快速补上下文，可先喂 `.agent/docs/handoff/chatgpt-project-brief.md`
9. 最后核对以下源码入口：
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
   - `apps/platform/src/pages/settings/SettingsPage.tsx`
   - `apps/platform/src/api/settings.ts`
   - `apps/api/src/app/create-app.ts`
   - `apps/api/src/config/ai-config.ts`
   - `apps/api/src/modules/auth/*`
   - `apps/api/src/modules/members/*`
   - `apps/api/src/modules/projects/*`
   - `apps/api/src/modules/memberships/*`
   - `apps/api/src/modules/knowledge/*`
   - `apps/api/src/modules/skills/*`
   - `apps/api/src/modules/agents/*`
   - `apps/api/src/modules/settings/*`
   - `apps/api/src/routes/memory.ts`

## 当前业务逻辑的最小事实包

### 1. 登录与鉴权

- `/login` 已经不是纯 UI 演示页，而是正式接入 `POST /api/auth/register` 和 `POST /api/auth/login` 的认证入口。
- 登录页采用同页登录 / 注册模式切换，不新增 `/register` 路由。
- 登录成功后会写入：
  - `localStorage['knowject_token']`
  - `localStorage['knowject_auth_user']`
- “记住用户名”会写入 `localStorage['knowject_remembered_username']`。
- `/api/auth/*`、`/api/settings/*` 与 `/api/memory/*` 在生产环境要求 HTTPS，并附带 `Cache-Control: no-store`。

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

- 项目列表由 `ProjectContext` 管理，并直接消费 `GET /api/projects`。
- 当前前端本地只保留两类项目相关状态：
  - `knowject_project_pins`：项目置顶偏好
  - `knowject_project_resource_bindings`：历史项目资源绑定迁移缓存
- 当前运行时 `ProjectSummary` 会把后端项目基础字段、成员 roster、后端资源绑定与前端本地 pin 合并成页面消费模型。
- `isPinned` 仍只是前端展示偏好，不进入后端正式项目模型。
- 项目创建 / 编辑弹框当前会把 `name / description / knowledgeBaseIds / skillIds / agentIds` 一并提交到后端项目模型。

### 4. 项目页与全局资产页

- 项目页的正式读链路已经补到三块：
  - 项目对话列表 / 详情来自 `/api/projects/:projectId/conversations*`
  - 项目资源绑定来自 `/api/projects`
  - 资源页知识分组同时消费 `/api/knowledge` 与 `/api/projects/:projectId/knowledge`
- 项目 `资源` 页当前同时展示“项目绑定的全局资产”和“项目私有知识”，不是全局治理入口；知识库分组现已补齐统一“接入知识库”入口和详情抽屉。
- 全局绑定知识在项目内保持只读：可查看文档、解除绑定、跳转全局治理，但不在项目页直接编辑或删除全局知识内容。
- 项目私有知识在项目内支持轻维护：创建、编辑、删除、上传文档、文档级 retry / rebuild / delete，以及最小 diagnostics / rebuild 操作。
- `project.mock.ts` 当前主要保留项目概览补充文案、成员协作快照，以及项目资源展示映射补充层。
- 全局 `/knowledge`、`/skills`、`/agents` 页面已分别接入正式接口；其中 `/skills` 已支持原生 `SKILL.md` 自建、GitHub/URL 导入、编辑、预览、草稿/发布与删除，`/agents` 已支持创建 / 编辑 / 删除与知识库 / Skill 绑定。
- 全局 `/settings` 页面已正式接入 `/api/settings/*`：embedding / LLM / indexing / workspace 配置都走数据库优先、环境变量回退的 effective config 逻辑；本期访问控制固定为“所有已登录用户可访问”。
- 成员数据现在分两层：
  - 全局成员基础档案在 `project.catalog.ts`
  - 项目成员协作快照在 `project.mock.ts`
- 成员页当前已完全切到正式后端 roster 管理；`project.mock.ts` 里的成员协作快照只保留给概览头部等演示展示。

### 5. 后端当前边界

- `apps/api` 现在的正式落地部分是：
  - MongoDB 连接与 health 诊断
  - 用户注册 / 登录
  - `argon2id` 密码哈希
  - JWT 鉴权中间件
  - 全局成员概览 `GET /api/members`
  - 项目模型与 `GET/POST/PATCH/DELETE /api/projects`
  - 项目资源绑定字段 `knowledgeBaseIds / agentIds / skillIds`
  - 项目对话只读接口 `GET /api/projects/:projectId/conversations*`
  - 项目成员管理接口 `/api/projects/:projectId/members*`
  - 已注册用户搜索 `GET /api/auth/users`
  - 全局 Skill 正式资产接口 `GET /api/skills*`、`POST /api/skills`、`POST /api/skills/import`、`PATCH /api/skills/:skillId`、`DELETE /api/skills/:skillId`
  - 全局 Agent 正式 CRUD 与绑定校验 `/api/agents*`
  - 工作区设置中心 `/api/settings*`
  - 知识库 CRUD、文档上传、状态推进、rebuild / diagnostics 与统一检索
  - 项目私有知识 `list / create / detail / upload`
  - `memory/overview` 与 `memory/query` 演示接口
- 当前知识索引不再使用“固定 collection 名”假设：namespace key 仍稳定，但物理 collection 已改为 versioned naming，并通过 Mongo 里的 active pointer 切换；模型切换后要做 namespace 级全量重建，而不是重启服务。
- 因此当前项目页内容应写成“项目主数据、资源绑定、项目私有知识、对话读链路、成员关系与工作区设置中心已经切到后端，但消息写入、项目级合并检索与 Skill / Agent 运行时仍未完成”；基础框架阶段与 Week 5-6 基线本身已完成。

## 如果你要继续开发，先按这个顺序推进

1. 保持当前 canonical 路由和信息架构稳定，不再做大幅重命名。
2. 优先补项目对话消息写路径。
3. 在消息写路径稳定后，再推进项目 + 全局知识合并检索与最小来源引用。
4. `SSE`、Skill runtime、Agent 编排和更完整的 AI 主链路继续后置，不要和消息写侧一起打包推进。
5. 最后再逐步替换概览补充文案和成员协作快照这些剩余展示 Mock。

这个顺序的理由很简单：当前最大断层已经从“项目主数据没接后端”切换为“消息写路径、合并检索与最小引用仍未形成”，而不是先缺 `SSE` 或更重的 runtime 框架。

## 这一轮文档迭代做了什么

- 补齐了 `.agent/docs/current/architecture.md` 里遗漏的新业务事实：
  - 记住用户名缓存
  - 项目资源绑定已进入后端项目模型
  - 项目对话读链路已接入正式 `/api/projects/:projectId/conversations*`
  - `resources?focus=*` 的兼容定位逻辑
  - 全局 `/skills`、`/agents` 正式接线、Skill 资产治理闭环与历史壳层退场现状
- README、子系统 README 与 handoff 文档已同步新增 `pnpm test` 入口和项目读链路现状。
- 新增了三份文档：
  - `.agent/docs/plans/doc-iteration-handoff-plan.md`
  - `.agent/docs/handoff/handoff-guide.md`
  - `.agent/docs/handoff/handoff-prompt.md`
- 更新了 `.agent/docs/README.md` 和根 `README.md`，把“事实 / 接手 / 交接”入口收口到 `.agent/docs/`。
- 本轮又补充收口了一层“当前迭代重点”说明：当前没有独立 Week 7-8 计划文档，继续开发时应直接按 gap-analysis、Week 5-6 交接接口与 handoff 文档组合判断顺序。

## 接手后最容易犯的错

- 把 `.agent/docs/roadmap/target-architecture.md` 当成当前实现说明。
- 把 `knowject_project_resource_bindings` 当成仍在运行时驱动项目资源页的主状态，而忽略它已经退为迁移缓存。
- 看到 `/api/projects/:projectId/conversations*` 已落地，就误判“消息写入、来源引用和对话检索也已经完成”。
- 以为仓库里已经有一份单独的 Week 7-8 执行计划文档，结果错过了真正的当前入口。
- 把 `/project/:projectId/resources?focus=*` 当成新的 canonical 设计，而不是兼容跳转。
- 在剩余的 `project.mock.ts` 和 `project.catalog.ts` 补充层上继续堆更多真实业务逻辑。

## 文档同步规则

- 路由、重定向、页面命名、localStorage 键、主数据来源变化：
  - 先改 `.agent/docs/current/architecture.md`
  - 再改 `.agent/docs/README.md`
  - 必要时改根 `README.md`
- JWT、认证、环境变量、安全边界变化：
  - 同步 `.agent/docs/contracts/auth-contract.md`
- 目标态、阶段规划、蓝图边界变化：
  - 同步 `.agent/docs/roadmap/target-architecture.md` 与 `.agent/docs/roadmap/gap-analysis.md`
- 需要把工作继续交给下一位协作者：
  - 更新 `.agent/docs/handoff/handoff-guide.md`
  - 视情况更新 `.agent/docs/handoff/handoff-prompt.md`

## 最小验证

```bash
pnpm check-types
pnpm lint
pnpm test
pnpm verify:index-ops-project-consumption
```

如果你要接着改业务代码，建议再补：

```bash
pnpm build
```

## 一句话结论

现在最重要的不是“继续美化壳层”，而是让接手者清楚：前端壳层、索引运维基线、工作区设置中心和项目私有知识最小闭环已经稳定，剩余主要断层在消息写路径、项目级合并检索与 AI 主链路。
