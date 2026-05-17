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
TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

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
context_fixtures=(
  "$SKILLS_DIR"/knowject-context-init/references/examples/*.yaml
  "$SKILLS_DIR"/knowject-prd-to-mock/references/examples/*-input.yaml
  "$SKILLS_DIR"/knowject-read-design/references/examples/*-input.yaml
)
for f in "${context_fixtures[@]}"; do
  if ! python3 "$SKILLS_DIR/_shared/schema.py" "$f" >/dev/null 2>&1; then
    fail "example fails schema: ${f#$SKILLS_DIR/}"
    all_ok=0
  fi
done
[ "$all_ok" -eq 1 ] && pass "all example yamls validate"

# 6. context.yaml schema rejects malformed project blocks without traceback
note "context.yaml schema rejects non-mapping project"
bad_project="$TMP_DIR/bad-project.yaml"
cat > "$bad_project" <<'YAML'
knowject_version: "0.1"
project: invalid
stack:
  package_manager: pnpm@10
YAML
if output=$(python3 "$SKILLS_DIR/_shared/schema.py" "$bad_project" 2>&1); then
  fail "bad project unexpectedly passed schema"
elif echo "$output" | grep -q "Traceback"; then
  fail "bad project produced traceback"
elif echo "$output" | grep -q "project: expected mapping"; then
  pass "non-mapping project reports validation error"
else
  fail "bad project did not report expected project mapping error"
fi

# 7. context.yaml schema rejects forbidden env/secret fields
note "context.yaml schema rejects forbidden env fields"
forbidden_fields="$TMP_DIR/forbidden-fields.yaml"
cat > "$forbidden_fields" <<'YAML'
knowject_version: "0.1"
project:
  name: Demo
  description: Demo project
  type: backend-only
  locale: zh
stack:
  package_manager: pnpm@10
  backend:
    framework: Express
    language: TypeScript
api:
  sources:
    - format: express
      path: apps/api/src/modules
      base_url: https://api.example.com
  api_key: should-not-live-here
YAML
if output=$(python3 "$SKILLS_DIR/_shared/schema.py" "$forbidden_fields" 2>&1); then
  fail "forbidden env fields unexpectedly passed schema"
elif echo "$output" | grep -q "api.sources\[0\].base_url" && echo "$output" | grep -q "api.api_key"; then
  pass "forbidden env fields report validation errors"
else
  fail "forbidden env fields did not report expected validation errors"
fi

# 8. extract-express-routes.py - fixture round-trip
note "extract-express-routes.py matches fixture"
if [ -f "$SKILLS_DIR/knowject-read-api/scripts/extract-express-routes.py" ]; then
  exp_file="$SKILLS_DIR/knowject-read-api/references/examples/express-expected.json"
  inp_file="$SKILLS_DIR/knowject-read-api/references/examples/express-input.routes.ts"
  if [ -f "$exp_file" ] && [ -f "$inp_file" ]; then
    actual_norm=$(python3 "$SKILLS_DIR/knowject-read-api/scripts/extract-express-routes.py" "$inp_file" \
      | python3 -c "import json,sys; print(json.dumps(json.load(sys.stdin), indent=2, sort_keys=True, ensure_ascii=False))")
    expected_norm=$(python3 -c "import json; print(json.dumps(json.load(open('$exp_file')), indent=2, sort_keys=True, ensure_ascii=False))")
    if [ "$actual_norm" = "$expected_norm" ]; then
      pass "express extractor matches expected"
    else
      fail "express extractor output differs from expected (see references/examples/express-expected.json)"
    fi
  else
    fail "express fixture or expected file missing"
  fi
else
  fail "extract-express-routes.py missing"
fi

# 9. extract-openapi-endpoints.py - fixture round-trip
note "extract-openapi-endpoints.py matches fixture"
if [ -f "$SKILLS_DIR/knowject-read-api/scripts/extract-openapi-endpoints.py" ]; then
  exp_file="$SKILLS_DIR/knowject-read-api/references/examples/openapi-expected.json"
  inp_file="$SKILLS_DIR/knowject-read-api/references/examples/openapi-input.yaml"
  if [ -f "$exp_file" ] && [ -f "$inp_file" ]; then
    actual_norm=$(python3 "$SKILLS_DIR/knowject-read-api/scripts/extract-openapi-endpoints.py" "$inp_file" \
      | python3 -c "import json,sys; print(json.dumps(json.load(sys.stdin), indent=2, sort_keys=True, ensure_ascii=False))")
    expected_norm=$(python3 -c "import json; print(json.dumps(json.load(open('$exp_file')), indent=2, sort_keys=True, ensure_ascii=False))")
    if [ "$actual_norm" = "$expected_norm" ]; then
      pass "openapi extractor matches expected"
    else
      fail "openapi extractor output differs from expected (see references/examples/openapi-expected.json)"
    fi
  else
    fail "openapi fixture or expected file missing"
  fi
else
  fail "extract-openapi-endpoints.py missing"
fi

# 10. extract-brand-brief.py - fixture round-trip
note "extract-brand-brief.py matches fixture"
if [ -f "$SKILLS_DIR/knowject-prd-to-mock/scripts/extract-brand-brief.py" ]; then
  exp_file="$SKILLS_DIR/knowject-prd-to-mock/references/examples/brand-brief-expected.json"
  inp_file="$SKILLS_DIR/knowject-prd-to-mock/references/examples/brand-brief-input.yaml"
  if [ -f "$exp_file" ] && [ -f "$inp_file" ]; then
    actual_norm=$(python3 "$SKILLS_DIR/knowject-prd-to-mock/scripts/extract-brand-brief.py" "$inp_file" \
      | python3 -c "import json,sys; print(json.dumps(json.load(sys.stdin), indent=2, sort_keys=True, ensure_ascii=False))")
    expected_norm=$(python3 -c "import json; print(json.dumps(json.load(open('$exp_file')), indent=2, sort_keys=True, ensure_ascii=False))")
    if [ "$actual_norm" = "$expected_norm" ]; then
      pass "brand brief extractor matches expected"
    else
      fail "brand brief extractor output differs from expected (see references/examples/brand-brief-expected.json)"
    fi
  else
    fail "brand brief fixture or expected file missing"
  fi
else
  fail "extract-brand-brief.py missing"
fi

# 11. extract-framework-profile.py - antd fixture round-trip
note "extract-framework-profile.py matches antd fixture"
if [ -f "$SKILLS_DIR/knowject-read-design/scripts/extract-framework-profile.py" ]; then
  exp_file="$SKILLS_DIR/knowject-read-design/references/examples/antd-profile-expected.json"
  inp_file="$SKILLS_DIR/knowject-read-design/references/examples/antd-profile-input.yaml"
  if [ -f "$exp_file" ] && [ -f "$inp_file" ]; then
    actual_norm=$(python3 "$SKILLS_DIR/knowject-read-design/scripts/extract-framework-profile.py" "$inp_file" \
      | python3 -c "import json,sys; print(json.dumps(json.load(sys.stdin), indent=2, sort_keys=True, ensure_ascii=False))")
    expected_norm=$(python3 -c "import json; print(json.dumps(json.load(open('$exp_file')), indent=2, sort_keys=True, ensure_ascii=False))")
    if [ "$actual_norm" = "$expected_norm" ]; then
      pass "framework profile (antd) matches expected"
    else
      fail "framework profile (antd) output differs (see antd-profile-expected.json)"
    fi
  else
    fail "antd profile fixture missing"
  fi
else
  fail "extract-framework-profile.py missing"
fi

# 12. extract-framework-profile.py - shadcn fixture round-trip
note "extract-framework-profile.py matches shadcn fixture"
if [ -f "$SKILLS_DIR/knowject-read-design/scripts/extract-framework-profile.py" ]; then
  exp_file="$SKILLS_DIR/knowject-read-design/references/examples/shadcn-profile-expected.json"
  inp_file="$SKILLS_DIR/knowject-read-design/references/examples/shadcn-profile-input.yaml"
  if [ -f "$exp_file" ] && [ -f "$inp_file" ]; then
    actual_norm=$(python3 "$SKILLS_DIR/knowject-read-design/scripts/extract-framework-profile.py" "$inp_file" \
      | python3 -c "import json,sys; print(json.dumps(json.load(sys.stdin), indent=2, sort_keys=True, ensure_ascii=False))")
    expected_norm=$(python3 -c "import json; print(json.dumps(json.load(open('$exp_file')), indent=2, sort_keys=True, ensure_ascii=False))")
    if [ "$actual_norm" = "$expected_norm" ]; then
      pass "framework profile (shadcn) matches expected"
    else
      fail "framework profile (shadcn) output differs (see shadcn-profile-expected.json)"
    fi
  else
    fail "shadcn profile fixture missing"
  fi
else
  fail "extract-framework-profile.py missing"
fi

# Report
echo ""
echo "Checks: $checks | Failures: $failures"
[ "$failures" -eq 0 ] || exit 1
echo "All checks passed."
