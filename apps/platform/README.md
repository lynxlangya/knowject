# Knowject Frontend (`apps/platform`)

前端采用 React + Vite + Ant Design，当前职责是提供登录后产品壳、项目态页面与全局资产管理页；截至 2026-04-13，基础框架阶段已完成认证接入、项目主数据接入、项目成员 roster 管理、项目资源绑定正式写回、项目对话读写链路接入、全局成员协作总览接入，以及知识库 / 技能 / 设置中心正式页面接线，其中 `/knowledge` 已补齐 rebuild / diagnostics 运维入口，`/skills` 已升级为结构化方法资产治理页（`preset|team`、`status`、`category`、`owner`、`definition` + generated markdown preview），`/settings` 已完成工作区级 AI 与索引配置管理，并已直接驱动项目对话 MVP；`/project/:projectId/chat` 当前已补齐右侧消息 Rail、消息加星、共享选择 Markdown 导出、knowledge draft drawer，以及最终 persisted assistant message 上的 sentence-level citation inline markers + message-local citation popover。desktop rail 当前默认收起，通过显式按钮展开 / 收起；窄屏继续使用 Drawer fallback。语言设置第一阶段当前已落地 `English / 简体中文` 双语基础设施、登录页 guest locale 入口，以及侧栏账号面板 hover 语言入口。独立全局 `/agents` 路由在第一版当前暂时隐藏，等待后续产品形态明确后再开放。

## Locale / i18n

- 平台当前通过 `src/app/providers/LocaleProvider.tsx` 维护单一 locale state，并按 `auth.user.locale -> knowject_locale_guest -> en` 的顺序解析当前语言。
- 未登录态语言偏好写入 `knowject_locale_guest`；登录成功后由服务端返回的 `user.locale` 接管当前 locale。
- `src/app/providers/AntdProvider.tsx` 当前会根据 locale 在 `en_US / zh_CN` 间切换 Ant Design locale。
- `src/api/client.ts` 当前会把 `auth.user.locale` 或 guest locale 注入 `Accept-Language`，让后端 envelope message 与前端 UI locale 保持一致。
- `src/i18n/` 当前承载运行时 i18n 资源与 `i18next` 初始化；已落地 `auth / navigation / pages / project / api-errors / common` 六组 namespace。
- 当前已迁移到 i18n 的页面面：
  - 登录页
  - 左侧栏账号面板与语言入口
  - `/home`
  - `/analytics`
  - `/members`
  - `/knowledge`
  - `/skills`
  - `/settings`
  - `/project/:projectId/overview`
  - `/project/:projectId/chat`
  - `/project/:projectId/resources`
  - `/project/:projectId/members`
  - `ProjectLayout` project shell
  - `/404`
- project `overview / members / layout` 与直接产出 UI 文案的 project 辅助 hook / helper 当前已完成 i18n 收口；剩余 project mock 演示补充数据不作为运行时文案事实源。

## 文案迁移约束

- 页面组件与 controller 的用户可见文案默认走 `react-i18next`。
- 会产出用户可见文案的 helper / constants 也必须从 i18n 读取，不能继续保留自然语言字面量。
- 当前已落地 source guard：
  - `tests/login.locale.test.ts`
  - `tests/appSider.locale.test.ts`
  - `tests/global-pages.locale.test.ts`
  - `tests/knowledge.locale.test.ts`
  - `tests/skills.locale.test.ts`
  - `tests/agents.locale.test.ts`
  - `tests/project.locale.test.ts`
  - `tests/no-hardcoded-platform-copy.test.ts`
- 修改 global pages、assets、project 页、settings、登录页、侧栏文案时，必须同步更新 `src/i18n/locales/en|zh-CN/*`，并保持对应 guard 通过。

## 当前路由

- `/login`：登录页。
- `/home`：登录后默认首页。
- `/project/:projectId/overview`：项目概览（判断 / dashboard），以聚合指标与风险提示为主，不再是 recent-entry 列表页。
- `/project/:projectId/chat`、`/project/:projectId/chat/:chatId`：项目对话。
- `/project/:projectId/resources`：项目资源。
- `/project/:projectId/members`：项目成员。
- `/knowledge`、`/skills`：当前对外暴露的全局资产管理页；独立 `/agents` 路由在第一版暂时隐藏。
- `/members`：全局成员协作总览页。
- `/analytics`：全局占位页。
- `/settings`：工作区设置中心，支持 embedding / LLM / indexing / workspace 配置与在线测试，其中 LLM provider 预设已覆盖 `openai / gemini / aliyun / deepseek / moonshot / zhipu / custom`，OpenAI `gpt-5*` 连接测试会自动改用 `max_completion_tokens`，索引配置页可直接测试 `Node -> indexer -> Chroma` 链路。

## 布局与职责

- 登录后主布局为“左侧全局侧栏 + 右侧内容区”。
- 左侧侧栏负责品牌区、全局导航、“我的项目”列表、项目创建 / 编辑 / 置顶 / 删除与退出登录。
- 项目态四个一级页固定为：`概览`、`对话`、`资源`、`成员`。
- 全局 `知识库 / 技能` 页面负责当前对外资产治理；`/knowledge` 与 `/skills` 已切到正式后端接口。Agent 相关后端接口与页面实现仍保留在仓库内，但独立 `/agents` 路由在第一版暂不暴露。
- 项目 `成员` 页当前支持按用户名 / 姓名模糊搜索已有用户，并通过多选下拉框批量加入项目。
- 全局 `成员` 页当前聚合“当前账号可见项目”中的成员基础信息、参与项目、协作快照与权限摘要。
- 全局 `/settings` 当前消费 `GET/PATCH/TEST /api/settings/*`，支持 provider 切换后的 API Key 重输与连接测试交互；当用户切换 Provider 或 Base URL 时，前端要求重新输入新 Key，而不是沿用旧提示态；保存后的 LLM 配置会直接进入项目对话 runtime；OpenAI `gpt-5*` 连接测试已与后端 provider-aware payload 适配对齐；索引配置页也支持直接查看 Python indexer / Chroma 链路是否处于降级状态。

## 数据来源

- `src/app/project/ProjectContext.tsx`：项目列表与项目快照的运行时主状态源；组件初始化时会一次性清理已退役的 `knowject_project_resource_bindings` 与 `knowject_projects`。
- `src/app/project/ProjectContext.tsx`：项目资源绑定更新当前走 partial `PATCH /api/projects/:projectId`，只发送调用方明确传入的 `knowledgeBaseIds / agentIds / skillIds`，不再从当前项目快照拼全量项目更新请求。
- `src/app/project/project.storage.ts`：仅负责 `knowject_project_pins` 的本地持久化。
- `src/app/project/project.catalog.ts`：成员基础档案 Mock 源；项目创建 / 编辑表单的资源选项已经迁到 `useProjectResourceOptions.ts` 运行时拉取正式 `/api/knowledge` 与 `/api/skills`，Agent 相关入口在第一版暂时隐藏，这里只保留历史演示数据兼容。
- `src/app/layouts/components/AppSider.tsx`：侧栏 shell、导航 / mutation / locale 编排层；项目列表面板与账号 / 语言面板已拆到 `src/app/layouts/components/AppSiderProjectPanel.tsx` 与 `src/app/layouts/components/AppSiderAccountPanel.tsx`，项目表单已拆到 `src/app/layouts/components/ProjectFormModal.tsx`，知识库 / Skill options 与未知已选项保留逻辑下沉到 `src/app/project/useProjectResourceOptions.ts` 与 `src/app/project/projectResourceOptions.shared.ts`；Skill options 当前按 `预置方法资产 / 团队方法资产` 语义展示，不再显示 runtime 状态话术。
- `src/pages/project/projectWorkspaceSnapshot.mock.ts`：仅用于 `ProjectHeader` 的 header-level member roster 映射与 meta summary fallback（以及基于项目快照计数的 header stats）；不再作为 `/project/:projectId/overview` 主体内容的数据源。
- `src/pages/project/ProjectOverviewPage.tsx`、`src/pages/project/projectOverview.adapter.ts`、`src/pages/project/projectOverview.insights.ts`：概览 dashboard 的主链路；页面从 `useProjectPageContext` 取正式项目态数据，先用 adapter 聚合出 summary，再用 insights 生成可展示的风险/提示集合；当 `conversations` 或 `projectKnowledge` 部分加载失败时会降级到 `unavailable` 展示（例如 `—`）并提示 partial-load，而不是静默渲染为 0。
- `src/pages/project/projectResourceMappers.ts`：项目资源展示映射；知识库分组会同时合并“绑定的全局知识”和“项目私有知识”，未知 `skills / agents` ID 会渲染占位项而不是静默丢失；Skill 当前按 `预置方法资产 / 团队方法资产` 展示归属。
- `src/pages/project/ProjectChatPage.tsx`：项目对话编排层；对话配置、详情读取、流式 turn、用户消息 `retry / edit / copy`、消息 Rail state / action、knowledge draft flow，以及 create / rename / delete 动作已分别拆到 `useProjectChatSettings.ts`、`useProjectConversationDetail.ts`、`useProjectConversationTurn.ts`、`useProjectChatUserMessageActions.ts`、`useProjectConversationMessageRail.ts`、`useProjectConversationMessageActions.ts`、`useProjectKnowledgeDraftFlow.ts` 与 `useProjectChatActions.ts`，markdown / bubble 展示与 clipboard fallback 拆到 `projectChat.markdown.tsx`、`projectChatBubble.components.tsx` 与 `projectChat.clipboard.ts`，右侧 Rail 与知识草稿抽屉分别落在 `components/ProjectConversationMessageRail.tsx` 与 `components/ProjectKnowledgeDraftDrawer.tsx`；knowledge draft drawer 当前要求先选择已有项目私有知识库，再把共享选择整理出的 Markdown 文档上传进去；若当前项目还没有私有知识库，则会在聊天页内复用 `ProjectKnowledgeAccessModal` 先创建一个空知识库后回填；desktop rail 当前采用显式展开 / 收起，不再依赖 hover 展开。
- `src/pages/assets/components/GlobalAssetLayout.tsx`、`src/pages/assets/components/globalAsset.shared.ts`：全局资产页共享的 summary/filter/meta/updateAt 展示基元，当前供 `/skills` 与暂未对外暴露的 `/agents` 实现复用。
- `src/index.css`：Tailwind v4 theme token 基线；当前已沉淀高频 `radius / text / shadow` token，并承接登录页、项目页、成员页与全局资产页的第一批迁移。
- `src/api`：登录、项目、项目对话、成员、知识库、技能、智能体、设置中心接口封装，以及统一错误提取 helper；其中 `projects.ts` 继续承接 REST envelope wrapper，`projects.stream.ts` 负责 `POST /messages/stream` 的 `fetch + SSE` 解析；项目列表、项目基础信息、项目资源绑定、项目对话读写链路、全局成员概览、成员 roster、全局知识库目录、全局技能目录与设置中心已接入真实后端。Agent 相关 API 也已接入，但独立全局管理路由以及项目内 Agent 配置入口当前隐藏。
- `src/api/*` 当前统一按 `ApiEnvelope<T>` 调用后端，并在 API 层解包 `data`；页面层继续消费原有业务对象，不直接感知 `code / message / meta`。
- `/knowledge` 主要消费 `GET /api/knowledge`、`GET /api/knowledge/:knowledgeId`、`POST /api/knowledge`、`PATCH /api/knowledge/:knowledgeId`、`DELETE /api/knowledge/:knowledgeId`、`POST /api/knowledge/:knowledgeId/documents`、`POST /api/knowledge/:knowledgeId/documents/:documentId/retry`、`POST /api/knowledge/:knowledgeId/documents/:documentId/rebuild`、`POST /api/knowledge/:knowledgeId/rebuild` 与 `GET /api/knowledge/:knowledgeId/diagnostics`；页面当前支持文档级 retry / rebuild、知识库级 rebuild、diagnostics 面板与最小轮询状态刷新。当前正式上传链路支持 `md / markdown / txt / pdf / docx / xlsx`，其中 PDF 仅支持可提取文本的数字 PDF，OCR / 扫描件暂不支持。
- `/skills` 主要消费 `GET /api/skills`、`GET /api/skills/:skillId`、`POST /api/skills`、`PATCH /api/skills/:skillId` 与 `DELETE /api/skills/:skillId`；页面当前支持结构化方法资产编辑、generated markdown preview、状态流转与删除，`preset` Skill 保持只读查看；页面不再暴露 GitHub/URL 导入与 raw `SKILL.md` 主编辑面。
- `/project/:projectId/chat` 当前已正式消费 `GET /api/projects/:projectId/conversations`、`GET /api/projects/:projectId/conversations/:conversationId`、`POST /api/projects/:projectId/conversations`、`PATCH /api/projects/:projectId/conversations/:conversationId`、`PATCH /api/projects/:projectId/conversations/:conversationId/messages/:messageId`、`DELETE /api/projects/:projectId/conversations/:conversationId`、`POST /api/projects/:projectId/conversations/:conversationId/messages/stream`、`POST /api/projects/:projectId/knowledge`、`POST /api/projects/:projectId/knowledge/:knowledgeId/documents` 与 `GET /api/settings`；页面已支持新建会话、默认流式发送、pending user bubble、draft assistant bubble、停止生成、标题 hover 可编辑提示、内联改标题、删除线程、用户气泡 `retry / edit / copy`、当前会话消息 Rail、persisted message 加星 / 取消加星、共享选择 Markdown 导出、knowledge draft drawer，以及在 `done / error / cancel` 后通过 detail/list 回读收口服务端真相。assistant citation 当前会在 `done` 后继续以 `citation_patch` 增量更新已渲染消息，具体表现为 sentence-level inline markers + message-local citation popover；marker 采用 document-level numbering，同文档 chunk 会在 popover 内聚合切换，不再默认展示底部 evidence block；draft assistant bubble 仍显式传空 `citationContent`/`sources`。若 cited content 带 markdown-rich 结构，或 `citationContent` 与 `sources` 发生漂移，前端会 fail-closed 回退到 legacy markdown + sources 渲染。knowledge draft drawer 当前会要求用户先选择一个已有项目私有知识库，再上传整理出的 Markdown 文档；若项目尚无私有知识库，则会在聊天页内先创建空知识库并自动回填选择。同一轮失败重试会复用同一个 `clientRequestId`，历史消息 replay/edit 则会通过 `targetUserMessageId` 在同线程内裁掉后续 turn 再重跑。共享选择只作用于当前 conversation；desktop rail 默认收起，通过显式按钮展开 / 收起，selection mode 会强制保持展开，drawer 关闭时保留 selection，保存成功后清空 selection；streaming 中 export / knowledge action 会禁用。
- `/project/:projectId/resources` 主要消费后端项目模型中的 `knowledgeBaseIds / skillIds / agentIds`，并补充 `/api/projects/:projectId/knowledge` 项目私有知识目录；页面当前支持在知识分组中区分“全局绑定 / 项目私有”，通过统一“接入知识库”弹层承接“引入全局知识库 / 新建项目私有知识库”，并通过知识库详情抽屉提供文档查看、项目私有知识编辑删除、文档上传与最小 diagnostics / rebuild 操作；详情抽屉的 loading 仅跟随详情/诊断请求，不再受目录轮询影响而闪烁，未知资源会展示占位卡片。
- `/members` 主要消费 `GET /api/members`；`/project/:projectId/members` 主要消费 `GET /api/auth/users` 与 `/api/projects/:projectId/members*`。
- `/settings` 主要消费 `GET /api/settings`、`PATCH /api/settings/embedding`、`PATCH /api/settings/llm`、`PATCH /api/settings/indexing`、`PATCH /api/settings/workspace`、`POST /api/settings/embedding/test`、`POST /api/settings/llm/test` 与 `POST /api/settings/indexing/test`；页面会根据 `source=database|environment` 区分当前是否仍在使用环境变量回退，并把保存的 LLM 设置直接作为项目对话页的运行时配置来源；当前仅保留已验证的 `chat/completions` provider 预设，不再展示 `anthropic`。

Project chat 现在把 retrieval / stream 失败作为分层 issue 处理，retrieval 相关 error 会提示“项目检索链路当前不可用”，stream 级中断则提示“项目对话流式过程意外中断”，避免所有非 LLM 的 failure 统一归类为 generic 发送错误。

## 核心目录

- `src/app/auth`：鉴权 token 管理。
- `src/app/guards`：受保护路由守卫。
- `src/app/layouts`：登录后布局与侧栏。
- `src/app/navigation`：路由、路径构建与兼容重定向。
- `src/app/project`：项目状态、共享类型、Mock 资产目录，以及项目表单资源 options helper。
- `src/api`：前端 API 封装（auth / projects / members / knowledge / skills / agents / settings）与错误 helper，其中成员添加候选复用 `GET /api/auth/users`，并统一在此层完成 response envelope 解包。
- `src/pages`：登录页、主页、项目页、全局资产页。
- 根 `eslint.config.mjs`：当前已对 `apps/platform/src/**/*.{ts,tsx}` 启用 type-aware ESLint，并收口 `await-thenable`、`no-floating-promises` 两条前端异步护栏。

## 开发

```bash
pnpm --filter platform dev
pnpm --filter platform check-types
pnpm --filter platform build
# 仓库根最小验证入口
pnpm verify:global-assets-foundation
pnpm verify:index-ops-project-consumption
pnpm verify:core-loop-readiness
```
