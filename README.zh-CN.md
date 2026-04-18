# 知项 · Knowject

[English](./README.md)

让项目知识，真正为团队所用。

Knowject 是一个面向开发团队的项目级 AI 知识工作台，目标是把代码、文档、设计资产与项目上下文沉淀成可持续复用的项目记忆，让搜索、协作与决策建立在真实仓库语境之上。

当前仓库处于“主链路已打通、核心 AI 工作流持续收口”的阶段：产品壳、鉴权、项目与成员主数据链路、项目资源绑定正式持久化、项目对话读写与默认流式链路、全局知识库 / 技能治理链路、工作区设置中心，以及 Docker 部署基线已经具备；更完整的引用体验、运行时编排与 `global_code` 仍在持续实现中。

## 当前状态

- `apps/platform` 已提供登录后产品壳、项目路由、成员管理界面、全局知识库 / 技能正式管理页，以及 `/settings` 工作区设置中心；独立 `/agents` 路由在第一版当前暂时隐藏。
- `apps/api` 已提供 `health`、`auth`、`members`、`projects`、`memberships`、知识库 CRUD / 上传 / 检索接口、Skill 正式资产 CRUD / 绑定校验接口、正式 `agents` CRUD / 绑定接口，以及演示性质的 `memory` 接口。
- 项目列表、项目基础信息、成员 roster、项目资源绑定、项目对话列表 / 详情 / 写入与全局成员总览已经接入 `/api/projects*` 与 `/api/members`。
- `knowject_project_resource_bindings` 现在只保留为历史本地数据的一次性迁移来源，运行时项目资源绑定已经持久化到后端项目模型。
- 项目概览仍保留成员协作快照与部分展示文案的本地补充数据；项目资源页当前已经同时消费全局资产目录与项目私有知识目录。
- `/knowledge`、`/skills` 已切到正式后端资产接口；其中 live `/skills` 页面当前已收口为最小管理面：只展示现有团队 Skill，并支持状态流转与删除，不再暴露创建、查看、编辑抽屉，也不再展示预设 Skill。项目资源页也已通过统一“接入知识库”弹层和知识库详情抽屉正式区分“全局绑定知识 / 项目私有知识”。`/agents` 的独立全局路由在第一版暂时隐藏，项目创建/编辑与项目资源页也不再暴露 Agent 相关入口，等待后续产品形态明确后再开放。
- `/settings` 已切到正式 `/api/settings/*` 链路，支持向量模型、对话模型、索引参数与工作区信息配置；本期访问控制固定为“登录即可访问”，API Key 在服务端加密存储。
- `GET /api/projects/:projectId/conversations`、`GET /api/projects/:projectId/conversations/:conversationId`、`POST /api/projects/:projectId/conversations/:conversationId/messages/stream` 已组成当前项目对话读写主链路。
- `pnpm verify:global-assets-foundation` 已作为 Week 3-4 最小自动验证入口，统一执行 API 测试、Python indexer 测试与前端类型检查。
- `pnpm verify:index-ops-project-consumption` 已作为 Week 5-6 最小自动验证入口，统一执行项目知识 / 索引运维相关 API 测试、Python indexer 测试与前端类型检查。
- 仓库已经提供本地与线上风格的 Docker Compose 基线，覆盖 `platform + api + indexer-py + mongodb + chroma`。
- MongoDB 是当前正式主存储；Chroma 当前只承担索引 / 检索层，但已从“固定 collection 名”升级为“稳定 namespace key + versioned collection + active pointer”模式，用于支撑 `global_docs` 与项目私有知识的模型切换；`global_code` 仍只保留命名空间预留。

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
docs/         文档主根目录（事实源）
.agents/      项目级 Skill live 根目录
.codex/       Codex 项目级配置目录
```

## 产品信息架构

### 全局路由

- `/login`
- `/home`
- `/knowledge`
- `/skills`
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

`pnpm dev:init` / `pnpm dev:up` 现在也会把 `SETTINGS_ENCRYPTION_KEY_FILE` 一并回写到 `.env.local`，和 MongoDB / JWT 的本地 secrets 保持同一套宿主机开发流，避免设置中心上线后首次启动仍因缺少加密密钥而阻塞。

### 常用命令

```bash
pnpm dev:web
pnpm dev:api
pnpm --filter indexer-py dev
pnpm test
pnpm verify:global-assets-foundation
pnpm verify:index-ops-project-consumption
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

当前仓库以 `docs/` 作为文档主根目录，`docs/exports/` 作为派生导出目录；`.agents/skills/` 是项目级 Skill live 根目录，`.codex/` 仅保留 `config.toml` 等项目级配置。

- [项目规则](./AGENTS.md)
- [文档索引](./docs/README.md)
- [架构事实](./docs/current/architecture.md)
- [项目对话 source/citation 事实](./docs/current/project-chat-sources.md)
- [Docker 使用现状](./docs/current/docker-usage.md)
- [Docker 操作清单](./docs/current/docker-operation-checklist.md)
- [认证与环境契约](./docs/contracts/auth-contract.md)
- [Chroma 决策说明](./docs/contracts/chroma-decision.md)
- [快速接手指南](./docs/handoff/handoff-guide.md)
- [ChatGPT / 外部模型项目说明](./docs/handoff/chatgpt-project-brief.md)
- [ChatGPT Projects 导出包说明](./docs/exports/chatgpt-projects/README.md)
- [前端说明](./apps/platform/README.md)
- [API 说明](./apps/api/README.md)
- [Docker 说明](./docker/README.md)

## 参与贡献

贡献前请先阅读 [CONTRIBUTING.md](./CONTRIBUTING.md)，其中包含开发准备、提交流程、最小验证与文档同步约定。

## 安全说明

漏洞披露方式与当前安全支持范围见 [SECURITY.md](./SECURITY.md)。

## 许可说明

当前仓库内容采用
[Knowject Proprietary Source-Available License](./LICENSE)。
允许个人非商业场景下的学习、私下研究、评估与非生产实验。
任何商业使用、公司使用、客户项目、部署托管、SaaS、再分发或盈利性衍生使用，
都必须事先获得许可方的书面授权。
