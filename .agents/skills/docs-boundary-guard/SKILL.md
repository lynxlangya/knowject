---
name: docs-boundary-guard
description: Use when changes touch `docs/*`, `docs/exports/*`, `.agents/skills/*`, `AGENTS.md`, `README.md`, Docker or command entry docs, or root-governance/compatibility docs and you need to audit truth-surface boundaries, entry-doc sync, or export drift.
---

# Docs Boundary Guard

Audit Knowject's document system as a source-of-truth problem, not a writing problem. Use this skill to decide which document owns a fact, which entry docs must move with it, and whether derived exports or compatibility notes have drifted from live roots.

## Audit Inputs

Start from the concrete change, then gather only the documents needed to judge it:

- `AGENTS.md`
- `README.md`
- `docs/README.md`
- `docs/standards/document-sync-governance.md`
- `docs/exports/README.md`
- `docs/exports/chatgpt-projects/README.md`
- `docs/current/docker-usage.md` when Docker, compose, or runtime topology docs changed
- `docker/README.md` when command entrypoints or deployment/operator guidance changed
- `.agents/skills/README.md` when skill-root governance or skill packaging changed
- affected files under `docs/*`
- affected files under `docs/exports/*`
- affected files under `.agents/skills/*`
- compatibility notes under `.codex/*` only if those files exist and are still meant to mirror live roots

If the change is route, API, data-source, or module-boundary related, read `docs/current/architecture.md` before judging sync completeness.
If the change affects implemented contracts or frozen decisions, read the relevant files under `docs/contracts/*`.
If the change affects governance rules, review the relevant files under `docs/standards/*`.

## Workflow

### 1. Classify the change

Decide which class the change belongs to:

- current fact change
- contract or decision change
- standards/governance change
- target/roadmap change
- execution plan or DoD change
- handoff/onboarding change
- design asset change
- export or compatibility-layer sync change

Do not start by editing prose. Start by deciding which truth surface changed.

### 2. Check `docs/*` directory boundaries

Use these boundaries strictly:

- `current/`: only implemented facts that source code or runtime baseline can prove
- `contracts/`: implemented contract facts and bound decisions
- `standards/`: long-lived engineering governance and collaboration rules
- `plans/`: execution plans, task breakdowns, DoD, stage records
- `handoff/`: onboarding order, next-step context, collaborator transfer material
- `roadmap/`: target state, gap analysis, future direction
- `inputs/`: upstream raw inputs and cognition drafts, not truth source
- `design/`: brand and visual design assets, not runtime/current facts
- `templates/`: reusable templates only
- `superpowers/`: workflow/process assets, not a project truth surface
- `exports/`: derived artifacts only, never the source of truth

Flag these as boundary violations:

- target ideas written into `current/`
- contract decisions buried only in plan or handoff docs
- standards or governance rules buried only in ad-hoc notes
- long-term planning written only in `handoff/`
- design rationale treated as current runtime fact
- process assets treated as project truth surface
- raw notes treated as implemented fact
- one-off drafts stored in `templates/`

### 3. Check entry-document synchronization

Review whether the change should update these entry documents:

- `README.md`: repo-level entry, startup, structure, external reading order
- `AGENTS.md`: project rules, current structure, document sync obligations, root responsibilities
- `docs/README.md`: documentation-root entry and truth-surface map
- `docs/exports/README.md`: export-layer scope and sync rules
- `docs/exports/chatgpt-projects/README.md`: current export package composition and usage
- `docs/current/docker-usage.md`: current Docker topology, runtime constraints, and container-side operator facts
- `docker/README.md`: compose/deploy command entry and operator guidance
- `.agents/skills/README.md`: project skill live-root and packaging rules
- compatibility notes under `.codex/*` only if they actually exist

Use `AGENTS.md` section 5 and `docs/standards/document-sync-governance.md` as the first sync matrix. If a change affects root governance, docs boundary ownership, export mapping, or skill live-root rules, verify `AGENTS.md`, `docs/README.md`, `docs/exports/README.md`, and `.agents/skills/README.md` together. Pull `.codex/*` into the check only when those compatibility files are present.
If a change affects Docker, compose, ports, secrets, or command entry flow, verify `README.md`, `docs/current/docker-usage.md`, `docs/current/architecture.md`, `docker/README.md`, and the relevant runtime README together.

### 4. Check export synchronization

Treat `docs/*` as the source of truth.
Treat `docs/exports/*` as the live derived export layer.
Treat `docs/exports/chatgpt-projects/*` as the current export package path.
Treat `.codex/*` as an optional compatibility layer only when those files exist.

When referenced source docs changed, verify whether `docs/exports/*` needs sync. Apply these rules:

- update source docs first
- then update `docs/exports/*` if the changed source is mirrored or summarized there
- if source and derived exports disagree, source wins
- verify `docs/exports/chatgpt-projects/README.md` still matches the current package contents and upload guidance
- if compatibility shell files exist, verify they still point to live roots; if they do not exist, do not invent them

### 5. Check for stale "current facts"

Look for now-false statements in collaboration docs, especially:

- old directory ownership claims
- old claims that `.codex/` is the live docs or skill root
- old export package paths or pack terminology
- old skill-root ownership claims
- old migration status claims
- outdated upload-pack guidance
- entry links that still point at compatibility files which no longer exist
- outdated plan/handoff sequencing statements

If a statement describes the current repository state, it must be updated or explicitly marked historical.
Treat `.codex/*` as a compatibility layer in this process, not as the active docs root.
Also flag compatibility shell drift when existing `.codex/*` stubs still describe pre-migration live paths.

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
- Flag broken entry links even when the surrounding prose is otherwise correct.
- If the change only affects current facts, do not rewrite roadmap prose.
- If the change only affects roadmap intent, do not rewrite `current/` to match an unimplemented idea.
- If unsure whether something is "current" or "plan", ask: can the repository prove it today?

## Typical Triggers

- adding or moving files under `docs/`, `docs/exports/`, or `.agents/skills/`
- changing truth-surface boundaries or governance in `docs/standards/*`
- changing routes, module boundaries, data sources, or Canonical entry points
- changing export package composition or active export paths
- migrating content away from legacy compatibility roots
- updating handoff docs after a stage transition
- shipping a change that updates docs but may have left exports or compatibility notes stale
