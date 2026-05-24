#!/usr/bin/env python3
"""Validate knowject/memory/project-memory.yaml."""

from __future__ import annotations

import re
import sys
from pathlib import Path
from typing import Any

try:
    import yaml  # type: ignore
except ImportError:
    print("PyYAML is required. Install it: pip install pyyaml", file=sys.stderr)
    sys.exit(3)

TYPES = {"fact", "decision", "preference", "workflow", "risk", "lesson"}
CONFIDENCE = {"high", "medium", "low"}
STATUS = {"active", "stale", "superseded"}
MODES = {"default-scan", "explicit-files", "git-range", "conversation-summary"}
DATE_RE = re.compile(r"^\d{4}-\d{2}-\d{2}$")
FORBIDDEN_KEY_RE = re.compile(
    r"(api[_-]?key|auth[_-]?header|base[_-]?url|cookie|credential|database[_-]?url|db[_-]?url|password|secret|token)",
    re.IGNORECASE,
)


def is_str(value: Any) -> bool:
    return isinstance(value, str) and bool(value.strip())


def add(errors: list[str], path: str, msg: str) -> None:
    errors.append(f"{path}: {msg}")


def check_forbidden_keys(value: Any, path: str, errors: list[str]) -> None:
    if isinstance(value, dict):
        for key, child in value.items():
            key_path = f"{path}.{key}" if path else str(key)
            if isinstance(key, str) and FORBIDDEN_KEY_RE.search(key):
                add(errors, key_path, "forbidden secret/environment key")
            check_forbidden_keys(child, key_path, errors)
    elif isinstance(value, list):
        for idx, child in enumerate(value):
            check_forbidden_keys(child, f"{path}[{idx}]", errors)


def require_date(value: Any, path: str, errors: list[str]) -> None:
    if not (isinstance(value, str) and DATE_RE.match(value)):
        add(errors, path, "expected YYYY-MM-DD")


def validate_source_ref(ref: Any, path: str, errors: list[str]) -> None:
    if not isinstance(ref, dict):
        add(errors, path, "expected mapping")
        return
    if not is_str(ref.get("path")):
        add(errors, f"{path}.path", "required non-empty string")

    has_note = is_str(ref.get("note"))
    has_lines = "line_start" in ref and "line_end" in ref
    if has_lines:
        start = ref.get("line_start")
        end = ref.get("line_end")
        if not isinstance(start, int) or start <= 0:
            add(errors, f"{path}.line_start", "expected positive integer")
        if not isinstance(end, int) or end <= 0:
            add(errors, f"{path}.line_end", "expected positive integer")
        if isinstance(start, int) and isinstance(end, int) and end < start:
            add(errors, path, "line_end must be >= line_start")
    if not has_lines and not has_note:
        add(errors, path, "requires line_start+line_end or note")
    if "quote" in ref and not isinstance(ref["quote"], str):
        add(errors, f"{path}.quote", "must be string if present")


def validate_item(item: Any, idx: int, errors: list[str]) -> None:
    path = f"items[{idx}]"
    if not isinstance(item, dict):
        add(errors, path, "expected mapping")
        return
    for key in ("id", "title", "summary"):
        if not is_str(item.get(key)):
            add(errors, f"{path}.{key}", "required non-empty string")
    if item.get("type") not in TYPES:
        add(errors, f"{path}.type", f"must be one of {sorted(TYPES)}")
    if item.get("confidence") not in CONFIDENCE:
        add(errors, f"{path}.confidence", f"must be one of {sorted(CONFIDENCE)}")
    if item.get("status") not in STATUS:
        add(errors, f"{path}.status", f"must be one of {sorted(STATUS)}")
    require_date(item.get("created_at"), f"{path}.created_at", errors)
    require_date(item.get("updated_at"), f"{path}.updated_at", errors)

    refs = item.get("source_refs")
    if not isinstance(refs, list) or not refs:
        add(errors, f"{path}.source_refs", "required non-empty list")
    else:
        for ridx, ref in enumerate(refs):
            validate_source_ref(ref, f"{path}.source_refs[{ridx}]", errors)

    for key in ("tags", "related_files"):
        if key in item:
            value = item[key]
            if not isinstance(value, list) or not all(isinstance(v, str) for v in value):
                add(errors, f"{path}.{key}", "must be list[str] if present")


def validate(doc: Any) -> list[str]:
    errors: list[str] = []
    if not isinstance(doc, dict):
        return ["root: expected mapping"]

    check_forbidden_keys(doc, "", errors)

    if doc.get("version") != "0.1":
        add(errors, "version", "must be '0.1'")

    project = doc.get("project")
    if not isinstance(project, dict):
        add(errors, "project", "expected mapping")
    else:
        if not is_str(project.get("name")):
            add(errors, "project.name", "required non-empty string")
        require_date(project.get("captured_at"), "project.captured_at", errors)
        summary = project.get("source_summary")
        if not isinstance(summary, dict):
            add(errors, "project.source_summary", "expected mapping")
        else:
            if summary.get("mode") not in MODES:
                add(errors, "project.source_summary.mode", f"must be one of {sorted(MODES)}")
            refs = summary.get("refs")
            if not isinstance(refs, list) or not refs:
                add(errors, "project.source_summary.refs", "required non-empty list")
            else:
                for idx, ref in enumerate(refs):
                    validate_source_ref(ref, f"project.source_summary.refs[{idx}]", errors)

    items = doc.get("items")
    if not isinstance(items, list) or not items:
        add(errors, "items", "required non-empty list")
    else:
        for idx, item in enumerate(items):
            validate_item(item, idx, errors)

    return errors


def main() -> int:
    if len(sys.argv) != 2:
        print("usage: validate-project-memory.py <project-memory.yaml>", file=sys.stderr)
        return 2
    path = Path(sys.argv[1])
    if not path.is_file():
        print(f"not a file: {path}", file=sys.stderr)
        return 2
    try:
        doc = yaml.safe_load(path.read_text())
    except yaml.YAMLError as exc:
        print(f"YAML parse failed: {exc}", file=sys.stderr)
        return 2
    errors = validate(doc)
    if errors:
        print(f"INVALID: {path}", file=sys.stderr)
        for error in errors:
            print(f"  - {error}", file=sys.stderr)
        return 1
    print(f"OK: {path}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
