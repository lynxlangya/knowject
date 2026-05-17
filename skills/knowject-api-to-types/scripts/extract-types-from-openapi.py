#!/usr/bin/env python3
"""Extract TypeScript types + operation→type mapping from an OpenAPI 3 document.

Output is one JSON document on stdout containing:
- module: the module name (passed via --module; default "api")
- types_ts: ready-to-write content of the .types.ts file (string)
- operations_mapping: list of {method, path, operationId, response_type, request_type}
  consumed by rewrite-typed-client.py to wire the typed client.

Naming convention:
- Named schemas in components.schemas → kept verbatim
- Inline response schemas → <PascalOperationId>Response
- Inline request body schemas → <PascalOperationId>Request

Limitations (documented; not bugs):
- Only application/json content type is read.
- Only 200/201/default responses are considered.
- $ref resolution is local-only (no external file refs).
- discriminator / not / patternProperties → emit `unknown`.
"""

import json
import re
import sys
from pathlib import Path

try:
    import yaml  # type: ignore
except ImportError:
    print("PyYAML is required. Install it: pip install pyyaml", file=sys.stderr)
    sys.exit(3)


HTTP_METHODS = ("get", "post", "put", "patch", "delete", "options", "head")
SCALAR = {
    "string": "string",
    "integer": "number",
    "number": "number",
    "boolean": "boolean",
    "null": "null",
}


def ref_name(ref: str) -> str:
    return ref.rsplit("/", 1)[-1]


def schema_to_ts(schema, discovered: set) -> str:
    if not isinstance(schema, dict):
        return "unknown"
    if "$ref" in schema:
        name = ref_name(schema["$ref"])
        discovered.add(name)
        return name
    if "enum" in schema:
        return " | ".join(json.dumps(v) for v in schema["enum"])
    if "oneOf" in schema:
        return " | ".join(schema_to_ts(s, discovered) for s in schema["oneOf"])
    if "anyOf" in schema:
        return " | ".join(schema_to_ts(s, discovered) for s in schema["anyOf"])
    if "allOf" in schema:
        return " & ".join(schema_to_ts(s, discovered) for s in schema["allOf"])

    t = schema.get("type")
    if t == "array":
        return f"Array<{schema_to_ts(schema.get('items', {}), discovered)}>"
    if t == "object" or (t is None and "properties" in schema):
        return object_body(schema, discovered)
    return SCALAR.get(t, "unknown")


def object_body(schema: dict, discovered: set) -> str:
    props = schema.get("properties") or {}
    required = set(schema.get("required") or [])
    if not props:
        return "Record<string, unknown>"
    lines = ["{"]
    for name, prop in props.items():
        opt = "" if name in required else "?"
        ts = schema_to_ts(prop, discovered)
        if "\n" in ts:
            ts = ts.replace("\n", "\n  ")
        lines.append(f"  {name}{opt}: {ts};")
    lines.append("}")
    return "\n".join(lines)


def emits_interface(schema: dict) -> bool:
    return isinstance(schema, dict) and (
        schema.get("type") == "object" or "properties" in schema
    )


def emit_declaration(name: str, schema: dict, discovered: set) -> str:
    if emits_interface(schema):
        return f"export interface {name} {object_body(schema, discovered)}"
    return f"export type {name} = {schema_to_ts(schema, discovered)};"


def get_op_schema(op: dict, kind: str):
    if kind == "response":
        for code in ("200", "201", "default"):
            r = (op.get("responses") or {}).get(code) or {}
            s = ((r.get("content") or {}).get("application/json") or {}).get("schema")
            if s:
                return s
        return None
    if kind == "request":
        body = op.get("requestBody") or {}
        return ((body.get("content") or {}).get("application/json") or {}).get("schema")
    return None


def pascal(s: str) -> str:
    return s[:1].upper() + s[1:] if s else s


def extract(doc: dict, module: str) -> dict:
    components = ((doc.get("components") or {}).get("schemas") or {})
    operations_mapping = []
    inline_types = {}
    discovered: set = set()

    for path, ops in (doc.get("paths") or {}).items():
        if not isinstance(ops, dict):
            continue
        for method, op in ops.items():
            if method.lower() not in HTTP_METHODS or not isinstance(op, dict):
                continue
            op_id = op.get("operationId") or f"{method}{re.sub(r'[^A-Za-z0-9]', '', path)}"

            response_type = None
            r_schema = get_op_schema(op, "response")
            if r_schema:
                if "$ref" in r_schema:
                    response_type = ref_name(r_schema["$ref"])
                    discovered.add(response_type)
                else:
                    response_type = f"{pascal(op_id)}Response"
                    inline_types[response_type] = r_schema

            request_type = None
            req_schema = get_op_schema(op, "request")
            if req_schema:
                if "$ref" in req_schema:
                    request_type = ref_name(req_schema["$ref"])
                    discovered.add(request_type)
                else:
                    request_type = f"{pascal(op_id)}Request"
                    inline_types[request_type] = req_schema

            operations_mapping.append({
                "method": method.upper(),
                "path": path,
                "operationId": op_id,
                "response_type": response_type,
                "request_type": request_type,
            })

    # Transitive closure: named schemas may reference other named schemas.
    queue = list(discovered)
    seen: set = set()
    while queue:
        name = queue.pop(0)
        if name in seen or name not in components:
            continue
        seen.add(name)
        before = set(discovered)
        schema_to_ts(components[name], discovered)  # mutates discovered
        queue.extend(discovered - before)

    # Emit named types in components.schemas declaration order, then inline types.
    # Object schemas become interfaces; scalar/enum/union schemas become aliases.
    declarations = []
    for name in components:
        if name in seen:
            declarations.append(emit_declaration(name, components[name], discovered))
    for name, schema in inline_types.items():
        declarations.append(emit_declaration(name, schema, discovered))

    title = ((doc.get("info") or {}).get("title")) or "OpenAPI document"
    header = (
        f"// Generated by knowject-api-to-types from {title}.\n"
        f"// Module: {module}.\n"
        f"// Do not edit by hand — re-run knowject-api-to-types to refresh.\n\n"
    )
    body = "\n\n".join(declarations) + ("\n" if declarations else "")

    return {
        "module": module,
        "types_ts": header + body,
        "operations_mapping": operations_mapping,
    }


def main() -> int:
    args = sys.argv[1:]
    if not args:
        print(
            "usage: extract-types-from-openapi.py <openapi.yaml> [--module <name>]",
            file=sys.stderr,
        )
        return 2
    src = Path(args[0])
    module = "api"
    if "--module" in args:
        i = args.index("--module")
        if i + 1 < len(args):
            module = args[i + 1]
    if not src.is_file():
        print(f"not a file: {src}", file=sys.stderr)
        return 2
    doc = yaml.safe_load(src.read_text())
    if not isinstance(doc, dict):
        print("OpenAPI document must be a mapping at the top level", file=sys.stderr)
        return 2
    print(json.dumps(extract(doc, module), indent=2, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    sys.exit(main())
