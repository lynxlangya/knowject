# 文档迭代与交接执行计划（2026-03-10）

## 2026-03-14 增量同步说明

- 触发提交：`df7c2ea feat(skills): 增加 Skill 资产治理与绑定校验链路`
- 本次增量范围：
  - 把 `/skills` 从“系统内置只读目录”的旧表述统一升级为“正式 Skill 资产治理链路”的当前事实。
  - 同步 README、handoff、roadmap、contracts 与 `.agent/gpt/*` 上传副本里的旧描述。
  - 保留本文件作为 2026-03-10 首轮文档治理计划记录，但以下涉及 Skill 的事实均以后续源码与最新同步结果为准。

## 目标

基于当前仓库代码事实和已落地的新业务逻辑，完成一轮文档迭代，明确“现在是什么”“接下来怎么继续”“如何把上下文准确交给下一位 AI 或人类”。

## 事实基线

- 真相源文件：
  - `.agent/docs/current/architecture.md`
  - `.agent/docs/roadmap/gap-analysis.md`
  - `.agent/docs/contracts/auth-contract.md`
  - `apps/platform/src/app/navigation/routes.tsx`
  - `apps/platform/src/app/layouts/components/AppSider.tsx`
  - `apps/platform/src/app/project/ProjectContext.tsx`
  - `apps/platform/src/app/project/project.storage.ts`
  - `apps/platform/src/pages/project/ProjectResourcesPage.tsx`
  - `apps/api/src/app/create-app.ts`
  - `apps/api/src/modules/auth/*`
  - `apps/api/src/routes/memory.ts`
- 当前实现摘要：
  - 前端产品壳、项目页 canonical 路由、全局资产正式管理页和项目资源消费层已经收敛。
  - 前端登录页已经接入正式注册 / 登录、JWT、用户快照和“记住用户名”。
  - 后端已经完成 `health / auth / members / projects / memberships / knowledge / skills / agents / memory` 正式基线，前端项目列表、项目基础信息、成员 roster、全局资产页与资源绑定已接到后端。
  - 项目资源绑定已写入后端项目模型，`knowject_projects` 已退为历史 Mock 缓存键。
- 已确认的路由 / 接口 / 数据来源：
  - canonical 路由：`/home`、`/project/:projectId/*`
  - 兼容路由：`/workspace`、`/home/project/*`、`/project/:projectId/knowledge|skills|agents`
  - 现有接口：`GET /api/health`、`POST /api/auth/register`、`POST /api/auth/login`、`GET /api/auth/users`、`GET /api/members`、`GET /api/projects`、`POST /api/projects`、`PATCH /api/projects/:projectId`、`DELETE /api/projects/:projectId`、`POST /api/projects/:projectId/members`、`PATCH /api/projects/:projectId/members/:userId`、`DELETE /api/projects/:projectId/members/:userId`、`GET /api/knowledge`、`POST /api/knowledge`、`POST /api/knowledge/search`、`GET /api/skills`、`GET /api/skills/:skillId`、`POST /api/skills`、`POST /api/skills/import`、`PATCH /api/skills/:skillId`、`DELETE /api/skills/:skillId`、`GET /api/agents`、`GET /api/agents/:agentId`、`POST /api/agents`、`PATCH /api/agents/:agentId`、`DELETE /api/agents/:agentId`、`GET /api/memory/overview`、`POST /api/memory/query`
  - 项目态页面主数据来源：后端 `ProjectContext + /api/projects*`，辅以前端 `project.storage + project.catalog + project.mock`
- 已知历史兼容或废弃项：
  - `/workspace` 仅作兼容入口，必须重定向到 `/home`
  - `/home/project/*` 仅作兼容跳转，不再作为业务 canonical
  - 目标蓝图文档不能直接当成当前事实源

## 背景

- 相关文件：
  - `README.md`
  - `.agent/docs/README.md`
  - `.agent/docs/current/architecture.md`
  - `.agent/docs/roadmap/target-architecture.md`
  - `.agent/docs/roadmap/gap-analysis.md`
  - `.agent/docs/contracts/auth-contract.md`
- 当前行为：
  - 现有文档已经完成“当前事实 / 目标蓝图 / 差距分析”的初步分层。
  - 但对“新接手者如何快速建立事实”和“这一轮新增业务逻辑应该看哪里”仍缺少统一入口。
  - 当前业务事实里有几处容易被误读：
    - 登录页已经是正式 auth 接口接入，不再是纯演示入口。
    - 项目侧栏创建 / 编辑流程已经把资源绑定字段写回后端项目模型，但项目资源页中的 `agents` 仍保留 fallback。
    - 全局 `/skills` 已升级为正式 Skill 资产治理页，支持自建、GitHub/URL 导入、编辑、预览、草稿/发布与删除；`/agents` 已有正式 CRUD / 绑定写路径；`GlobalAssetManagementPage.tsx` 已退为历史壳层。
    - 项目资源页会消费兼容跳转带来的 `focus` 查询参数，但 canonical URL 仍保持无查询串。
- 代码 / 配置证据：
  - `apps/platform/src/pages/login/LoginPage.tsx`
  - `apps/platform/src/pages/login/constants.ts`
  - `apps/platform/src/app/layouts/components/AppSider.tsx`
  - `apps/platform/src/pages/project/ProjectResourcesPage.tsx`
  - `apps/api/src/middleware/secure-transport.ts`
- 约束：
  - 只能把源码可印证的事实写入事实文档。
  - 目标态、路线图和当前事实必须继续分层维护。
  - 本次以最小 diff 完成文档收口，不引入新的“理想态说明”文档。
- 依赖 / 阻塞：
  - 无代码阻塞，主要依赖当前文档与源码一致性核对。
- 假设：
  - 本轮不调整产品目标蓝图，只更新当前事实、接手路径和交接模板。
- 风险：
  - 若把 handoff 文档写成“未来建议大全”，会再次和事实文档角色混淆。

## 影响文档

- 需要同步的文档：
  - `README.md`
  - `README.zh-CN.md`
  - `apps/api/README.md`
  - `apps/platform/README.md`
  - `.agent/docs/README.md`
  - `.agent/docs/current/architecture.md`
  - `.agent/docs/contracts/chroma-decision.md`
  - `.agent/docs/roadmap/target-architecture.md`
  - `.agent/docs/roadmap/gap-analysis.md`
  - `.agent/docs/plans/doc-iteration-handoff-plan.md`
  - `.agent/docs/handoff/handoff-guide.md`
  - `.agent/docs/handoff/chatgpt-project-brief.md`
  - `.agent/docs/handoff/handoff-prompt.md`
  - `.agent/gpt/README.md`
  - `.agent/gpt/PROJECT_BRIEF.md`
  - `.agent/gpt/CURRENT_ARCHITECTURE.md`
  - `.agent/gpt/GAP_ANALYSIS.md`
  - `.agent/gpt/INDEXING_DECISION.md`
  - `.agent/gpt/WEEK3_4_TASKS.md`
- 不需要同步的文档：
  - `.agent/docs/plans/tasks-foundation-framework.md`
  - `.agent/docs/contracts/auth-contract.md`
- 同步原因：
  - 最新提交已经改变了 Skill 资产治理的当前事实边界，并影响当前事实、接手入口、目标状态注释和上传副本的一致性。

## 范围

本次要做：

- 补齐当前事实文档中遗漏的新业务逻辑。
- 为接手者新增一份 15 分钟可用的快速上手文档。
- 为下一位 AI / 人类新增一份可直接复制使用的 handoff prompt。
- 更新文档导航，明确各文档角色与阅读顺序。

本次不做：

- 不改动业务代码、路由或接口行为。
- 不重写历史计划文档的原始意图，只对会误导当前事实判断的段落做增量收口。
- 不新增额外的需求分析、路线图或架构理想态文档。

## 执行方案

先以 `.agent/docs/current/architecture.md` 为事实锚点，补齐当前文档里遗漏但源码已落地的业务逻辑。  
然后新增两份衔接文档：一份负责“人和 AI 怎么快速接手”，一份负责“把上下文准确交给下一位”。  
最后更新 `.agent/docs/README.md` 和仓库根 `README.md`，让协作者从入口就能选对文档，而不是在多个文档之间来回猜。

## 里程碑

### 里程碑 1

- 目标：完成事实核对并固定本轮文档边界
- 预期结果：明确哪些属于事实补丁，哪些应放入 handoff 文档
- 验证方式：源码与现有文档逐项对照

### 里程碑 2

- 目标：落地接手指南和 handoff prompt
- 预期结果：新接手者能在单个 `.agent/docs/` 目录内找到事实、计划、交接入口
- 验证方式：检查文档导航、阅读顺序和引用文件是否闭环

## 具体步骤

1. 改哪些文件：
   - `.agent/docs/current/architecture.md`
   - `.agent/docs/README.md`
   - `README.md`
   - `.agent/docs/plans/doc-iteration-handoff-plan.md`
   - `.agent/docs/handoff/handoff-guide.md`
   - `.agent/docs/handoff/handoff-prompt.md`
2. 执行哪些命令：
   - 使用 `sed` / `rg` 核对路由、鉴权、存储键和数据来源事实
   - 使用 `pnpm check-types`
3. 需要同步哪些 README / AGENTS / docs：
   - 同步 `.agent/docs/README.md` 与根 `README.md`
   - 本次不需要更新 `AGENTS.md`
4. 预期产出是什么：
   - 一份本轮执行计划
   - 一份快速接手指南
   - 一份可直接复制的交接 Prompt
   - 一版补齐业务事实后的架构文档

## 验证方式

- 自动验证：
  - `pnpm check-types`
  - 结果：2026-03-10 已执行，通过
- 手动验证：
  - 检查 `.agent/docs/README.md` 中的阅读顺序、角色表和维护边界是否覆盖新增文档
  - 检查 `.agent/docs/current/architecture.md` 中新增业务事实是否都能在源码中找到对应证据
- 文档一致性检查：
  - 确认 `README.md`、`.agent/docs/README.md`、`.agent/docs/handoff/handoff-guide.md` 对新增文档的入口描述一致
- 最小验收结果：
  - 新接手者可以只依赖 `.agent/docs/` 下文档建立当前事实，并知道下一步该读什么、改什么、验什么

## 风险与回滚

- 风险：
  - handoff 文档和事实文档边界再次混写
  - 入口文档新增过多后反而提高阅读负担
- 回滚方式：
  - 删除新增 handoff 文档，并把入口回退到 `.agent/docs/current/architecture.md + .agent/docs/README.md`
- 是否可重试：
  - 可重试，且属于纯文档回滚

## 进度

- [x] 完成现有文档与源码事实核对
- [x] 固定本轮目标文件与执行边界
- [x] 更新事实文档与导航文档
- [x] 新增接手指南与 handoff prompt
- [x] 运行验证并补结果总结

## 发现记录

- `ProjectSummary` 目前混合了承担“项目基础信息”和“前端资源绑定”两类职责。
- 项目资源页的 `focus` 查询参数只服务兼容跳转，不应被误判为新的 canonical 路由设计。
- 全局资产管理页已经有治理入口壳层，但创建 / 引入仍是占位行为。

## 决策记录

- 决策：
  - 把执行计划也沉淀到 `.agent/docs/`，而不是只留在回复中
- 原因：
  - 用户明确要求执行计划和高价值文档都要沉淀，且后续接手者需要看到“为什么要改这些文档”
- 备选方案：
  - 使用 `.agent/docs/templates/PLANS.md` 仅保留模板，不新增本轮计划文档

## 结果总结

- 已完成：
  - 固定本轮文档范围与交付物
  - 明确新增 handoff 文档的角色分工
  - 已执行 `pnpm check-types`，结果通过
- 未完成：
  - 暂无
- 后续建议：
  - 下次若进入项目 / 成员正式接口开发，应直接复用本文件结构记录“代码事实变化 + handoff 影响面”
