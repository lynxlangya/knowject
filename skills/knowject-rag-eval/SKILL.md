---
name: knowject-rag-eval
description: |
  Use when the user wants to create or review lightweight RAG, retrieval, and
  citation-quality evaluation cases from project knowledge artifacts. Triggers
  on phrases like "/knowject rag eval", "evaluate RAG citations", "生成 RAG
  评测用例", "检查引用是否有来源", "把这些知识库文档做成 eval cases", or "评估事实和
  roadmap 是否混淆". Day-1 output is file-based only under knowject/evals/:
  README.md, rag-eval-cases.yaml, and rag-eval-report.md. Every eval case must
  include source evidence, avoid secrets, and pass a diff-confirm gate before
  writing.
---

# `knowject-rag-eval`

You generate reviewable RAG and citation evaluation artifacts from selected project knowledge sources. The output is a small file-based eval set under `knowject/evals/` that helps teams test retrieval, citation support, unsupported-claim avoidance, and fact-vs-plan conflicts before changing prompts, chunking, or retrieval behavior.

## Hard rules

1. **Refuse without `knowject/context.yaml`**, unless the user only asks for a dry-run explanation of the Skill. Point at `knowject-context-init` and stop.
2. **Every eval case needs source evidence.** Each case must include `expected_source_refs` with repo-relative paths plus line ranges or notes. Do not write source-free questions.
3. **No live scoring in Day 1.** Do not call LLMs, chatbots, Chroma, MongoDB, platform APIs, or external evaluation services.
4. **Never copy secrets or environment values.** Do not read or copy `.env*`, tokens, keys, passwords, cookies, auth headers, DB URLs, base URLs, private credentials, or raw sensitive records.
5. **Current facts override roadmap, plans, and old handoffs.** Eval cases that test conflict resolution must encode this precedence explicitly.
6. **Diff before write; confirm before write.** Show unified diffs for `knowject/evals/README.md`, `rag-eval-cases.yaml`, and `rag-eval-report.md`; write only after explicit user confirmation.
7. **Do not scan outside the current repo** unless the user provides exact paths. Never scan the whole home directory.
8. **Use the user's language** for chat replies and question wording when possible; YAML keys and enum values stay English.
9. **Keep the scope file-based and reviewable.** This Skill generates eval artifacts; it does not prove live RAG quality by itself.

## Flow

### Step 1 - Verify preconditions

Confirm the current directory is the target repo root:

```bash
git rev-parse --show-toplevel
```

Read `knowject/context.yaml`.

- If it is missing and the user wants eval artifacts: refuse, point at `knowject-context-init`, and stop.
- If it is missing and the user asks only how the Skill works: explain the contract and stop before reading sources.
- If it exists: use `project.name` when preparing `rag-eval-cases.yaml`.

### Step 2 - Pick source mode

Choose one mode from the request:

| Mode | Use when |
|---|---|
| `explicit-files` | The user names knowledge docs, memory files, contracts, or directories. |
| `default-scan` | The user asks for RAG evals without naming sources. |
| `memory-assisted` | The user asks to build evals from `knowject/memory/project-memory.yaml`. |
| `git-range` | The user asks to make evals from a branch, commit, diff, or PR. |

If the source set is too broad, ask one narrowing question. Prefer fewer high-signal evals over broad, shallow coverage.

### Step 3 - Select sources

Apply [`references/source-selection.md`](./references/source-selection.md).

Stable source priority:

1. `knowject/context.yaml`
2. `docs/current/**`
3. `docs/contracts/**`
4. `docs/standards/**`
5. `knowject/memory/project-memory.yaml`
6. User-provided knowledge files
7. `docs/handoff/**` and roadmap docs only when testing stale-source or fact-vs-plan behavior

Avoid `.env*`, logs, generated build output, `.git/`, `node_modules/`, shell history, browser history, private chat logs, and any path likely to contain secrets.

### Step 4 - Draft eval cases

Use [`references/eval-taxonomy.md`](./references/eval-taxonomy.md) and create cases with these Day-1 eval types:

- `source_recall`
- `citation_support`
- `unsupported_claim`
- `fact_vs_plan`
- `conflict_resolution`

For each case:

- Ask one focused question that a RAG answer should handle.
- Attach the expected source refs before writing expected answer points.
- List the answer points the cited sources support.
- List forbidden claims that a model must not invent.
- Set `difficulty` to `easy`, `medium`, or `hard`.
- Add compact tags such as `architecture`, `contract`, `memory`, `citation`, or `roadmap`.

### Step 5 - Prepare the report

Create `rag-eval-report.md` with:

- coverage by source
- source quality risks
- citation risk
- chunking / retrieval recommendations
- unsupported-claim watchlist

The report is a review artifact, not a numeric benchmark. Do not claim the project has passed live RAG evaluation unless the user later runs these cases against a system.

### Step 6 - Prepare files

Apply [`references/eval-file-contract.md`](./references/eval-file-contract.md).

Write or update exactly these Day-1 files:

```text
knowject/evals/
  README.md
  rag-eval-cases.yaml
  rag-eval-report.md
```

Use ids like:

```text
rag-YYYYMMDD-001
```

Keep existing ids stable when updating an existing eval set.

### Step 7 - Validate, diff, and confirm

Before writing:

1. Validate proposed cases:

   ```bash
   python3 <SKILLS_ROOT>/knowject-rag-eval/scripts/validate-rag-eval-cases.py \
     <proposed-rag-eval-cases.yaml>
   ```

2. Show unified diffs for all proposed file creates or updates.
3. Ask: "Apply these RAG eval changes? (yes / cancel)".
4. On `yes`, write the files.
5. On `cancel`, stop without writing anything.

If validation fails, show the errors and fix the proposal before asking for confirmation.

### Step 8 - Summarize

After writing, report:

- Cases added or updated.
- Sources covered.
- Sources skipped, with reason.
- Any sensitive source intentionally not copied.
- Suggested next step, such as running the cases manually against project chat or adding them to review docs.

## Failure modes

- **`knowject/context.yaml` missing:** refuse and tell the user to run `knowject-context-init` first.
- **No durable sources found:** explain checked paths and ask for explicit knowledge files.
- **Source set is too broad:** ask one narrowing question instead of scanning everything.
- **Source appears secret-bearing:** skip secret values and warn the user.
- **Case has no evidence:** skip it or ask for a source. Do not write it.
- **Current and old sources conflict:** make a `fact_vs_plan` or `conflict_resolution` case, with current docs/contracts as the expected source.
- **Existing eval YAML is invalid:** stop, show validation errors, and ask whether to repair it before adding cases.
- **User does not confirm the diff:** stop without writing.

## What this Skill does NOT do

- Does not run live model calls or automated chatbot scoring.
- Does not query Chroma, MongoDB, vector stores, APIs, or platform runtime.
- Does not add platform UI, backend routes, CI requiring network, or external eval dependencies such as RAGAS.
- Does not claim production RAG quality, production scoring, or complete evaluation coverage.
- Does not copy secrets or environment-specific values into eval files.

## See also

- Eval taxonomy: [`references/eval-taxonomy.md`](./references/eval-taxonomy.md)
- File contract: [`references/eval-file-contract.md`](./references/eval-file-contract.md)
- Source selection: [`references/source-selection.md`](./references/source-selection.md)
- Case validator: [`scripts/validate-rag-eval-cases.py`](./scripts/validate-rag-eval-cases.py)
- Examples: [`references/examples/`](./references/examples/)
- Memory capture: [`../knowject-memory-capture/SKILL.md`](../knowject-memory-capture/SKILL.md)
- Schema reference: [`../_shared/context-yaml-schema.md`](../_shared/context-yaml-schema.md)
