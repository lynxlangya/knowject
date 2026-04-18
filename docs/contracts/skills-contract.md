# Skills Contract

本文件冻结 Knowject Skill 模块当前前后端共享的核心契约，供 `apps/api`、`apps/platform` 与项目消费层对齐。

## 1. Read Model

### `SkillSummaryResponse`

- `id: string`
- `slug: string`
- `name: string`
- `description: string`
- `type: 'repository_search' | 'repository_inspection' | 'knowledge_search' | 'markdown_bundle'`
- `source: 'preset' | 'team'`
- `origin: 'manual' | 'github' | 'url' | null`
- `handler: string | null`
- `parametersSchema: object | null`
- `runtimeStatus: 'available' | 'contract_only'`
- `lifecycleStatus: 'draft' | 'published'`
- `category?: 'documentation_architecture' | 'engineering_execution' | 'governance_capture'`
- `status?: 'draft' | 'active' | 'deprecated' | 'archived'`
- `owner?: string`
- `definition?: SkillDefinitionFields`
- `statusChangedAt?: string | null`
- `bindable: boolean`
- `markdownExcerpt: string`
- `bundleFileCount: number`
- `importProvenance: object | null`
- `createdBy: string`
- `createdAt: string`
- `updatedAt: string`
- `publishedAt: string | null`

### `SkillDefinitionFields`

- `goal: string`
- `triggerScenarios: string[]`
- `requiredContext: string[]`
- `workflow: string[]`
- `outputContract: string[]`
- `guardrails: string[]`
- `artifacts: string[]`
- `projectBindingNotes: string[]`
- `followupQuestionsStrategy: 'none' | 'optional' | 'required'`

约束补充：

- `artifacts` 与 `projectBindingNotes` 仍然是正式结构字段，但当前允许为空数组

### `SkillDetailResponse`

- 继承 `SkillSummaryResponse`
- 额外包含：
  - `skillMarkdown: string`
  - `bundleFiles: Array<{ path: string; size: number }>`

## 2. List Meta

`GET /api/skills` 当前返回：

- `meta.registry = 'preset+team'`
- `meta.builtinOnly = false`
- `meta.boundaries.authoring = 'structured-method-asset'`
- `meta.boundaries.source = 'team-created-only'`
- `meta.boundaries.binding = 'project-first'`
- `meta.boundaries.runtime = 'manual-or-recommended-in-conversation'`

## 3. Mutations

### `POST /api/skills`

请求体：

- `name: string`
- `description: string`
- `category: SkillCategory`
- `owner: string`
- `definition: SkillDefinitionFields`

行为：

- 后端固定把新建 Skill 写成 `status=draft`
- 后端根据结构化字段生成 `skillMarkdown`

### `POST /api/skills/creation/jobs`

请求体：

- `name: string`
- `description: string`
- `taskIntent: string`
- `templateHint?: 'goal' | 'workflow' | 'output' | 'guardrails' | null`

响应体：

- `job: SkillCreationJobResponse`

约束：

- 该接口服务于 `/skills` 页面当前的轻输入创建态
- 请求成功后应尽快返回，不等待大模型生成完成
- 初始 `job.status` 为 `queued` 或 `generating`
- `templateHint` 只作为输入辅助，不承担正式分类职责

### `GET /api/skills/creation/jobs`

响应体：

- `jobs: SkillCreationJobResponse[]`

约束：

- 返回当前登录用户的创建任务，按 `updatedAt` 倒序排列
- live `/skills` 页面用它渲染顶部异步生成卡片区

### `GET /api/skills/creation/jobs/:jobId`

响应体：

- `job: SkillCreationJobResponse`

约束：

- 仅允许访问当前登录用户自己的任务
- `status = 'ready'` 时，响应中应包含完整 `markdownDraft`

### `POST /api/skills/creation/jobs/:jobId/refine`

请求体：

- `markdownDraft: string`
- `optimizationInstruction?: string`
- `currentInference?: { category: SkillCategory | null; contextTargets: string[]; rationale?: string } | null`

响应体：

- `job: SkillCreationJobResponse`

约束：

- 该接口只重排当前任务，不直接落库
- 请求成功后应尽快返回，不等待优化完成
- 前端局部提示与撤销属于页面本地状态，不属于 API contract

### `POST /api/skills/creation/jobs/:jobId/save`

请求体：

- `markdownDraft: string`
- `currentInference?: { category: SkillCategory | null; contextTargets: string[]; rationale?: string } | null`

行为：

- 后端先把 Markdown 草稿转换为 `definition`
- 再复用 `POST /api/skills` 的正式创建链路
- `owner` 由当前登录用户补齐
- `category` 优先取 `currentInference.category`，缺失时由后端按草稿内容推断

响应体：

- `job: SkillCreationJobResponse`
- `skill: SkillDetailResponse`

### `SkillCreationJobResponse`

- `id: string`
- `status: 'queued' | 'generating' | 'ready' | 'failed' | 'saved'`
- `name: string`
- `description: string`
- `taskIntent: string`
- `templateHint: 'goal' | 'workflow' | 'output' | 'guardrails' | null`
- `markdownDraft: string | null`
- `currentSummary: string`
- `currentInference: { category: SkillCategory | null; contextTargets: string[]; rationale?: string } | null`
- `confirmationQuestions: string[]`
- `needsFollowup: boolean`
- `errorMessage: string | null`
- `createdAt: string`
- `updatedAt: string`

### `PATCH /api/skills/:skillId`

允许更新：

- `name?: string`
- `description?: string`
- `category?: SkillCategory`
- `owner?: string`
- `definition?: SkillDefinitionFields`
- `status?: SkillStatus`

限制：

- `preset` Skill 不可编辑
- 已绑定 Skill 在降级/归档时仍受后端引用保护

### `POST /api/skills/authoring/turns`

请求体：

- `scope?: { scenario: SkillCategory; targets: string[] } | null`
- `messages: Array<{ role: 'assistant' | 'user'; content: string }>`
- `questionCount: number`
- `currentSummary: string`
- `currentStructuredDraft?: SkillAuthoringTurnDraft | null`
- `currentInference?: { category: SkillCategory | null; contextTargets: string[]; rationale?: string } | null`
- `humanOverrides?: { category?: SkillCategory | null; contextTargets?: string[] } | null`

响应体：

- `stage: 'interviewing' | 'synthesizing' | 'awaiting_confirmation'`
- `assistantMessage: string`
- `nextQuestion: string`
- `options: Array<{ id: 'a' | 'b' | 'c'; label: string; rationale: string; recommended: boolean }>`
- `questionCount: number`
- `currentSummary: string`
- `currentInference: { category: SkillCategory | null; contextTargets: string[]; rationale?: string }`
- `structuredDraft: SkillAuthoringTurnDraft | null`
- `readyForConfirmation: boolean`

约束：

- 该接口当前仍存在于后端，但已不再接入 live `/skills` 创建页
- `options` 仅出现在关键决策轮
- `scope` 当前进入兼容过渡态：可以省略，但如果传入，仍需满足完整合法的 `scenario + targets`
- `currentInference` 与 `humanOverrides.contextTargets` 当前只接受受控范围值，不是任意 free-form tags

### `POST /api/skills/authoring/turns/stream`

请求体：

- 与 `POST /api/skills/authoring/turns` 相同

响应体：

- `Content-Type: text/event-stream`
- pre-`ack` 的鉴权 / 校验失败仍返回普通 JSON error envelope，并保留原始 HTTP status
- 事件顺序：
  - `ack`
  - `done` 或 `error`

事件载荷：

- `ack`
  - `version: 'v1'`
  - `type: 'ack'`
  - `sequence: number`
- `done`
  - `version: 'v1'`
  - `type: 'done'`
  - `sequence: number`
  - `turn: SkillAuthoringTurnResponse`
- `error`
  - `version: 'v1'`
  - `type: 'error'`
  - `sequence: number`
  - `status: number`
  - `code: string`
  - `message: string`
  - `retryable: boolean`

约束：

- 该 stream 接口当前不再接入 live `/skills` 创建页
- `ack` 仅表示 stream 已建立，不携带业务 stage
- post-`ack` error 事件需要保留原始错误 `status`，避免前端把所有失败都压平为 502
- 编辑已有 Skill 仍不使用该接口

## 4. Removed Contract

以下旧契约不再属于 live contract：

- `POST /api/skills/import`
- `POST /api/skills/creation/drafts/generate`
- `POST /api/skills/creation/drafts/refine`
- `POST /api/skills/creation/drafts/save`
- 前端原生 `SKILL.md` 自由编辑作为主 authoring surface
- `system/custom/imported` 作为正式读侧来源模型
- `publish/unpublish` 作为正式主动作语义
