# Knowject Skills

Cross-role collaboration Skills for Claude Code and Codex. Project-anchored. Opinionated.

> Status: Phase 4 Day-1 complete. Shipped: `knowject-context-init`, `knowject-read-api`, `knowject-prd-to-mock`, `knowject-read-design`, `knowject-api-to-types`, `knowject-memory-capture`. Next: Claude Code plugin marketplace.

---

## What this gives you

Skill catalog:

| Skill | What it does | Docs |
|---|---|---|
| `knowject-context-init` | Initialize project context (`knowject/context.yaml`) for all Knowject Skills. | [`README`](./knowject-context-init/README.md) |
| `knowject-prd-to-mock` | Turn written requirements into a branded single-page HTML mock. | [`README`](./knowject-prd-to-mock/README.md) |
| `knowject-read-api` | Discover API endpoints and generate typed client stubs. | [`README`](./knowject-read-api/README.md) |
| `knowject-api-to-types` | Generate TypeScript response types from OpenAPI and wire them into generated clients. | [`README`](./knowject-api-to-types/README.md) |
| `knowject-read-design` | Turn UI design sources into component decomposition plans and skeleton code. | [`README`](./knowject-read-design/README.md) |
| `knowject-memory-capture` | Capture source-cited durable project memory from artifacts, handoffs, diffs, and decisions. | [`README`](./knowject-memory-capture/README.md) |

Each Skill reads `knowject/context.yaml` in your project to ground its output in your brand, your tech stack, and your conventions instead of producing generic AI output.

`knowject-memory-capture` turns project artifacts, handoff notes, diffs, and decisions into source-cited durable memory under `knowject/memory/`, so Claude Code and Codex can reuse stable context across sessions without guessing.

This is not a new agent CLI. It is a pack of Skills that Claude Code and Codex consume directly, similar to the `longbridge` or `superpowers` skill packs.

---

## Install

### Recommended: ask your AI agent

Copy this prompt into Claude Code or Codex:

```text
根据指引安装 Knowject AI toolkit：https://github.com/lynxlangya/knowject/blob/main/skills/install.md
```

The agent will follow [`install.md`](./install.md), use a stable local checkout,
run `skills/scripts/install.sh`, and verify the Skill links for Claude Code and
Codex.

### Manual fallback

#### Requirements

- Claude Code or Codex (or both)
- macOS / Linux (Windows: use WSL)
- `bash`, `python3` (3.8 or newer), `git`
- Python `PyYAML`, required by the schema validator and `verify.sh`

`install.sh` itself does not require PyYAML, but `verify.sh` and `schema.py` do.
Install PyYAML before full validation:

```bash
pip install pyyaml
```

### One-line install

```bash
git clone https://github.com/lynxlangya/knowject.git
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

After running `knowject-memory-capture`, the same folder also contains file-based project memory:

```text
your-project/
  knowject/
    memory/
      README.md
      project-memory.yaml  # source-cited durable memory (commit this after review)
```

Every memory item must cite source evidence. Do not put secrets, environment values, tokens, DB URLs, cookies, auth headers, or private credentials in `knowject/memory/`.

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
- [x] Phase 3: `knowject-api-to-types`
- [x] Phase 4: `knowject-memory-capture`
- [ ] Next: Claude Code plugin manifest, official marketplace listing
