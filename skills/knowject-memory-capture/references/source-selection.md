# Source Selection

Memory quality depends on source quality. Read only enough to capture durable, source-cited context.

## Modes

### `default-scan`

Use when the user asks for project memory without naming sources. Check these paths in order when present:

1. `knowject/context.yaml`
2. `AGENTS.md`
3. `CLAUDE.md`
4. `README.md`
5. `docs/current/**`
6. `docs/contracts/**`
7. `docs/standards/**`
8. `docs/handoff/**`

Do not scan every file in the repo. If this set is too large, read indexes first and ask one narrowing question.

### `explicit-files`

Use when the user provides paths. Resolve repo-relative paths from the repo root. Absolute paths are allowed only when the user provides them exactly.

If a path is outside the repo and was not explicitly provided, refuse and ask for an exact source.

### `git-range`

Use when the user asks about a diff, branch, commit, or range.

Good inputs:

- `git diff --name-only <range>`
- `git diff <range> -- <paths>`
- `git show --stat <commit>`
- Changed source and docs files.

Commit messages and PR titles are useful context but are not strong enough for `confidence: high` unless backed by changed files.

### `conversation-summary`

Use when the user pastes a handoff or conversation summary.

Require durable citations for high-confidence items:

- Repo paths.
- Line ranges.
- Commit ids.
- Issue or PR ids when the linked artifact is accessible.

Without citations, either ask for source evidence or write only `confidence: low` lessons that clearly describe the uncertainty.

## Source precedence

When sources conflict, prefer:

1. Source code and generated contracts that reflect current behavior.
2. `docs/current/**`.
3. `docs/contracts/**`.
4. `knowject/context.yaml`.
5. `AGENTS.md` and standards for collaboration rules.
6. README for public entry points.
7. Handoff docs.
8. Plans and roadmap.
9. Pasted summaries.

Roadmap, plans, and handoff docs cannot override current facts.

## Exclusions

Never read or copy:

- `.env`, `.env.*`, or environment dumps.
- Secrets, tokens, passwords, cookies, auth headers, DB URLs, or base URLs.
- `.git/`, `node_modules/`, build outputs, caches, coverage, logs, shell history, browser history.
- `.codex/` or `.claude/` private local state unless the user explicitly names a specific safe file.

If an allowed source contains a sensitive-looking value, do not copy the value. Capture a sanitized risk or lesson only when useful.

## Evidence format

Prefer line-based citations:

```yaml
source_refs:
  - path: "docs/current/architecture.md"
    line_start: 42
    line_end: 55
```

When line ranges are unavailable:

```yaml
source_refs:
  - path: "Git diff abc123..def456"
    note: "Changed API client generation flow; no stable line range."
```

Quotes are optional and should be short.
