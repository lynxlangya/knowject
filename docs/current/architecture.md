# Current Architecture

本文件是 Knowject 的仓库级 **current facts** 入口，用于回答“这个 monorepo 现在由哪些层组成、各层职责是什么、当前主链路在哪里、还要继续读哪些专题事实”。

它只记录当前已落地事实，不写 roadmap，也不替代子系统专题文档。

## 1. Truth Surface

- 根入口：`AGENTS.md`
- 当前事实：`docs/current/*` + 源码
- 契约与边界：`docs/contracts/*`
- 工程治理：`docs/standards/*`
- 执行计划：`docs/plans/*`
- 导出层：`docs/exports/*`，不是事实源
- `CLAUDE.md` / `.claude/*`：个人本地兼容层；可存在于本地，但不再作为仓库正式内容提交

## 2. Monorepo 拓扑

```text
apps/
  platform/    React 前端产品壳与页面
  api/         Express 正式业务 API
  indexer-py/  Python 索引运行时
packages/
  request/     共享请求封装
  ui/          共享 UI 组件
docs/          正式文档主源
.agents/       仓库共享 skills
.codex/        项目级 Codex 配置
```

## 3. 子系统职责

### `apps/platform`

- 登录后产品壳、项目态页面、全局资产页、设置中心。
- 主要消费 `/api/*` 正式接口，不承担业务主数据真相源。
- 项目页是当前最复杂的前端业务域，详情见：
  - `apps/platform/README.md`
  - `docs/current/project-chat-sources.md`

### `apps/api`

- 对外正式业务 API、认证、locale 协商、统一响应 envelope、错误语义。
- 业务主状态以 MongoDB 为主数据源。
- 主要模块：`auth`、`projects`、`knowledge`、`skills`、`agents`、`settings`。
- 详情见：
  - `apps/api/README.md`
  - `docs/contracts/auth-contract.md`
  - `docs/contracts/chat-contract.md`
  - `docs/contracts/chroma-decision.md`

### `apps/indexer-py`

- Python 独立索引运行时，负责文档解析、清洗、分块、embedding、Chroma 写删侧与诊断。
- 不写 MongoDB 业务主状态，不替代 `apps/api` 的正式 API。
- 详情见：
  - `apps/indexer-py/README.md`
  - `docs/contracts/chroma-decision.md`

### `packages/*`

- `packages/request`：共享请求封装、统一错误处理、请求去重与下载辅助。
- `packages/ui`：共享 UI 组件。
- 当前 packages 不承载业务真相源。

## 4. 当前主要业务主链路

- 鉴权与账号偏好：
  - `platform -> /api/auth/* -> MongoDB`
- 项目与成员协作：
  - `platform -> /api/projects* /api/members -> MongoDB`
- 项目对话：
  - `platform chat page -> /api/projects/.../messages/stream`
  - `apps/api/src/modules/projects/*` 负责 turn orchestration、provider runtime、SSE 事件和消息持久化
- 知识索引：
  - `platform / api upload -> apps/api knowledge module -> indexer-py -> Chroma`
  - MongoDB 保存知识元数据、文档记录、namespace state
  - Chroma 保存可重建的向量索引
- 工作区设置：
  - `platform /settings -> /api/settings/*`
  - effective embedding / llm / indexing config 已进入对话与索引主链路

## 5. 高复杂度专题事实

- 项目对话 source / citation / drawer / rail / handoff：
  - `docs/current/project-chat-sources.md`
- Skill 当前治理：
  - `docs/current/skills-governance.md`
- Docker 当前使用现状：
  - `docs/current/docker-usage.md`
  - `docs/current/docker-operation-checklist.md`

## 6. 当前已知 Hotspot

- `apps/platform/src/pages/project/ProjectChatPage.tsx`
- `apps/platform/src/pages/project/useProjectConversationTurn.ts`
- `apps/platform/src/app/layouts/components/AppSider.tsx`
- `apps/api/src/modules/knowledge/knowledge.repository.ts`
- `apps/api/src/modules/projects/*`
- `apps/indexer-py/app/domain/indexing/*`

## 7. 默认阅读顺序

1. `AGENTS.md`
2. 本文件 `docs/current/architecture.md`
3. 与任务直接相关的 `docs/current/*` 专题文档
4. 对应 `docs/contracts/*`
5. 对应子系统 README 与源码

当目录中存在更近的子目录 `AGENTS.md` 时，继续补读该目录入口。
