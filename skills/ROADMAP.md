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
| `knowject-api-to-types` | Phase 3 | `docs/plans/tasks-knowject-skills-api-to-types.md` |
| `knowject-memory-capture` | Phase 4 — memory | GitHub issue #1 |

## Deferred (2026-05-17 narrowing)

Three Tier 2 candidates from the original brainstorming failed re-evaluation after Phase 2 Tier 1 shipped. Preserved here with explicit reopen conditions.

| Skill | Original purpose | Defer reason | Reopen if |
|---|---|---|---|
| `knowject-mock-to-api` | UI mock + business description → proposed API endpoint list | Creative modeling, not structured translation; LLM ad-hoc with `read-api`'s output as style anchor matches the value; wrong endpoint suggestions cost more than no suggestion; no fixture round-trip possible. | Team starts generating ≥5 new endpoint sets per quarter from mocks AND ad-hoc consistency drops below acceptable. |
| `knowject-prd-validate` | PRD ↔ UI ↔ API consistency check | "Consistency" is subjective — over-strict produces noise, lax produces silent drift; equivalent value via a PR review checklist under `docs/standards/*` at far lower maintenance cost; no testable contract. | PR review checklist proves insufficient AND a deterministic subset (e.g., "every API path param appears in at least one PRD field") becomes definable. |
| `knowject-changelog` | commit/PR → user-facing release notes | Already covered by `semantic-release` / `git-cliff` / `release-please` / GitHub auto-notes; only `brand.voice` differentiation, insufficient to justify a Skill; spec §3 rejection rule "已被 X 覆盖好" applies. | A brand-voice differentiation case appears that existing tooling cannot serve AND `brand.voice` proves load-bearing for user reception. |

## Next

- Claude Code plugin manifest + official marketplace listing.

## Governance

Catalog changes (ship / promote to Active / defer / deprecate) require:

1. **An entry in the Decision log section below** with date, trigger, rationale, and reopen / sunset conditions where applicable.
2. **Sync into `skills/manifest.yaml`** — `#skills` for shipped, `#roadmap` for active / pending implementation. Deferred Skills are intentionally **not** listed in manifest (they are not pending implementation; promoting them requires a fresh Active decision).
3. **README banner + status checklist update** to reflect the new state.

Versioning is on the whole product (`manifest.yaml#version`), not per-Skill.

## Decision log

### 2026-05-24 — Phase 4 shipped: memory-capture

**Trigger:** Hangzhou AI Agent / AI application market scan shows
Memory and Context Engineering as high-signal JD requirements.
Existing Knowject Skills cover project anchoring and cross-role
handoff, but not durable project memory.

**Outcome:** `knowject-memory-capture` shipped as the next
highest-priority Skill. It captures, classifies, verifies, and
refreshes source-cited project memory for future Claude Code and
Codex runs.

**Day-1 scope:** file-based, source-cited project memory under
`knowject/memory/`, with `project-memory.yaml` as the canonical
machine-readable artifact and `README.md` as the folder guide.
The Skill requires `knowject/context.yaml`, requires evidence for
every memory item, avoids secrets and environment values, gives
current facts precedence over roadmap / old plans / handoff docs,
and uses a diff-confirm write gate.

**Deliberate non-goals:** no database, no MongoDB / Chroma /
vector store, no server API, no platform UI, no background watcher
or daemon, no automatic commit, no `.codex` / `.claude` / shell
history / browser history ingestion, no generic brainstorming
memory without project evidence, and no full semantic deduplication
engine.

**Resume signal:** project memory, context engineering,
source-cited agent context, safe memory governance.

### 2026-05-17 — Phase 3 shipped: api-to-types

**Trigger:** Phase 2 Tier 1 stabilized; api-to-types remained the sole
Tier 2 survivor of the 2026-05-17 narrowing decision.

**Outcome:** `knowject-api-to-types` shipped per the locked design
(OpenAPI-only Day-1 input; A+C hybrid integration with read-api's
typed client; sibling `.types.ts` colocation in `api.client.output_dir`).

**Implementation summary:**

- Two Python scripts (`extract-types-from-openapi.py`,
  `rewrite-typed-client.py`) under `skills/knowject-api-to-types/scripts/`,
  each covered by a verify.sh fixture round-trip (checks #13 / #14).
- Three reference docs (`openapi-to-typescript-mapping.md`,
  `typed-client-rewrite.md`, `non-openapi-refusal.md`) lock the
  schema mapping rules, the rewrite flow, and the per-framework
  OpenAPI exposure recommendations respectively.
- SKILL.md body wires Mode A (rewrite+emit) and Mode B (emit-only
  fallback) with explicit diff-confirm gates.
- Day-1 deliberate non-goals: request/query/path body typing (response
  types only), runtime validators (zod/io-ts), non-OpenAPI native
  parsers — all surfaced in the "What this Skill does NOT do" section
  for future v2 candidates.

**Phase 4 unblocks:** Claude Code plugin manifest + marketplace listing.

### 2026-05-17 — Tier 2 narrowing (4 → 1)

**Trigger:** Phase 2 Tier 1 ship complete; independent review of remaining Tier 2 candidates against spec §3 inclusion filter and rejection rules.

**Outcome:** `api-to-types` retained as Phase 3 Active; `mock-to-api`, `prd-validate`, `changelog` deferred (see Deferred table above for per-Skill reasoning and reopen conditions).

**Pattern observed:** Two failure modes shared by the deferred Skills — either LLM ad-hoc is good enough (`mock-to-api` / `changelog`) or there is no testable contract and failure cost is asymmetric (`prd-validate`). Conversely, `api-to-types` survives the filter because it is not a new feature but a promise completion — `read-api` explicitly carved out the `unknown` placeholder for it.

**Process lesson:** the original spec listed 4 Tier 2 candidates with one-line descriptions only; under closer scrutiny three did not survive. Future spec entries should pre-state the testable contract and the existing-tooling check, not defer those to a later review pass.
