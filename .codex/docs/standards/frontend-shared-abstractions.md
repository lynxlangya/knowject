# 前端通用封装治理标准

## 1. 目标
- 通过清晰边界判断何时将高频页面逻辑、样式或 state 抽象为项目共享能力，避免过度封装造成上下文失真。
- 保持 `apps/platform/src` 内现有故事线（如 `/knowledge`、`/skills`、`/agents` 页面）在复用抽象前的可观察性和可调试性。
- 让抽象以现实复用价值驱动（如多个页面共享 filter hook、detail shelf 组织、Tailwind token），而不是“看起来通用”或“提前封装”。

## 2. 触发条件
- 新增或重构以往在 `apps/platform/src/pages/knowledge`、`/skills`、`/agents` 等路由中多次复现的逻辑或结构时。
- 围绕高频视觉 token（radius/text/shadow）、common hook/adapter、loading/error 组织或 summary/action 结构已有多个 consumers。
- Tailwind 相关操作进入 canonical class 或 token 化阶段（参考 `apps/platform/src/pages` 相关 token 计划），但仍保留清晰归属。

## 3. 适合抽离的对象
- 高频特性：`KnowledgeManagementPage` / `SkillsManagementPage` / `AgentsManagementPage` 中重复的搜索/筛选控件、Loading/Error 组织、summary 行为、action 列表结构。
- 状态 Hook：在两个或以上页面/模块共享的 state/hook（如分页、筛选、健康检查订阅）时，可放入 `apps/platform/src/shared` 或 `hooks` 目录。
- 样式常量：Tailwind canonical class 统一、radius/text/shadow token 出台后可封装到主题 helper 供 `packages/ui` 与 `apps/platform` 复用，依据 Plans 中 FE-R12 经验。
- 结构模板：如 detail/diagnostics/reload token 再次复用的弹性布局或 `knowledgeUpload.shared.ts` 中的 payload 组织。

## 4. 不应过早抽象的场景
- 只在单个页面出现、且业务语义与未来抽象方向不明确的逻辑（例如临时数据对齐需求、短期 migration flow）不能提前提升到 shared layer。
- 经典情形：`Apps/platform` 侧栏、project 表单等已经具有明确结构的地方，过早做 “超级通用组件” 反而增加耦合并让调试变得困难，正如 Plans 中 FE-R11 ~ FE-R13 所提醒。
- Tailwind token 化还在探索阶段时，不应该把每个视觉特性都拔高为 theme helper；在 `arbitrary value` 阶段，先做 canonical clean，再评估 token reuse。

## 5. 推荐动作
- 开工前列出潜在共享候选，梳理实际 consumers、边界参数与变更频率，优先推进复用价值最高的部分（细粒度 context + action 排序）。
- 对可能的 shared hook/adapter 先开发 thin wrapper，避免引入沉重的上下文；只有在第 2 轮确认证明多处 reuse 时再抽离完整模块。
- 抽象后增加 smoke test：运行 `pnpm --filter platform lint/check-types/build`，确认新的 shared layer 无编译错误，并检查 `apps/platform/src/pages` 使用点是否保持可读。
- 复查 FE-R12 的 Tailwind token baseline，确保 canonical class、token 名称与 `packages/ui`/`apps/platform` 中既有主题一致。

## 6. 允许例外
- 当新特性在短期内（一个 sprint 内）会扩散到多个页面，但暂未达到成熟复用时，可先保留“复制”实现；在实现成熟后再统一抽象。
- 某些项目级特殊布局（如 project 资源篇章、智体目录）可能需要更强的定制化抽象；只要保证该抽象明确归属，仍可接受。

## 7. 文档同步要求
- 抽象治理变动后，更新 `.codex/docs/plans/tasks-platform-frontend-refactor.md` 中的相关 milestone（如 FE-R11~FE-R13、token baseline），并说明复用点。
- 同步 `.codex/docs/current/architecture.md` 中前端架构/路由描述，确保抽象后的组件层级仍能被理解。
- 若新抽象影响 `packages/ui` 的共享组件/样式，需要同时更新 `.codex/docs/standards/code-structure-governance.md` 或 `core-code-commenting` 中对应条目，并通知页面 owner。
