#!/usr/bin/env bash
# skills/scripts/test-install.sh
# Test install.sh by pointing HOME to a temp dir.

set -euo pipefail

TEST_HOME="$(mktemp -d)"
trap "rm -rf '$TEST_HOME'" EXIT

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Run install with fake HOME
HOME="$TEST_HOME" bash "$SCRIPT_DIR/install.sh" > /dev/null

# Assert symlinks exist
for tool in .claude .codex; do
  link="$TEST_HOME/$tool/skills/knowject-context-init"
  shared_link="$TEST_HOME/$tool/skills/_shared"
  skill_relative_schema="$link/../_shared/context-yaml-schema.md"

  if [ ! -L "$link" ]; then
    echo "FAIL: $link is not a symlink"
    exit 1
  fi
  if [ ! -d "$link/" ]; then
    echo "FAIL: $link does not resolve to a directory"
    exit 1
  fi
  if [ ! -f "$link/SKILL.md" ]; then
    echo "FAIL: $link/SKILL.md missing through symlink"
    exit 1
  fi
  if [ ! -L "$shared_link" ]; then
    echo "FAIL: $shared_link is not a symlink"
    exit 1
  fi
  if [ ! -f "$shared_link/schema.py" ]; then
    echo "FAIL: $shared_link/schema.py missing through symlink"
    exit 1
  fi
  if [ ! -f "$skill_relative_schema" ]; then
    echo "FAIL: $skill_relative_schema does not resolve"
    exit 1
  fi
done

# Test idempotency: run again, should not fail
HOME="$TEST_HOME" bash "$SCRIPT_DIR/install.sh" > /dev/null

# Test safety: non-symlink targets must not be overwritten.
BLOCK_HOME="$TEST_HOME/block"
mkdir -p "$BLOCK_HOME/.claude/skills" "$BLOCK_HOME/.codex/skills"
mkdir "$BLOCK_HOME/.codex/skills/_shared"
if HOME="$BLOCK_HOME" bash "$SCRIPT_DIR/install.sh" > /dev/null 2>&1; then
  echo "FAIL: install.sh overwrote or ignored a blocking non-symlink target"
  exit 1
fi
if [ ! -d "$BLOCK_HOME/.codex/skills/_shared" ] || [ -L "$BLOCK_HOME/.codex/skills/_shared" ]; then
  echo "FAIL: blocking non-symlink _shared target was overwritten"
  exit 1
fi

echo "OK: install.sh is correct and idempotent"
