#!/usr/bin/env python3
"""
skills/_shared/schema.py

Validator for knowject/context.yaml v0.1.

Pure stdlib + PyYAML. No external runtime deps beyond PyYAML.
Self-contained — never imports from apps/ or packages/.

Usage:
    python3 skills/_shared/schema.py <path-to-context.yaml>

Exit codes:
    0   valid
    1   validation error (errors printed to stderr)
    2   file / yaml parse error
    3   environment error (PyYAML missing)
"""

from __future__ import annotations

import re
import sys
from pathlib import Path
from typing import Any

try:
    import yaml  # type: ignore
except ImportError:
    sys.stderr.write(
        "ERROR: PyYAML not installed. Install with: pip install pyyaml\n"
        "(Or in a uv project: uv add pyyaml)\n"
    )
    sys.exit(3)


# ---------- enum allow-lists ----------
PROJECT_TYPES = {"monorepo", "frontend-only", "backend-only", "full-stack"}
LOCALES = {"zh", "en", "zh-en", "en-zh"}
DESIGN_FORMATS = {"png", "figma-export", "pdf", "sketch", "url"}
API_FORMATS = {"express", "openapi", "fastapi", "nest", "markdown"}
HEX_RE = re.compile(r"^#[0-9a-fA-F]{6}$")
SCHEMA_VERSIONS = {"0.1"}
FORBIDDEN_KEY_SUFFIXES = (
    "apikey",
    "baseurl",
    "connectionstring",
    "credential",
    "credentials",
    "databaseurl",
    "dburl",
    "password",
    "secret",
    "token",
)


# ---------- helpers ----------
def _err(errors: list[str], path: str, msg: str) -> None:
    errors.append(f"  - {path}: {msg}")


def _is_str(v: Any) -> bool:
    return isinstance(v, str) and v != ""


def _normalize_key(key: str) -> str:
    return re.sub(r"[^a-z0-9]", "", key.lower())


def _is_forbidden_key(key: Any) -> bool:
    if not isinstance(key, str):
        return False
    normalized = _normalize_key(key)
    return any(normalized.endswith(suffix) for suffix in FORBIDDEN_KEY_SUFFIXES)


def _check_forbidden_fields(value: Any, path: str, errors: list[str]) -> None:
    if isinstance(value, dict):
        for key, child in value.items():
            key_path = f"{path}.{key}" if path else str(key)
            if _is_forbidden_key(key):
                _err(
                    errors,
                    key_path,
                    "forbidden environment/secret field; use .env or deployment config",
                )
            _check_forbidden_fields(child, key_path, errors)
    elif isinstance(value, list):
        for i, child in enumerate(value):
            item_path = f"{path}[{i}]" if path else f"[{i}]"
            _check_forbidden_fields(child, item_path, errors)


def _check_required_keys(
    block: Any, required: list[str], path: str, errors: list[str]
) -> None:
    if not isinstance(block, dict):
        _err(errors, path, f"expected mapping, got {type(block).__name__}")
        return
    for k in required:
        if k not in block:
            _err(errors, path, f"missing required field '{k}'")
        elif not _is_str(block[k]):
            _err(errors, f"{path}.{k}", "required non-empty string")


# ---------- block validators ----------
def validate_project(block: Any, errors: list[str]) -> None:
    if not isinstance(block, dict):
        _check_required_keys(
            block, ["name", "description", "type", "locale"], "project", errors
        )
        return
    _check_required_keys(
        block, ["name", "description", "type", "locale"], "project", errors
    )
    if "type" in block and block["type"] not in PROJECT_TYPES:
        _err(errors, "project.type", f"must be one of {sorted(PROJECT_TYPES)}")
    if "locale" in block and block["locale"] not in LOCALES:
        _err(errors, "project.locale", f"must be one of {sorted(LOCALES)}")


def validate_stack(block: dict, project_type: str, errors: list[str]) -> None:
    if not isinstance(block, dict):
        _err(errors, "stack", "expected mapping")
        return
    if not _is_str(block.get("package_manager")):
        _err(errors, "stack.package_manager", "required non-empty string")

    needs_frontend = project_type in {"monorepo", "frontend-only", "full-stack"}
    needs_backend = project_type in {"monorepo", "backend-only", "full-stack"}

    if needs_frontend:
        if "frontend" not in block:
            _err(errors, "stack.frontend", f"required when project.type={project_type}")
        else:
            _check_required_keys(
                block["frontend"],
                ["framework", "bundler", "ui", "styling", "language"],
                "stack.frontend",
                errors,
            )
    if needs_backend:
        if "backend" not in block:
            _err(errors, "stack.backend", f"required when project.type={project_type}")
        else:
            _check_required_keys(
                block["backend"], ["framework", "language"], "stack.backend", errors
            )


def validate_design(block: dict, errors: list[str]) -> None:
    """Partial config legal: design block is wholly optional. If present, validate."""
    if not isinstance(block, dict):
        _err(errors, "design", "expected mapping")
        return
    sources = block.get("sources")
    if not isinstance(sources, list) or len(sources) == 0:
        _err(errors, "design.sources", "must be a non-empty list")
    else:
        for i, src in enumerate(sources):
            if not isinstance(src, dict):
                _err(errors, f"design.sources[{i}]", "expected mapping")
                continue
            if not _is_str(src.get("path")):
                _err(errors, f"design.sources[{i}].path", "required non-empty string")
            if src.get("format") not in DESIGN_FORMATS:
                _err(
                    errors,
                    f"design.sources[{i}].format",
                    f"must be one of {sorted(DESIGN_FORMATS)}",
                )
    output = block.get("output")
    if not isinstance(output, dict):
        _err(errors, "design.output", "expected mapping")
    else:
        _check_required_keys(
            output, ["components_dir", "pages_dir"], "design.output", errors
        )


def validate_api(block: dict, errors: list[str]) -> None:
    """Partial config legal: api block is wholly optional. If present, validate."""
    if not isinstance(block, dict):
        _err(errors, "api", "expected mapping")
        return
    sources = block.get("sources")
    if not isinstance(sources, list) or len(sources) == 0:
        _err(errors, "api.sources", "must be a non-empty list")
    else:
        for i, src in enumerate(sources):
            if not isinstance(src, dict):
                _err(errors, f"api.sources[{i}]", "expected mapping")
                continue
            if src.get("format") not in API_FORMATS:
                _err(
                    errors,
                    f"api.sources[{i}].format",
                    f"must be one of {sorted(API_FORMATS)}",
                )
            if not _is_str(src.get("path")):
                _err(errors, f"api.sources[{i}].path", "required non-empty string")
    # client is optional when api block is present (backend-only case)
    client = block.get("client")
    if client is not None:
        if not isinstance(client, dict):
            _err(errors, "api.client", "expected mapping if present")
        else:
            for k in ("wrapper", "output_dir"):
                if not _is_str(client.get(k)):
                    _err(errors, f"api.client.{k}", "required non-empty string")


def validate_brand(block: dict, errors: list[str]) -> None:
    """Partial config legal: brand block is wholly optional. If present, validate."""
    if not isinstance(block, dict):
        _err(errors, "brand", "expected mapping")
        return
    pc = block.get("primary_color")
    if not isinstance(pc, str) or not HEX_RE.match(pc):
        _err(errors, "brand.primary_color", "must match /^#[0-9a-fA-F]{6}$/")
    for k in ("font_family", "voice"):
        if not _is_str(block.get(k)):
            _err(errors, f"brand.{k}", "required non-empty string")
    if "logo_path" in block and not isinstance(block["logo_path"], str):
        _err(errors, "brand.logo_path", "must be a string if present")
    if "reference_mocks" in block:
        rm = block["reference_mocks"]
        if not isinstance(rm, list) or not all(isinstance(x, str) for x in rm):
            _err(errors, "brand.reference_mocks", "must be list[str] if present")


# ---------- top-level ----------
def validate(doc: dict) -> list[str]:
    errors: list[str] = []
    if not isinstance(doc, dict):
        return ["root: expected mapping"]
    _check_forbidden_fields(doc, "", errors)

    ver = doc.get("knowject_version")
    if ver not in SCHEMA_VERSIONS:
        _err(
            errors,
            "knowject_version",
            f"must be one of {sorted(SCHEMA_VERSIONS)} (got {ver!r})",
        )

    project = doc.get("project")
    if project is None:
        _err(errors, "project", "required block missing")
    else:
        validate_project(project, errors)

    stack = doc.get("stack")
    project_type = project.get("type", "") if isinstance(project, dict) else ""
    if stack is None:
        _err(errors, "stack", "required block missing")
    else:
        validate_stack(stack, project_type, errors)

    # Partial-config-legal optional blocks
    if "design" in doc:
        validate_design(doc["design"], errors)
    if "api" in doc:
        validate_api(doc["api"], errors)
    if "brand" in doc:
        validate_brand(doc["brand"], errors)

    return errors


def main() -> int:
    if len(sys.argv) != 2:
        sys.stderr.write("usage: schema.py <path-to-context.yaml>\n")
        return 2
    path = Path(sys.argv[1])
    if not path.is_file():
        sys.stderr.write(f"ERROR: file not found: {path}\n")
        return 2
    try:
        doc = yaml.safe_load(path.read_text(encoding="utf-8"))
    except yaml.YAMLError as e:
        sys.stderr.write(f"ERROR: YAML parse failed: {e}\n")
        return 2

    errors = validate(doc)
    if errors:
        sys.stderr.write(f"INVALID: {path}\n")
        for e in errors:
            sys.stderr.write(e + "\n")
        return 1
    print(f"OK: {path}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
