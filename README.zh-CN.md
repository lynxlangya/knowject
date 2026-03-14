# 知项 · Knowject

[English](./README.md)

让项目知识，真正为团队所用。

Knowject 是一个面向开发团队的项目级 AI 知识工作台，目标是把代码、文档、设计资产与项目上下文沉淀成可持续复用的项目记忆，让搜索、协作与决策建立在真实仓库语境之上。

当前仓库处于“基础框架已打通、核心 AI 工作流持续落地”的阶段：产品壳、鉴权、项目与成员主数据链路、项目资源绑定正式持久化、项目对话只读链路、全局知识库 / 技能 / 智能体治理链路，以及 Docker 部署基线已经具备；消息写入、项目侧资产消费收口与更深的检索 / 运行时闭环仍在持续实现中。

## 当前状态

- `apps/platform` 已提供登录后产品壳、项目路由、成员管理界面，以及全局知识库 / 技能 / 智能体正式管理页。
- `apps/api` 已提供 `health`、`auth`、`members`、`projects`、`memberships`、知识库 CRUD / 上传 / 检索接口、内置 `skills` registry 只读接口、正式 `agents` CRUD / 绑定接口，以及演示性质的 `memory` 接口。
- 项目列表、项目基础信息、成员 roster、项目资源绑定、项目对话列表 / 详情与全局成员总览已经接入 `/api/projects*` 与 `/api/members`。
- `knowject_project_resource_bindings` 现在只保留为历史本地数据的一次性迁移来源，运行时项目资源绑定已经持久化到后端项目模型。
- 项目概览仍保留成员协作快照与部分展示文案的本地补充数据；`/project/:projectId/resources` 对 `skills / agents` 仍使用本地目录 fallback。
- `/knowledge`、`/skills`、`/agents` 已切到正式后端资产接口；项目内 `skills / agents` 消费仍使用本地目录 fallback。
- `GET /api/projects/:projectId/conversations` 与 `GET /api/projects/:projectId/conversations/:conversationId` 已提供当前项目对话读链路，但消息写入还未落地。
- `pnpm verify:global-assets-foundation` 已作为 Week 3-4 最小自动验证入口，统一执行 API 测试、Python indexer 测试与前端类型检查。
- 仓库已经提供本地与线上风格的 Docker Compose 基线，覆盖 `platform + api + indexer-py + mongodb + chroma`。
- MongoDB 是当前正式主存储；Chroma 当前只承担索引 / 检索层，已进入 `global_docs` 正式链路，`global_code` 仍只保留命名空间预留。

## 仓库结构

```text
apps/
  platform/   React + Vite + Ant Design 前端
  api/        Express + TypeScript API
  indexer-py/ Python 索引服务（文档解析 / 分块 / 向量写入）
packages/
  request/    共享请求包（@knowject/request）
  ui/         共享 UI 包（@knowject/ui）
docker/       Compose、镜像构建、反向代理与初始化脚本
scripts/      统一命令入口
.agent/docs/  架构事实、契约、计划、交接与设计文档
```

## 产品信息架构

### 全局路由

- `/login`
- `/home`
- `/knowledge`
- `/skills`
- `/agents`
- `/members`
- `/analytics`
- `/settings`

### 项目路由

- `/project/:projectId/overview`
- `/project/:projectId/chat`
- `/project/:projectId/chat/:chatId`
- `/project/:projectId/resources`
- `/project/:projectId/members`

## 技术栈

- 前端：React 19、Vite 7、Ant Design 6、Tailwind CSS 4
- API：Express 4、TypeScript、MongoDB Node.js Driver
- 鉴权：JWT + `argon2id`
- 工具链：pnpm workspace、Turborepo、ESLint、Prettier
- 基础设施：Docker Compose、MongoDB、Chroma、Caddy

## 快速开始

### 环境要求

- Node.js >= 22
- pnpm 10
- Python 3.12+
- `uv`（`pnpm dev` / `pnpm test` 会通过 `apps/indexer-py` 使用它）

### 本地开发

```bash
cp .env.example .env.local
pnpm install
pnpm dev
```

`pnpm dev` 现在会通过 workspace 一起启动 `platform + api + indexer-py`，默认宿主机开发流里不再需要手动另开 Python 索引服务。
如果走宿主机开发流，请先安装 `uv`；现在 `apps/indexer-py` 通过 `uv run` 启动，Docker 开发流则把这层依赖收在容器内。

在 `development` 环境下，如果本地没有配置 `OPENAI_API_KEY`，但已经提供 `CHROMA_URL`，当前 `md / txt` 上传会自动降级到 deterministic 本地 embedding，保证上传与索引状态流先跑通；正式检索质量和 `/api/knowledge/search` 仍建议使用真实 OpenAI-compatible embedding 配置。

如果希望使用仓库推荐的本地工作流，由 Docker 托管依赖服务：

```bash
pnpm dev:init
pnpm dev:up
```

### 常用命令

```bash
pnpm dev:web
pnpm dev:api
pnpm --filter indexer-py dev
pnpm test
pnpm verify:global-assets-foundation
pnpm check-types
pnpm build
pnpm host:up
pnpm docker:local:up
pnpm docker:local:health
```

统一命令入口：

```bash
./scripts/knowject.sh help
pnpm knowject:help
```

## 文档入口

- [项目规则](./AGENTS.md)
- [文档索引](./.agent/docs/README.md)
- [架构事实](./.agent/docs/current/architecture.md)
- [Docker 使用现状](./.agent/docs/current/docker-usage.md)
- [Docker 操作清单](./.agent/docs/current/docker-operation-checklist.md)
- [认证与环境契约](./.agent/docs/contracts/auth-contract.md)
- [Chroma 决策说明](./.agent/docs/contracts/chroma-decision.md)
- [快速接手指南](./.agent/docs/handoff/handoff-guide.md)
- [ChatGPT / 外部模型项目说明](./.agent/docs/handoff/chatgpt-project-brief.md)
- [前端说明](./apps/platform/README.md)
- [API 说明](./apps/api/README.md)
- [Docker 说明](./docker/README.md)

## 参与贡献

贡献前请先阅读 [CONTRIBUTING.md](./CONTRIBUTING.md)，其中包含开发准备、提交流程、最小验证与文档同步约定。

## 安全说明

漏洞披露方式与当前安全支持范围见 [SECURITY.md](./SECURITY.md)。

## 开源协议

本项目采用 [Apache License 2.0](./LICENSE)。
