#!/usr/bin/env python3
"""Extract Express route declarations from a TypeScript or JavaScript source file.

Recognizes the common idioms:
    router.get('/path', handler)
    usersRouter.get('/path', handler)
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
ROUTER_DECL_RE = re.compile(
    r"\b(?:const|let|var)\s+([A-Za-z_$][A-Za-z0-9_$]*)\s*=\s*(?:express\.)?Router\s*\("
)
PARAM_RE = re.compile(r":([A-Za-z_][A-Za-z0-9_]*)")


def _route_re(text: str) -> re.Pattern[str]:
    router_names = {"app", "router"}
    router_names.update(ROUTER_DECL_RE.findall(text))
    names = "|".join(re.escape(name) for name in sorted(router_names, key=len, reverse=True))
    return re.compile(
        r"^[ \t]*(?:" + names + r")\.(" + "|".join(METHODS) + r")\s*\(\s*['\"`]([^'\"`]+)['\"`]",
        re.MULTILINE,
    )


def extract(text: str, source: str) -> dict:
    endpoints = []
    for m in _route_re(text).finditer(text):
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
    print(json.dumps(result, indent=2, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    sys.exit(main())
