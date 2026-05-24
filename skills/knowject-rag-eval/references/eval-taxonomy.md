# RAG Eval Taxonomy

Day-1 eval cases are designed for human review and later manual execution against a RAG or project-chat system. They are not live automated scoring.

## Eval Types

| Type | Purpose | Good case shape |
|---|---|---|
| `source_recall` | Check that retrieval should find the expected docs or chunks. | Question points to a specific documented fact and lists the expected source refs. |
| `citation_support` | Check that answer claims are supported by cited sources. | Expected answer points map directly to source refs. |
| `unsupported_claim` | Check that the model avoids details missing from sources. | Forbidden claims list common guesses or tempting but unsupported details. |
| `fact_vs_plan` | Check that current facts are not confused with roadmap or old handoff notes. | Current source refs and stale/plan refs are both named when useful. |
| `conflict_resolution` | Check that stronger sources override weaker or older sources. | Expected answer points state the precedence rule. |

## Difficulty

Use:

- `easy` when one current source answers the question directly.
- `medium` when the answer needs two sources or careful citation boundaries.
- `hard` when the case involves conflicting docs, old plans, or unsupported-claim traps.

## Case Quality Rules

- One case should test one behavior.
- Prefer concrete questions over broad prompts.
- Keep expected answer points short and citeable.
- Put hallucination traps in `forbidden_claims`, not in the expected answer.
- Do not create cases from secrets, environment config, logs, or private credentials.
