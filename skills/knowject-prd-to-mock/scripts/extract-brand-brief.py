#!/usr/bin/env python3
"""Distil the brand-relevant subset of knowject/context.yaml into a flat JSON brief.

The Skill's HTML-generation prompt consumes this JSON verbatim; the brief
is intentionally narrow (no stack details beyond UI library, no API surface)
so the HTML stays decoupled from runtime concerns.
"""
import json
import sys
from pathlib import Path

try:
    import yaml  # type: ignore
except ImportError:
    print("PyYAML is required. Install it: pip install pyyaml", file=sys.stderr)
    sys.exit(3)


def extract(doc: dict) -> dict:
    project = (doc.get("project") or {}) if isinstance(doc, dict) else {}
    stack = (doc.get("stack") or {}) if isinstance(doc, dict) else {}
    frontend = (stack.get("frontend") or {}) if isinstance(stack, dict) else {}
    brand = (doc.get("brand") or {}) if isinstance(doc, dict) else {}

    brief = {
        "project_name": project.get("name"),
        "project_description": project.get("description"),
        "locale": project.get("locale"),
        "ui_library": frontend.get("ui"),
        "primary_color": brand.get("primary_color"),
        "font_family": brand.get("font_family"),
        "voice": brand.get("voice"),
        "logo_path": brand.get("logo_path"),
    }
    return brief


def main() -> int:
    if len(sys.argv) != 2:
        print("usage: extract-brand-brief.py <context.yaml>", file=sys.stderr)
        return 2
    p = Path(sys.argv[1])
    if not p.is_file():
        print(f"not a file: {p}", file=sys.stderr)
        return 2
    doc = yaml.safe_load(p.read_text())
    if not isinstance(doc, dict):
        print("context.yaml must be a mapping at the top level", file=sys.stderr)
        return 2
    print(json.dumps(extract(doc), indent=2, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    sys.exit(main())
