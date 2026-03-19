# Knowject Frontend (`apps/platform`)

前端采用 React + Vite + Ant Design，当前职责是提供登录后产品壳、项目态页面与全局资产管理页；截至 2026-03-17，基础框架阶段已完成认证接入、项目主数据接入、项目成员 roster 管理、项目资源绑定正式写回、项目对话读写链路接入、全局成员协作总览接入，以及知识库 / 技能 / 智能体 / 设置中心正式页面接线，其中 `/knowledge` 已补齐 rebuild / diagnostics 运维入口，`/skills` 已升级为正式 Skill 资产治理页，`/settings` 已完成工作区级 AI 与索引配置管理，并已直接驱动项目对话 MVP。

## 当前路由

- `/login`：登录页。
- `/home`：登录后默认首页。
- `/project/:projectId/overview`：项目概览。
- `/project/:projectId/chat`、`/project/:projectId/chat/:chatId`：项目对话。
- `/project/:projectId/resources`：项目资源。
- `/project/:projectId/members`：项目成员。
- `/knowledge`、`/skills`、`/agents`：全局资产管理页。
- `/members`：全局成员协作总览页。
- `/analytics`：全局占位页。
- `/settings`：工作区设置中心，支持 embedding / LLM / indexing / workspace 配置与在线测试，其中 LLM provider 预设已覆盖 `openai / gemini / aliyun / deepseek / moonshot / zhipu / custom`，索引配置页可直接测试 `Node -> indexer -> Chroma` 链路。

## 布局与职责

- 登录后主布局为“左侧全局侧栏 + 右侧内容区”。
- 左侧侧栏负责品牌区、全局导航、“我的项目”列表、项目创建 / 编辑 / 置顶 / 删除与退出登录。
- 项目态四个一级页固定为：`概览`、`对话`、`资源`、`成员`。
- 全局 `知识库 / 技能 / 智能体` 页面负责资产治理；其中 `/knowledge`、`/skills` 与 `/agents` 已切到正式后端接口。
- 项目 `成员` 页当前支持按用户名 / 姓名模糊搜索已有用户，并通过多选下拉框批量加入项目。
- 全局 `成员` 页当前聚合“当前账号可见项目”中的成员基础信息、参与项目、协作快照与权限摘要。
- 全局 `/settings` 当前消费 `GET/PATCH/TEST /api/settings/*`，支持 provider 切换后的 API Key 重输与连接测试交互；当用户切换 Provider 或 Base URL 时，前端要求重新输入新 Key，而不是沿用旧提示态；保存后的 LLM 配置会直接进入项目对话 runtime；索引配置页也支持直接查看 Python indexer / Chroma 链路是否处于降级状态。

## 数据来源

- `src/app/project/ProjectContext.tsx`：项目列表与项目快照的运行时主状态源；组件初始化时会一次性清理已退役的 `knowject_project_resource_bindings` 与 `knowject_projects`。
- `src/app/project/project.storage.ts`：仅负责 `knowject_project_pins` 的本地持久化。
- `src/app/project/project.catalog.ts`：成员基础档案 Mock 源；项目创建 / 编辑表单的资源选项已经迁到 `useProjectResourceOptions.ts` 运行时拉取正式 `/api/knowledge`、`/api/skills` 与 `/api/agents`，这里只保留历史演示数据兼容。
- `src/app/layouts/components/AppSider.tsx`：侧栏 shell 与项目列表入口；项目表单已拆到 `src/app/layouts/components/ProjectFormModal.tsx`，知识库 / Skill options 与未知已选项保留逻辑下沉到 `src/app/project/useProjectResourceOptions.ts` 与 `src/app/project/projectResourceOptions.shared.ts`。
- `src/pages/project/projectWorkspaceSnapshot.mock.ts`：项目概览补充文案与成员协作快照；仅承载演示补充层，不作为正式成员关系主数据源。
- `src/pages/project/projectResourceMappers.ts`：项目资源展示映射；知识库分组会同时合并“绑定的全局知识”和“项目私有知识”，未知 `skills / agents` ID 会渲染占位项而不是静默丢失。
- `src/pages/project/ProjectChatPage.tsx`：项目对话编排层；对话配置、详情读取与 create / send / rename / delete 动作已分别拆到 `useProjectChatSettings.ts`、`useProjectConversationDetail.ts` 与 `useProjectChatActions.ts`，markdown 与 bubble 展示拆到 `projectChat.markdown.tsx` 与 `projectChatBubble.components.tsx`。
- `src/pages/assets/components/GlobalAssetLayout.tsx`、`src/pages/assets/components/globalAsset.shared.ts`：全局资产页共享的 summary/filter/meta/updateAt 展示基元，当前供 `/skills` 与 `/agents` 复用。
- `src/index.css`：Tailwind v4 theme token 基线；当前已沉淀高频 `radius / text / shadow` token，并承接登录页、项目页、成员页与全局资产页的第一批迁移。
- `src/api`：登录、项目、项目对话、成员、知识库、技能、智能体、设置中心接口封装，以及统一错误提取 helper；项目列表、项目基础信息、项目资源绑定、项目对话读写链路、全局成员概览、成员 roster、全局知识库、全局技能目录、全局智能体管理页与设置中心已接入真实后端。
- `src/api/*` 当前统一按 `ApiEnvelope<T>` 调用后端，并在 API 层解包 `data`；页面层继续消费原有业务对象，不直接感知 `code / message / meta`。
- `/knowledge` 主要消费 `GET /api/knowledge`、`GET /api/knowledge/:knowledgeId`、`POST /api/knowledge`、`PATCH /api/knowledge/:knowledgeId`、`DELETE /api/knowledge/:knowledgeId`、`POST /api/knowledge/:knowledgeId/documents`、`POST /api/knowledge/:knowledgeId/documents/:documentId/retry`、`POST /api/knowledge/:knowledgeId/documents/:documentId/rebuild`、`POST /api/knowledge/:knowledgeId/rebuild` 与 `GET /api/knowledge/:knowledgeId/diagnostics`；页面当前支持文档级 retry / rebuild、知识库级 rebuild、diagnostics 面板与最小轮询状态刷新。当前正式上传链路支持 `md / markdown / txt`，界面文案统一推荐 `.md / .txt`。
- `/skills` 主要消费 `GET /api/skills`、`GET /api/skills/:skillId`、`POST /api/skills`、`POST /api/skills/import`、`PATCH /api/skills/:skillId` 与 `DELETE /api/skills/:skillId`；页面支持原生 `SKILL.md` 自建、GitHub/URL 导入、预览、草稿/发布与删除，系统内置 Skill 保持只读查看。
- `/project/:projectId/chat` 当前已正式消费 `GET /api/projects/:projectId/conversations`、`GET /api/projects/:projectId/conversations/:conversationId`、`POST /api/projects/:projectId/conversations`、`PATCH /api/projects/:projectId/conversations/:conversationId`、`DELETE /api/projects/:projectId/conversations/:conversationId`、`POST /api/projects/:projectId/conversations/:conversationId/messages` 与 `GET /api/settings`；页面已支持新建会话、发送消息、assistant 最小 `sources` 展示、标题 hover 可编辑提示、内联改标题、删除线程、未配置或配置异常时的页内引导，以及发送失败时复用同一 `clientRequestId` 的幂等重试。
- `/project/:projectId/resources` 主要消费后端项目模型中的 `knowledgeBaseIds / skillIds / agentIds`，并补充 `/api/projects/:projectId/knowledge` 项目私有知识目录；页面当前支持在知识分组中区分“全局绑定 / 项目私有”，通过统一“接入知识库”弹层承接“引入全局知识库 / 新建项目私有知识库”，并通过知识库详情抽屉提供文档查看、项目私有知识编辑删除、文档上传与最小 diagnostics / rebuild 操作；详情抽屉的 loading 仅跟随详情/诊断请求，不再受目录轮询影响而闪烁，未知资源会展示占位卡片。
- `/members` 主要消费 `GET /api/members`；`/project/:projectId/members` 主要消费 `GET /api/auth/users` 与 `/api/projects/:projectId/members*`。
- `/settings` 主要消费 `GET /api/settings`、`PATCH /api/settings/embedding`、`PATCH /api/settings/llm`、`PATCH /api/settings/indexing`、`PATCH /api/settings/workspace`、`POST /api/settings/embedding/test`、`POST /api/settings/llm/test` 与 `POST /api/settings/indexing/test`；页面会根据 `source=database|environment` 区分当前是否仍在使用环境变量回退，并把保存的 LLM 设置直接作为项目对话页的运行时配置来源；当前仅保留已验证的 `chat/completions` provider 预设，不再展示 `anthropic`。

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
```
