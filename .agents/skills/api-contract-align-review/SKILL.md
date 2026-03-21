---
name: api-contract-align-review
description: Review Knowject frontend/backend API contract alignment when changes touch `apps/platform/src/api/*`, `packages/request`, `apps/api/src/modules/*`, `apps/api/src/app/create-app.ts`, response envelope fields, auth semantics, error behavior, or API-related docs/tests. Use for PR review, endpoint additions, wrapper updates, permission/error-shape changes, and mock-to-formal API cutovers.
---

# Api Contract Align Review

Review Knowject API changes as a contract-alignment task, not as a generic REST style review. Focus on drift between frontend wrappers, shared request primitives, backend router/service/types wiring, runtime auth behavior, and the docs/tests that describe those behaviors.

Prefer findings-first output. If no issues are found, say that explicitly and note residual risks or missing validation.

## Core Surfaces

Inspect these surfaces together because Knowject usually changes them as one chain:

- Frontend API wrappers in `apps/platform/src/api/*`
- Shared request primitives in `packages/request/src/*`
- Backend route/module wiring in `apps/api/src/modules/*`
- Backend app assembly in `apps/api/src/app/create-app.ts`
- API boundary docs in `apps/api/README.md`, `apps/platform/README.md`, `docs/current/architecture.md`
- Contract tests around envelopes, auth, error handling, and module behavior

## Review Workflow

### 1. Map the affected contract edge

- Identify which endpoint group or wrapper changed.
- Trace the full edge before judging correctness:
  - page or caller
  - `apps/platform/src/api/*` wrapper
  - `packages/request` envelope/error primitives
  - backend router
  - service/types/repository boundary
  - `create-app.ts` registration
  - docs/tests that describe the same behavior
- If the change only touches one layer, verify whether that is intentional or a likely partial update.

### 2. Check the frontend wrapper shape

- Verify wrappers still use `ApiEnvelope<T>` and `unwrapApiData(...)`.
- Verify request helpers still go through the shared client instead of bypassing `@knowject/request`.
- Verify auth-sensitive calls use the authenticated client and public auth calls stay on the public client.
- Verify pages are not forced to understand envelope internals such as `code`, `message`, or `meta` unless the contract explicitly requires it.
- Verify error extraction still matches current project behavior through `extractApiErrorMessage(...)`.

### 3. Check backend route and module alignment

- Verify the router uses the established pattern:
  - `requireAuth` where appropriate
  - `asyncHandler(...)`
  - `getRequiredAuthUser(...)` for actor extraction
  - `sendSuccess(...)` / `sendCreated(...)` for JSON responses
- Verify new or changed endpoints are actually mounted in `apps/api/src/app/create-app.ts`.
- Verify service/types names and response shapes match what the frontend wrapper expects.
- Verify route semantics remain consistent with existing modules instead of introducing one-off response patterns.

### 4. Check contract semantics, not just types

- Verify permission behavior is still explicit:
  - public vs authenticated
  - admin-only vs member-visible
  - sensitive-route transport guards where required
- Verify success semantics still match the current envelope contract:
  - `200 -> SUCCESS`
  - `201 -> CREATED`
  - `data` shape matches wrapper expectations
- Verify failure semantics still expose the right `message`, `code`, and relevant `meta.details` behavior.
- Call out drift when frontend assumes `null`, backend now returns an object, or vice versa.

### 5. Check sync obligations outside the code

- If endpoint behavior changed, verify the affected docs moved with it:
  - `apps/api/README.md`
  - `apps/platform/README.md`
  - `docs/current/architecture.md`
  - root `README.md` when external usage or startup flow changed
- If behavior changed and similar modules have tests, verify tests were updated or added.
- For multi-layer changes, check whether repo-level verification commands should be updated or at least mentioned.

## Knowject-Specific Checks

Run these checks whenever they are relevant:

- Frontend wrappers should keep using `ApiEnvelope<T>` plus `unwrapApiData(...)`; page components should consume business objects, not raw envelopes.
- `packages/request` is the shared transport contract. If request-id, unauthorized handling, `ApiError`, or dedupe behavior changes, treat that as a cross-cutting contract change.
- `apps/api/src/app/create-app.ts` is the final truth for whether a backend module is actually live.
- `GET /api/settings*`, `POST /api/settings/*/test`, `/api/auth/*`, and `/api/memory/*` have extra transport sensitivity; auth and secure transport assumptions must stay aligned across code and docs.
- `projects`, `knowledge`, `skills`, and `agents` should not invent response shapes that bypass the common envelope helpers.
- Mock-to-formal cutovers are high risk. When a page stops using local supplements and starts using formal API data, review both data-source replacement and the doc sync that explains the new truth source.

## Output Format

Use a concise review structure:

1. Findings
2. Open questions or assumptions
3. Required sync work
4. Validation gaps

Each finding should include:

- impacted endpoint or contract surface
- why the drift matters
- minimal fix direction
- missing tests or docs when relevant

If there are no findings, state that explicitly and then list any residual risks such as unrun tests, untouched docs, or partially reviewed callers.

## Typical Triggers

- “Review this PR for API contract drift.”
- “I changed `apps/platform/src/api/knowledge.ts` and `apps/api/src/modules/knowledge/*`; check whether frontend/backend/docs are still aligned.”
- “We replaced a mock data source with a formal endpoint; audit the contract and sync obligations.”
- “I changed the response envelope or unauthorized behavior; check downstream wrappers and docs.”
