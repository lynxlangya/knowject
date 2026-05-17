# Knowject Skills — Roadmap

Canonical product roadmap for the `skills/` distribution. The Active catalog, deferred-with-reason list, and historical decisions all live here. The companion machine-readable form is [`manifest.yaml`](./manifest.yaml).

> Predecessor brainstorming notes live in `docs/plans/knowject-skills-spec.md` (local-only — `docs/plans/*` is gitignored by the project's docs allowlist). Any catalog table there is historical; this file supersedes it.

## Shipped

| Skill | Phase | Implementation plan (local) |
|---|---|---|
| `knowject-context-init` | Phase 1 — foundation | `docs/plans/tasks-knowject-skills-foundation.md` |
| `knowject-read-api` | Phase 2 — Tier 1 | `docs/plans/tasks-knowject-skills-read-api.md` |
| `knowject-prd-to-mock` | Phase 2 — Tier 1 | `docs/plans/tasks-knowject-skills-prd-to-mock.md` |
| `knowject-read-design` | Phase 2 — Tier 1 | `docs/plans/tasks-knowject-skills-read-design.md` |

## Phase 3 — Active

| Skill | Purpose | Why this and not the rest |
|---|---|---|
| `knowject-api-to-types` | Backend schema (Express routes / OpenAPI) → cross-stack TypeScript types | Closes the typed-client loop opened by `knowject-read-api` — fills in the `unknown` placeholders its generated clients return. Differentiation from `openapi-typescript` is Express-route support (no OpenAPI required), which has no equivalent off-the-shelf tool. |

## Deferred (2026-05-17 narrowing)

Three Tier 2 candidates from the original brainstorming failed re-evaluation after Phase 2 Tier 1 shipped. Preserved here with explicit reopen conditions.

| Skill | Original purpose | Defer reason | Reopen if |
|---|---|---|---|
| `knowject-mock-to-api` | UI mock + business description → proposed API endpoint list | Creative modeling, not structured translation; LLM ad-hoc with `read-api`'s output as style anchor matches the value; wrong endpoint suggestions cost more than no suggestion; no fixture round-trip possible. | Team starts generating ≥5 new endpoint sets per quarter from mocks AND ad-hoc consistency drops below acceptable. |
| `knowject-prd-validate` | PRD ↔ UI ↔ API consistency check | "Consistency" is subjective — over-strict produces noise, lax produces silent drift; equivalent value via a PR review checklist under `docs/standards/*` at far lower maintenance cost; no testable contract. | PR review checklist proves insufficient AND a deterministic subset (e.g., "every API path param appears in at least one PRD field") becomes definable. |
| `knowject-changelog` | commit/PR → user-facing release notes | Already covered by `semantic-release` / `git-cliff` / `release-please` / GitHub auto-notes; only `brand.voice` differentiation, insufficient to justify a Skill; spec §3 rejection rule "已被 X 覆盖好" applies. | A brand-voice differentiation case appears that existing tooling cannot serve AND `brand.voice` proves load-bearing for user reception. |

## Phase 4

- Claude Code plugin manifest + official marketplace listing.

## Governance

Catalog changes (ship / promote to Active / defer / deprecate) require:

1. **An entry in the Decision log section below** with date, trigger, rationale, and reopen / sunset conditions where applicable.
2. **Sync into `skills/manifest.yaml`** — `#skills` for shipped, `#roadmap` for Phase 3 active. Deferred Skills are intentionally **not** listed in manifest (they are not pending implementation; promoting them requires a fresh Active decision).
3. **README banner + status checklist update** to reflect the new state.

Versioning is on the whole product (`manifest.yaml#version`), not per-Skill.

## Decision log

### 2026-05-17 — Tier 2 narrowing (4 → 1)

**Trigger:** Phase 2 Tier 1 ship complete; independent review of remaining Tier 2 candidates against spec §3 inclusion filter and rejection rules.

**Outcome:** `api-to-types` retained as Phase 3 Active; `mock-to-api`, `prd-validate`, `changelog` deferred (see Deferred table above for per-Skill reasoning and reopen conditions).

**Pattern observed:** Two failure modes shared by the deferred Skills — either LLM ad-hoc is good enough (`mock-to-api` / `changelog`) or there is no testable contract and failure cost is asymmetric (`prd-validate`). Conversely, `api-to-types` survives the filter because it is not a new feature but a promise completion — `read-api` explicitly carved out the `unknown` placeholder for it.

**Process lesson:** the original spec listed 4 Tier 2 candidates with one-line descriptions only; under closer scrutiny three did not survive. Future spec entries should pre-state the testable contract and the existing-tooling check, not defer those to a later review pass.
