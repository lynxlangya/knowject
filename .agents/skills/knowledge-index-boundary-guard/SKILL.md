---
name: knowledge-index-boundary-guard
description: Audit Knowject's knowledge indexing boundary across `apps/api`, `apps/indexer-py`, MongoDB metadata, Chroma namespaces, and settings-driven embedding/indexing config. Use when changing knowledge upload/search/retry/rebuild/diagnostics/delete flows, `settings` integration, indexer routes, namespace/versioned collection rules, or when reviewing whether docs/tests/verify scripts were synced after indexing changes.
---

# Knowledge Index Boundary Guard

## Overview

Use this skill to review whether a Knowject change respects the current knowledge indexing boundary instead of quietly smearing responsibilities across Node, Python, MongoDB, Chroma, settings, and docs.

Keep the task in audit mode. Identify drift, missing sync work, and boundary violations. Do not treat this skill as permission to redesign the whole indexing stack.

## Fixed Boundary

- `apps/api` owns business routes, auth, visibility checks, MongoDB metadata, state transitions, and the read-side knowledge search service.
- `apps/indexer-py` owns parse, clean, chunk, embed, and Chroma write/delete control-plane operations.
- MongoDB stores business truth: knowledge base metadata, document records, namespace active pointers, status, and failure details.
- Chroma is a rebuildable derived index layer. It must not become the business source of truth.
- `settings` owns effective embedding/indexing config. Model or provider changes must be reflected in namespace fingerprint and rebuild rules.
- Frontend pages call formal API routes. They do not talk to indexer or Chroma directly.
- Skills and agents must not bypass the API search service to query Chroma directly.

## Trigger Cases

Use this skill when the change touches one or more of these areas:

- `apps/api/src/modules/knowledge/*`
- `apps/api/src/modules/settings/*`
- `apps/indexer-py/app/api/routes/indexing.py`
- `apps/indexer-py/app/services/*`
- `apps/indexer-py/app/domain/indexing/*`
- `apps/platform/src/pages/knowledge/*`
- `apps/platform/src/pages/project/*` when project-private knowledge behavior changes
- `docs/current/architecture.md`
- `docs/contracts/chroma-decision.md`
- `docs/plans/tasks-index-ops-project-consumption.md`
- verify scripts or tests that prove the indexing path still works

## Audit Workflow

1. Rebuild the affected path.
   Start from the changed user or system behavior: upload, retry, rebuild, diagnostics, delete, search, project-private knowledge upload, or settings-driven embedding change.
2. Map ownership before judging code.
   Confirm which layer should own the behavior: API, indexer, MongoDB metadata, Chroma lifecycle, settings, frontend status view, or docs.
3. Check route and contract completeness.
   Verify public API routes, internal indexer routes, payload fields, and conflict semantics are still aligned.
4. Check state and namespace invariants.
   Confirm that scope, project ownership, namespace key, versioned collection naming, active pointer, rebuild requirement, and fallback behavior still match current contracts.
5. Check validation coverage.
   Confirm the change updated the minimum relevant tests or verify command, not just production code.
6. Check documentation sync.
   Confirm current docs and contract docs still describe the new reality without leaking roadmap language into current facts.

## Minimum Checklist

### API and indexer contract

- Confirm Node still exposes the business-facing route and Python still exposes the internal control-plane route.
- Confirm `upload / retry / rebuild / diagnostics / delete / search` semantics are explicit and not inferred from UI behavior.
- Confirm legacy route compatibility remains intentional if older development flows still depend on it.

### State ownership

- Confirm MongoDB remains the source of truth for document status, retry count, timestamps, and error state.
- Confirm Python returns processing results but does not silently take over business-state writes.
- Confirm Chroma cleanup or rebuild does not bypass MongoDB status coordination.

### Namespace and rebuild rules

- Confirm namespace keys remain stable: `global_docs`, `global_code`, `proj_{projectId}_docs`, `proj_{projectId}_code`.
- Confirm physical collection naming still follows the namespace-plus-fingerprint pattern when applicable.
- Confirm embedding config changes lead to explicit rebuild requirements instead of mixing vectors from incompatible spaces.
- Confirm project-private knowledge stays isolated from global binding arrays and global namespace reads.

### Settings integration

- Confirm effective embedding/indexing config still flows from `settings` into Node and then into Python.
- Confirm local-dev fallback embedding remains intentional and does not leak into production semantics.
- Confirm diagnostics still report degraded dependencies instead of failing opaque.

### Frontend and UX boundary

- Confirm frontend pages call formal API routes and only render status/diagnostics returned by the backend.
- Confirm project resources pages do not treat project-private knowledge as global binding data.
- Confirm no UI patch introduces direct Chroma or indexer coupling.

### Docs, tests, and verification

- Check whether these files need sync when boundary behavior changes:
  - `docs/current/architecture.md`
  - `docs/contracts/chroma-decision.md`
  - `docs/plans/tasks-index-ops-project-consumption.md`
  - `apps/api/README.md`
  - `apps/indexer-py/README.md`
- Confirm relevant API tests, Python tests, and verify scripts still cover the changed path.
- Prefer reporting missing verification explicitly over assuming an untouched verify command is still enough.

## Output Contract

Return findings in this shape:

1. `Boundary summary`
   State which layer owns what after the change.
2. `Findings`
   List concrete drifts, missing sync items, or contract mismatches.
3. `Required follow-up`
   List code, test, verify, or doc updates still required.
4. `Safe no-change areas`
   Note which boundaries remain correctly untouched.

If there are no findings, say so explicitly and still mention remaining validation gaps.

## Typical Requests

- `Use $knowledge-index-boundary-guard to review whether this knowledge rebuild change still respects Node/Python/Chroma boundaries.`
- `Use $knowledge-index-boundary-guard to check this project-private knowledge upload patch for namespace, docs, and verification drift.`
- `Use $knowledge-index-boundary-guard to audit whether the new settings-driven embedding change requires rebuild, docs, and test updates.`

## Reference Files

Read these only as needed:

- `docs/current/architecture.md`
- `docs/contracts/chroma-decision.md`
- `docs/plans/tasks-index-ops-project-consumption.md`
- `apps/api/src/modules/knowledge/knowledge.service.ts`
- `apps/indexer-py/app/api/routes/indexing.py`
- `apps/indexer-py/README.md`
