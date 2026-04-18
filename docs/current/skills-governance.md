# Current Skills Governance

本文件记录 Knowject 中 Skill 模块 **当前已实现的事实**，只描述已经落地到 `apps/api` 与 `apps/platform` 的行为，不描述未来 runtime 设想。

## 1. 定位

- Knowject 中的 `Skill` 已被收敛为 `团队方法资产（method asset）`。
- 它不是给 Codex / Claude 使用的 repo skill，也不是通用 tool registry。
- 当前产品语义是：
  - 全局层定义 Skill
  - 项目层绑定 Skill
  - 对话层使用 Skill

## 2. 来源与作用域

- 读侧 `source` 只有两种：
  - `preset`
  - `team`
- `preset` 代表 Knowject 内置方法资产，前后端都按只读处理。
- `team` 代表团队自建方法资产，可编辑、可绑定、可删除。
- 外部导入链路当前已从正式产品主路径移除；`/api/skills/import` 与前端导入 UI 不再作为 live 功能存在。

## 3. 生命周期与绑定

- Skill 读侧仍保留兼容字段 `lifecycleStatus=draft|published`，但治理状态已经切到 `status`：
  - `draft`
  - `active`
  - `deprecated`
  - `archived`
- `bindable` 当前由 `status === active` 推导。
- 前端新增/绑定选择器当前只允许团队自建且可绑定的 Skill；只读目录与历史绑定回显会继续保留 `preset + team` 元数据，避免已有绑定在 UI 中退化成未知项。

## 4. 结构化定义

- Skill 的正式定义字段为：
  - `name`
  - `description`
  - `category`
  - `owner`
  - `definition`
- `definition` 当前包含：
  - `goal`
  - `triggerScenarios`
  - `requiredContext`
  - `workflow`
  - `outputContract`
  - `guardrails`
  - `artifacts`
  - `projectBindingNotes`
  - `followupQuestionsStrategy`
- 后端会根据上述结构化字段生成 `skillMarkdown`，前端预览页展示的是生成结果，不再把自由输入 `SKILL.md` 作为主编辑面。

## 5. 当前预置 Skill

- 当前 registry 内置了 6 个 preset method assets：
  - `文档反向追问`
  - `方案补全`
  - `架构草图生成`
  - `需求去歧义`
  - `实现前检查`
  - `决策记录生成`

## 6. 前端消费事实

- `/skills` 页面当前只展示 `team` Skill，不再展示 `preset`
- `/skills` 页面当前展示：
  - `status`
  - `category`
  - `owner`
  - `definition` 摘要
- `/skills` 页面当前在目录页额外提供一个轻输入创建入口：
  - 名称
  - 描述
  - 具体要做的事情
  - 辅助模板（选填）
- 用户点击 `生成草稿` 后，创建弹框会立即关闭
- `/skills` 页面顶部会显示异步生成中的创建任务卡片
- 点击任务卡片会打开右侧 `Drawer`，在其中查看和编辑 `Markdown 草稿`
- live 创建链路当前使用异步 job 接口：
  - `POST /api/skills/creation/jobs`
  - `GET /api/skills/creation/jobs`
  - `GET /api/skills/creation/jobs/:jobId`
  - `POST /api/skills/creation/jobs/:jobId/refine`
  - `POST /api/skills/creation/jobs/:jobId/save`
- 保存时当前走：
  - `POST /api/skills/creation/jobs/:jobId/save`
  - 后端内部再转到正式 `definition -> skillMarkdown -> createSkill` 链路
- `/skills` 页面当前保留的动作：
  - 生成草稿
  - 查看生成任务卡片
  - 继续优化
  - 保存草稿
  - `status` 流转
  - 删除
- `/skills` 页面当前不再暴露：
  - 查看抽屉
  - 编辑抽屉
  - conversation-first authoring
  - 导入入口
  - `system/custom/imported` 来源模型
  - `publish` 动作心智
  - `runtime ready / contract reserved` 作为主展示语义
- 项目资源页、项目创建/编辑表单与 Agent 绑定选择器当前新增选择时只允许 `team` Skill；成员协作页与项目态全局目录会保留 `preset + team` 的读侧元数据，用于兼容历史绑定展示。
- 项目对话输入框当前新增显式 Skill picker，只展示“当前项目已绑定的 team Skill”；用户选中后，前端会在发送消息时显式携带 `skillId`，由后端把对应 Skill 的结构化定义注入本轮对话 prompt。

## 7. Authoring Contract Facts

- `POST /api/skills/authoring/turns` 与 `POST /api/skills/authoring/turns/stream` 的后端 contract 仍保留在仓库中，但当前已不再接入 live `/skills` 页面。
- `/skills` 页面当前不会触发旧 authoring turn 请求，也不再保留 conversation-first authoring session 状态。
- live 创建链路当前只使用：
  - `POST /api/skills/creation/jobs`
  - `GET /api/skills/creation/jobs`
  - `GET /api/skills/creation/jobs/:jobId`
  - `POST /api/skills/creation/jobs/:jobId/refine`
  - `POST /api/skills/creation/jobs/:jobId/save`
- 创建态 Markdown 只承担当前页编辑面，不作为长期主数据持久化；正式真相源仍然是 `definition`。
