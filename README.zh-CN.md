# 知项 · Knowject

[English](./README.md)

<p align="center">
  <img src="https://img.wangyun.fan/kj_skills.png" alt="Knowject Skills 能力图" width="100%" />
</p>

<p align="center">
  <strong>让项目知识，真正为团队所用。</strong>
</p>

Knowject 现在以 Skill 为核心。

它是一个面向 Claude Code 与 Codex 的项目级 Skill 包，也是一套围绕项目知识持续演进的 AI 工作台。第一可用入口是 [`skills/`](./skills/README.md)：一组可以安装到本机 agent 工具里的 Knowject Skills，用真实项目上下文驱动 PRD、设计稿、API 文档与代码交接。

核心目标很直接：降低跨角色交接成本。PRD 不应该停在文字里，设计稿不应该只靠人工拆组件，OpenAPI 不应该还要手写 `unknown` client，项目经验也不应该散落在临时对话里。Knowject Skills 让这些输入变成可检查、可继续改的工程初稿和带来源的项目记忆。

## Knowject Skills 能做什么

| 输入 | Skill | 输出 |
| --- | --- | --- |
| 现有项目仓库 | `knowject-context-init` | 记录技术栈、品牌、API 与设计路径的 `knowject/context.yaml` |
| 文字 PRD | `knowject-prd-to-mock` | 贴合项目品牌的一页式 HTML 原型 |
| UI 截图、PDF 页面或 Figma 导出 | `knowject-read-design` | 组件拆解计划与组件骨架文件 |
| Express 路由或 OpenAPI 文档 | `knowject-read-api` | Endpoint 清单与 typed-client 初稿 |
| OpenAPI 3 文档 | `knowject-api-to-types` | 写入生成 client 的 TypeScript response types |
| 项目文档、交接记录、diff 或决策 | `knowject-memory-capture` | 写入 `knowject/memory/` 的带来源项目记忆 |

这些不是泛泛的头脑风暴或代码审查 prompt。每个 Skill 都对应一个跨角色交接场景，并且依赖项目自己的 `knowject/context.yaml`。

## 工作方式

1. 在目标项目里运行一次 `knowject-context-init`。
2. 提交 `knowject/context.yaml`，把它作为项目上下文锚点。
3. 可选运行 `knowject-memory-capture`，把项目事实、决策、流程、风险和经验写成带来源的 `knowject/memory/` 文件。
4. 用其他 Knowject Skills 把 PRD、设计稿、API 文档转成可继续交付的产物。

`knowject/context.yaml` 是共享合同。它记录项目类型、前后端技术栈、设计稿路径、API 源路径、client 输出目录与品牌 token。它不应该包含 secrets、base URL、API key 或环境配置。

```text
your-project/
  knowject/
    context.yaml
    README.md
    memory/
      README.md
      project-memory.yaml
```

## 安装

### 推荐：让 AI 帮你安装

把这句话复制给 Claude Code 或 Codex：

```text
根据指引安装 Knowject AI toolkit：https://github.com/lynxlangya/knowject/blob/main/skills/install.md
```

AI 会读取 [`skills/install.md`](./skills/install.md)，使用稳定的本地 checkout，运行现有安装脚本，并验证 Claude Code + Codex 的 Skill 链接。

### 手动安装兜底

#### 环境要求

- Claude Code 或 Codex
- macOS / Linux，或 Windows + WSL
- `bash`、`python3` 3.8+、`git`
- 完整验证需要 Python `PyYAML`

```bash
git clone https://github.com/lynxlangya/knowject.git
cd knowject
bash skills/scripts/install.sh
```

`install.sh` 本身不依赖 PyYAML。完整验证 `skills/scripts/verify.sh` 需要：

```bash
pip install pyyaml
bash skills/scripts/verify.sh
```

安装脚本会把所有 `knowject-*` Skill 和共享支持目录 `_shared` 软链接到：

```text
~/.claude/skills/
~/.codex/skills/
```

安装后重启 Claude Code 或 Codex。

## 使用

在任意项目中输入：

```text
/knowject init
```

或：

```text
帮我在这个项目里启用 knowject
```

初始化后可以直接使用：

```text
/knowject mock
/knowject design
/knowject api
/knowject types
/knowject memory
```

自然语言也可以触发对应 Skill：

```text
把这段 PRD 出一个高保真 HTML 原型。
把这张设计稿拆成 React + Antd 组件骨架。
找一下用户列表 endpoint，并生成 typed client。
把这个 OpenAPI 文档转成 TypeScript response types。
把这次交接总结成项目记忆。
```

## Skill 边界

| Skill | 适合做 | 刻意不做 |
| --- | --- | --- |
| `knowject-context-init` | 项目初始化与上下文检测 | 不猜测 secrets 或环境配置 |
| `knowject-prd-to-mock` | 从需求文字生成静态 HTML 原型 | 不实现运行时交互 |
| `knowject-read-design` | UI 拆解与组件骨架 | 不接状态、路由、测试或真实数据 |
| `knowject-read-api` | API 发现与 typed-client 初稿 | Phase 2 仅支持 Express 与 OpenAPI |
| `knowject-api-to-types` | 为生成的 client 补 OpenAPI 3 response types | Day-1 只处理 response type，不做完整 request typing |
| `knowject-memory-capture` | 带来源的文件型项目记忆 | 不做 DB、向量库、平台 UI、daemon，不写 secrets 或无来源事实 |

这个边界是故意的。Knowject Skills 应该产出有用的一版初稿，而不是悄悄改动生产代码。

## 验证 Skill 包

```bash
bash skills/scripts/verify.sh
bash skills/scripts/test-install.sh
```

`verify.sh` 会检查 manifest、Skill frontmatter、Codex adapter、各 Skill README 覆盖、`context.yaml` 示例、路由提取器、OpenAPI 提取器、typed-client 生成、品牌提取、框架提取、类型提取、client rewrite fixtures 与 memory validator。`test-install.sh` 会检查安装幂等性和安装后的共享文件相对路径。

## Skill 背后的平台

Knowject 仍然包含一套产品工作台。这套工作台是 Skills 未来继续生长的系统底座：

- 登录后产品壳、项目路由、全局资产页、成员与设置
- `auth`、`projects`、`members`、`knowledge`、`skills`、`agents`、`settings` 等 Express API 模块
- 项目对话读写、SSE streaming、replay/edit、source seeds 与 citation patch events
- 全局知识与项目私有知识的上传、诊断、重试、重建与搜索
- 结构化 Skill 治理、绑定校验与项目对话 Skill 注入
- Python 索引运行时，负责解析、分块、embedding 与 Chroma 编排
- 本地与生产风格的 Docker Compose 基线

Skill 包是当前主展示面。工作台则是更长期的项目记忆、团队 Skill、知识资产与项目对话系统。

## 仓库结构

```text
skills/        面向 Claude Code 与 Codex 的可安装 Knowject Skills
apps/
  platform/    React 前端产品壳
  api/         Express 业务 API
  indexer-py/  Python 索引运行时
packages/
  request/     共享 HTTP client 包
  ui/          共享 UI 组件
docs/          项目文档事实源
.agents/       仓库内部治理 Skill
.codex/        项目级 Codex 配置
```

## 技术栈

- Skills：Markdown Skill specs、Codex adapters、Python validation scripts
- 前端：React 19、Vite 7、Ant Design 6、Tailwind CSS 4
- API：Express 4、TypeScript、MongoDB Node.js Driver
- 索引：Python 3.12+、`uv`、Chroma
- 鉴权：JWT + `argon2id`
- 工具链：pnpm workspace、Turborepo、ESLint、Prettier
- 基础设施：Docker Compose、MongoDB、Chroma、Caddy

## 开发快速开始

### 环境要求

- Node.js >= 22
- pnpm 10
- Python 3.12+
- `uv`

### 宿主机开发

```bash
cp .env.example .env.local
pnpm install
pnpm dev
```

`pnpm dev` 会通过 workspace 一起启动 `platform + api + indexer-py`。

### Docker 托管依赖

```bash
pnpm dev:init
pnpm dev:up
```

### 常用命令

```bash
pnpm dev:web
pnpm dev:api
pnpm test
pnpm check-types
pnpm build
pnpm verify:global-assets-foundation
pnpm verify:index-ops-project-consumption
pnpm verify:core-loop-readiness
pnpm docker:local:health
pnpm knowject:help
```

## 文档入口

`docs/` 是文档事实源。`docs/exports/` 是派生导出层，不是主事实面。

- [Skills README](./skills/README.md)
- [AI 安装指引](./skills/install.md)
- [Skills Schema](./skills/_shared/context-yaml-schema.md)
- [项目规则](./AGENTS.md)
- [文档索引](./docs/README.md)
- [架构事实](./docs/current/architecture.md)
- [项目对话 source/citation 事实](./docs/current/project-chat-sources.md)
- [Skills Governance](./docs/current/skills-governance.md)
- [Contracts Index](./docs/contracts/README.md)
- [Chat Contract](./docs/contracts/chat-contract.md)
- [Skills Contract](./docs/contracts/skills-contract.md)
- [前端说明](./apps/platform/README.md)
- [API 说明](./apps/api/README.md)
- [Docker 说明](./docker/README.md)

## 当前状态

- 已发布 Skill 包：`knowject-context-init`、`knowject-read-api`、`knowject-prd-to-mock`、`knowject-read-design`、`knowject-api-to-types`
- 当前包版本：`0.1.0`
- 下一步分发工作：Claude Code plugin manifest 与 marketplace listing

## 参与贡献

贡献前请先阅读 [CONTRIBUTING.md](./CONTRIBUTING.md)。如果要新增 Skill，请遵循 [skills/_shared/contributing-skills.md](./skills/_shared/contributing-skills.md)。

## 安全说明

漏洞披露方式与当前安全支持范围见 [SECURITY.md](./SECURITY.md)。

## 许可说明

当前仓库内容采用
[Knowject Proprietary Source-Available License](./LICENSE)。

允许个人非商业场景下的学习、私下研究、评估与非生产实验。任何商业使用、公司使用、客户项目、部署托管、SaaS、再分发或盈利性衍生使用，都必须事先获得许可方的书面授权。
