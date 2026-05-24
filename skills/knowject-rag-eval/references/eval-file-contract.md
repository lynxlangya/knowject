# RAG Eval File Contract

Day-1 RAG eval output is file-based and repo-local.

```text
knowject/evals/
  README.md
  rag-eval-cases.yaml
  rag-eval-report.md
```

`rag-eval-cases.yaml` is the canonical machine-readable artifact. `rag-eval-report.md` is a human review report.

## `rag-eval-cases.yaml`

Use this shape:

```yaml
version: "0.1"
project:
  name: "<from knowject/context.yaml project.name>"
  generated_at: "YYYY-MM-DD"
  source_summary:
    mode: "default-scan | explicit-files | memory-assisted | git-range"
    refs:
      - path: "docs/current/architecture.md"
        note: "current architecture facts"

cases:
  - id: "rag-YYYYMMDD-001"
    eval_type: "source_recall | citation_support | unsupported_claim | fact_vs_plan | conflict_resolution"
    difficulty: "easy | medium | hard"
    question: "What should the answer prove?"
    expected_source_refs:
      - path: "docs/current/architecture.md"
        line_start: 10
        line_end: 24
    expected_answer_points:
      - "Supported point that should appear in the answer."
    forbidden_claims:
      - "Unsupported detail that must not appear."
    tags:
      - "architecture"
      - "citation"
```

## Required Fields

Every case requires:

- `id`
- `eval_type`
- `difficulty`
- `question`
- `expected_source_refs`
- `expected_answer_points`
- `forbidden_claims`
- `tags`

Every `expected_source_refs` entry requires `path` and either:

- `line_start` + `line_end`, or
- `note`

## README Template

Use this content when creating `knowject/evals/README.md`:

```markdown
# knowject/evals/

This folder stores source-cited RAG and citation evaluation artifacts produced by `knowject-rag-eval`.

- `rag-eval-cases.yaml` is the canonical machine-readable eval case file.
- `rag-eval-report.md` summarizes source coverage, citation risks, chunking/retrieval recommendations, and unsupported-claim watchlists.
- Every eval case must include source evidence.
- This folder must not contain secrets, tokens, API keys, DB URLs, cookies, auth headers, or environment-specific values.

Review diffs before committing eval updates.
```

## Report Template

`rag-eval-report.md` should include:

- source coverage
- source quality risks
- citation risks
- chunking / retrieval recommendations
- unsupported-claim watchlist

Keep the report factual. Do not claim live RAG scoring or model performance.

## Validation

Validate generated cases before writing or committing:

```bash
python3 <SKILLS_ROOT>/knowject-rag-eval/scripts/validate-rag-eval-cases.py \
  knowject/evals/rag-eval-cases.yaml
```
