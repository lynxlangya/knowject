# RAG Eval Source Selection

Use the smallest source set that can produce useful, citeable eval cases.

## Preferred Sources

Read these first when present and relevant:

1. `knowject/context.yaml`
2. `docs/current/**`
3. `docs/contracts/**`
4. `docs/standards/**`
5. `knowject/memory/project-memory.yaml`
6. user-provided knowledge files

Use `docs/handoff/**`, `docs/roadmap/**`, or plans only when the eval case is intentionally testing stale-source handling, `fact_vs_plan`, or `conflict_resolution`.

## Avoid

Do not read or copy:

- `.env*`
- credentials, tokens, cookies, auth headers, DB URLs, base URLs, or private keys
- `.git/`
- `node_modules/`
- build outputs
- logs that may contain sensitive values
- shell history, browser history, or private chat logs
- whole home directories or broad parent directories

## Evidence Rules

- Prefer repo-relative paths and line ranges.
- If a line range is not practical, include a short `note`.
- Do not create a case if the expected answer cannot be tied to source evidence.
- For conflict cases, cite both sides when possible and state which source should win.
