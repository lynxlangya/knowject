---
name: knowject-read-api
description: |
  Use when the user asks to discover backend API endpoints or generate a typed HTTP
  client in a project that has knowject/context.yaml. Triggers on phrases like
  "/knowject api", "找一下用户列表 endpoint", "生成 typed client", "has there been a
  POST /orders endpoint", "scan the api", "wire up the client for the users module",
  "把 user 接口的 client 帮我写一下". Two modes: discovery (answer questions about the
  API surface) and generation (emit a typed-client TypeScript file under
  api.client.output_dir using api.client.wrapper). Reads api.sources[*] from
  knowject/context.yaml — Phase 2 supports format=express and format=openapi.
---

# `knowject-read-api`

You read the project's API surface and answer about it, or generate a typed client that consumes it.

## Hard rules

1. **Refuse without `knowject/context.yaml`.** If the file is missing, tell the user to run `knowject-context-init` first and stop. Do not guess paths.
2. **Use the user's language.** Detect from their first message.
3. **Never invent endpoints.** If the extractor returns nothing for a path the user asked about, say so - do not hallucinate routes.
4. **Never write secrets.** Generated clients reference `api.client.wrapper`; they do not embed base URLs, API keys, or environment-specific config.
5. **Prefer the deterministic extractors** in [`scripts/`](./scripts/) over ad-hoc grep when the source format matches. Manual fallback is allowed only when [`references/express-detection.md`](./references/express-detection.md) Step 3 signals trigger it.
6. **Do not overwrite existing client files silently.** Diff first, ask, then write.

## Flow

### Step 1 - Pick the mode

Read [`references/discovery-vs-generation.md`](./references/discovery-vs-generation.md). Pick **Mode A (Discovery)** or **Mode B (Generation)** from the user's intent. If ambiguous, default to Discovery and ask whether the user wants a typed client at the end.

### Step 2 - Load context

Read `knowject/context.yaml`:

- `api.sources[*]` - required for both modes.
- `api.client` - required for Mode B only.

If `api.sources` is missing or empty: refuse, point at `knowject-context-init`.

### Step 3 - Build the inventory

For each source in `api.sources`:

| `format` | Recipe |
|---|---|
| `express` | [`references/express-detection.md`](./references/express-detection.md) - uses [`scripts/extract-express-routes.py`](./scripts/extract-express-routes.py) |
| `openapi` | [`references/openapi-detection.md`](./references/openapi-detection.md) - uses [`scripts/extract-openapi-endpoints.py`](./scripts/extract-openapi-endpoints.py) |
| `fastapi` / `nest` / `markdown` | Out of scope for Phase 2 - tell the user this format isn't supported yet and stop. |

Merge endpoint lists in source-declaration order, prepending mount prefixes per `express-detection.md` Step 4.

### Step 4 - Mode-specific output

**Mode A:** Filter the inventory by the user's query (method / path substring / param). Answer in the user's language with `<repo-relative-path>:<line>` citations from the extractor output. End with "Want me to generate a typed client for any of these? Tell me the module name."

**Mode B:** Follow [`references/typed-client-generation.md`](./references/typed-client-generation.md). Run [`scripts/generate-typed-client.py`](./scripts/generate-typed-client.py) against the endpoint inventory, `api.client.wrapper`, and the selected module name. Output target is `<api.client.output_dir>/<module-name>.ts`. If the file exists, show a diff to the user and ask before writing. After writing, output a one-line summary plus a hint to wire the new module into the project's existing client barrel file if one exists (do not modify the barrel automatically).

## Failure modes

- **`knowject/context.yaml` missing:** point at `knowject-context-init`, stop.
- **`api.sources` missing or empty:** same.
- **`api.sources[*].format` is `fastapi` / `nest` / `markdown`:** explain Phase 2 only supports `express` and `openapi`, point at the roadmap, stop.
- **Mode B but `api.client.wrapper` or `api.client.output_dir` missing:** name the missing field, ask the user to update `knowject/context.yaml`, stop.
- **Source path does not exist on disk:** print the expected path verbatim and ask the user whether the project layout has changed; do not silently rescan elsewhere.
- **Extractor exits non-zero:** show stderr to the user. If PyYAML missing (exit 3), tell the user `pip install pyyaml`.
- **Extractor returns empty inventory for a non-empty source:** likely a regex miss; tell the user, show one sample file from the source directory, and ask whether the file uses a wrapper helper or non-literal path.

## See also

- Mode dispatcher: [`references/discovery-vs-generation.md`](./references/discovery-vs-generation.md)
- Express recipe: [`references/express-detection.md`](./references/express-detection.md)
- OpenAPI recipe: [`references/openapi-detection.md`](./references/openapi-detection.md)
- Client generator: [`scripts/generate-typed-client.py`](./scripts/generate-typed-client.py)
- Codegen: [`references/typed-client-generation.md`](./references/typed-client-generation.md)
- Examples: [`references/examples/`](./references/examples/)
- Schema reference: [`../_shared/context-yaml-schema.md`](../_shared/context-yaml-schema.md)
