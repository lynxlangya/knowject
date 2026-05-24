# Memory File Contract

Day-1 memory is file-based and repo-local.

```text
knowject/memory/
  README.md
  project-memory.yaml
```

`project-memory.yaml` is the canonical machine-readable artifact. `README.md` explains the folder purpose and safety rules for humans.

## `project-memory.yaml`

Use this shape:

```yaml
version: "0.1"
project:
  name: "<from knowject/context.yaml project.name>"
  captured_at: "YYYY-MM-DD"
  source_summary:
    mode: "default-scan | explicit-files | git-range | conversation-summary"
    refs:
      - path: "docs/current/architecture.md"
        note: "architecture facts"

items:
  - id: "mem-YYYYMMDD-001"
    type: "fact | decision | preference | workflow | risk | lesson"
    title: "Short stable title"
    summary: "One concise paragraph. No secrets."
    source_refs:
      - path: "docs/current/architecture.md"
        line_start: 10
        line_end: 24
        quote: "Short excerpt, optional, never secret-bearing"
    confidence: "high | medium | low"
    status: "active | stale | superseded"
    tags:
      - "architecture"
    related_files:
      - "apps/api/src/server.ts"
    created_at: "YYYY-MM-DD"
    updated_at: "YYYY-MM-DD"
```

## Required fields

Every item requires:

- `id`
- `type`
- `title`
- `summary`
- `source_refs`
- `confidence`
- `status`
- `created_at`
- `updated_at`

Every `source_refs` entry requires `path` and either:

- `line_start` + `line_end`, or
- `note`

`quote` is optional. Keep it short and never include secrets.

## Id and date rules

- New ids use `mem-YYYYMMDD-001`, incrementing within the capture run.
- Existing ids should remain stable.
- Use the current date for new `created_at` and `updated_at`.
- When updating an item, preserve `created_at` and change `updated_at`.

## README template

Use this content when creating `knowject/memory/README.md`:

```markdown
# knowject/memory/

This folder stores source-cited project memory produced by `knowject-memory-capture`.

- `project-memory.yaml` is the canonical machine-readable memory file.
- Every memory item must include source evidence.
- This folder must not contain secrets, tokens, API keys, DB URLs, cookies, auth headers, or environment-specific values.
- Current facts and contracts override roadmap notes, old plans, and handoff summaries.

Review diffs before committing memory updates.
```

Adjust wording to the user's language if they prefer, but keep filenames and safety rules clear.

## Update behavior

When memory exists:

- Read and parse existing YAML before adding new items.
- Add new items under `items`.
- Update existing items only when evidence supports the change.
- Mark older contradictions `stale` or `superseded`; do not silently delete them.
- Show the full diff before writing.

If existing YAML does not parse, stop and ask whether to repair it before adding new memory.

## Validation

Validate generated memory before writing or committing:

```bash
python3 <SKILLS_ROOT>/knowject-memory-capture/scripts/validate-project-memory.py \
  knowject/memory/project-memory.yaml
```

The validator checks the top-level contract, required item fields, enum values,
date shapes, source evidence, line ranges, and secret-looking keys.
