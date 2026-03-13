# Knowject

[简体中文](./README.zh-CN.md)

Make project knowledge truly usable for teams.

Knowject is an AI-assisted project knowledge workspace for development teams. It turns code, documents, design assets, and project context into reusable project memory so that search, collaboration, and decision-making stay grounded in the real repository.

The repository is currently in an active foundation stage: the product shell, authentication flow, project/member data flow, and Docker deployment baseline are already implemented, while the final knowledge, chat, and retrieval workflows are still being built out.

## Current Status

- `apps/platform` already provides the authenticated shell, project routes, member management UI, and the first formal global knowledge management UI.
- `apps/api` already provides a production-style baseline with `health`, `auth`, `members`, `projects`, `memberships`, knowledge metadata CRUD/upload/search endpoints, scaffolded `skills / agents`, and demo `memory` endpoints.
- Project lists, project basics, member rosters, and the global members overview already use `/api/projects*` and `/api/members`.
- Project overview, chat, and resources still partially depend on local mock data and local bindings.
- `/knowledge` is now wired to the formal backend knowledge APIs for list/create/update/delete/upload/status display, while `skills` and `agents` still remain shell pages.
- `GET /api/knowledge`, `POST /api/knowledge`, `PATCH /api/knowledge/:knowledgeId`, `DELETE /api/knowledge/:knowledgeId`, `POST /api/knowledge/:knowledgeId/documents`, and `POST /api/knowledge/search` are available end-to-end for the current GA-07 knowledge flow.
- Docker Compose baselines are available for both local and production-style environments with `platform + api + indexer-py + mongodb + chroma`.
- MongoDB is the current primary datastore. Chroma now backs the GA-06 global document index layer for `global_docs`, while `global_code` is reserved as an empty namespace only.
- `apps/indexer-py` now provides the Python indexing service used for `md / txt` parsing, cleaning, chunking, OpenAI-compatible embedding generation, and Chroma upsert/delete orchestration.

## Repository Layout

```text
apps/
  platform/   React + Vite + Ant Design frontend
  api/        Express + TypeScript API
  indexer-py/ Python indexing service for preprocessing and Chroma write-side
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

`pnpm dev` now starts `platform + api + indexer-py` together through the workspace, so the default host workflow no longer needs a separate manual indexer process for markdown uploads.

In `development`, if `OPENAI_API_KEY` is missing but `CHROMA_URL` is available, markdown/txt uploads now fall back to deterministic local embeddings so the upload/index status flow can still run end-to-end. Formal retrieval quality and `/api/knowledge/search` still expect real OpenAI-compatible embedding config.

To verify the GA-06 indexing/retrieval path locally, make sure `.env.local` also provides `CHROMA_URL` and OpenAI-compatible embedding settings.

If you want the recommended local workflow with Docker-managed dependencies:

```bash
pnpm dev:init
pnpm dev:up
```

### Useful commands

```bash
pnpm dev:web
pnpm dev:api
pnpm --filter indexer-py dev
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
