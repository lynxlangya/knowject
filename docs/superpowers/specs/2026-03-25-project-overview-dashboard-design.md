# Knowject 项目概览驾驶舱设计

- 日期：2026-03-25
- 状态：已批准
- 范围：`apps/platform` 项目态 `/project/:projectId/overview` 页面重构

## 摘要

当前项目概览页主要由：

- 最近对话
- 最近接入资源
- 快捷操作

组成。

这些内容与项目内的 `对话 / 资源 / 成员` 页面发生了明显重复，承担的更多是“二次导航”而不是“概览判断”。对项目负责人来说，这样的概览页信息密度偏低，无法快速回答更重要的问题：

- 这个项目的 AI / 知识链路有没有真正运转起来
- 当前链路是健康、脆弱，还是停滞
- 资源底座是否完整，哪里存在明显缺口

本设计将项目概览页重构为 `AI 项目驾驶舱`，核心定位从“入口聚合页”切换为“负责人判断页”。

新概览页优先回答以下问题：

1. 这个项目最近的 AI / 知识链路有没有真正被使用
2. 当前知识链路是否处于可用、处理中还是异常状态
3. 资源底座是否失衡，是否缺少关键 AI 能力要素
4. 负责人当前最值得注意的风险是什么

本次设计明确采用以下产品约束：

- 只使用现有正式数据，不新增人工维护字段
- 不新增 overview 专用后端接口
- 不引入重量级图表库
- 不继续把概览逻辑堆进现有 mock snapshot

## 问题

当前概览页存在四个核心问题：

1. 语义重复
   - 最近对话与对话页重复
   - 最近资源与资源页重复
   - 快捷操作与项目导航重复

2. 判断价值低
   - 用户仍需要自己从多个入口拼出“项目当前状态”
   - 页面没有把现有正式数据翻译成判断信号

3. 页面定位模糊
   - 目前更像 landing section，而不是 overview
   - 对项目负责人没有形成明确的“10 秒诊断价值”

4. 容易继续堆积补充层
   - 文档已经明确指出项目概览仍有本地补充层与 mock 残留
   - 如果继续在概览页增加列表和补充文案，后续切正式数据的成本会继续上升

## 目标

- 把项目概览页从“二次导航入口”改造成“AI 项目驾驶舱”。
- 让项目负责人在 10 秒内判断项目 AI 链路是否真的在运行。
- 基于现有正式数据给出趋势、健康、覆盖和风险提示。
- 与 `对话 / 资源 / 成员` 页形成清晰分工：
  - 概览负责判断
  - 对话负责查看过程
  - 资源负责管理资产
  - 成员负责正式 roster
- 采用小步、可替换的前端分层，避免把新逻辑继续堆进 `ProjectOverviewPage.tsx`。

## 非目标

- 不新增项目阶段、里程碑、风险状态等人工填写字段。
- 不在本阶段新增后端 overview 聚合 API。
- 不把概览页改造成项目管理系统或周报中心。
- 不在本阶段提供深度经营分析、团队绩效分析或复杂运营报表。
- 不引入 `echarts`、`recharts`、`@ant-design/charts` 等重量级图表依赖。
- 不扩展 `projectWorkspaceSnapshot.mock.ts` 的职责。

## 已确认的产品决策

### 用户优先级

用户已明确项目概览的价值排序为：

1. 项目推进健康度
2. 知识与资源覆盖
3. AI 使用成效
4. 团队协作状态

在进一步聚焦后，概览页打开时最希望优先回答的问题为：

1. 这个项目最近的 AI / 知识链路有没有真正运转起来
2. 这个项目现在是否健康，哪里有风险
3. 这个项目下一步最该补什么资源或动作

概览页的第一使用者为：

- 项目负责人

### 数据边界

本次设计只允许使用现有正式数据自动推导，不引入人工维护字段。

意味着概览页必须依赖：

- 项目基础信息
- 项目对话列表
- 项目绑定资源
- 项目私有知识列表
- 全局知识 / 技能 / 智能体 catalog

进行聚合判断，而不是引入新的录入流程。

## 现有上下文

### 当前页面结构

`ProjectOverviewPage.tsx` 当前主要包含：

- 最近对话卡片
- 最近接入资源卡片
- 快捷操作卡片

这些模块都直接复用现有列表数据，缺少真正的 overview 推导层。

### 当前可用正式数据

当前项目页上下文已经具备以下正式数据源：

- `activeProject`
  - 项目基础信息
  - `knowledgeBaseIds / skillIds / agentIds`
- `conversations.items`
  - 对话 summary 列表
  - `updatedAt`
- `projectKnowledge.items`
  - 项目私有知识列表
  - `indexStatus`
  - `documentCount`
  - `chunkCount`
  - `updatedAt`
- `globalAssetCatalogs.knowledge.items`
  - 绑定的全局知识事实源
- `globalAssetCatalogs.skills.items`
  - 技能目录
- `globalAssetCatalogs.agents.items`
  - 智能体目录

这些数据已经足够支撑趋势、覆盖和健康度的首版驾驶舱。

### 当前约束

- 前端已有页面中没有现成的图表依赖
- `ProjectHeader` 已承担项目头部视觉和基础摘要职责
- `projectWorkspaceSnapshot.mock.ts` 当前仍承载成员补充层与概览头部补充 meta
- 文档已经明确剩余 mock 不应继续扩张

结论：

首版应优先利用现有正式数据做“轻量诊断”，而不是继续增加新 mock 或新接口。

## 方案对比

### 方案 A：AI 链路驾驶舱

这是本设计的推荐方案。

核心回答：

- 这个项目的 AI / 知识链路有没有跑起来
- 目前链路稳不稳
- 资源底座缺不缺关键拼图

展示内容：

- 最近 7 天对话活跃趋势
- 知识结构分布与索引健康
- 资源配置完整度
- 自动推导诊断结论

优点：

- 最贴合项目负责人视角
- 与当前正式数据匹配度最高
- 与对话页、资源页形成“判断层”而非“入口层”分工

缺点：

- 需要定义一套清晰的推导规则，避免结论空泛

### 方案 B：项目经营简报

核心回答：

- 当前项目整体投入产出是否健康

展示内容：

- 项目活跃度
- 资产量
- 最近变化摘要

优点：

- 更接近经营视角
- 一眼看全

缺点：

- 对“AI 是否真正运转”这个问题回答不够锋利
- 容易退化成一般化数据报表

### 方案 C：项目脉搏时间轴

核心回答：

- 最近一段时间项目发生了什么

展示内容：

- 最近对话
- 最近资源变化
- 最近知识更新

优点：

- 叙事感强
- 容易理解

缺点：

- 仍然偏“最近发生了什么”
- 和现有对话页、资源页的重叠度较高

## 推荐方案

采用方案 A：`AI 链路驾驶舱`。

取舍依据：优先 Correctness 与 Maintainability，在不新增后端接口与人工字段的前提下，最大化概览页的判断价值。

## 页面结构设计

新概览页建议拆为 5 个区域：

### 1. 顶部总览带

保留现有 `ProjectHeader`，但把它视为“项目总览头”，不再在主体区域重复展示列表入口。

职责：

- 承接项目名称、描述、基础规模信息
- 维持项目页视觉连续性
- 不在本次重构中承担新的复杂判断逻辑

### 2. 左主区：AI 运转趋势

展示一个最近 7 天的活跃线程趋势图。

目标：

- 回答“最近 AI 是否真的在被持续使用”

建议内容：

- 7 天柱状趋势图
- 7 天内活跃线程数
- 最近一次活跃时间

### 3. 中主区：知识链路健康

展示知识结构、索引状态和内容承载。

目标：

- 回答“知识是不是只是挂上去了，还是已经 ready”

建议内容：

- 项目私有知识 vs 绑定全局知识分布
- `completed / pending / processing / failed` 状态分布
- 知识库总数 / 有文档知识库数 / 总文档数

### 4. 右侧诊断区：自动推导结论

以结论而不是列表为核心。

目标：

- 把复杂数据翻译为负责人可快速判断的信号

建议内容：

- 状态级别
- 一句话结论
- 简短原因解释

例如：

- AI 使用降温
- 知识已接入但尚未进入稳定可用状态
- 资源底座偏轻，当前更像仅知识检索项目

### 5. 底部补充区：资源配置完整度

展示 knowledge / skills / agents 三类资源的接入平衡度。

目标：

- 回答“项目的 AI 底座是否完整”

建议内容：

- 三类资源数量对比
- 覆盖度标签
- 是否存在明显单腿走路

## 指标与推导口径

### 1. AI 使用活跃度

数据源：

- `conversations.items[].updatedAt`

推导规则：

- 取最近 7 天
- 同一线程在同一天内最多记为 1 次活跃
- 生成按天分桶的活跃线程数

输出指标：

- `activeConversationCount7d`
- `lastConversationActivityAt`
- `activityTrend7d[]`

设计原因：

- 比“最近 3 条对话”更能反映项目 AI 使用热度

### 2. 知识链路健康度

数据源：

- `activeProject.knowledgeBaseIds`
- `projectKnowledge.items`
- `globalAssetCatalogs.knowledge.items`

推导规则：

- 绑定全局知识数 = `activeProject.knowledgeBaseIds.length`
- 项目私有知识数 = `projectKnowledge.items.length`
- 知识总数 = 两者之和
- `indexStatus` 聚合只对项目私有知识统计
- 有文档知识库数 = `documentCount > 0`
- 总文档数 = 所有 knowledge 的 `documentCount` 求和

输出指标：

- `globalKnowledgeCount`
- `projectKnowledgeCount`
- `totalKnowledgeCount`
- `knowledgeStatusBreakdown`
- `knowledgeWithDocumentsCount`
- `knowledgeDocumentCount`

设计原因：

- 首版正式可观测的 index status 主要来自项目私有知识
- 对绑定全局知识维持“已接入数量”判断即可

### 3. 资源配置完整度

数据源：

- `activeProject.knowledgeBaseIds`
- `activeProject.skillIds`
- `activeProject.agentIds`
- `projectKnowledge.items`

推导规则：

- knowledge 覆盖数 = 绑定全局知识数 + 项目私有知识数
- skills 覆盖数 = `skillIds.length`
- agents 覆盖数 = `agentIds.length`

输出指标：

- `resourceCoverage.knowledge`
- `resourceCoverage.skills`
- `resourceCoverage.agents`

设计原因：

- 首版的目标不是判断“资源质量”，而是先判断“配置是否成形”

### 4. 自动诊断结论

数据源：

- 活跃度聚合结果
- 知识链路聚合结果
- 资源覆盖聚合结果

规则示例：

- 如果 `activeConversationCount7d = 0` 且存在历史对话迹象（例如 `lastConversationActivityAt !== null`）
  - 输出：AI 使用降温
- 如果 `totalKnowledgeCount > 0` 且项目私有知识 `completed = 0` 且存在 `pending / processing / failed`
  - 输出：知识链路未进入稳定 ready 状态
- 如果 `knowledge > 0` 且 `skills = 0` 且 `agents = 0`
  - 输出：资源底座偏轻
- 如果 `projectKnowledgeCount > 0` 且 `knowledgeDocumentCount = 0`
  - 输出：项目知识已创建但尚未形成内容承载
- 如果所有资源全空且对话全空
  - 输出：项目仍处于 AI 冷启动阶段

输出建议结构：

```ts
type ProjectOverviewInsightLevel = 'positive' | 'neutral' | 'warning' | 'risk';

interface ProjectOverviewInsight {
  id: string;
  level: ProjectOverviewInsightLevel;
  title: string;
  description: string;
}
```

## 视图与组件边界

### 页面壳层

文件：

- `apps/platform/src/pages/project/ProjectOverviewPage.tsx`

职责：

- 读取 `useProjectPageContext()`
- 调用 overview adapter
- 组织页面布局
- 渲染各 overview 子组件

非职责：

- 不直接写趋势分桶逻辑
- 不直接写诊断规则
- 不继续扩充列表型入口

### 指标适配层

建议新增：

- `apps/platform/src/pages/project/projectOverview.types.ts`
- `apps/platform/src/pages/project/projectOverview.adapter.ts`

职责：

- 聚合项目上下文正式数据
- 产出页面需要的统一 view model
- 处理空态与部分失败下的默认值

### 诊断规则层

建议新增：

- `apps/platform/src/pages/project/projectOverview.insights.ts`

职责：

- 输入 adapter summary
- 输出诊断结论列表

要求：

- 纯函数
- 可单测
- 不耦合 UI 组件

### 视图组件层

建议新增：

- `apps/platform/src/pages/project/components/overview/OverviewMetricStrip.tsx`
- `apps/platform/src/pages/project/components/overview/OverviewActivityChart.tsx`
- `apps/platform/src/pages/project/components/overview/OverviewKnowledgeHealthCard.tsx`
- `apps/platform/src/pages/project/components/overview/OverviewResourceCoverageCard.tsx`
- `apps/platform/src/pages/project/components/overview/OverviewInsightList.tsx`

职责：

- 只消费整理后的 view model
- 不自行推导业务逻辑

## 视觉与图表策略

当前项目未引入现成图表库，因此首版采用轻量自绘策略。

建议：

- 活跃趋势：`SVG` 迷你柱状图
- 状态分布：分段状态条
- 资源覆盖：横向覆盖条或比例卡

原因：

- 降低依赖成本
- 减少 bundle 风险
- 保持样式可控
- 避免为单页引入整套 chart 生态

## 错误处理与空态

### 部分失败策略

概览页不应因为某个数据源失败而整体失效。

原则：

- 局部失败，局部降级
- 其他可计算模块继续显示
- 诊断规则只基于当前可用数据输出，不伪造结论

### 对话数据失败

- 趋势图区域显示 warning
- 其他模块继续可用
- 不输出依赖对话活跃度的诊断

### 项目私有知识失败

- 知识健康区退化为“已绑定知识与资源覆盖”的有限视图
- 提示当前诊断不包含项目私有知识

### 全新冷启动项目

即使没有对话、没有知识、没有技能、没有智能体，也不展示空白页面。

应输出：

- AI 冷启动提示
- 当前尚未形成使用记录
- 当前缺少知识 / 技能 / 智能体底座

## 文案与国际化

本次重构会替换现有 `overview` 文案 key。

要求：

- 新增概览相关的中英文 locale key
- 删除或停用旧的“最近对话 / 最近资源 / 快捷操作”文案键
- 维持 `project` namespace 内部结构清晰

建议按模块组织：

- `overview.summary`
- `overview.activity`
- `overview.knowledge`
- `overview.coverage`
- `overview.insights`
- `overview.states`

## 测试策略

### 1. adapter 单测

建议新增：

- `apps/platform/tests/projectOverview.adapter.test.ts`

覆盖：

- 最近 7 天趋势分桶正确
- knowledge / skills / agents 聚合正确
- 索引状态分布正确
- 空数据与部分缺失数据不抛错

### 2. insight 规则单测

建议新增：

- `apps/platform/tests/projectOverview.insights.test.ts`

覆盖：

- 无活跃线程时输出 AI 使用降温
- 有知识但未 ready 时输出知识链路风险
- 无 skill / agent 时输出资源底座偏轻
- 冷启动项目输出基础诊断

### 3. 页面回归验证

至少验证：

- overview 页面在桌面与移动端都能正常布局
- 部分数据失败时页面不崩溃
- locale 切换后 overview 新文案镜像完整

## 验收标准

本设计落地后，概览页应满足：

1. 首屏不再以“最近列表 + 快捷入口”为主。
2. 用户能在 10 秒内回答：
   - 最近 AI 有没有被持续使用
   - 知识链路是否 ready
   - 资源底座是否失衡
   - 当前最值得关注的风险是什么
3. 不新增后端接口。
4. 不新增人工维护字段。
5. 不引入重量级图表库。
6. 主要逻辑沉淀到 adapter / insights / components，而不是重新堆进页面 JSX。

## 实施建议

建议按以下顺序实施：

1. 新增 overview adapter / types / insights
2. 新增 overview 组件
3. 重写 `ProjectOverviewPage.tsx`
4. 更新 `project` locale 资源
5. 补 adapter / insights 测试
6. 运行 `lint / check-types / test / build`

## 风险与后续演进

### 当前风险

- 当前对话 summary 只有 `updatedAt`，无法区分更细的消息级活跃度
- 绑定全局知识缺少统一的运行态健康信号，首版只能体现“接入数量”而非“可用质量”
- `ProjectHeader` 仍依赖部分 snapshot 补充层，首版不处理该边界

### 后续演进方向

如果后续后端新增正式 overview 聚合接口，本次前端分层可以平滑演进为：

- adapter 从“前端聚合”切到“服务端 summary 映射”
- insights 规则保留
- 视图组件保持不变

这保证了首版先交付价值，后续再把复杂聚合迁回服务端时不会推翻页面结构。
