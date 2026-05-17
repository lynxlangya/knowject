#!/usr/bin/env python3
"""Extract endpoint inventory from an OpenAPI 3 YAML or JSON document.

Outputs JSON {source, endpoints[{method, path, params, operationId, summary}]}.
Only path parameters are listed in `params`; query/header/cookie params are
ignored at this layer - the agent can re-read the source if needed.
"""
import json
import sys
from pathlib import Path

try:
    import yaml  # type: ignore
except ImportError:
    print(
        "PyYAML is required. Install it: pip install pyyaml",
        file=sys.stderr,
    )
    sys.exit(3)

HTTP_METHODS = ("get", "post", "put", "patch", "delete", "options", "head")


def path_param_names(*groups):
    names = []
    seen = set()
    for group in groups:
        if not isinstance(group, list):
            continue
        for p in group:
            if not isinstance(p, dict) or p.get("in") != "path":
                continue
            name = p.get("name")
            if name and name not in seen:
                names.append(name)
                seen.add(name)
    return names


def extract(doc: dict, source: str) -> dict:
    endpoints = []
    paths = (doc or {}).get("paths", {}) or {}
    for path, ops in paths.items():
        if not isinstance(ops, dict):
            continue
        path_parameters = ops.get("parameters", [])
        for method, op in ops.items():
            if method.lower() not in HTTP_METHODS:
                continue
            if not isinstance(op, dict):
                continue
            params = path_param_names(path_parameters, op.get("parameters", []))
            endpoints.append(
                {
                    "method": method.upper(),
                    "path": path,
                    "params": params,
                    "operationId": op.get("operationId"),
                    "summary": op.get("summary"),
                }
            )
    return {"source": source, "endpoints": endpoints}


def main() -> int:
    if len(sys.argv) != 2:
        print("usage: extract-openapi-endpoints.py <file>", file=sys.stderr)
        return 2
    p = Path(sys.argv[1])
    if not p.is_file():
        print(f"not a file: {p}", file=sys.stderr)
        return 2
    doc = yaml.safe_load(p.read_text())
    if not isinstance(doc, dict):
        print("OpenAPI document must be a mapping at the top level", file=sys.stderr)
        return 2
    print(json.dumps(extract(doc, p.name), indent=2))
    return 0


if __name__ == "__main__":
    sys.exit(main())
