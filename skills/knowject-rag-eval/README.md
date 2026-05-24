# knowject-rag-eval

## What It Does

`knowject-rag-eval` creates lightweight, source-cited RAG and citation evaluation artifacts from project knowledge sources. It helps teams review whether retrieval should find the right documents, whether answers should cite evidence, and where unsupported claims or stale roadmap facts may appear.

Day 1 is file-based: the Skill writes reviewable eval files under `knowject/evals/` and does not run a live chatbot or scoring engine.

## When To Use

- You want a small eval set before changing prompts, chunking, retrieval, or citation behavior.
- You want to test source recall, citation support, unsupported-claim avoidance, or fact-vs-plan conflicts.
- You want to turn current docs, contracts, standards, or project memory into reusable RAG review cases.
- You need a safe review artifact without adding a database, vector store, or external eval dependency.

## Inputs

- `knowject/context.yaml`.
- Stable knowledge sources such as `docs/current/**`, `docs/contracts/**`, and `docs/standards/**`.
- Optional `knowject/memory/project-memory.yaml`.
- User-provided knowledge files or requested git ranges.

## Outputs

- `knowject/evals/README.md`.
- `knowject/evals/rag-eval-cases.yaml`.
- `knowject/evals/rag-eval-report.md`.
- Unified diffs and confirmation prompts before writing.

## Example

User asks:

```text
/knowject rag eval from docs/current/architecture.md docs/contracts/chat-contract.md
```

Expected result:

```text
The Skill creates source-cited eval cases for retrieval, citation support, unsupported claims, and fact-vs-plan risks, validates rag-eval-cases.yaml, shows diffs, and writes knowject/evals/ only after confirmation.
```

## Safety Rules

- Refuse without `knowject/context.yaml`, except for dry-run explanation.
- Require source evidence for every eval case.
- Never copy secrets, tokens, DB URLs, auth headers, cookies, base URLs, or environment values.
- Prefer current docs and contracts over roadmap or old handoff notes.
- Use diff-confirm before writing.
- Day 1 does not call models, query Chroma/MongoDB, add UI/API code, or run external scoring.

## Related Files

- [`SKILL.md`](./SKILL.md)
- [`agents/openai.yaml`](./agents/openai.yaml)
- [`references/eval-taxonomy.md`](./references/eval-taxonomy.md)
- [`references/eval-file-contract.md`](./references/eval-file-contract.md)
- [`references/source-selection.md`](./references/source-selection.md)
- [`scripts/validate-rag-eval-cases.py`](./scripts/validate-rag-eval-cases.py)
- [`references/examples/`](./references/examples/)
