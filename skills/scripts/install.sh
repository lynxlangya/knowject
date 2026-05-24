#!/usr/bin/env bash
# skills/scripts/install.sh
# Symlink each knowject-* Skill and shared support files into
# ~/.claude/skills/ and ~/.codex/skills/.
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

link_entry() {
  local source="$1"
  local target="$2"

  if [ -L "$target" ]; then
    rm "$target"
  elif [ -e "$target" ]; then
    echo "⚠️  Refuse to overwrite non-symlink: $target" >&2
    skipped=$((skipped + 1))
    return 0
  fi

  ln -s "$source" "$target"
  installed=$((installed + 1))
  echo "→ linked $target → $source"
}

for skill_dir in "$SKILLS_DIR"/knowject-*/; do
  [ -d "$skill_dir" ] || continue
  skill_name="$(basename "$skill_dir")"

  for target_root in "$CLAUDE_SKILLS" "$CODEX_SKILLS"; do
    link_entry "$skill_dir" "$target_root/$skill_name"
  done
done

for target_root in "$CLAUDE_SKILLS" "$CODEX_SKILLS"; do
  link_entry "$SKILLS_DIR/_shared" "$target_root/_shared"
done

echo ""
echo "Installed: $installed symlinks"
echo "Skipped:   $skipped (non-symlink files in target — remove manually then re-run)"

if [ "$skipped" -gt 0 ]; then
  exit 2
fi

echo ""
echo "Next: restart Claude Code / Codex, then say '/knowject init' in any project."
