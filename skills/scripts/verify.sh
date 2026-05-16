#!/usr/bin/env bash
# skills/scripts/verify.sh
# Validate the entire skills/ tree.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SKILLS_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
REPO_ROOT="$(cd "$SKILLS_DIR/.." && pwd)"

# 0. Preflight: dependencies
if ! command -v python3 >/dev/null 2>&1; then
  echo "❌ python3 not found. Install Python 3.8+ before running verify.sh." >&2
  exit 3
fi
if ! python3 -c "import yaml" 2>/dev/null; then
  echo "❌ PyYAML not installed. verify.sh and schema.py require it." >&2
  echo "   Install with: pip install pyyaml  (or pip3 install pyyaml)" >&2
  echo "   This is documented in skills/README.md Requirements." >&2
  exit 3
fi

failures=0
checks=0

note() { echo "→ $1"; checks=$((checks+1)); }
fail() { echo "❌ $1" >&2; failures=$((failures+1)); }
pass() { echo "✓ $1"; }

# 1. manifest.yaml parses
note "manifest.yaml parses"
if python3 -c "import yaml; m=yaml.safe_load(open('$SKILLS_DIR/manifest.yaml')); assert 'name' in m and 'version' in m and 'skills' in m" 2>/dev/null; then
  pass "manifest.yaml"
else
  fail "manifest.yaml does not parse or missing required fields"
fi

# 2. Each declared skill exists as a directory
skills_list=$(python3 -c "import yaml; print('\n'.join(yaml.safe_load(open('$SKILLS_DIR/manifest.yaml'))['skills']))")
for s in $skills_list; do
  note "skill directory: $s"
  if [ -d "$SKILLS_DIR/$s" ]; then
    pass "$s/ exists"
  else
    fail "$s/ missing"
  fi
done

# 3. Each skill has SKILL.md with frontmatter
for s in $skills_list; do
  note "SKILL.md frontmatter: $s"
  if [ -f "$SKILLS_DIR/$s/SKILL.md" ]; then
    if python3 -c "
import re, yaml, sys
c = open('$SKILLS_DIR/$s/SKILL.md').read()
m = re.match(r'^---\n(.*?)\n---\n', c, re.DOTALL)
assert m, 'no frontmatter'
fm = yaml.safe_load(m.group(1))
assert fm.get('name') == '$s', f\"name mismatch: {fm.get('name')} != $s\"
assert 'description' in fm and len(fm['description']) > 50, 'description too short'
" 2>/dev/null; then
      pass "$s/SKILL.md frontmatter"
    else
      fail "$s/SKILL.md frontmatter invalid"
    fi
  else
    fail "$s/SKILL.md missing"
  fi
done

# 4. Each skill has agents/openai.yaml with correct Codex interface structure
for s in $skills_list; do
  note "Codex adapter shape: $s"
  if [ -f "$SKILLS_DIR/$s/agents/openai.yaml" ]; then
    if python3 -c "
import yaml, sys
doc = yaml.safe_load(open('$SKILLS_DIR/$s/agents/openai.yaml'))
assert isinstance(doc, dict), 'top-level must be mapping'
assert 'interface' in doc, \"missing top-level 'interface' block\"
iface = doc['interface']
for k in ('display_name', 'short_description', 'default_prompt'):
    assert k in iface, f\"missing interface.{k}\"
    assert isinstance(iface[k], str) and iface[k].strip(), f\"interface.{k} must be non-empty string\"
assert '\$$s' in iface['default_prompt'], f\"default_prompt should reference \$$s\"
" 2>/dev/null; then
      pass "$s/agents/openai.yaml structure"
    else
      fail "$s/agents/openai.yaml missing 'interface' block or required keys (display_name/short_description/default_prompt) or default_prompt does not reference \$$s"
    fi
  else
    fail "$s/agents/openai.yaml missing"
  fi
done

# 5. context.yaml schema validates all examples (self-contained, no apps/indexer-py)
note "context.yaml schema validates all examples"
all_ok=1
for f in "$SKILLS_DIR"/knowject-context-init/references/examples/*.yaml; do
  if ! python3 "$SKILLS_DIR/_shared/schema.py" "$f" >/dev/null 2>&1; then
    fail "example fails schema: $(basename "$f")"
    all_ok=0
  fi
done
[ "$all_ok" -eq 1 ] && pass "all example yamls validate"

# Report
echo ""
echo "Checks: $checks | Failures: $failures"
[ "$failures" -eq 0 ] || exit 1
echo "All checks passed."
