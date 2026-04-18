# AGENTS.md

## 0. 继承与作用域

- 默认继承全局规则：`/Users/langya/.codex/AGENTS.md`。
- 本文件是 Knowject 的项目级协作主入口，负责定义：读取顺序、优先级、项目级覆盖规则、文档同步门禁，以及子目录 `AGENTS.md` 的分层边界。
- 全局规则与本文件不冲突时，继续按全局规则执行。
- 取舍依据：`AGENTS.md` 保持轻入口，易漂移的“当前事实”和分领域细则下沉到独立索引，减少长期维护成本。

## 1. 协作入口与读取顺序

### 1.1 主入口

- `AGENTS.md`：项目级长期指令入口；先看这里，再决定需要补读哪些事实源、规则或计划文档。

### 1.2 Claude 风格 Memory（快速上下文，不是事实源）

- `.claude/memory/project_overview.md`：项目概览、当前阶段、结构 hotspot 的快速摘要。
- `.claude/memory/user.md`：用户角色、协作偏好、提交偏好等轻量摘要。
- 用法约束：`memory/*` 只用于“快速建立上下文”，不能覆盖源码、`docs/current/*`、`docs/contracts/*` 或本文件中的正式规则。

### 1.3 Claude 风格 Rules（分领域细则，不替代主入口）

- `.claude/rules/frontend.md`：前端分层、路由、i18n、Tailwind 等约束。
- `.claude/rules/backend.md`：后端模块、路由模式、数据存储与 internal 路由约束。
- `.claude/rules/safety.md`：secrets、env、品牌文本、文档同步等安全红线。
- `.claude/rules/git.md`：提交草案、拆分策略、提交流程边界。
- 用法约束：`rules/*` 用于承载稳定的领域细则；若与项目正式治理或当前实现事实冲突，应更新规则文件本身，而不是临时发明例外。

### 1.4 正式事实源

- 当前实现事实：`docs/current/architecture.md` + 源码。
- 子系统 current facts：`docs/current/*` 中对应专题文档。
- 工程治理规则：`docs/standards/*`。
- 接口契约：`docs/contracts/*`。
- 执行计划与里程碑：`docs/plans/*`。
- 交接上下文：`docs/handoff/*`。
- 目标态与 gap：`docs/roadmap/*`。

### 1.5 冲突判定

- 指令优先级沿用全局 AGENTS 约定。
- 事实冲突时：源码与 `docs/current/*` 优先于 `.claude/memory/*`。
- 治理冲突时：本文件与 `docs/standards/*` 优先于 `.claude/rules/*`。
- 若 `.claude/*` 摘要失真，修正文档摘要本身，不把失真摘要当成例外依据。

## 2. Root Governance

- `docs/` 是唯一正式文档主源；truth surface 按目录边界管理。
- `docs/exports/` 是派生导出层，不承担事实源职责；当前 live 导出入口是 `docs/exports/chatgpt-projects/*`。
- 项目级 Skill 的 live 根目录是 `.agents/skills/`；`.codex/` 仅保留 Codex 配置与兼容说明。
- `.codex/` 不再承载正式文档、导出包与 Skill 主内容。
- 取舍依据：优先单一真相源与稳定入口，避免多入口并行造成事实漂移。

## 3. 项目执行默认值

- 开始任务时，先把变更归类为：current fact / contract / standards / plan / export sync，再决定需要读取的文档面。
- 默认采用最小可审阅改动；不臆造 API、配置、路径或目录职责，先检索仓库并复用现有模式。
- 新增业务页面默认放在 `apps/platform/src/pages`。
- 新增正式业务后端接口默认放在 `apps/api/src/modules/*`，并在 `apps/api/src/app/create-app.ts` 统一挂载 `/api/*`。
- 涉及品牌文本时必须使用：`知项 · Knowject` 与 `让项目知识，真正为团队所用。`
- Tailwind 类名必须使用 canonical 写法：`!` 重要标记使用后缀形式（如 `mb-1!`），禁止前缀形式（如 `!mb-1`）。
- 当任务进入已存在的子目录 `AGENTS.md` 作用域时，优先应用“最近目录”的规则；若与根入口冲突，以更近作用域且不违背上层治理的规则为准。

## 4. 文档同步与边界门禁

- 以下变化默认触发 `docs/standards/document-sync-governance.md` 检查：路由、重定向、页面命名、模块归属、目录边界变化。
- 以下变化默认触发 `docs/standards/document-sync-governance.md` 检查：Mock 数据源、示例路径、storage key、数据流或默认行为变化。
- 以下变化默认触发 `docs/standards/document-sync-governance.md` 检查：Docker / compose / 端口 / secrets / 容器网络 / 命令入口变化。
- 以下变化默认触发 `docs/standards/document-sync-governance.md` 检查：Root governance、导出映射、Skill live root、工程治理标准变化。
- 事实源同步优先级始终是：先更新 `docs/*`，再更新 `docs/exports/*`，最后修正兼容说明或摘要索引。
- 入口文档检查默认覆盖：`README.md`、`docs/README.md`、`docs/current/architecture.md`、`docs/exports/README.md`、`docs/exports/chatgpt-projects/README.md`、`.agents/skills/README.md`、`apps/platform/README.md`、`apps/api/README.md`；`.codex/*` 兼容说明仅在对应文件实际存在时纳入检查。
- 当变更只影响 Claude 风格摘要层时，应同步 `.claude/memory/*` 或 `.claude/rules/*`，但不得让这些摘要反向定义项目事实。

## 5. 快速路由

- 需要项目现状、技术栈、当前阶段、hotspot：先看 `.claude/memory/project_overview.md`，再落回 `docs/current/architecture.md` 与源码核实。
- 需要用户协作偏好：看 `.claude/memory/user.md`，若与当前对话冲突，以当前对话为准。
- 需要前端实现约束：看 `.claude/rules/frontend.md`。
- 需要前端设计系统与视觉约束：看 `.claude/rules/design.md`。
- 需要后端实现约束：看 `.claude/rules/backend.md`。
- 需要安全、env、品牌、文档同步红线：看 `.claude/rules/safety.md`。
- 需要提交草案、拆分建议与 Git 边界：看 `.claude/rules/git.md`。
- 进入以下目录时，先补读最近的子目录 `AGENTS.md`：
  - `apps/platform/`
  - `apps/platform/src/pages/project/`
  - `apps/api/`
  - `apps/api/src/modules/projects/`
  - `apps/api/src/modules/knowledge/`
  - `apps/indexer-py/`

## 6. 提交协作约定

- 当任务已达到可提交状态，且用户明确要求“生成 commit 记录 / 提交信息”，或表达“我来提交代码”的意图时，默认把提交信息草案作为交付物的一部分给出。
- 提交草案遵循全局 commit 规范与 `.claude/rules/git.md`，至少包含标题，以及 `Why`、`What`、`Validation`、`Risk` 四段正文。
- 若当前工作区存在多个单一目的改动，优先拆分为多个 commit 草案，并说明推荐顺序。
- 不得把未执行的验证、未确认的结论写入提交草案；除非用户明确要求直接提交，否则默认只生成草案，不执行 `git commit`。

## 7. 维护原则

- `AGENTS.md` 只保留稳定的项目入口规则，不再重复堆放大量“当前实现细节”。
- 高频变化的项目快照优先更新 `.claude/memory/*`。
- 分领域稳定约束优先更新 `.claude/rules/*`。
- 目录级稳定差异优先通过子目录 `AGENTS.md` 承载，而不是继续扩张根入口。
- 只有当协作主入口、优先级、truth surface、文档同步门禁或项目级覆盖规则变化时，才优先修改本文件。
