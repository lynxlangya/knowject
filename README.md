# 知项 · Knowject

<p align="center">
  <img src="https://img.wangyun.fan/github/knowject.jpg" alt="Knowject Skills capability map" width="100%" />
</p>

<p align="center">
  <strong>让项目知识，真正为团队所用。</strong>
</p>

<p align="center">
  Project-anchored Skills for Claude Code and Codex. Turn PRDs, design mocks,
  API specs, and repository context into concrete handoff artifacts.
</p>

<p align="center">
  <a href="./README.zh-CN.md">简体中文</a>
  ·
  <a href="./skills/README.md">Skills</a>
  ·
  <a href="./docs/README.md">Documentation</a>
  ·
  <a href="./CONTRIBUTING.md">Contributing</a>
  ·
  <a href="./SECURITY.md">Security</a>
</p>

## What Knowject Is

Knowject now starts from Skills.

It is a source-available Skill pack and AI workspace for teams that want AI
agents to work from real project context instead of generic prompts. The first
usable surface is `skills/`: a set of installable, project-grounded Skills that
Claude Code and Codex can consume directly.

The goal is simple: make handoff work cheaper. A PRD should become a usable
HTML mock. A design screenshot should become a component decomposition plan. An
OpenAPI file should become a typed client scaffold. A project should carry its
own context, source-cited memory, and review artifacts so the next agent run
does not start from zero.

## What Knowject Skills Do

| Input | Skill | Output |
| --- | --- | --- |
| Existing project repository | `knowject-context-init` | `knowject/context.yaml` with stack, brand, API, and design paths |
| Written PRD | `knowject-prd-to-mock` | Brand-aware single-page HTML mock |
| UI screenshot, PDF page, or Figma export | `knowject-read-design` | Component decomposition plan and skeleton files |
| Express routes or OpenAPI document | `knowject-read-api` | Endpoint inventory and typed-client scaffold |
| OpenAPI 3 document | `knowject-api-to-types` | TypeScript response types wired into the generated client |
| Project artifacts, handoff notes, diffs, or decisions | `knowject-memory-capture` | Source-cited durable project memory under `knowject/memory/` |
| Project knowledge sources | `knowject-rag-eval` | Source-cited RAG and citation eval cases under `knowject/evals/` |
| API surfaces or endpoint inventories | `knowject-mcp-tool-designer` | MCP tool design artifacts under `knowject/tools/` |

These Skills are intentionally not generic brainstorming or code-review
prompts. Each one is scoped to a cross-role handoff where project context
matters.

## How It Works

1. Run `knowject-context-init` once in your project.
2. Commit `knowject/context.yaml` as the project anchor.
3. Optionally run `knowject-memory-capture` to preserve source-cited project
   facts, decisions, workflows, risks, and lessons under `knowject/memory/`.
4. Use the other Skills to turn PRDs, UI mocks, API specs, knowledge sources,
   and endpoint inventories into concrete review artifacts.

`knowject/context.yaml` is the shared contract. It records the project type,
frontend and backend stack, design source paths, API source paths, client output
directory, and brand tokens. It must not contain secrets, base URLs, API keys, or
environment-specific config.

```text
your-project/
  knowject/
    context.yaml
    README.md
    memory/
      README.md
      project-memory.yaml
    evals/
      README.md
      rag-eval-cases.yaml
      rag-eval-report.md
    tools/
      README.md
      mcp-tools.plan.md
      mcp-tools.schema.json
      tool-risk-report.md
```

## Install

### Recommended: ask your AI agent

Copy this prompt into Claude Code or Codex:

```text
根据指引安装 Knowject AI toolkit：https://github.com/lynxlangya/knowject/blob/main/skills/install.md
```

The agent will read [`skills/install.md`](./skills/install.md), use a stable
local checkout, run the existing installer, and verify the Claude Code + Codex
Skill links.

### Manual fallback

#### Requirements

- Claude Code or Codex
- macOS / Linux, or Windows with WSL
- `bash`, `python3` 3.8+, `git`
- Python `PyYAML` for full validation

```bash
git clone https://github.com/lynxlangya/knowject.git
cd knowject
bash skills/scripts/install.sh
```

`install.sh` itself does not require PyYAML. Full validation via
`skills/scripts/verify.sh` does:

```bash
pip install pyyaml
bash skills/scripts/verify.sh
```

The installer symlinks every `knowject-*` Skill plus the shared support folder `_shared` into:

```text
~/.claude/skills/
~/.codex/skills/
```

Restart Claude Code or Codex after installation.

## Use

In any project:

```text
/knowject init
```

or:

```text
帮我在这个项目里启用 knowject
```

After that, use the Skills directly:

```text
/knowject mock
/knowject design
/knowject api
/knowject types
/knowject memory
/knowject rag eval
/knowject mcp tools
```

Natural-language requests work too, as long as the intent matches the Skill:

```text
把这段 PRD 出一个高保真 HTML 原型。
把这张设计稿拆成 React + Antd 组件骨架。
找一下用户列表 endpoint，并生成 typed client。
把这个 OpenAPI 文档转成 TypeScript response types。
把这次交接总结成项目记忆。
基于这些知识库文档生成 RAG 引用评测用例。
把这些 endpoint 设计成带风险 gate 的 MCP tools。
```

## Skill Boundaries

| Skill | Good for | Deliberate limits |
| --- | --- | --- |
| `knowject-context-init` | Project onboarding and context detection | Does not guess secrets or environment config |
| `knowject-prd-to-mock` | Static HTML mock from a written requirement | Does not build runtime interactivity |
| `knowject-read-design` | UI decomposition and component skeletons | Does not wire state, routes, tests, or real data |
| `knowject-read-api` | API discovery and typed-client scaffold | Phase 2 supports Express and OpenAPI sources |
| `knowject-api-to-types` | OpenAPI 3 response types for generated clients | Day-1 scope is response types, not full request typing |
| `knowject-memory-capture` | Source-cited file-based project memory | No DB, vector store, platform UI, daemon, secrets, or uncited facts |
| `knowject-rag-eval` | Source-cited RAG and citation eval artifacts | No live model calls, Chroma, MongoDB, platform UI, network scoring, or external eval dependency |
| `knowject-mcp-tool-designer` | API-to-MCP tool design with risk labels and confirmation gates | Does not implement an MCP server, runtime handlers, auth code, API routes, or UI |

This makes the output reviewable. A Skill should produce a useful first pass,
not silently mutate a production codebase.

## Validate the Skill Pack

```bash
bash skills/scripts/verify.sh
bash skills/scripts/test-install.sh
```

`verify.sh` checks the manifest, Skill frontmatter, Codex adapters, per-Skill
README coverage, `context.yaml` examples, route extractors, OpenAPI extractors,
typed-client generation, brand extraction, framework extraction, type
extraction, client rewrite fixtures, the memory validator, RAG eval validator,
and MCP tool schema fixture. `test-install.sh` checks installer idempotency and
installed shared-file references.

## The Platform Behind the Skills

Knowject also contains the product workspace that these Skills can grow into.
That platform is already more than a shell:

- authenticated product shell with project routes, global asset pages, members,
  and settings
- Express API modules for `auth`, `projects`, `members`, `knowledge`, `skills`,
  `agents`, and `settings`
- project chat read/write flow with SSE streaming, replay/edit, source seeds,
  and citation patch events
- global and project-private knowledge flows with upload, diagnostics, retry,
  rebuild, and search
- structured Skill governance with binding validation and project-chat Skill
  injection
- Python indexing runtime for parsing, chunking, embedding, and Chroma
  orchestration
- Docker-based local and production-style deployment baselines

The Skill pack is the lead surface. The workspace is the longer-term system for
managing project memory, team Skills, knowledge assets, and project chat.

## Repository Layout

```text
skills/        Installable Knowject Skills for Claude Code and Codex
apps/
  platform/    React frontend product shell
  api/         Express business API
  indexer-py/  Python indexing runtime
packages/
  request/     Shared HTTP client package
  ui/          Shared UI components
docs/          Project documentation source of truth
.agents/       Internal project-governance Skills
.codex/        Project-local Codex configuration
```

## Tech Stack

- Skills: Markdown Skill specs, Codex adapters, Python validation scripts
- Frontend: React 19, Vite 7, Ant Design 6, Tailwind CSS 4
- API: Express 4, TypeScript, MongoDB Node.js Driver
- Indexing: Python 3.12+, `uv`, Chroma
- Auth: JWT + `argon2id`
- Tooling: pnpm workspace, Turborepo, ESLint, Prettier
- Infra: Docker Compose, MongoDB, Chroma, Caddy

## Development Quick Start

### Requirements

- Node.js >= 22
- pnpm 10
- Python 3.12+
- `uv`

### Host workflow

```bash
cp .env.example .env.local
pnpm install
pnpm dev
```

`pnpm dev` starts `platform + api + indexer-py` through the workspace.

### Docker-managed dependencies

```bash
pnpm dev:init
pnpm dev:up
```

### Useful commands

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

## Documentation

`docs/` is the documentation source of truth. `docs/exports/` is a derived
export layer and not the primary fact surface.

- [Skills README](./skills/README.md)
- [AI Install Guide](./skills/install.md)
- [Skills Schema](./skills/_shared/context-yaml-schema.md)
- [Project Rules](./AGENTS.md)
- [Documentation Index](./docs/README.md)
- [Current Architecture](./docs/current/architecture.md)
- [Project Chat Sources](./docs/current/project-chat-sources.md)
- [Skills Governance](./docs/current/skills-governance.md)
- [Contracts Index](./docs/contracts/README.md)
- [Chat Contract](./docs/contracts/chat-contract.md)
- [Skills Contract](./docs/contracts/skills-contract.md)
- [Platform README](./apps/platform/README.md)
- [API README](./apps/api/README.md)
- [Docker README](./docker/README.md)

## Status

- Shipped Skill pack: `knowject-context-init`, `knowject-read-api`,
  `knowject-prd-to-mock`, `knowject-read-design`, `knowject-api-to-types`
- Current package version: `0.1.0`
- Next distribution step: Claude Code plugin manifest and marketplace listing

## Contributing

Contributions are welcome. Start with [CONTRIBUTING.md](./CONTRIBUTING.md) for
setup, workflow expectations, validation rules, and documentation sync
requirements. For new Skills, follow
[skills/_shared/contributing-skills.md](./skills/_shared/contributing-skills.md).

## Security

For vulnerability reporting and current support scope, see
[SECURITY.md](./SECURITY.md).

## License

This repository is currently distributed under the
[Knowject Proprietary Source-Available License](./LICENSE).

Personal, non-commercial learning, private study, evaluation, and non-production
experimentation are allowed. Commercial use, company use, client use,
deployment, hosting, SaaS, distribution, or monetized derivative work requires
the Licensor's prior written permission.
