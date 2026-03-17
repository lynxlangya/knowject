# Knowject

[简体中文](./README.zh-CN.md)

Make project knowledge truly usable for teams.

Knowject is an AI-assisted project knowledge workspace for development teams. It turns code, documents, design assets, and project context into reusable project memory so that search, collaboration, and decision-making stay grounded in the real repository.

The repository is currently in an active foundation stage: the product shell, authentication flow, project/member data flow, project resource binding persistence, project conversation read-side, formal global knowledge/skill/agent management flows, workspace settings management, and Docker deployment baseline are already implemented, while message write-side, project-side asset consumption cleanup, and deeper retrieval/runtime workflows are still being built out.

## Current Status

- `apps/platform` already provides the authenticated shell, project routes, member management UI, formal global knowledge/skill/agent management pages, and the `/settings` workspace settings center.
- `apps/api` already provides a production-style baseline with `health`, `auth`, `members`, `projects`, `memberships`, global knowledge CRUD/upload/search endpoints, project-scoped knowledge `list/create/detail/upload` routes, formal skill asset CRUD/import/publish/binding-validation APIs, formal `agents` CRUD/binding APIs, and demo `memory` endpoints.
- Project lists, project basics, member rosters, project resource bindings, project conversation summaries/details, and the global members overview already use `/api/projects*` and `/api/members`.
- `knowject_project_resource_bindings` now remains only as a one-time migration source for historical local data; runtime resource bindings are persisted on project documents.
- Project overview still uses local display supplements for member collaboration snapshots and some fallback copy, while project-bound resource metadata now comes from formal backend catalogs and project-private knowledge summaries.
- `/knowledge`, `/skills`, and `/agents` are now wired to the formal backend asset APIs; `/skills` already supports native `SKILL.md` authoring, GitHub/raw URL import, preview, and draft/publish lifecycle management, and project-side resource cards now consume the same formal catalogs while `/project/:projectId/resources` supports both global knowledge binding and project-private knowledge maintenance through a unified access flow and detail drawer.
- `/settings` is now wired to formal backend settings APIs for embedding, LLM, indexing, and workspace metadata. API keys are encrypted server-side, and the current access phase is “all logged-in users”.
- `GET /api/projects/:projectId/conversations` and `GET /api/projects/:projectId/conversations/:conversationId` now provide the current project chat read-side; message creation is not implemented yet.
- `GET /api/projects/:projectId/knowledge`, `GET /api/projects/:projectId/knowledge/:knowledgeId`, `POST /api/projects/:projectId/knowledge`, and `POST /api/projects/:projectId/knowledge/:knowledgeId/documents` now provide the Week 5-6 project-private knowledge write-side baseline without writing back into `projects.knowledgeBaseIds`.
- `GET /api/knowledge`, `POST /api/knowledge`, `PATCH /api/knowledge/:knowledgeId`, `DELETE /api/knowledge/:knowledgeId`, `POST /api/knowledge/:knowledgeId/documents`, `POST /api/knowledge/:knowledgeId/documents/:documentId/retry`, `POST /api/knowledge/:knowledgeId/documents/:documentId/rebuild`, `POST /api/knowledge/:knowledgeId/rebuild`, `GET /api/knowledge/:knowledgeId/diagnostics`, `DELETE /api/knowledge/:knowledgeId/documents/:documentId`, and `POST /api/knowledge/search` are available end-to-end for the current GA-07 knowledge flow.
- JSON API responses now share the same envelope contract: `code`, `message`, `data`, and `meta`; frontend API wrappers unwrap `data` before UI consumption.
- `pnpm verify:global-assets-foundation` now bundles the Week 3-4 minimum automated validation across API tests, Python indexer tests, and platform type checks.
- `pnpm verify:index-ops-project-consumption` now bundles the Week 5-6 minimum automated validation across project-knowledge API tests, Python indexer tests, and platform type checks.
- Docker Compose baselines are available for both local and production-style environments with `platform + api + indexer-py + mongodb + chroma`.
- MongoDB is the current primary datastore. Chroma now runs behind stable namespace keys such as `global_docs` and `proj_{projectId}_docs`, while the physical collections are versioned and switched through active pointers so embedding model changes do not require a service restart. `global_code` remains a reserved empty namespace.
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
.codex/       Codex workspace (config, docs, packs, skills)
.agent/       Legacy compatibility notes only (deprecated)
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
- Python 3.12+
- `uv` (used by the `apps/indexer-py` workspace during `pnpm dev` / `pnpm test`)

### Local development

```bash
cp .env.example .env.local
pnpm install
pnpm dev
```

`pnpm dev` now starts `platform + api + indexer-py` together through the workspace, so the default host workflow no longer needs a separate manual indexer process for markdown uploads.
If you use the host workflow, install `uv` first; `apps/indexer-py` now runs through `uv run`, while Docker-based workflows keep that dependency inside the container.

In `development`, if `OPENAI_API_KEY` is missing but `CHROMA_URL` is available, markdown/txt uploads now fall back to deterministic local embeddings so the upload/index status flow can still run end-to-end. Formal retrieval quality and `/api/knowledge/search` still expect real OpenAI-compatible embedding config.

To verify the GA-06 indexing/retrieval path locally, make sure `.env.local` also provides `CHROMA_URL` and OpenAI-compatible embedding settings.

If you want the recommended local workflow with Docker-managed dependencies:

```bash
pnpm dev:init
pnpm dev:up
```

`pnpm dev:init` / `pnpm dev:up` now also sync `SETTINGS_ENCRYPTION_KEY_FILE` into `.env.local` together with the existing MongoDB / JWT file-based secrets, so old local checkouts do not need a manual settings-key repair step before the API boots.

### Useful commands

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

The unified command entrypoint is:

```bash
./scripts/knowject.sh help
pnpm knowject:help
```

## Documentation

`.codex/` is now the only maintained Codex workspace root for this repository. `.agent/` remains only as a legacy compatibility layer.

- [Project Rules](./AGENTS.md)
- [Codex Workspace](./.codex/README.md)
- [Migration Guide](./.codex/MIGRATION.md)
- [Documentation Index](./.codex/docs/README.md)
- [Current Architecture Facts](./.codex/docs/current/architecture.md)
- [Docker Usage](./.codex/docs/current/docker-usage.md)
- [Docker Operation Checklist](./.codex/docs/current/docker-operation-checklist.md)
- [Auth and Environment Contract](./.codex/docs/contracts/auth-contract.md)
- [Chroma Decision Record](./.codex/docs/contracts/chroma-decision.md)
- [Handoff Guide](./.codex/docs/handoff/handoff-guide.md)
- [ChatGPT / External Model Brief](./.codex/docs/handoff/chatgpt-project-brief.md)
- [ChatGPT Projects Pack](./.codex/packs/chatgpt-projects/README.md)
- [Platform README](./apps/platform/README.md)
- [API README](./apps/api/README.md)
- [Docker README](./docker/README.md)

## Contributing

Contributions are welcome. Start with [CONTRIBUTING.md](./CONTRIBUTING.md) for setup, workflow, validation, and documentation expectations.

## Security

For vulnerability reporting and current security support scope, see [SECURITY.md](./SECURITY.md).

## License

The current repository contents are provided under the
[Knowject Proprietary Source-Available License](./LICENSE).
Personal, non-commercial learning, private study, evaluation, and
non-production experimentation are allowed.
Any commercial use, company use, client use, deployment, hosting, SaaS,
distribution, or monetized derivative work requires the Licensor's prior
written permission.
