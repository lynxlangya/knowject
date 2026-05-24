# Example Input Summary

Mode: `conversation-summary`

The user asks:

```text
把这次交接总结成 knowject memory。可引用的来源如下：
- AGENTS.md lines 28-45: default work style is minimal, source-verified changes with validation.
- docs/current/architecture.md lines 12-30: current app is a monorepo with platform and API packages.
- docs/standards/document-sync-governance.md lines 18-36: route, data-flow, Docker, contract, and docs export changes require sync checks.
- docs/handoff/release-note.md lines 8-16: last release left a warning that roadmap notes may lag current implementation.
```

Expected capture behavior:

- Create a `preference` item for minimal, source-verified changes.
- Create a `fact` item for the current package layout only if the cited architecture lines support it.
- Create a `workflow` item for documentation sync checks.
- Create a `risk` item that roadmap or handoff notes may lag current implementation.
- Do not assign `confidence: high` to any uncited sentence from the pasted summary.
