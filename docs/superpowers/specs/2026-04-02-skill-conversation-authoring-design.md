# Knowject Skill 对话式创建设计

- 日期：2026-04-02
- 状态：已确认
- 适用范围：`/skills` 新建 Skill 抽屉、Skill authoring API、前端本地可恢复创建会话
- 设计目标：把 Skill 新建从“结构化填表”改成“模型引导对话 -> 用户确认 -> 一次性填充结构化 Skill”

## 1. Summary

本设计只解决一件事：

- 让团队成员创建 Skill 时，不需要一上来就面对 `goal / workflow / guardrails / outputContract` 这些结构化字段。

新的 authoring 心智是：

1. 用户打开新建 Skill 抽屉
2. 默认进入第一个 tab：`conversation`
3. 大模型逐轮提问、归纳、继续追问
4. 达到收敛条件后，产出总结和结构化 Skill 草稿
5. 用户确认后，再一次性填充进现有 `editor / preview` 能力
6. 最终仍然通过现有 `createSkill` 接口保存

本设计刻意不把它做成复杂的实时共编体验。

结论非常明确：

- `conversation` 是新建 Skill 的主 authoring surface
- `editor` 是确认后的微调面
- `preview` 是最后的结果预览面，并保持为最后一个 tab

取舍依据：优先降低新建门槛和认知负担，同时最大化复用现有结构化 Skill 模型与创建链路。

## 2. Goals

- 让所有团队成员都能创建 Skill，但默认按“对项目不够熟的人”来设计引导。
- 用对话代替直接填表，减少结构化字段给用户带来的理解成本。
- 在提问前先限定目标场景和项目范围，避免模型脱离项目上下文追问。
- 把提问轮次控制在 `5-12` 次之间，既保证质量，也避免无意义拉长流程。
- 保留现有 `editor / preview` 面，作为确认后的微调与验收能力。
- 支持中途关闭、切页、刷新后的本地恢复，避免长对话白费。

## 3. Non-Goals

- 不把编辑已有 `team` Skill 也切到对话式创建。
- 不做对话过程中实时同步结构化字段的复杂交互。
- 不做多版本草稿 diff、多人协作会话或跨设备恢复。
- 不把未确认的对话草稿直接写成正式 Skill 记录。
- 不复用项目聊天 runtime 直接承接 Skill authoring。

## 4. Current Facts

当前 `/skills` 新建体验已经切到结构化 Skill 模型，但 authoring 入口仍然是表单。

已存在的事实：

- 前端抽屉在 [SkillEditorModal.tsx](/Users/langya/Documents/CodeHub/ai/knowject/apps/platform/src/pages/skills/components/SkillEditorModal.tsx)
- 抽屉当前只有 `editor / preview` 两个 tab
- 新建与编辑的结构化状态管理在 [useSkillEditor.ts](/Users/langya/Documents/CodeHub/ai/knowject/apps/platform/src/pages/skills/hooks/useSkillEditor.ts)
- Skill 正式结构字段已冻结在 [skills-contract.md](/Users/langya/Documents/CodeHub/ai/knowject/docs/contracts/skills-contract.md)
- 保存仍走 [skills.ts](/Users/langya/Documents/CodeHub/ai/knowject/apps/platform/src/api/skills.ts) 中的 `createSkill`

当前问题：

- 用户一进入抽屉就被迫理解结构化字段
- 非核心成员很难直接判断 `workflow`、`guardrails`、`followupQuestionsStrategy` 应该怎么写
- “为了写 Skill 而写字段”会让 Skill 更像格式化表单，而不是贴合项目的方法资产

## 5. Target Users

目标用户不是少数专家，而是：

- 所有团队成员都可以使用

但交互假设必须按下面的默认心智设计：

- 用户未必熟悉当前项目
- 用户未必知道结构化 Skill 模型
- 用户更容易回答“你想解决什么问题、在哪个场景下发生”，而不是“请填写 output contract”

因此，本设计要求模型承担两类责任：

- 把自然语言回答逐步收敛成稳定问题定义
- 把用户回答映射成结构化 Skill 字段

## 6. Core Interaction Design

### 6.1 抽屉与 tab 结构

新建 Skill 时：

- 第一个 tab 改为 `conversation`
- 第二个 tab 保留 `editor`
- 第三个 tab 保留 `preview`
- 默认进入 `conversation`

编辑已有 Skill 时：

- 保持当前行为
- 默认仍进入 `editor`
- 不启用对话式创建

### 6.2 对话主流程

1. 用户点击“新建 Skill”
2. 抽屉打开到 `conversation`
3. 模型先引导用户选择：
   - 目标场景
   - 涉及范围
4. 进入逐轮提问
5. 每轮回复结构固定为：
   - 对上一轮回答的简短归纳
   - 下一轮问题
   - 若是关键分叉题，则附带 A/B/C 选项和推荐项
6. 达到收敛条件后，不再继续追问，而是输出：
   - Skill 总结
   - 结构化 Skill 草稿
   - “确认填充 / 继续微调”引导
7. 用户确认后，系统把结构化结果一次性填充到 `editorDraft`
8. 用户再去 `editor` 或 `preview` 完成最后确认
9. 点击保存时，才真正创建 Skill

### 6.3 提问策略

- 提问次数下限：`5`
- 提问次数上限：`12`
- 默认策略：问满必要问题，信息不足才继续追问
- 可选项只用于关键分叉题，不用于每一轮

关键分叉题包括但不限于：

- 目标场景分类
- 项目范围选择
- 产出形式选择
- Follow-up 策略判断

### 6.4 范围选择策略

用户先选：

- 目标场景

再补选：

- 涉及范围

推荐的交互不是先让模型自由读取全项目，而是先让用户圈定边界，再由模型围绕这组边界提问。

本轮确定采用：

- “先选目标场景，再补选涉及范围”的组合式入口

取舍依据：先给模型问题边界，再给材料边界，能同时提高提问准确度和项目贴合度。

## 7. State Machine

Skill 新建 authoring 会话使用轻量状态机，不与正式 Skill 记录混用。

### 7.1 状态定义

- `scope_selecting`
  - 尚未完成目标场景和涉及范围选择
- `interviewing`
  - 正在逐轮提问
- `synthesizing`
  - 信息已足够，模型整理总结和结构化草稿
- `awaiting_confirmation`
  - 等待用户确认是否填充当前草稿
- `hydrated`
  - 草稿已填充进 `editorDraft`，回到现有表单/预览体系

### 7.2 状态切换

- `scope_selecting -> interviewing`
  - 用户完成范围选择
- `interviewing -> synthesizing`
  - 达到最少轮次且信息收敛，或到达上限轮次
- `synthesizing -> awaiting_confirmation`
  - 结构化草稿已生成
- `awaiting_confirmation -> hydrated`
  - 用户点击确认填充
- `awaiting_confirmation -> interviewing`
  - 用户要求继续补充或修正

### 7.3 收敛规则

- 未达到 `5` 轮前，默认不进入总结态
- 达到 `5` 轮后，若核心问题、适用场景、范围边界、输出期望已经清楚，可提前收敛
- 超过 `12` 轮仍未收敛时，强制生成“当前信息下的初稿”，再交给用户微调

## 8. Structured Draft Mapping

对话过程中不强制用户理解结构化字段，模型在收敛阶段一次性完成映射。

### 8.1 顶层字段

- `name`
  - 由模型基于目标场景和 Skill 作用给出候选名，并带推荐
- `description`
  - Skill 的一句话总结
- `category`
  - 根据目标场景推断，并在关键分叉题中确认
- `owner`
  - 新建时可先用当前用户或默认 owner，填充后允许在 editor 中改

### 8.2 definition 字段

- `goal`
  - 来自用户对“要解决的问题 / 希望得到的结果”的描述
- `triggerScenarios`
  - 来自目标场景、触发条件和使用时机
- `requiredContext`
  - 来自项目范围选择和模型整理出的必要材料
- `workflow`
  - 来自用户期望流程与模型归纳步骤
- `outputContract`
  - 来自用户对产出形式的期望
- `guardrails`
  - 来自用户明确约束与模型补足的项目边界
- `artifacts`
  - 来自希望沉淀出的结果物
- `projectBindingNotes`
  - 来自项目范围、模块边界和适用提醒
- `followupQuestionsStrategy`
  - 由对话风格和任务类型统一判定为 `none | optional | required`

### 8.3 字段暴露原则

- 对话期间，用户看到的是问题、归纳和总结，不是完整字段表
- 结构化字段只在总结确认阶段和填充后的 `editor / preview` 中完整展示

## 9. Frontend Architecture

### 9.1 组件拆分

- [SkillEditorModal.tsx](/Users/langya/Documents/CodeHub/ai/knowject/apps/platform/src/pages/skills/components/SkillEditorModal.tsx)
  - 负责 tab 容器、模式切换和底部动作
- 新增 `SkillAuthoringConversationTab`
  - 承载范围选择、消息流、问题卡片、回答输入和确认动作
- 新增 `useSkillAuthoringSession`
  - 承载本地可恢复 authoring 状态
- [useSkillEditor.ts](/Users/langya/Documents/CodeHub/ai/knowject/apps/platform/src/pages/skills/hooks/useSkillEditor.ts)
  - 新增“从 structuredDraft 填充 editorDraft”的入口
- [SkillMarkdownPreview.tsx](/Users/langya/Documents/CodeHub/ai/knowject/apps/platform/src/pages/skills/components/SkillMarkdownPreview.tsx)
  - 继续只预览当前 `editorDraft` 生成结果，不承接对话过程展示

### 9.2 状态边界

前端保持两套清晰状态：

- `authoring session state`
  - 只服务于对话创建
- `editorDraft state`
  - 只服务于现有结构化表单与预览

两者不做实时双向绑定。

唯一同步点是：

- 用户确认填充时，`structuredDraft -> editorDraft`

取舍依据：优先简洁和可维护性，避免对话态与表单态互相污染。

## 10. API Boundary

### 10.1 新接口职责

建议在 `skills` 模块内新增专用 authoring 接口，而不是复用项目聊天接口。

建议形状：

- `POST /api/skills/authoring/turns`

请求体包含：

- `scope`
- `messages`
- `questionCount`
- `currentSummary`
- `currentStructuredDraft?`

响应体包含：

- `stage`
- `assistantMessage`
- `nextQuestion`
- `options`
- `questionCount`
- `structuredDraft?`
- `readyForConfirmation`

### 10.2 为什么不复用项目聊天接口

- 项目聊天关注开放式问答和流式回复
- Skill authoring 关注受控提问、轮次上限、结构化收敛和确认填充

如果直接复用项目聊天 runtime，会产生两个问题：

- authoring 的状态机和产品语义被稀释
- 前后端更难约束提问节奏、选项结构和收敛信号

### 10.3 正式创建链路保持不变

本设计不改变正式 Skill 创建契约：

- 用户确认填充后，仍然通过现有 `createSkill` 保存
- 未确认的对话草稿不进入正式 Skill 存储

## 11. Persistence Strategy

第一版采用：

- 前端本地可恢复会话

保留内容包括：

- 已选目标场景和范围
- 已产生的对话消息
- 当前轮次
- 当前状态机阶段
- 当前总结与 structuredDraft

第一版不做：

- 后端持久化 authoring session
- 跨设备恢复
- 团队共享未完成创建会话

取舍依据：先用最小复杂度验证对话 authoring 价值，避免在正式 Skill 体系之外再引入新的持久化对象。

## 12. Error Handling

### 12.1 Authoring 接口失败

- 保留当前对话内容
- 给出“本轮生成失败，请重试”
- 允许用户重新提交当前轮

### 12.2 本地恢复数据损坏

- 自动回退到新的创建会话
- 给一次轻提示，不阻塞用户继续

### 12.3 超过上限仍未收敛

- 停止继续追问
- 进入“当前信息下的初稿”总结态
- 明确告知用户仍可继续补充

### 12.4 确认后发现草稿不准

- 允许回到 `conversation`
- 基于已有内容继续追问或重新总结
- 重新覆盖当前未保存的 `editorDraft`

## 13. Validation Strategy

### 13.1 前端验证

- 新建模式默认进入 `conversation`
- 编辑模式不受影响，仍默认进入 `editor`
- `structuredDraft` 能正确填充 `editorDraft`
- 本地可恢复状态能正确读写
- `5-12` 轮控制符合预期

### 13.2 API / service 验证

- 各状态响应形状固定
- 关键分叉题 `options` 结构稳定
- 收敛后返回的 `structuredDraft` 字段完整
- 空范围、空消息、非法输入得到正确校验

### 13.3 最小集成验证

至少覆盖一条真实路径：

1. 打开新建 Skill
2. 完成 `5+` 轮对话
3. 生成总结草稿
4. 确认填充
5. 切换到 `preview`
6. 通过现有创建接口保存成功

## 14. Rollout Recommendation

建议按两步上线：

### Phase 1

- 上线 `conversation` tab
- 接通 authoring API
- 支持本地恢复
- 支持确认后填充 `editor / preview`

### Phase 2

- 根据真实使用情况，再决定是否需要：
  - 更强的项目范围选择器
  - 更细的总结稿展示
  - 后端持久化 authoring session

## 15. Final Decision

本次设计最终冻结以下结论：

- Skill 新建默认走对话式引导，不再默认从结构化表单开始
- Preview 保留在最后一个 tab
- 不做对话期间的复杂实时草稿交互
- 结构化 Skill 草稿在收敛后一次性生成
- 用户确认后再填充到现有 editor / preview
- 只有点击保存时才调用正式创建接口
- 中途退出时保留本地可恢复创建会话

这条路线同时满足：

- 对新成员友好
- 对项目上下文更敏感
- 对现有 Skill 结构化模型改动最小
- 对实现复杂度可控
