# Install Knowject AI Toolkit

This file is written for AI agents such as Claude Code and Codex.

User-facing prompt:

```text
根据指引安装 Knowject AI toolkit：https://github.com/lynxlangya/knowject/blob/main/skills/install.md
```

## Goal

Install the Knowject Skills pack for both Claude Code and Codex by linking all
`knowject-*` Skill directories into:

```text
~/.claude/skills/
~/.codex/skills/
```

First-party supported clients for this installer: Claude Code and Codex.

## Hard Rules

- Do not install from `/tmp` or another temporary checkout. The installer uses
  symlinks, so the source checkout must live in a stable path.
- Do not overwrite non-symlink files or directories under `~/.claude/skills/`
  or `~/.codex/skills/`.
- Do not install Python packages automatically. If PyYAML is missing, report
  that full validation requires it.
- Do not modify the user's target project during installation. This step only
  installs the Knowject Skill pack.

## Install

### 1. Pick the source checkout

If the current working directory is already a `lynxlangya/knowject` checkout and
`skills/scripts/install.sh` exists, use it directly.

Otherwise use this stable local checkout path:

```text
~/.knowject/knowject
```

If `~/.knowject/knowject` does not exist:

```bash
mkdir -p ~/.knowject
git clone https://github.com/lynxlangya/knowject.git ~/.knowject/knowject
```

If `~/.knowject/knowject` already exists:

1. Confirm it is a Git repository.
2. Confirm its `origin` remote points to `lynxlangya/knowject`.
3. Confirm it has no dirty tracked or untracked changes.
4. Then update it:

```bash
git -C ~/.knowject/knowject pull --ff-only
```

If any check fails, stop and tell the user what conflicted. Do not delete or
overwrite the directory.

### 2. Run the installer

From the selected Knowject repository root:

```bash
bash skills/scripts/install.sh
```

The script is idempotent. It replaces existing symlinks and refuses to overwrite
non-symlink files.

## Verify

Check that the core Skill is available for both clients:

```bash
test -f ~/.claude/skills/knowject-context-init/SKILL.md
test -f ~/.codex/skills/knowject-context-init/SKILL.md
```

If PyYAML is available, run the full Skill pack validation from the Knowject
repository root:

```bash
python3 -c "import yaml"
bash skills/scripts/verify.sh
```

If PyYAML is missing, do not install it automatically. Tell the user:

```text
Knowject Skills are installed. Full validation requires PyYAML:
pip install pyyaml
```

## Finish

Tell the user:

```text
Knowject AI toolkit is installed.
Restart Claude Code / Codex, then run `/knowject init` inside any project.
```
