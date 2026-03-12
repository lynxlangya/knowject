# Contributing to Knowject

Thanks for contributing to Knowject.

This repository is still in an active foundation stage, so the main goal of every contribution is to improve correctness, maintainability, and reviewability with the smallest reasonable diff.

## Before You Start

- Read the [README](./README.md) for the current product and repository scope.
- Read [AGENTS.md](./AGENTS.md) for project-level collaboration rules.
- For architecture, routing, data-source, and Docker facts, use [`.agent/docs/current/architecture.md`](./.agent/docs/current/architecture.md) as the current source of truth.
- Do not assume roadmap documents describe already shipped behavior.

## Development Setup

```bash
cp .env.example .env.local
pnpm install
pnpm dev
```

Recommended local workflow with Docker-managed dependencies:

```bash
pnpm dev:init
pnpm dev:up
```

## Branches and Commits

- Keep each change focused on one purpose.
- Prefer small, reviewable pull requests over broad refactors.
- Use the commit title format `type(scope)!: summary`.
- Allowed `type` values: `feat`, `fix`, `refactor`, `perf`, `docs`, `test`, `build`, `ci`, `chore`, `revert`.
- If the change is non-trivial, include commit body sections for `Why`, `What`, `Validation`, and `Risk`.

## Coding Expectations

- Reuse existing patterns before introducing new abstractions.
- Keep module boundaries intact:
  - `apps/platform` for frontend product behavior
  - `apps/api` for backend modules and routes
  - `packages/*` for reusable shared packages
- Do not introduce undocumented environment variables or storage keys.
- Keep naming in English. Follow repository conventions for comments, docs, and UI copy.

## Validation

Run the smallest relevant validation for your change. Typical commands:

```bash
pnpm check-types
pnpm build
pnpm --filter api check-types
pnpm --filter platform check-types
```

If you touch Docker or environment behavior, also validate the compose configuration that applies to your change.

## Documentation Sync

Update documentation whenever behavior changes. At minimum:

- Update [README.md](./README.md) when repository entrypoints, setup, or external-facing expectations change.
- Update [`.agent/docs/current/architecture.md`](./.agent/docs/current/architecture.md) when routes, data sources, storage keys, or module boundaries change.
- Update [`.agent/docs/current/docker-usage.md`](./.agent/docs/current/docker-usage.md) and [docker/README.md](./docker/README.md) when Docker topology, ports, secrets, or deployment workflow changes.
- Update [apps/platform/README.md](./apps/platform/README.md) or [apps/api/README.md](./apps/api/README.md) when subsystem responsibilities move.

## Pull Requests

When opening a pull request, describe:

- What changed
- Why it changed
- How you validated it
- Any remaining risks or follow-up work

If the change intentionally leaves a gap, say so explicitly.
