# 代码结构治理标准

## 1. 目标

- 把结构治理当作每一轮改动的第一道判断：在 `tasks-engineering-governance-foundation.md` 里已将“代码结构治理”定义为第一阶段主线，本标准补充具体评判依据，让涉及巨石文件的痛点被记录并带着方向落地，而不是等 reviewer 发现堆叠逻辑后再临时拆。
- 通过明确“职责边界 + 结构评估 + 计划/评审同步”的闭环，使得重型业务流程即使暂时无法拆分，也能交待为什么未拆、何时重审，从而让结构治理可解释、可落地、可维护。

## 2. 触发条件

- 任何文件行数逼近或超过 550 行（`tasks-platform-frontend-refactor.md` 事实基线列出 `ProjectChatPage.tsx` 917 行、`AppSider.tsx` 862 行），且在单文件中还能同时看到编排、副作用、状态、数据映射、adapter/helper 等多重职责。
- service/repository façade 开始承载 Chroma/Indexer/DB 的具体实现（`tasks-service-indexing-refactor.md` 中 `SR-40~SR-42` 描述的 `knowledge.repository.ts` 当前既做 compare-and-set 状态迁移，也处理 diagnostics/rebuild/summary），说明职责已经跑偏。
- 页面/组件之间缺乏清晰 ownership：`ProjectChatPage` 既拉 settings 也同步 list/detail、issue 推导；`AppSider` 同时在渲染槽位、拉项目表单并修补资源 option；helper/adapters 被硬绑入页面，后续改动需要同时触碰多个层级。
- 结构性变化、业务复用、配置调整等情境，只要对应文件表现出职责膨胀就必须触发结构治理评估，而不是简单依赖行数。

## 3. 坏味道判定

- 巨石文件难以定位 entry points、effects 与 render 的边界：`ProjectChatPage.tsx` 一边查 settings/setup、一边同步 conversation list/detail、处理 issue；`AppSider.tsx` 一边渲染侧栏、一边拉项目表单 & 资源 options，还要修补 fallback 选项。`tasks-platform-frontend-refactor.md` 已将其列为结构债热点。
- service/repository façade 直接吞掉业务状态流：以 `knowledge.repository.ts` 为例，`SR-40` 中的 compare-and-set API 仍原先混在一处，导致 commit count 直线上升、review 难以 isolate 逻辑；这是 `tasks-engineering-governance-foundation.md` 所说的“repository façade 吞掉实现细节”的典型症状。
- helper/adapter/middleware 被硬绑在这些巨石文件中，导致 responsive UI 与 domain logic 无法逐步抽离，常见 review 反馈是“why is this here”。
- 放任结构漏洞会放大回归风险：结构债让修复必须跨多个层级修改，前端 layout/service 逐渐退化成“单文件黑匣子”，这正是计划强调“结构债会扩散”的原因。

## 4. 推荐动作

1. 先拆职责边界：把编排层（settings/composer/outlet）、业务逻辑（domain flow/state transitions）和展示组件/adapter（markdown renderer、bubble role config）分出独立文件或 hook，使每个文件只关心一类责任。
2. 抽出共享 helper/adapter/hook/mapper：将 global knowledge/page resource 的 detail/diagnostics/upload/retry/rebuild/delete 流拆为 domain hook + adapter，避免重复；`projectChat.adapters.tsx` 中的 sources popover 与 bubble role 逻辑应交由 domain helper，page 文件保留编排。
3. Service/repository facade 只保留授权/orchestration/error wrapping：将状态迁移、diagnostics、recovery、summary 等具体逻辑下沉至 `knowledge.visibility.ts`、`knowledge.storage.ts`、`knowledge.recovery.ts` 等 helper modules，repository 通过 thin API 调用。
4. 拆分完成后立即验证：跑 `platform lint`、`api check-types`、`knowledge` 相关 smoke test 等，确保 facade 变化没有引入 regressions。
5. 把结构治理判断与 plan/review 同步：在 `.codex/docs/plans/` 中（如 `tasks-platform-frontend-refactor.md`、`tasks-service-indexing-refactor.md`）记录当前痛点与下一阶段拆分目标，并在 `review-checklist.md` 的“结构治理”条目勾选或说明例外。

## 5. 允许例外

- 紧急修复/回归或系统级护栏调整时可暂时保留巨石文件，但必须按 `engineering-governance-overview.md` 的例外机制记录位置、原因、风险、目标 Plan（例如文档中已提及“结构治理会放大回归风险”的 `AppSider` 修复）。
- 只改纯渲染 margin、样式、log 文案时，拆分成本高于收益可以不执行，但需在 review note/plan 中注明“结构治理评估：当前可控”，并约定未来重新评估。
- 例外记录需贴近改动（review note、plan update、PR description）并指明在哪个计划/阶段会恢复结构治理。

## 6. 文档同步要求

- 结构治理相关的痛点与拆分计划必须补在 `.codex/docs/plans/`（如前述两个 plan）中，以保证标准与执行计划相互印证。
- 导致页面/模块职责变化时，要同步 `.codex/docs/current/architecture.md`、`README.md`、`.codex/docs/README.md` 等事实类文档，避免 review 时误认为现状与结构规则不一致。
- `review-checklist.md` 中“结构治理”条目应勾选“已判断”或注明例外，若触发例外请把证据链接到 `AGENTS.md` 或 review comment 方便后续追踪。

## 7. 当前代表性治理对象

- `apps/platform/src/pages/project/ProjectChatPage.tsx`：settings、conversation list/detail、issue 推导混在一处，`tasks-platform-frontend-refactor.md` 将其列为首批拆分对象。
- `apps/platform/src/app/layouts/components/AppSider.tsx`：侧栏渲染、项目表单、资源 options 拉取、fallback 修补集中，计划中已有 `ProjectFormModal` 与 `useProjectResourceOptions` 的拆分方案。
- `apps/api/src/modules/knowledge/knowledge.repository.ts`：`SR-40~SR-42` 中的状态迁移、diagnostics、summary 逻辑仍在同一文件，需要像计划中描述的那样下沉 helper 并保留 compare-and-set contract。
