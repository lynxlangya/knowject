# Knowject

[简体中文](./README.zh-CN.md)

Make project knowledge truly usable for teams.

Knowject is an AI-assisted project knowledge workspace for development teams. It turns code, documents, design assets, and project context into reusable project memory so that search, collaboration, and decision-making stay grounded in the real repository.

The repository is currently in an active foundation stage: the product shell, authentication flow, project/member data flow, and Docker deployment baseline are already implemented, while the final knowledge, chat, and retrieval workflows are still being built out.

## Current Status

- `apps/platform` already provides the authenticated shell, project routes, member management UI, and global asset management shells.
- `apps/api` already provides a production-style baseline with `health`, `auth`, `members`, `projects`, `memberships`, scaffolded `knowledge / skills / agents`, and demo `memory` endpoints.
- Project lists, project basics, member rosters, and the global members overview already use `/api/projects*` and `/api/members`.
- Project overview, chat, and resources still partially depend on local mock data and local bindings.
- Global `knowledge`, `skills`, and `agents` pages currently act as management shells; create/import flows are still placeholders.
- `GET /api/knowledge`, `GET /api/skills`, and `GET /api/agents` are now auth-protected scaffold endpoints that return empty placeholder payloads for the next GA steps.
- Docker Compose baselines are available for both local and production-style environments with `platform + api + mongodb + chroma`.
- MongoDB is the current primary datastore. Chroma is integrated only for infrastructure and health diagnostics, not yet for a full retrieval pipeline.
- `apps/indexer-py` is reserved as the future Python indexer boundary, but currently only contains implementation notes.

## Repository Layout

```text
apps/
  platform/   React + Vite + Ant Design frontend
  api/        Express + TypeScript API
  indexer-py/ Reserved Python indexer boundary (placeholder only)
packages/
  request/    Shared HTTP client package (@knowject/request)
  ui/         Shared UI package (@knowject/ui)
docker/       Compose files, image builds, reverse proxy, init scripts
scripts/      Reusable command entrypoints
.agent/docs/  Architecture facts, contracts, plans, handoff, design docs
```

## Product Surface

### Global routes

- `/login`
- `/home`
- `/knowledge`
- `/skills`
- `/agents`
- `/members`
- `/analytics`
- `/settings`

### Project routes

- `/project/:projectId/overview`
- `/project/:projectId/chat`
- `/project/:projectId/chat/:chatId`
- `/project/:projectId/resources`
- `/project/:projectId/members`

## Tech Stack

- Frontend: React 19, Vite 7, Ant Design 6, Tailwind CSS 4
- API: Express 4, TypeScript, MongoDB Node.js Driver
- Auth: JWT + `argon2id`
- Tooling: pnpm workspace, Turborepo, ESLint, Prettier
- Infrastructure: Docker Compose, MongoDB, Chroma, Caddy

## Getting Started

### Requirements

- Node.js >= 22
- pnpm 10

### Local development

```bash
cp .env.example .env.local
pnpm install
pnpm dev
```

If you want the recommended local workflow with Docker-managed dependencies:

```bash
pnpm dev:init
pnpm dev:up
```

### Useful commands

```bash
pnpm dev:web
pnpm dev:api
pnpm check-types
pnpm build
pnpm host:up
pnpm docker:local:up
pnpm docker:local:health
```

The unified command entrypoint is:

```bash
./scripts/knowject.sh help
pnpm knowject:help
```

## Documentation

- [Project Rules](./AGENTS.md)
- [Documentation Index](./.agent/docs/README.md)
- [Current Architecture Facts](./.agent/docs/current/architecture.md)
- [Docker Usage](./.agent/docs/current/docker-usage.md)
- [Docker Operation Checklist](./.agent/docs/current/docker-operation-checklist.md)
- [Auth and Environment Contract](./.agent/docs/contracts/auth-contract.md)
- [Chroma Decision Record](./.agent/docs/contracts/chroma-decision.md)
- [Handoff Guide](./.agent/docs/handoff/handoff-guide.md)
- [ChatGPT / External Model Brief](./.agent/docs/handoff/chatgpt-project-brief.md)
- [Platform README](./apps/platform/README.md)
- [API README](./apps/api/README.md)
- [Docker README](./docker/README.md)

## Contributing

Contributions are welcome. Start with [CONTRIBUTING.md](./CONTRIBUTING.md) for setup, workflow, validation, and documentation expectations.

## Security

For vulnerability reporting and current security support scope, see [SECURITY.md](./SECURITY.md).

## License

This project is licensed under the [Apache License 2.0](./LICENSE).
