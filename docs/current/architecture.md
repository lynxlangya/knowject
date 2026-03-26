# Current Architecture (Project Chat Sources)

本文件是 **当前已实现事实**（current facts），聚焦 `apps/platform` 项目对话页在 source/citation 与 Drawer/Rail 交互上的实现边界。

范围：

- page-level source drawer（右侧 sources Drawer）
- turn hook 的 `sources_seed` 接入与 source seed 暂存
- draft `[[sourceN]]` transport token 与最终 persisted 语义的交接
- message rail 与 source drawer 的互斥与优先级
- draft-to-persisted handoff（draft message id -> persisted message id）

非范围：

- 未来计划 / roadmap
- 其他模块（knowledge/skills/agents 等）的治理与实现

## 1. 页面分层与主要参与者

页面：`/project/:projectId/chat`（`ProjectChatPage.tsx`）

核心参与者（只列出与 Task 7 同步相关部分）：

- `useProjectConversationTurn`
  - 发起 `POST .../messages/stream`，消费 SSE events（`ack/delta/sources_seed/done/citation_patch/error`）
  - 维护 draft assistant message（streaming 文本）与 source seed 暂存
  - 在 `done` 后触发 draft-to-persisted handoff 所需状态（`assistantMessageHandoff`），并在 `citation_patch` 到达后补丁更新 persisted message 的 `citationContent`
- `useProjectConversationSourceDrawer`
  - 管理 sources Drawer 的 open/messageId/activeSourceKey/activeChunkId/status
  - 负责把 Drawer 的 `messageId` 从 draft id 平滑切换到 persisted assistantMessageId
- `projectChatSources.ts`
  - 解析 `[[sourceN]]` / `[[SOURCE_TAG:...]]` token
  - 按 `sourceKey` 聚合 sources，并实现 seed entries 与 persisted sources 的回退/切换逻辑
- `projectChatBubble.components.tsx`
  - 在 assistant bubble 内把 draft token 渲染为可点击的 source tag
  - 点击 source tag 时打开 sources Drawer（page-level handler 注入）

## 2. `sources_seed` 的接入与暂存（Turn Hook）

`useProjectConversationTurn` 在一次 turn 开始时，会初始化两份与 sources 相关的 draft 状态：

1. `draftAssistantMessage.sourceSeedEntries: []`
2. `sourceDrawerDraftSnapshot.sourceSeedEntries: []`

当 SSE 收到 `sources_seed` 事件时：

- `draftAssistantMessage.sourceSeedEntries = event.sources`
- `sourceDrawerDraftSnapshot.sourceSeedEntries = event.sources`

这两份数据的用途不同：

- `draftAssistantMessage` 用于 **当前 streaming draft bubble** 的 tag 渲染。
- `sourceDrawerDraftSnapshot` 用于 **source drawer 的 seed 暂存**，即使 draft bubble 被清理（例如错误分支）仍能在 Drawer 中保留 “seed 列表 + retry 信息”。

## 3. Draft Token 与最终 persisted 语义

### 3.1 Draft `[[sourceN]]` / Legacy `[[SOURCE_TAG:...]]` 的解析

`projectChatSources.resolveDraftSourceTokens(content)` 识别两类 token：

- draft：`[[sourceN]]`
- legacy：`[[SOURCE_TAG:1,2]]`（解析为 `source1/source2/...`）

token 被解析为：

- `kind: "draft" | "legacy"`
- `rawText`（原始 token 文本）
- `sourceKeys: string[]`（例如 `["source1"]` / `["source1","source2"]`）
- `start/end`（在 content 中的位置）

### 3.2 Draft token 的“可点击 tag”门禁

在 `ProjectChatAssistantMessage` 渲染时，token 是否会被替换为可点击 tag 取决于 token 类型与可用 source 集合：

- draft token（`[[sourceN]]`）：只会渲染 `sourceSeedEntries` 中存在的 `sourceKey`（即 “seededSourceKeys”）。
- legacy token（`[[SOURCE_TAG:...]]`）：在 persisted message 场景下按 `sources[]` 的 `sourceKey` 门禁；在 draft 场景下同样会受 `seededSourceKeys` 约束。

结果：

- streaming draft 可以先基于 `sources_seed` 渲染 tags（即使还没有最终 `sources[]`）。
- persisted message 的事实源是 `sources[] / citationContent`；token 只作为可选的 legacy fallback 输入，不构成 persisted 语义依赖。

## 4. Source Drawer：seed -> persisted 的切换与回退

`useProjectConversationSourceDrawer` 的 drawer payload 分三类：

1. Drawer 指向 draft assistant message（`draftAssistantMessage.id === drawerState.messageId`）
  - `seedEntries` 来自 `draftAssistantMessage.sourceSeedEntries`
  - `persistedSources` 来自 `draftAssistantMessage.sources`（当前实现中默认空数组）
2. Drawer 指向 seed 暂存快照（来自 `sourceDrawerDraftSnapshot` 的虚拟 draft message）
  - `seedEntries` 来自 `sourceDrawerDraftSnapshot.sourceSeedEntries`
  - `persistedSources` 为空数组
3. Drawer 指向 persisted assistant message（从 `messages[]` 找到的 `message.sources`）
  - `persistedSources` 来自 `messages[].sources`
  - `seedEntries` 为空数组

`projectChatSources.buildProjectConversationSourceDrawerViewModel` 会在以下条件下使用 seed entries 作为 Drawer 的有效列表：

- seed entries 非空
- 且 persisted sources 的聚合结果与 seed entries 不一致（数量更少，或按索引逐项对比 `sourceKey/knowledgeId/documentId` 有差异）

这保证了：

- `sources_seed` 到达后，Drawer 可以立即展示 “将要引用的文档列表骨架”。
- 当 persisted `sources[]` 准备好且与 seed 一致时，Drawer 自动切换到 persisted sources（包含 chunk/snippet 等更完整信息）。

## 5. Draft-to-Persisted Handoff（Drawer 侧 messageId 映射）

`useProjectConversationTurn` 在收到 `done` 事件时，会设置：

- `assistantMessageHandoff = { clientRequestId, draftMessageId, assistantMessageId }`

`useProjectConversationSourceDrawer.resolveProjectConversationSourceDrawerMessageId` 使用 `assistantMessageHandoff` 做 messageId 映射：

- 如果 Drawer 当前指向 `draftMessageId`，且 `messages[]` 中已出现 `assistantMessageId`（role=assistant），则把 Drawer 的 `messageId` 切换到 `assistantMessageId`。

目的：

- 即使用户在 streaming 阶段已经打开 Drawer，`done` 后也能无缝切到最终 persisted assistant message 的 `sources[]`。

## 6. Drawer 与 Message Rail 的互斥与优先级（Page-Level）

`ProjectChatPage` 在 page-level 明确了 Drawer 与 message rail 的互斥关系：

- 点击 assistant bubble 内的 source tag 打开 Drawer 时：
  - 先 `setMobileRailOpen(false)`（移动端 rail Drawer 关闭）
  - 再 `sourceDrawer.openDrawer({ messageId, sourceKey })`
- desktop rail 的 `expanded` 计算为：
  - `expanded = sourceDrawer.state.open ? false : messageRail.expanded`
  - 即：**source drawer 打开时强制收起 rail**（drawer 优先级更高）
- 移动端打开 rail 的按钮会先 `sourceDrawer.closeDrawer()` 再打开 rail：
  - 即：**rail 打开时会关闭 source drawer**

结论（当前事实）：

- rail 与 source drawer 在页面上是互斥显示的。
- 优先级为：打开 source drawer 会压制/关闭 rail；打开 rail 会关闭 source drawer。

## 7. 项目概览（Dashboard）当前事实

本节只记录 `apps/platform` 已实现的 `/project/:projectId/overview` 行为与数据链路事实，不展开未来规划。

- `/project/:projectId/overview` 当前是判断 / dashboard 页，不再是 recent-entry 列表页。
- Overview 主体数据来自 `ProjectLayout -> Outlet context` 注入的 `useProjectPageContext()`（`ProjectPageContextValue`），并通过纯 domain helper 链路聚合：
  - `projectOverview.adapter.ts` 的 `buildProjectOverviewSummary(...)`：把 `activeProject + conversations + bound global knowledge + projectKnowledge` 聚合成可计算的 summary（同时显式标记 `available`）。
  - `projectOverview.insights.ts` 的 `buildProjectOverviewInsights(summary)`：把 summary 转换为有限条可展示 insight（按 severity 排序并截断）。
- `ProjectHeader` 仍使用 `projectWorkspaceSnapshot.mock.ts`（`getProjectWorkspaceSnapshot`）做 header-level 的 member roster 映射与 meta summary fallback；该 mock 不再作为 Overview 主体内容的数据源。
- Partial-load / error 降级：当 `conversations`、项目私有知识目录，或项目绑定的全局知识目录读取失败时，Overview 会以 warning 提示 partial-load，并把对应指标 fail-closed 到 `unavailable` 展示（例如 `—` / `unavailable` label），避免静默渲染出误导性的 0。
