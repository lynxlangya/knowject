# Memory Taxonomy

Use this taxonomy to decide whether a candidate belongs in `project-memory.yaml`.

## Types

| Type | Meaning | Strong evidence |
|---|---|---|
| `fact` | Current project reality: architecture, module ownership, data flow, path, supported command, deployed behavior. | `docs/current/**`, source code, contracts, `knowject/context.yaml`, README when current. |
| `decision` | Explicit product, architecture, or governance choice with rationale. | ADR, issue, PR, plan decision log, AGENTS rule, standards doc. |
| `preference` | Maintainer or team working preference that should shape future agent behavior. | AGENTS rule, contributing guide, repeated review comments, explicit user instruction captured with citation. |
| `workflow` | Repeatable procedure, validation path, release step, or safe operating sequence. | README command, scripts, standards doc, handoff guide. |
| `risk` | Known limitation, sharp edge, security concern, drift hazard, or unsupported scenario. | Security note, failure mode, issue, incident note, old handoff warning verified against current facts. |
| `lesson` | Retrospective learning from debugging, delivery, or review that should prevent repeat work. | Postmortem, PR review, handoff note, commit diff plus observed outcome. |

## Include / Skip

Include memory when it is:

- Stable enough to help a future agent session.
- Project-specific rather than generic engineering advice.
- Small enough to review.
- Cited to durable source evidence.

Skip memory when it is:

- A temporary chat thought without evidence.
- A roadmap wish presented as a current fact.
- A secret, environment value, credential, token, cookie, DB URL, auth header, or base URL.
- Generic methodology that applies to any project.
- Duplicated by an existing active item with the same source.

## Confidence

Use `confidence: high` when the item is directly supported by current facts, contracts, source code, or explicit project rules.

Use `confidence: medium` when the item is supported by handoff docs, standards, issues, PR notes, or git diffs but not yet verified against current source.

Use `confidence: low` only for useful, clearly marked memory from indirect evidence. Low-confidence items still need `source_refs`.

Pasted summaries without project citations cannot be `high`.

## Status

| Status | Use when |
|---|---|
| `active` | The item is current and reusable. |
| `stale` | The item may be outdated, but no replacement is confirmed. |
| `superseded` | A newer item replaces it. Mention the newer id in the summary when practical. |

Do not delete old memory only because it conflicts. Mark staleness in the diff so a human can review the change.
