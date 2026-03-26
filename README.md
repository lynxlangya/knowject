# Knowject

[简体中文](./README.zh-CN.md)

Make project knowledge truly usable for teams.

Knowject is an AI-assisted project knowledge workspace for development teams. It turns code, documents, design assets, and project context into reusable project memory so that search, collaboration, and decision-making stay grounded in the real repository.

The repository is currently in an active foundation stage: the product shell, authentication flow, project/member data flow, project resource binding persistence, project conversation read/write plus a backend assistant/runtime baseline, formal global knowledge/skill/agent management flows, workspace settings management, and Docker deployment baseline are already implemented. Saved workspace LLM settings now directly drive the project chat MVP through a unified `chat/completions`-compatible runtime, and the project chat page now defaults to the formal SSE streaming route; richer chat citation UX, stream recovery polish, `global_code`, project-side asset consumption cleanup, and deeper retrieval/runtime workflows are still being built out.

## Current Status

- `apps/platform` already provides the authenticated shell, project routes, member management UI, formal global knowledge/skill/agent management pages, and the `/settings` workspace settings center.
- `apps/api` already provides a production-style baseline with `health`, `auth`, `members`, `projects`, `memberships`, global knowledge CRUD/upload/search endpoints, project-scoped knowledge `list/create/detail/upload` routes, formal skill asset CRUD/import/publish/binding-validation APIs, formal `agents` CRUD/binding APIs, and demo `memory` endpoints.
- Project lists, project basics, member rosters, project resource bindings, project conversation summaries/details, and the global members overview already use `/api/projects*` and `/api/members`.
- `knowject_project_resource_bindings` now remains only as a one-time migration source for historical local data; runtime resource bindings are persisted on project documents.
- Project resource binding writes now use partial `PATCH /api/projects/:projectId` payloads for `knowledgeBaseIds / agentIds / skillIds`; the frontend no longer reconstructs a full project update from the current snapshot when only resource bindings change.
- Project overview (`/project/:projectId/overview`) is now a judgment/dashboard page. Its main body aggregates the formal Project page context (`useProjectPageContext`) through the pure domain helper chain (`projectOverview.adapter` + `projectOverview.insights`), while `projectWorkspaceSnapshot.mock.ts` remains limited to header-level member/meta supplements. Partial-load failures now fail closed to "unavailable" states instead of silently rendering misleading zeroes.
- `/knowledge`, `/skills`, and `/agents` are now wired to the formal backend asset APIs; `/skills` already supports native `SKILL.md` authoring, GitHub/raw URL import, preview, and draft/publish lifecycle management, while the backend import boundary now requires HTTPS, trusted GitHub/raw hosts, and import size/file-count budgets. Project-side resource cards consume the same formal catalogs, and project create/edit forms now also load Agent options from `/api/agents` instead of local mock-only choices.
- `/settings` is now wired to formal backend settings APIs for embedding, LLM, indexing, and workspace metadata. API keys are encrypted server-side, the verified chat-completions provider presets cover `openai / gemini / aliyun / deepseek / moonshot / zhipu / custom`, OpenAI `gpt-5*` connection tests now use `max_completion_tokens` while other compatible providers continue to use `max_tokens`, and saved LLM config now directly drives the project chat MVP.
- The locale foundation is now active across the stack: the frontend uses a shared `LocaleProvider + i18next + Ant Design locale` bridge, guest language preference is stored in `knowject_locale_guest`, signed-in preference is persisted through `PATCH /api/auth/me/preferences`, and API requests now forward `Accept-Language` so backend envelope messages follow the active UI language.
- The locale migration now covers login, the sidebar account language entry, global pages, `/knowledge`, `/skills`, `/agents`, `/settings`, and the full main `/project/:projectId/*` shell (`layout / overview / chat / resources / members`), including project-side user-visible fallback/toast copy.
- `GET /api/projects/:projectId/conversations` and `GET /api/projects/:projectId/conversations/:conversationId` provide the current project chat read-side, while `POST /api/projects/:projectId/conversations`, `PATCH /api/projects/:projectId/conversations/:conversationId`, `DELETE /api/projects/:projectId/conversations/:conversationId`, `POST /api/projects/:projectId/conversations/:conversationId/messages`, and `POST /api/projects/:projectId/conversations/:conversationId/messages/stream` now provide the current backend write/runtime baseline for creating threads, renaming/deleting threads, appending or replaying/editing user messages in-place, running project-level merged retrieval, generating assistant replies, and exposing SSE `ack / sources_seed / delta / done / citation_patch / error` events. Message writes accept `clientRequestId`, and replay/edit requests can additionally carry `targetUserMessageId`; the sync path keeps `clientRequestId` optional for retries, while the stream path requires it so the backend can reuse the same persisted user message after generation, persistence failure, or client disconnect. The project chat page now defaults to the stream route for message sends, shows pending user / draft assistant bubbles during generation, supports stop-generation, and now exposes user-bubble retry / edit / copy actions that trim later turns in the same thread before reconciling detail/list state after `done`, `error`, or cancel; `done` no longer waits for citation grounding, and the final citation highlight may arrive later through `citation_patch`.
- `GET /api/projects/:projectId/knowledge`, `GET /api/projects/:projectId/knowledge/:knowledgeId`, `POST /api/projects/:projectId/knowledge`, and `POST /api/projects/:projectId/knowledge/:knowledgeId/documents` now provide the Week 5-6 project-private knowledge write-side baseline without writing back into `projects.knowledgeBaseIds`.
- `GET /api/knowledge`, `POST /api/knowledge`, `PATCH /api/knowledge/:knowledgeId`, `DELETE /api/knowledge/:knowledgeId`, `POST /api/knowledge/:knowledgeId/documents`, `POST /api/knowledge/:knowledgeId/documents/:documentId/retry`, `POST /api/knowledge/:knowledgeId/documents/:documentId/rebuild`, `POST /api/knowledge/:knowledgeId/rebuild`, `GET /api/knowledge/:knowledgeId/diagnostics`, `DELETE /api/knowledge/:knowledgeId/documents/:documentId`, and `POST /api/knowledge/search` are available end-to-end for the current GA-07 knowledge flow. Namespace rebuilds now always write into a staged/versioned collection before switching the active pointer, and diagnostics expose the indexer runtime actual values separately from the workspace-expected config.
- `GET /api/health` now exposes only a minimal public status surface: top-level `status` plus `checks.{app,database,vectorStore}.status`, all normalized to `up/down`; internal host/url/error details are no longer exposed on the public health route.
- JSON API responses now share the same envelope contract: `code`, `message`, `data`, and `meta`; frontend API wrappers unwrap `data` before UI consumption.
- `pnpm verify:global-assets-foundation` now bundles the Week 3-4 minimum automated validation across API tests, Python indexer tests, and platform type checks.
- `pnpm verify:index-ops-project-consumption` now bundles the Week 5-6 minimum automated validation across project-knowledge API tests, Python indexer tests, and platform type checks.
- Docker Compose baselines are available for both local and production-style environments with `platform + api + indexer-py + mongodb + chroma`; `platform` now has a `/healthz` readiness probe, and `pnpm docker:prod:up` now starts in image-only mode instead of implicitly building on the target machine.
- MongoDB is the current primary datastore. Chroma now runs behind stable namespace keys such as `global_docs` and `proj_{projectId}_docs`, while the physical collections are versioned and switched through active pointers so embedding model changes do not require a service restart. `global_code` remains a reserved empty namespace.
- `apps/indexer-py` now provides the Python indexing service used for `md / txt` parsing, cleaning, chunking, OpenAI-compatible embedding generation, provider-aware batching/error handling, and Chroma upsert/delete orchestration. Its internal control-plane docs are disabled outside `development`, `storagePath` is constrained under `KNOWLEDGE_STORAGE_ROOT`, and non-`development` startup now fails closed unless `KNOWLEDGE_INDEXER_INTERNAL_TOKEN(_FILE)` is configured for both the API and the indexer.

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
scripts/      Reusable command entrypoints and shell helpers
docs/         Current documentation root (source of truth)
.agents/      Live project skill root (`.agents/skills/*`)
.codex/       Codex configuration + compatibility notes only (includes compatibility stubs)
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

In `development`, if `OPENAI_API_KEY` is missing but `CHROMA_URL` is available, markdown/txt uploads now fall back to deterministic local embeddings so the upload/index status flow can still run end-to-end. Formal retrieval quality and `/api/knowledge/search` still expect real compatible embedding config, and the Python indexer now adapts batching/error prefixes to the selected provider (for example, Aliyun embeddings are sent in batches of at most 10 texts).

To verify the GA-06 indexing/retrieval path locally, make sure `.env.local` also provides `CHROMA_URL` and OpenAI-compatible embedding settings.

If you want the recommended local workflow with Docker-managed dependencies:

```bash
pnpm dev:init
pnpm dev:up
```

`pnpm dev:init` / `pnpm dev:up` now sync the canonical host secret quartet `MONGODB_URI_FILE` / `JWT_SECRET_FILE` / `SETTINGS_ENCRYPTION_KEY_FILE` / `KNOWLEDGE_INDEXER_INTERNAL_TOKEN_FILE` into `.env.local`, and also derive Docker's internal `docker/secrets/mongodb_uri.txt` from `.env.docker.local` plus `mongo_app_password.txt`, so host and container API / indexer boot paths no longer drift on Mongo credentials or internal bearer auth.

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

`docs/` is the project documentation root. `docs/exports/` is the derived export root, and `docs/exports/chatgpt-projects/*` is the live ChatGPT Projects export package path. Project skills live under `.agents/skills/`, while `.codex/` keeps compatibility stubs only.

- [Project Rules](./AGENTS.md)
- [Codex Workspace](./.codex/README.md)
- [Migration Guide](./.codex/MIGRATION.md)
- [Documentation Index](./docs/README.md)
- [Current Architecture Facts](./docs/current/architecture.md)
- [Auth and Environment Contract](./docs/contracts/README.md)
- [Handoff Notes](./docs/handoff/README.md)
- [Roadmap Notes](./docs/roadmap/README.md)
- [Exports Index](./docs/exports/README.md)
- [Platform README](./apps/platform/README.md)
- [API README](./apps/api/README.md)
- [Docker Command Portal](./docker/README.md)

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
