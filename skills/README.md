# Knowject Skills

Cross-role collaboration Skills for Claude Code and Codex. Project-anchored. Opinionated.

> Status: Tier 1 complete. Shipped: `knowject-context-init`, `knowject-read-api`, `knowject-prd-to-mock`, `knowject-read-design`. Next: Tier 2 roadmap.

---

## What this gives you

Three audiences, three core scenarios:

| Audience | Scenario | Skill |
|---|---|---|
| Product / PM | Turn a written requirement into a high-fidelity HTML mock | `knowject-prd-to-mock` |
| Frontend + Backend | Discover API endpoints during integration; generate a typed client | `knowject-read-api` |
| Design -> Frontend | Turn a UI mock into component code | `knowject-read-design` |
| Everyone | Anchor the Skills to your project (stack, brand, paths) | `knowject-context-init` |

Each Skill reads `knowject/context.yaml` in your project to ground its output in your brand, your tech stack, and your conventions instead of producing generic AI output.

This is not a new agent CLI. It is a pack of Skills that Claude Code and Codex consume directly, similar to the `longbridge` or `superpowers` skill packs.

---

## Install

### Requirements

- Claude Code or Codex (or both)
- macOS / Linux (Windows: use WSL)
- `bash`, `python3` (3.8 or newer), `git`
- Python `PyYAML`, required by the schema validator and `verify.sh`

Install PyYAML with:

```bash
pip install pyyaml
```

`install.sh` itself does not require PyYAML, but `verify.sh` and `schema.py` do.

### One-line install

```bash
git clone https://github.com/langya/knowject.git
cd knowject
bash skills/scripts/install.sh
```

`install.sh` symlinks every `knowject-*` Skill into `~/.claude/skills/` and `~/.codex/skills/`. Re-run anytime to refresh.

### Fallback: copy instead of symlink

If symlinks are not viable in your setup:

```bash
cp -r skills/knowject-* ~/.claude/skills/
cp -r skills/knowject-* ~/.codex/skills/
```

You will need to re-copy on every update.

---

## Use

In any project, ask your agent:

```text
/knowject init
```

or:

```text
帮我在这个项目里启用 knowject
```

The `knowject-context-init` Skill scans your project, asks only what it cannot detect, and writes `knowject/context.yaml` plus `knowject/README.md`. Once `context.yaml` exists, future Skills consume it automatically when triggered.

---

## What goes in your project

After init, your project has one new folder:

```text
your-project/
  knowject/
    context.yaml          # your project context (commit this)
    README.md             # what this folder is
```

Never put secrets, base URLs, API keys, or per-environment config in `context.yaml`. Those belong in `.env`. The schema rejects them.

Full schema reference: [`_shared/context-yaml-schema.md`](./_shared/context-yaml-schema.md).

---

## Contribute

We accept new Skills that meet the inclusion filter in [`_shared/contributing-skills.md`](./_shared/contributing-skills.md):

1. Reads project-specific resources via `context.yaml`, or
2. Translates between roles (UI <-> code, PRD <-> mock, API <-> client), or
3. Encodes a strong opinion that generic Skills cannot match.

We do not accept:

- Generic methodology Skills (brainstorming, debugging, code-review, TDD, system-design).
- Agent workflow Skills (writing-plans, executing-plans).
- Document-format operations (docx, pdf, xlsx, pptx).
- Pure template generators that do not read project context.

See [`_shared/contributing-skills.md`](./_shared/contributing-skills.md) for the full PR checklist.

---

## License

See [LICENSE](./LICENSE). Source-available: personal evaluation and non-commercial use permitted; commercial use requires written permission.

---

## Status & Roadmap

- [x] Phase 1: `skills/` scaffold, schema, `knowject-context-init`, install/verify scripts
- [x] Phase 2: `knowject-read-api`, `knowject-prd-to-mock`, `knowject-read-design`
- [ ] Phase 3: `api-to-types` (see [`ROADMAP.md`](./ROADMAP.md) for the Active / Deferred catalog and the 2026-05-17 Tier 2 narrowing decision)
- [ ] Phase 4: Claude Code plugin manifest, official marketplace listing
