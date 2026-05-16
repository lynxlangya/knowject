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
done

# Test idempotency: run again, should not fail
HOME="$TEST_HOME" bash "$SCRIPT_DIR/install.sh" > /dev/null
echo "OK: install.sh is correct and idempotent"
