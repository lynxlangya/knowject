# knowject-memory-capture

## What It Does

`knowject-memory-capture` captures durable, source-cited project memory from repo artifacts, handoff notes, diffs, PR notes, or conversation summaries. It writes a small file-based memory layer under `knowject/memory/` so future Claude Code and Codex runs can reuse stable context without guessing.

It classifies memory as `fact`, `decision`, `preference`, `workflow`, `risk`, or `lesson`.

## When To Use

- You want to preserve project facts or decisions after a handoff.
- You want to capture lessons from a PR, diff, bug fix, or delivery review.
- You want future agent runs to reuse stable, cited project context.
- You need a repo-local memory file without adding a database or runtime service.

## Inputs

- `knowject/context.yaml`.
- Explicit files or directories supplied by the user.
- Default stable artifacts such as `AGENTS.md`, `README.md`, `docs/current/**`, `docs/contracts/**`, `docs/standards/**`, and `docs/handoff/**`.
- Requested git ranges or diffs.
- Pasted summaries that include durable source citations.

## Outputs

- `knowject/memory/README.md`.
- `knowject/memory/project-memory.yaml`.
- A summary of items added, updated, skipped, and any sensitive source intentionally not copied.
- Unified diffs and confirmation prompts before writing memory files.

## Example

User asks:

```text
/knowject memory update from docs/current/architecture.md docs/standards/document-sync-governance.md
```

Expected result:

```text
The Skill extracts source-cited facts, workflows, risks, or decisions, proposes updates to knowject/memory/project-memory.yaml, shows the diff, and writes only after confirmation.
```

## Safety Rules

- Refuse without `knowject/context.yaml`, except for dry-run explanation.
- Require source evidence for every memory item.
- Never copy secrets, tokens, passwords, cookies, auth headers, DB URLs, base URLs, or environment values.
- Current facts and contracts override roadmap, old plans, and handoff docs.
- Do not scan outside the current repo unless the user provides exact paths.
- Do not treat pasted chat summaries as high-confidence facts unless they cite project files or commits.
- Day-1 is file-based only: no API, DB, vector store, UI, watcher, daemon, or runtime service.

## Related Files

- [`SKILL.md`](./SKILL.md)
- [`agents/openai.yaml`](./agents/openai.yaml)
- [`references/memory-taxonomy.md`](./references/memory-taxonomy.md)
- [`references/memory-file-contract.md`](./references/memory-file-contract.md)
- [`references/source-selection.md`](./references/source-selection.md)
- [`references/examples/`](./references/examples/)
