#!/usr/bin/env python3
"""Validate knowject/evals/rag-eval-cases.yaml."""

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

EVAL_TYPES = {
    "source_recall",
    "citation_support",
    "unsupported_claim",
    "fact_vs_plan",
    "conflict_resolution",
}
DIFFICULTY = {"easy", "medium", "hard"}
MODES = {"default-scan", "explicit-files", "memory-assisted", "git-range"}
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


def require_string_list(value: Any, path: str, errors: list[str], *, allow_empty: bool = False) -> None:
    if not isinstance(value, list):
        add(errors, path, "expected list[str]")
        return
    if not allow_empty and not value:
        add(errors, path, "required non-empty list")
        return
    for idx, item in enumerate(value):
        if not is_str(item):
            add(errors, f"{path}[{idx}]", "expected non-empty string")


def validate_case(case: Any, idx: int, errors: list[str]) -> None:
    path = f"cases[{idx}]"
    if not isinstance(case, dict):
        add(errors, path, "expected mapping")
        return
    for key in ("id", "question"):
        if not is_str(case.get(key)):
            add(errors, f"{path}.{key}", "required non-empty string")
    if case.get("eval_type") not in EVAL_TYPES:
        add(errors, f"{path}.eval_type", f"must be one of {sorted(EVAL_TYPES)}")
    if case.get("difficulty") not in DIFFICULTY:
        add(errors, f"{path}.difficulty", f"must be one of {sorted(DIFFICULTY)}")

    refs = case.get("expected_source_refs")
    if not isinstance(refs, list) or not refs:
        add(errors, f"{path}.expected_source_refs", "required non-empty list")
    else:
        for ridx, ref in enumerate(refs):
            validate_source_ref(ref, f"{path}.expected_source_refs[{ridx}]", errors)

    require_string_list(case.get("expected_answer_points"), f"{path}.expected_answer_points", errors)
    require_string_list(case.get("forbidden_claims"), f"{path}.forbidden_claims", errors, allow_empty=True)
    require_string_list(case.get("tags"), f"{path}.tags", errors)


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
        require_date(project.get("generated_at"), "project.generated_at", errors)
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

    cases = doc.get("cases")
    if not isinstance(cases, list) or not cases:
        add(errors, "cases", "required non-empty list")
    else:
        for idx, case in enumerate(cases):
            validate_case(case, idx, errors)

    return errors


def main() -> int:
    if len(sys.argv) != 2:
        print("usage: validate-rag-eval-cases.py <rag-eval-cases.yaml>", file=sys.stderr)
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
