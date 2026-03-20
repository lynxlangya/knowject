# 平台前端重构任务拆解（Milestone 0-5，规划拆解）

状态：进行中（2026-03-18：已完成 FE-R0 ~ FE-R7）
优先级：P1
阶段：Platform 前端结构治理 / 重构准备
关联模块：`apps/platform` / `packages/ui` / `packages/request` / `.codex/docs`

当前结论：

- 这次重构不适合 big-bang，必须先把 `lint` 护栏拉正，再进入页面级抽离。
- 最高收益点不是样式层，而是“知识库域工作流共享化”和“项目数据编排边界拆分”。
- `project.catalog.ts`、`AppSider.tsx`、`ProjectChatPage.tsx`、`projectChat.adapters.ts` / `projectChat.components.tsx` 是当前剩余较明显的结构债集中点。
- Tailwind 治理必须分两批推进：先做安全的 canonical class 替换，再做 token 化；不要把视觉设计值和语法清理混在一批。
- 每一批都要保持“可单独提交、可单独回滚、可单独验证”，避免一轮重构同时破坏资源页、对话页和布局层。

## 治理依赖

本计划从执行开始就必须对齐下面三个治理标准：

- `.codex/docs/standards/code-structure-governance.md`（结构治理）：该标准定义了巨石文件评估、职责边界失真判定和例外记录机制，FE-R0~FE-R10 里的 `ProjectLayout.tsx`、`ProjectChatPage.tsx`、`KnowledgeManagementPage.tsx` 这种大体量文件的拆分都要以此为触发点，并在 PR/计划中额外标注“为什么现在可以拆、例外放在哪、回滚风险是什么”。
- `.codex/docs/standards/frontend-shared-abstractions.md`（前端通用封装）：这份标准要求没有复用价值的页面逻辑不得先抽象，抽象前先列出 consumer 列表、保持页面可观察性、跟 FE-R1~FE-R4/FE-R8~FE-R10/FE-R11~FE-R13 的 hook 与 Tailwind token 做溯源说明，保证 shared layer 由现实复用驱动而不是感觉通用。
- `.codex/docs/standards/review-checklist.md`（评审清单）：在结构治理、前端封装、文档同步等复用项里，各 checkpoint 都要对照 `review-checklist`：每次触发“巨石文件”/“shared hook”/“文档同步”都要在 PR 描述里打钩并说明处理结果，避免忽略评审矩阵中的关键项。


---

## 一、目标

本计划的目标不是“把前端全部重写一遍”，而是在不破坏当前正式链路的前提下，把最重的重复业务流程、最脆的数据编排边界和最明显的样式债分阶段收敛。

本计划结束时，至少要达到以下结果：

- `apps/platform` 的 `lint / check-types / build` 形成稳定基线，现有阻塞性告警先归零。
- 全局知识治理页与项目资源页共享同一套知识库域核心能力，而不是两套平行实现。
- `ProjectLayout` 不再同时承担 conversations、catalog、project knowledge、polling 等所有职责。
- 项目资源 live mapper 与历史 mock snapshot 已切开，后续不再把正式映射逻辑继续堆回 mock 文件。
- 项目对话页、侧栏项目表单、全局资产治理页的结构边界更清楚，后续继续演进时不再持续向单文件堆逻辑。
- Tailwind v4 的安全 canonical class 能力得到清理，高频非标准视觉值开始进入 token 化治理，而不是继续扩散 arbitrary value。

## 二、事实基线

### 2.1 当前事实真相源文件

- `.codex/docs/current/architecture.md`
- `apps/platform/src/pages/knowledge/KnowledgeManagementPage.tsx`
- `apps/platform/src/pages/project/ProjectResourcesPage.tsx`
- `apps/platform/src/pages/project/ProjectLayout.tsx`
- `apps/platform/src/pages/project/projectResourceMappers.ts`
- `apps/platform/src/pages/project/projectWorkspaceSnapshot.mock.ts`
- `apps/platform/src/pages/project/ProjectChatPage.tsx`
- `apps/platform/src/pages/project/projectChat.adapters.ts`
- `apps/platform/src/pages/project/projectChat.components.tsx`
- `apps/platform/src/app/layouts/components/AppSider.tsx`
- `apps/platform/src/pages/skills/SkillsManagementPage.tsx`
- `apps/platform/src/pages/agents/AgentsManagementPage.tsx`
- `apps/platform/src/pages/members/MembersPage.tsx`
- `eslint.config.mjs`

### 2.2 已确认事实（2026-03-18 本地检查 + GPT-5.4 agents 汇总）

- `pnpm --filter platform check-types` 通过。
- `pnpm --filter platform lint` 失败，当前结果为 `31 problems (27 errors, 4 warnings)`。
- 立即阻塞项主要有两类：
  - `react-hooks/set-state-in-effect`
  - `@typescript-eslint/no-unused-vars`
- 当前前端热点大文件集中在：
  - `KnowledgeManagementPage.tsx`：2167 行
  - `SettingsPage.tsx`：1757 行
  - `ProjectResourcesPage.tsx`：1294 行
  - `SkillsManagementPage.tsx`：1076 行
  - `ProjectChatPage.tsx`：917 行
  - `AgentsManagementPage.tsx`：889 行
  - `AppSider.tsx`：862 行
  - `ProjectKnowledgeDetailDrawer.tsx`：720 行
  - `projectChat.adapters.tsx`：653 行
- 知识库域工作流已经确认存在“双实现”：
  - 全局知识治理页与项目资源页各自实现了一遍 `detail + diagnostics + upload + retry/rebuild/delete + rebuild knowledge`。
- 项目页正式数据已经接入后端，但仍有结构债：
  - `ProjectLayout.tsx` 同时拉 conversations、global catalogs、project knowledge，并承担短轮询与 outlet context 汇总。
  - `projectResourceMappers.ts` 与 `projectWorkspaceSnapshot.mock.ts` 已切开资源 live mapper 与成员 / 概览 mock snapshot，`project.catalog.ts` 仍保留部分历史过渡层。
- 项目对话主链路已跑通，不需要重写业务范围；当前真正的问题是 page / adapters 边界不清和 lint 护栏失衡。
- Tailwind v4 基线接入正确，动态 spacing 用法大量符合官方推荐；当前更大的问题是：
  - 明明可写成 canonical class，却保留 `[...]`
  - 高频视觉值没有进入 token

### 2.3 当前明确未完成

- 前端尚无系统化的 UI 自动化测试基线，当前验收主要依赖 `lint / typecheck / build + 手动 smoke`。
- ESLint 仍不是 type-aware 配置。
- `project.catalog.ts` 的历史过渡层还没有切干净。
- Tailwind 还没有形成统一的 radius / text / shadow token 层。
- `Typography` / `Card` / `Input` 等 Ant Design 组件周围仍存在大量 `!` 覆盖写法，说明样式边界尚未完全收口。

## 三、背景与问题拆解

### 3.1 知识库域存在最深的复制实现

最重的重复不在 UI 壳层，而在业务链路本身。全局知识治理和项目知识消费都需要：

- 详情加载
- diagnostics 加载
- 上传入口与批量上传
- 文本上传
- 文档级 retry / rebuild / delete
- 知识库级 rebuild
- 状态字典、时间格式化和 action menu

这套流程现在散落在多个页面与抽屉组件里，导致改一处动作、状态文案或异常提示时，极易出现行为漂移。

### 3.2 项目页数据编排职责过重

`ProjectLayout.tsx` 目前是项目态的“总调度器”，同时承担：

- conversations 拉取
- global knowledge / skills / agents catalog 拉取
- project private knowledge 拉取
- project knowledge 轮询
- outlet context 聚合与下发

这会让任何项目页改动都更容易回流到 layout 本体，长期只会继续膨胀。

### 3.3 live mapper 与历史 mock 边界失真

`project.mock.ts` 当前已经不是“临时 mock 文件”，而是项目概览、资源映射与 fallback 的 live adapter 层。命名与职责失真会误导后续维护者继续往 mock 文件里写正式逻辑，长期不可接受。

### 3.4 chat、sider 与 global asset 页面都存在“单文件全包”倾向

- `ProjectChatPage.tsx` 承担设置读取、detail/list 同步、create/send/rename/delete、issue 推导。
- `projectChat.adapters.tsx` 混合 markdown renderers、conversation label、sources popover、bubble role config。
- `AppSider.tsx` 同时做侧栏渲染、项目表单、资源选项拉取、fallback option 修补。
- `SkillsManagementPage.tsx`、`AgentsManagementPage.tsx` 已复用了部分壳层，但列表筛选、summary、更新时间与 action 组织仍有可抽离空间。

### 3.5 Tailwind 债务是“治理问题”，不是“语法崩坏”

当前不能用“把所有 arbitrary value 一次删光”的方式治理 Tailwind。更合理的判断是：

- 第一批：只替换绝对安全的 canonical class。
- 第二批：把高频但非标准的视觉值沉淀成 theme token。
- 第三批：复杂 gradient / shadow / filter / SVG 相关表达继续保留。

## 四、影响文档

### 4.1 本次立刻需要同步的文档

- `.codex/docs/plans/tasks-platform-frontend-refactor.md`
- `.codex/docs/README.md`

### 4.2 本次不需要同步的文档

- `.codex/docs/current/architecture.md`
- `AGENTS.md`
- `.codex/README.md`
- `.codex/MIGRATION.md`
- `.codex/packs/chatgpt-projects/*`
- 根 `README.md`

### 4.3 判断依据

- 本次只是新增前端重构执行计划，没有改动已落地事实、目录职责或上传包映射。
- `.codex/docs/current/architecture.md` 只记录“当前是什么”，不记录未来重构方案。
- `.codex/packs/chatgpt-projects/*` 当前没有镜像这份计划，不需要派生同步。

## 五、范围

本计划要覆盖：

- `apps/platform` 前端结构治理与任务拆分
- 前端 lint / typecheck / build 基线治理
- 知识库域共享抽象
- 项目页数据编排与 context 拆分
- mock / live 边界治理
- chat / sider / global asset 页面边界治理
- Tailwind v4 安全 canonical 化与 token 化顺序

本计划暂不覆盖：

- 后端 API 契约重写
- 路由族调整
- 新的产品需求
- 项目对话 SSE 新功能扩写
- 全量 UI 自动化测试体系建设
- Ant Design 设计系统层面的全仓库统一替换

## 六、执行总策略

本轮重构按“先止血，再抽域，再拆边界，最后治样式”的顺序推进。

核心原因：

- 若先做页面级抽离而不处理 lint 红灯，开发过程会持续被护栏阻塞。
- 若先动 chat、sidebar 或样式层，而不先抽知识库域与项目数据编排，收益不高且难形成可复用基础。
- 若先全面 token 化 Tailwind，会把“设计决策”和“结构重构”绑在一起，回滚成本太大。

建议每个 milestone 单独成批，保持以下原则：

- 一批只解决一类问题。
- 每批都能独立验证。
- 每批都能单独回滚。
- 不在同一批里同时改资源页、对话页和全局布局层。

## 七、里程碑

### 里程碑 0：恢复前端护栏

- 目标：
  - 让 `platform lint` 从红灯回到绿灯，恢复重构最小安全基线。
- 预期结果：
  - 现有 27 个 error 清零。
  - `projectChat.adapters.ts` / `projectChat.components.tsx` 的快刷边界问题至少降到非阻塞。
- 验证方式：
  - `pnpm --filter platform lint`
  - `pnpm --filter platform check-types`
  - `pnpm --filter platform build`

### 里程碑 1：抽知识库域共享能力

- 目标：
  - 把知识库域最重的重复逻辑从页面中收出去。
- 预期结果：
  - 全局知识治理页与项目资源页共享相同的 status/meta、detail/diagnostics、upload、document actions 能力。
- 验证方式：
  - 全局知识库创建、上传、retry、rebuild、delete
  - 项目私有知识库创建、上传、retry、rebuild、delete
  - diagnostics 与轮询行为不回归

### 里程碑 2：拆项目态数据编排

- 目标：
  - 降低 `ProjectLayout.tsx` 的全能职责。
- 预期结果：
  - conversations、global catalogs、project knowledge catalog 由独立 hook 管理。
  - 项目资源绑定 mutation 不再在页面里手拼完整 payload。
- 验证方式：
  - 项目切换
  - 会话列表刷新
  - 项目资源刷新
  - 项目私有 knowledge 短轮询

### 里程碑 3：切开 live mapper 与历史 mock

- 目标：
  - 明确正式映射与 mock snapshot 的边界。
- 预期结果：
  - `project.mock.ts` 被拆分或改名，live mapping 不再继续驻留在 mock 文件。
- 验证方式：
  - 项目概览页
  - 项目资源页
  - 成员协作快照与未知资源 fallback

### 里程碑 4：拆 chat / sider / global assets 的结构边界

- 目标：
  - 解决剩余几个单文件全包问题。
- 预期结果：
  - chat renderer / mapper / config 分开。
  - `AppSider` 的项目表单与资源选项加载下沉。
  - global assets 页面的筛选 / summary / meta 共享能力开始统一。
- 验证方式：
  - 会话创建、发送、改标题、删除
  - 项目创建、编辑、删除、资源选项展示
  - `/skills`、`/agents` 列表筛选和操作 smoke

### 里程碑 5：Tailwind 治理

- 目标：
  - 完成一轮低风险 canonical 清理，并建立后续 token 化落点。
- 预期结果：
  - 安全的 bracket class 替换完成。
  - 高频 radius / text / shadow 值形成 token 方案。
- 验证方式：
  - `pnpm --filter platform build`
  - 关键页面 UI smoke
  - 样式回归抽样：登录页、项目对话页、项目资源页、成员页、全局资产页

## 八、详细任务拆分

### FE-R0：统一 lint 护栏并恢复绿灯

- 目标：
  - 先恢复最小重构安全基线。
- 主要文件：
  - `eslint.config.mjs`
  - `apps/platform/src/pages/project/projectChat.adapters.ts`
  - `apps/platform/src/pages/project/projectChat.components.tsx`
  - `apps/platform/src/pages/project/components/ProjectKnowledgeAccessModal.tsx`
  - `apps/platform/src/pages/project/components/ProjectKnowledgeDetailDrawer.tsx`
- 操作：
  - 统一 `_unused` 参数规则，消除 ESLint 与 TypeScript 行为不一致。
  - 修掉当前 `set-state-in-effect` 阻塞项。
  - 顺手拆开 `projectChat.adapters.ts` / `projectChat.components.tsx` 的导出边界，消掉 Fast Refresh warning。
- 预期产出：
  - `platform lint` 变绿。
- 验证：
  - `pnpm --filter platform lint`
  - `pnpm --filter platform check-types`
  - `pnpm --filter platform build`
- 风险：
  - 若把 effect reset 改坏，资源页弹窗 / 抽屉行为可能回归。

### FE-R1：抽知识库共享 meta / formatter / status 层

- 目标：
  - 先收最轻但重复率最高的共享逻辑。
- 主要文件：
  - `apps/platform/src/pages/knowledge/KnowledgeManagementPage.tsx`
  - `apps/platform/src/pages/project/components/ProjectKnowledgeDetailDrawer.tsx`
  - `apps/platform/src/pages/project/components/ProjectKnowledgeAccessModal.tsx`
  - `apps/platform/src/pages/project/ProjectOverviewPage.tsx`
- 操作：
  - 提取日期格式化、状态字典、badge class、知识库概览 meta。
  - 给知识域提供统一 helper / constants 层。
- 预期产出：
  - 知识相关状态色、文案、时间格式统一，不再多处复制。
- 验证：
  - 知识列表、详情抽屉、项目概览中的知识卡片展示一致。
- 风险：
  - 文案和 className 改动会造成细微 UI 差异，需要视觉抽样。

### FE-R2：抽知识详情与 diagnostics 状态 hook

- 目标：
  - 把 detail/diagnostics 加载逻辑从页面编排层拆开。
- 主要文件：
  - `apps/platform/src/pages/knowledge/KnowledgeManagementPage.tsx`
  - `apps/platform/src/pages/project/ProjectResourcesPage.tsx`
- 操作：
  - 提取 `useKnowledgeDetailState` 一类 hook。
  - 收拢 detail、diagnostics、reload token、loading/error 组织方式。
- 预期产出：
  - 全局知识页和项目资源页不再各自维护一套 detail/diagnostics 状态机。
- 验证：
  - 切换 active knowledge
  - 刷新 detail
  - 刷新 diagnostics
- 风险：
  - active knowledge 切换与 stale data 清理容易出错。

### FE-R3：抽知识上传流程 hook

- 目标：
  - 统一文件上传、批量上传、文本上传、校验和消息提示。
- 主要文件：
  - `apps/platform/src/pages/knowledge/KnowledgeManagementPage.tsx`
  - `apps/platform/src/pages/project/ProjectResourcesPage.tsx`
  - `apps/platform/src/pages/knowledge/knowledgeUpload.shared.ts`
- 操作：
  - 提取 `useKnowledgeUploadFlow`。
  - 保持全局 knowledge 和 project knowledge 两套 transport 差异，但共享流程控制。
- 预期产出：
  - 上传前校验、批量上传进度、large file warning、text source 提交流程统一。
- 验证：
  - 单文件上传
  - 多文件上传
  - 文本上传
  - 非法文件拦截
- 风险：
  - 上传成功后 refresh / active selection 行为在全局页与项目页不同，需要保留注入点。

### FE-R4：抽知识文档动作层

- 目标：
  - 收敛 retry / rebuild / delete / rebuild knowledge 的动作边界。
- 主要文件：
  - `apps/platform/src/pages/knowledge/KnowledgeManagementPage.tsx`
  - `apps/platform/src/pages/project/ProjectResourcesPage.tsx`
  - `apps/platform/src/pages/project/components/ProjectKnowledgeDetailDrawer.tsx`
- 操作：
  - 提取 `useKnowledgeDocumentActions`。
  - 统一 optimistic patch、busy 状态和 refresh 策略。
- 预期产出：
  - 文档级动作不再在三个文件里分别维护。
- 验证：
  - retry document
  - rebuild document
  - delete document
  - rebuild knowledge
- 风险：
  - optimistic patch 和服务端真实状态不一致时，需要优先保证最终回读正确。

### FE-R5：拆 `ProjectLayout` 的数据编排

- 目标：
  - 降低 layout 体积和耦合。
- 主要文件：
  - `apps/platform/src/pages/project/ProjectLayout.tsx`
  - `apps/platform/src/pages/project/projectPageContext.ts`
- 操作：
  - 提取：
    - `useProjectConversations`
    - `useGlobalAssetCatalogs`
    - `useProjectKnowledgeCatalog`
  - 缩小 outlet context 暴露面。
- 预期产出：
  - layout 更像“页面容器”，而不是“项目态全能数据中心”。
- 验证：
  - 切换项目
  - conversations 加载 / 错误态
  - global catalog 加载 / 错误态
  - project knowledge polling
- 风险：
  - 任何 hook 依赖链处理不好，都可能导致 project 切换时短暂闪错状态。

### FE-R6：下沉项目资源绑定 mutation

- 目标：
  - 消除页面手拼完整 project payload 的坏味道。
- 主要文件：
  - `apps/platform/src/pages/project/ProjectResourcesPage.tsx`
  - `apps/platform/src/app/project/ProjectContext.tsx`
  - `apps/platform/src/app/project/project.types.ts`
- 操作：
  - 把项目知识绑定更新下沉到 context 或 domain service。
  - 封装“保留未知已选项 / 已绑定资源”逻辑。
- 预期产出：
  - 页面不再直接负责拼接 `name / description / ids` 的完整更新体。
- 验证：
  - 绑定全局知识
  - 解除绑定
  - 项目知识库创建后刷新
- 风险：
  - 若 context 更新策略变化不当，项目列表与项目页状态可能短暂不一致。

### FE-R7：切开 live mapper 与历史 mock

- 目标：
  - 彻底停止“正式逻辑写进 mock 文件”。
- 主要文件：
  - `apps/platform/src/pages/project/project.mock.ts`
  - `apps/platform/src/app/project/project.catalog.ts`
  - `apps/platform/src/pages/project/ProjectOverviewPage.tsx`
  - `apps/platform/src/pages/project/ProjectResourcesPage.tsx`
- 操作：
  - 拆成 `projectResourceMappers.ts` 与 `projectWorkspaceSnapshot.mock.ts` 一类结构。
  - 明确 legacy fallback 与 live mapper 的命名。
- 预期产出：
  - mock 只承载快照与演示层；live 映射进入正式 helper / mapper。
- 验证：
  - 项目概览
  - 项目资源映射
  - 未知资源 fallback
- 风险：
  - 拆文件过程中 import 链容易出错，需要先机械迁移、后再整理命名。

### FE-R8：拆项目对话 adapters 与页面状态层

- 目标：
  - 把 chat 的 renderers / mappers / config / session state 分层。
- 主要文件：
  - `apps/platform/src/pages/project/ProjectChatPage.tsx`
  - `apps/platform/src/pages/project/projectChat.adapters.ts`
  - `apps/platform/src/pages/project/projectChat.components.tsx`
  - `apps/platform/src/pages/project/components/ProjectConversationList.tsx`
- 操作：
  - 把 markdown renderers、bubble role config、sources popover、conversation item mapper 拆开。
  - 页面内再拆 settings issue、detail loading、mutation handlers。
- 预期产出：
  - chat 页可以继续演进，但不会继续向单个页面和 adapter 文件堆功能。
- 验证：
  - 新建对话
  - 发送消息
  - 改标题
  - 删除线程
  - assistant sources 展示
- 风险：
  - chat 行为链路较长，拆分时要优先保持服务端回读语义不变。

### FE-R9：拆 `AppSider` 的项目表单与资源选项加载

- 目标：
  - 让侧栏回归布局组件，而不是 modal + data loader + fallback 修补器。
- 主要文件：
  - `apps/platform/src/app/layouts/components/AppSider.tsx`
  - `apps/platform/src/app/project/ProjectContext.tsx`
- 操作：
  - 提取 `ProjectFormModal`。
  - 提取 `useProjectResourceOptions`。
  - 统一“保留未知已选项”的 helper。
- 预期产出：
  - 侧栏结构更清楚，项目表单更可复用。
- 验证：
  - 创建项目
  - 编辑项目
  - 资源多选回显
  - 删除项目 / 跳转
- 风险：
  - 表单默认值与异步 options 时序容易出问题。

### FE-R10：收敛全局资产页共享能力

- 目标：
  - 降低 skills / agents 的重复展示逻辑。
- 主要文件：
  - `apps/platform/src/pages/skills/SkillsManagementPage.tsx`
  - `apps/platform/src/pages/agents/AgentsManagementPage.tsx`
  - `apps/platform/src/pages/assets/components/GlobalAssetLayout.tsx`
- 操作：
  - 提取 summary item、sidebar filter item、updatedAt formatter、status pill/meta。
  - 保持业务差异，但统一展现基元。
- 预期产出：
  - global assets 页面对齐统一，未来新增资产类型时扩展成本下降。
- 验证：
  - `/skills`
  - `/agents`
  - 筛选 / summary / 列表 item / 操作菜单
- 风险：
  - 若抽象过度，会反向引入更高耦合；此任务只做薄层复用。

### FE-R11：执行第一批 Tailwind 安全 canonical 化

- 目标：
  - 先吃掉可机械替换的 class 债。
- 主要文件：
  - `apps/platform/src/**/*.{ts,tsx}`
- 操作：
  - 优先替换：
    - `rounded-[24px] -> rounded-3xl`
    - `rounded-[16px] -> rounded-2xl`
    - `rounded-[12px] -> rounded-xl`
    - `text-[12px] -> text-xs`
    - `text-[14px] -> text-sm`
    - `text-[16px] -> text-base`
    - `text-[18px] -> text-lg`
    - `text-[20px] -> text-xl`
    - `text-[30px] -> text-3xl`
    - `min-w-[148px] -> min-w-37`
    - `transition-[color,border-color] -> transition-colors`
- 预期产出：
  - 一批无设计争议的 class 被清理。
- 验证：
  - `pnpm --filter platform build`
  - 页面抽样 smoke
- 风险：
  - 类名替换多为机械修改，需避免把设计特意值误归类为 canonical。

### FE-R12：建立 Tailwind token 化基线

- 目标：
  - 为高频非标准值提供可维护落点。
- 主要文件：
  - `apps/platform/src/index.css`
  - 相关高频页面与组件
- 操作：
  - 评估并定义高频 token：
    - radius：`18 / 20 / 22 / 26 / 28`
    - text：`11 / 13 / 15 / 19 / 32 / 52`
    - shadow：高频卡片阴影
  - 不处理复杂 gradient / filter / SVG stroke。
- 预期产出：
  - 高频视觉值开始从 arbitrary value 迁移到统一 theme token。
- 验证：
  - 登录页
  - 项目对话页
  - 项目资源页
  - 成员页
  - 全局资产页
- 风险：
  - 这是设计治理任务，不应与结构重构同批进行。

### FE-R13：补前端规则增强与长期护栏

- 目标：
  - 把这次发现的结构性问题转化成后续不再复发的护栏。
- 主要文件：
  - `eslint.config.mjs`
  - 可能新增的 lint 配置或仓库脚本
- 操作：
  - 评估 type-aware ESLint。
  - 评估 `jsx-a11y`、import boundary / cycle 检查。
  - 评估是否为 Tailwind class 质量引入额外检查。
- 预期产出：
  - 后续新代码更难重新长成当前这类结构债。
- 验证：
  - lint 规则可跑通，不产生不可接受的噪音。
- 风险：
  - 规则增强会提高短期改造成本，应放在主链路重构稳定后推进。

## 九、推荐分批提交

建议拆成以下 6 批：

1. `PR-1`：FE-R0
   - 只恢复护栏，不碰大抽象。
2. `PR-2`：FE-R1 ~ FE-R4
   - 只处理知识库域共享能力。
3. `PR-3`：FE-R5 ~ FE-R6
   - 只处理项目数据编排与资源绑定 mutation。
4. `PR-4`：FE-R7
   - 单独处理 mock / live 边界。
5. `PR-5`：FE-R8 ~ FE-R10
   - 处理 chat / sider / global assets 结构边界。
6. `PR-6`：FE-R11 ~ FE-R13
   - 单独处理 Tailwind 治理与长期规则增强。

## 十、具体步骤

1. 先完成 FE-R0，恢复 `lint / check-types / build` 基线。
2. 再完成 FE-R1 ~ FE-R4，优先收敛知识库域工作流。
3. 然后完成 FE-R5 ~ FE-R6，拆 `ProjectLayout` 与 binding mutation。
4. 再做 FE-R7，把 `project.mock.ts` 与 `project.catalog.ts` 的边界切开。
5. 再处理 FE-R8 ~ FE-R10，逐步收缩 chat / sider / global assets 的单文件职责。
6. 最后推进 FE-R11 ~ FE-R13，把 Tailwind 和前端规则治理作为收尾批次。

## 十一、验证方式

### 11.1 自动验证

- `pnpm --filter platform lint`
- `pnpm --filter platform check-types`
- `pnpm --filter platform build`

### 11.2 手动验证

- 登录后进入项目页
- 项目切换
- 项目对话创建 / 发送 / 改标题 / 删除
- 全局知识库创建 / 上传 / retry / rebuild / delete
- 项目私有知识库创建 / 上传 / retry / rebuild / delete
- 项目资源页绑定全局知识 / 解除绑定
- `/skills`、`/agents` 列表筛选和表单操作
- 登录页、侧栏、成员页、资源页、对话页样式抽样

### 11.3 文档一致性检查

- 计划实施前后，对照 `.codex/docs/current/architecture.md` 判断是否出现“计划已落地但事实文档未更新”的漂移。
- 若任一 milestone 实际改动了模块边界、目录结构、路由或数据来源，需要同步更新：
  - `.codex/docs/current/architecture.md`
  - 必要时 `AGENTS.md`
  - 必要时对应 README

### 11.4 最小验收结果

- 每个批次提交前，至少保证 `lint + check-types + build` 通过。
- 每个批次都要有一组与改动直接相关的手动 smoke 结果。

## 十二、风险与回滚

### 12.1 主要风险

- 知识库域抽离时把全局页和项目页的行为差异错误抽平。
- `ProjectLayout` 拆 hook 后引入 project 切换时的 stale state。
- `project.mock.ts` 拆分时误伤概览页 / 资源页 fallback。
- chat / sider 改造时破坏已有交互路径。
- Tailwind token 化把“设计特例”误收成“通用 token”。

### 12.2 回滚方式

- 严格按批次推进，出问题时按 PR / commit 粒度回滚，不跨批次回滚。
- 知识库域抽离若出现高风险回归，优先回退 hook 集成层，而不是回退底层 helper/constant。
- Tailwind token 化若出现 UI 大面积偏差，直接回退该批，不影响结构层成果。

### 12.3 是否可重试

- 可重试。
- 前提是每批保持小范围、验证充分、提交边界单一。

## 十三、进度

- [x] FE-R0 恢复前端护栏
- [x] FE-R1 抽知识共享 meta / formatter / status
- [x] FE-R2 抽知识详情与 diagnostics 状态 hook
- [x] FE-R3 抽知识上传流程 hook
- [x] FE-R4 抽知识文档动作层
- [x] FE-R5 拆 `ProjectLayout` 数据编排
- [x] FE-R6 下沉项目资源绑定 mutation
- [x] FE-R7 切开 live mapper 与历史 mock
- [x] FE-R8 拆项目对话 adapters 与页面状态层
- [x] FE-R9 拆 `AppSider` 项目表单与资源选项加载
- [x] FE-R10 收敛全局资产页共享能力
- [x] FE-R11 执行第一批 Tailwind 安全 canonical 化
- [x] FE-R12 建立 Tailwind token 化基线
- [x] FE-R13 补前端规则增强与长期护栏

## 十四、发现记录

- 2026-03-18：本地执行 `pnpm --filter platform lint`，确认当前失败为 `31 problems (27 errors, 4 warnings)`。
- 2026-03-18：本地执行 `pnpm --filter platform check-types`，确认 TypeScript 编译基线通过。
- 2026-03-18：GPT-5.4 结构扫描确认，知识库域工作流与项目数据编排是最高收益重构点。
- 2026-03-18：GPT-5.4 Tailwind 审计确认，项目更适合“安全 canonical 化 + token 化分批治理”，不适合一次性消灭 arbitrary value。
- 2026-03-18：已完成 FE-R0，`pnpm --filter platform lint`、`pnpm --filter platform check-types` 与 `pnpm --filter platform build` 全部通过。
- 2026-03-18：已完成 FE-R1 ~ FE-R4，知识域共享 helper、detail/diagnostics hook、upload hook 与 document actions hook 已接入全局知识页与项目资源页，`pnpm --filter platform lint`、`pnpm --filter platform check-types` 与 `pnpm --filter platform build` 全部通过。
- 2026-03-18：已完成 FE-R5 ~ FE-R6，`ProjectLayout` 已拆为 conversations / global catalogs / project knowledge 三个 hook，项目资源页改为通过 `ProjectContext` 的资源绑定 mutation 更新 knowledge 绑定，`pnpm --filter platform lint`、`pnpm --filter platform check-types` 与 `pnpm --filter platform build` 全部通过。
- 2026-03-18：已完成 FE-R7，`project.mock.ts` 已拆为 `projectResourceMappers.ts` 与 `projectWorkspaceSnapshot.mock.ts`，项目概览 / 资源页 / 全局成员页引用已切换，并同步更新 `AGENTS.md`、`apps/platform/README.md` 与 `.codex/docs/current/architecture.md`，`pnpm --filter platform lint`、`pnpm --filter platform check-types` 与 `pnpm --filter platform build` 全部通过。
- 2026-03-18：已完成 FE-R8 ~ FE-R10，`ProjectChatPage` 已收敛为编排层并拆出 markdown / bubble / settings / detail / actions 边界，`AppSider` 已拆出 `ProjectFormModal` 与 `useProjectResourceOptions`，`/skills`、`/agents` 已共享 global asset 的 summary / filter / meta / updatedAt 展示基元，`pnpm --filter platform lint`、`pnpm --filter platform check-types` 与 `pnpm --filter platform build` 全部通过。
- 2026-03-18：已完成 FE-R11 ~ FE-R13，`apps/platform/src` 已完成第一批 Tailwind canonical class 替换并建立 `radius / text / shadow` token 基线，根 `eslint.config.mjs` 已对前端源码启用 type-aware `await-thenable / no-floating-promises` 护栏，`pnpm --filter platform lint`、`pnpm --filter platform check-types` 与 `pnpm --filter platform build` 全部通过。

## 十五、决策记录

- 决策：先做 FE-R0，再进入知识库域抽离。
  - 原因：当前 `lint` 红灯已经阻塞重构，先恢复护栏成本最低。
- 决策：知识库域优先于 chat、sider、样式层。
  - 原因：重复最深、收益最高、可复用面最大。
- 决策：`project.mock.ts` 必须拆，但放在知识库域和项目编排之后。
  - 原因：它是命名与边界债，不是当前最高频业务复制点。
- 决策：Tailwind 治理最后做。
  - 原因：避免把设计 token 决策和结构重构绑成一批。

## 十六、结果总结

- 已完成：
  - 重构方向、优先级、批次边界、验证方式和回滚策略已冻结为正式计划。
  - FE-R0 已完成，前端 `lint / check-types / build` 基线恢复为绿灯。
  - FE-R1 ~ FE-R4 已完成，知识库域最重的共享流程已从页面内联逻辑收敛为共享 helper / hook。
  - FE-R5 ~ FE-R6 已完成，`ProjectLayout` 的项目态编排与项目资源绑定 mutation 已完成第一轮边界收缩。
  - FE-R7 已完成，项目资源 live mapper 与成员 / 概览 mock snapshot 已拆分到独立文件。
  - FE-R8 ~ FE-R10 已完成，chat / sider / global assets 的单文件职责已完成一轮收缩。
  - FE-R11 ~ FE-R13 已完成，Tailwind canonical 化、token 基线与前端异步 lint 护栏已落地。
- 未完成：
  - 当前阶段计划项已全部完成；若继续推进，应转入新一轮前端体验或测试基线工作。
- 后续建议：
  - 开工时严格按 `PR-1 -> PR-6` 顺序推进，不要跳步。
