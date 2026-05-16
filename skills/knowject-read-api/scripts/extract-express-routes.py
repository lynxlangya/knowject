#!/usr/bin/env python3
"""Extract Express route declarations from a TypeScript or JavaScript source file.

Recognizes the common idioms:
    router.get('/path', handler)
    router.post("/path", async (req, res) => { ... })
    app.delete(`/path/:id`, handler)

Outputs JSON to stdout. Limitations are documented in
references/express-detection.md - this script is intentionally a regex,
not an AST walker; the Skill body tells the agent when to fall back to
manual inspection.
"""
import json
import re
import sys
from pathlib import Path

METHODS = ("get", "post", "put", "patch", "delete", "options", "head", "all")
ROUTE_RE = re.compile(
    r"^[ \t]*(?:router|app)\.("
    + "|".join(METHODS)
    + r")\s*\(\s*['\"`]([^'\"`]+)['\"`]",
    re.MULTILINE,
)
PARAM_RE = re.compile(r":([A-Za-z_][A-Za-z0-9_]*)")


def extract(text: str, source: str) -> dict:
    endpoints = []
    for m in ROUTE_RE.finditer(text):
        method = m.group(1).upper()
        path = m.group(2)
        params = PARAM_RE.findall(path)
        line = text[: m.start()].count("\n") + 1
        endpoints.append(
            {"method": method, "path": path, "params": params, "line": line}
        )
    return {"source": source, "endpoints": endpoints}


def main() -> int:
    if len(sys.argv) != 2:
        print("usage: extract-express-routes.py <file>", file=sys.stderr)
        return 2
    p = Path(sys.argv[1])
    if not p.is_file():
        print(f"not a file: {p}", file=sys.stderr)
        return 2
    result = extract(p.read_text(), p.name)
    print(json.dumps(result, indent=2))
    return 0


if __name__ == "__main__":
    sys.exit(main())
