#!/usr/bin/env python3
"""Distil knowject/context.yaml into a codegen profile for knowject-read-design.

The profile is a flat JSON that the Skill's skeleton-generation prompt
consumes verbatim. Library dispatch (antd / mui / shadcn / chakra /
naive / mantine) happens entirely here - the prompt downstream is
library-agnostic.
"""
import json
import sys
from pathlib import Path

try:
    import yaml  # type: ignore
except ImportError:
    print("PyYAML is required. Install it: pip install pyyaml", file=sys.stderr)
    sys.exit(3)


IMPORT_TEMPLATES = {
    "antd": "import { <Component> } from 'antd';",
    "mui": "import { <Component> } from '@mui/material';",
    "shadcn": "import { <Component> } from '@/components/ui/<component-kebab>';",
    "chakra": "import { <Component> } from '@chakra-ui/react';",
    "naive": "import { <Component> } from 'naive-ui';",
    "mantine": "import { <Component> } from '@mantine/core';",
}


def split_version(value):
    """Split 'react@19' to ('react', '19'). 'react' to ('react', None)."""
    if not isinstance(value, str) or not value:
        return None, None
    if "@" in value:
        name, _, version = value.partition("@")
        return name, version
    return value, None


def language_extension(language: str | None) -> str:
    if not language:
        return "tsx"
    if language.startswith("typescript"):
        return "tsx"
    if language.startswith("javascript"):
        return "jsx"
    return "tsx"


def extract(doc: dict) -> dict:
    stack = (doc.get("stack") or {}) if isinstance(doc, dict) else {}
    frontend = (stack.get("frontend") or {}) if isinstance(stack, dict) else {}
    design = (doc.get("design") or {}) if isinstance(doc, dict) else {}
    output = (design.get("output") or {}) if isinstance(design, dict) else {}

    framework_name, framework_version = split_version(frontend.get("framework"))
    ui_name, ui_version = split_version(frontend.get("ui"))
    styling_name, _ = split_version(frontend.get("styling"))
    language_name, _ = split_version(frontend.get("language"))

    return {
        "framework": framework_name,
        "framework_version": framework_version,
        "ui_library": ui_name,
        "ui_library_version": ui_version,
        "styling": styling_name,
        "language": language_name,
        "component_extension": language_extension(language_name),
        "components_dir": output.get("components_dir"),
        "pages_dir": output.get("pages_dir"),
        "import_template": IMPORT_TEMPLATES.get(ui_name, "import { <Component> } from 'react';"),
    }


def main() -> int:
    if len(sys.argv) != 2:
        print("usage: extract-framework-profile.py <context.yaml>", file=sys.stderr)
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
