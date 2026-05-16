#!/usr/bin/env bash
# skills/scripts/install.sh
# Symlink each knowject-* Skill into ~/.claude/skills/ and ~/.codex/skills/.
# Idempotent: re-running replaces existing symlinks.
# Safe: refuses to overwrite non-symlink files.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SKILLS_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

CLAUDE_SKILLS="${HOME}/.claude/skills"
CODEX_SKILLS="${HOME}/.codex/skills"

mkdir -p "$CLAUDE_SKILLS" "$CODEX_SKILLS"

installed=0
skipped=0

for skill_dir in "$SKILLS_DIR"/knowject-*/; do
  [ -d "$skill_dir" ] || continue
  skill_name="$(basename "$skill_dir")"

  for target_root in "$CLAUDE_SKILLS" "$CODEX_SKILLS"; do
    target="$target_root/$skill_name"

    if [ -L "$target" ]; then
      rm "$target"
    elif [ -e "$target" ]; then
      echo "⚠️  Refuse to overwrite non-symlink: $target" >&2
      skipped=$((skipped + 1))
      continue
    fi

    ln -s "$skill_dir" "$target"
    installed=$((installed + 1))
    echo "→ linked $target → $skill_dir"
  done
done

echo ""
echo "Installed: $installed symlinks"
echo "Skipped:   $skipped (non-symlink files in target — remove manually then re-run)"

if [ "$skipped" -gt 0 ]; then
  exit 2
fi

echo ""
echo "Next: restart Claude Code / Codex, then say '/knowject init' in any project."
