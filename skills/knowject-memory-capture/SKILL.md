---
name: knowject-memory-capture
description: |
  Use when the user wants to capture durable, source-cited project memory from
  repo artifacts, handoff notes, diffs, PR notes, or conversation summaries.
  Triggers on phrases like "/knowject memory", "沉淀一下这个项目的记忆",
  "把这次交接总结成 knowject memory", "capture project memory", "update
  knowject memory from these docs", or "把这次 PR / diff / 对话沉淀成项目记忆".
  Day-1 output is file-based only: knowject/memory/README.md and
  knowject/memory/project-memory.yaml. Every memory item must include source
  evidence, avoid secrets, and pass a diff-confirm gate before writing.
---

# `knowject-memory-capture`

You capture, classify, verify, and refresh durable project memory from selected project artifacts. The output is a small, reviewable, source-cited memory layer under `knowject/memory/` that future Claude Code and Codex runs can consume without guessing.

## Hard rules

1. **Refuse without `knowject/context.yaml`**, unless the user only asks for a dry-run explanation of the Skill. Point at `knowject-context-init` and stop.
2. **Every memory item needs source evidence.** Each item must include `source_refs` with a repo-relative path plus line range or a note. Do not write uncited facts.
3. **Never copy secrets or environment values.** Do not read or copy `.env*`, tokens, keys, passwords, cookies, auth headers, DB URLs, base URLs, or private credentials. If a source appears sensitive, extract only the non-sensitive lesson and warn the user.
4. **Current facts override roadmap, old plans, and handoff docs.** Treat `docs/current/**`, source code, contracts, and `knowject/context.yaml` as stronger evidence than roadmap wishes, old plans, or historical handoffs.
5. **Diff before write; confirm before write.** Show a unified diff for `knowject/memory/README.md` and `knowject/memory/project-memory.yaml`; write only after explicit user confirmation.
6. **Do not scan outside the current repo** unless the user provides exact paths. Never scan the whole home directory.
7. **Do not treat pasted chat summaries as high-confidence facts** unless they cite project files, commits, or other durable artifacts.
8. **Use the user's language** for chat replies; memory file keys and enum values stay English.
9. **Day-1 is file-based only.** Do not add or call platform APIs, MongoDB, Chroma, vector stores, UI, daemons, watchers, or runtime services.

## Flow

### Step 1 - Verify preconditions

Confirm the current directory is the target repo root:

```bash
git rev-parse --show-toplevel
```

Read `knowject/context.yaml`.

- If it is missing and the user wants capture: refuse, point at `knowject-context-init`, stop.
- If it is missing and the user asks for a dry-run explanation only: explain the output contract and stop before reading sources.
- If it exists: use `project.name` as the memory project name when present.

Do not read `skills/_shared/context-yaml-schema.md` unless you need schema field details.

### Step 2 - Pick capture mode

Choose one mode from the user intent:

| Mode | Use when |
|---|---|
| `explicit-files` | The user provides one or more files or directories. |
| `default-scan` | The user asks for project memory without naming sources. |
| `git-range` | The user asks to capture memory from a diff, branch, commit, or range. |
| `conversation-summary` | The user pastes a handoff, PR note, or conversation summary. |

If the source set is too broad, ask one narrowing question. Do not keep expanding the scan.

### Step 3 - Select sources

Apply [`references/source-selection.md`](./references/source-selection.md).

For `default-scan`, read stable project artifacts in this priority order when present:

1. `knowject/context.yaml`
2. `AGENTS.md`, `CLAUDE.md`
3. `README.md`
4. `docs/current/**`
5. `docs/contracts/**`
6. `docs/standards/**`
7. `docs/handoff/**`

For `explicit-files`, read only the user-specified sources after checking they are inside the repo or are exact paths provided by the user.

For `git-range`, inspect only the requested range or diff. Prefer source files and docs over commit-message prose. Do not infer durable facts from a commit message alone.

For `conversation-summary`, require citations to project files, commits, or line references before assigning `confidence: high`.

### Step 4 - Extract candidate memory

Classify every candidate using [`references/memory-taxonomy.md`](./references/memory-taxonomy.md):

- `fact`
- `decision`
- `preference`
- `workflow`
- `risk`
- `lesson`

For each candidate:

- Keep only project-stable information that future agent runs can reuse.
- Attach `source_refs` immediately. If you cannot cite it, skip it or ask for evidence.
- Set `confidence` to `high`, `medium`, or `low` based on source strength.
- Set `status: active` for current memory, unless replacing older items.
- Add compact `tags` and `related_files` only when they help retrieval.
- Avoid copying long quotes; prefer path + line range. If you include `quote`, keep it short and non-sensitive.

### Step 5 - Review conflicts and staleness

If `knowject/memory/project-memory.yaml` already exists, read it before preparing output.

- Identify duplicates by `type`, `title`, and overlapping `source_refs`.
- Merge duplicate summaries only when the sources agree.
- When newer current facts contradict older memory, mark the older item `stale` or `superseded`; do not delete it silently.
- Do not let roadmap, plan, or handoff text override verified current facts.
- Surface unresolved contradictions to the user before writing.

### Step 6 - Prepare files

Apply the file contract in [`references/memory-file-contract.md`](./references/memory-file-contract.md).

Write or update exactly these Day-1 files:

```text
knowject/memory/
  README.md
  project-memory.yaml
```

Use this id shape for new items:

```text
mem-YYYYMMDD-001
```

Perfect id stability is not required in Day 1, but avoid changing existing ids without a reason.

### Step 7 - Diff and confirm

Before writing:

1. Prepare the proposed `README.md` and `project-memory.yaml` content in memory or temp files.
2. Show unified diffs for every create or update.
3. Ask: "Apply these memory changes? (yes / cancel)".
4. On `yes`, write the files.
5. On `cancel`, stop without writing anything.

Before writing `project-memory.yaml`, validate the proposed YAML with:

```bash
python3 <SKILLS_ROOT>/knowject-memory-capture/scripts/validate-project-memory.py \
  <proposed-project-memory.yaml>
```

If validation fails, show the validation errors and fix the proposal before asking for confirmation.

### Step 8 - Summarize

After writing, report:

- Items added.
- Items updated.
- Items skipped, with reason.
- Any suspected sensitive source intentionally not copied.
- Suggested next use, such as asking another `knowject-*` Skill to read `knowject/memory/project-memory.yaml` before acting.

## Failure modes

- **`knowject/context.yaml` missing:** refuse and tell the user to run `knowject-context-init` first.
- **No durable sources found:** explain which paths were checked and ask for explicit files or a handoff summary.
- **Source is too broad:** ask one narrowing question instead of scanning the whole repo or home directory.
- **Source appears secret-bearing:** skip secret values, warn the user, and capture only a non-sensitive risk or lesson if useful.
- **Candidate has no evidence:** skip it or ask the user for a source. Do not write it.
- **Evidence conflicts:** prefer current facts and contracts; mark lower-priority memory stale only after showing the diff.
- **Existing memory YAML is invalid:** stop, show the parser error, and ask whether to repair it before adding new items.
- **User does not confirm the diff:** stop without writing.

## What this Skill does NOT do

- Does not create a MongoDB, Chroma, vector-store, or database-backed memory service.
- Does not change server APIs or `apps/platform` UI.
- Does not run a background watcher, daemon, scheduled job, or automatic ingestion service.
- Does not scan `.codex`, `.claude`, shell history, browser history, private chat logs, `.git/`, `node_modules/`, build outputs, or `.env*`.
- Does not automatically commit memory files.
- Does not capture generic brainstorming unless it is tied to project evidence.
- Does not implement full semantic deduplication. Day-1 dedupe is reviewable, source-based, and conservative.

## See also

- Taxonomy: [`references/memory-taxonomy.md`](./references/memory-taxonomy.md)
- File contract: [`references/memory-file-contract.md`](./references/memory-file-contract.md)
- Source selection: [`references/source-selection.md`](./references/source-selection.md)
- Memory validator: [`scripts/validate-project-memory.py`](./scripts/validate-project-memory.py)
- Examples: [`references/examples/`](./references/examples/)
- Context setup: [`../knowject-context-init/SKILL.md`](../knowject-context-init/SKILL.md)
- Schema reference: [`../_shared/context-yaml-schema.md`](../_shared/context-yaml-schema.md)
