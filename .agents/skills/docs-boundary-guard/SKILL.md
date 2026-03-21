---
name: docs-boundary-guard
description: Audit Knowject's docs boundaries and required sync work. Use when changes touch `docs/*`, `docs/exports/*`, `.agents/skills`, `AGENTS.md`, `README.md`, `.codex/README.md`, `.codex/MIGRATION.md`, or any feature that may require current/contracts/plans/handoff boundary checks and export synchronization.
---

# Docs Boundary Guard

Audit Knowject's document system as a source-of-truth problem, not a writing problem. Use this skill to decide which documents must change, which directory a document belongs in, and whether `docs/exports/*` has drifted from `docs/*`.

## Audit Inputs

Start from the concrete change, then gather only the documents needed to judge it:

- `AGENTS.md`
- `.codex/README.md`
- `.codex/MIGRATION.md`
- `docs/README.md`
- `docs/exports/README.md`
- affected files under `docs/*`
- affected entry docs such as `README.md`

If the change is route, API, data-source, or module-boundary related, read `docs/current/architecture.md` before judging sync completeness.

## Workflow

### 1. Classify the change

Decide which class the change belongs to:

- current fact change
- target/roadmap change
- execution plan or DoD change
- handoff/onboarding change
- migration or directory-governance change
- pack synchronization change

Do not start by editing prose. Start by deciding which truth surface changed.

### 2. Check `docs/*` directory boundaries

Use these boundaries strictly:

- `current/`: only implemented facts that source code or runtime baseline can prove
- `contracts/`: implemented contract facts and bound decisions
- `plans/`: execution plans, task breakdowns, DoD, stage records
- `handoff/`: onboarding order, next-step context, collaborator transfer material
- `inputs/`: upstream raw inputs and cognition drafts, not truth source
- `templates/`: reusable templates only

Flag these as boundary violations:

- target ideas written into `current/`
- contract decisions buried only in plan or handoff docs
- long-term planning written only in `handoff/`
- raw notes treated as implemented fact
- one-off drafts stored in `templates/`

### 3. Check entry-document synchronization

Review whether the change should update these entry documents:

- `README.md`: repo-level entry, startup, structure, external reading order
- `AGENTS.md`: project rules, current structure, document sync obligations, root responsibilities
- `.codex/README.md`: Codex workspace entry and top-level directory responsibilities
- `.codex/MIGRATION.md`: `.agent` to `.codex` source-of-truth mapping and maintenance rules

Use `AGENTS.md` section 5 as the first sync matrix. If a change affects Codex main-directory responsibilities, pack mapping, skill root rules, or structure governance, verify `AGENTS.md`, `.codex/README.md`, and `.codex/MIGRATION.md` together.

### 4. Check export synchronization

Treat `docs/*` as the source and `docs/exports/*` as derived material.

When the referenced source docs changed, verify whether the corresponding pack files and pack README also need sync. Apply these rules:

- update source docs first
- then update packs if the changed source is mirrored or summarized there
- if source and pack disagree, source wins
- do not treat legacy GPT pack directories as an active maintenance path

### 5. Check for stale "current facts"

Look for now-false statements in collaboration docs, especially:

- "current no project private skill"
- old directory ownership claims
- old migration status claims
- outdated upload-pack guidance
- outdated plan/handoff sequencing statements

If a statement describes the current repository state, it must be updated or explicitly marked historical.
Treat `.codex/*` as a compatibility layer in this process, not as the active docs root.

## Output

Return a concise audit report with these sections:

- `Judgment`: pass / needs sync / boundary violation
- `Required Updates`: exact files that must change now
- `Boundary Risks`: misplaced content or mixed truth surfaces
- `Export Sync`: whether `docs/exports/*` needs updates
- `Notes`: optional low-priority cleanup suggestions

Prefer file-path-specific findings over generic writing advice.

## Review Heuristics

- Prefer minimal diff, but do not leave a known false statement behind.
- Prefer updating the closest truth source instead of duplicating the same fact in more files.
- If the change only affects current facts, do not rewrite roadmap prose.
- If the change only affects roadmap intent, do not rewrite `current/` to match an unimplemented idea.
- If unsure whether something is "current" or "plan", ask: can the repository prove it today?

## Typical Triggers

- adding or moving files under `docs/`, `docs/exports/`, or `.agents/skills/`
- changing routes, module boundaries, data sources, or Canonical entry points
- migrating content away from legacy agent directories
- updating handoff docs after a stage transition
- shipping a change that updates docs but may have left pack files stale
