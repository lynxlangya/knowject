# Discovery vs Generation

`knowject-read-api` has two modes. Pick the mode from the user's intent **before** doing any source scanning - the work overlaps but the output is different.

## Mode A - Discovery

**Triggers:** "有没有 X endpoint", "find the user list route", "list all POST routes", "where is /api/orders defined", "show the API surface".

**Output:** A short answer in the user's language, citing `<repo-relative-path>:<line>` (Express) or `<openapi-file>#<path>.<method>` (OpenAPI) for each endpoint mentioned. Do **not** generate code. Do **not** write any file.

**Flow:**
1. Read `knowject/context.yaml#api.sources[*]`.
2. For each source, run the appropriate extractor (see `express-detection.md` / `openapi-detection.md`).
3. Filter the merged inventory by the user's query (method, path substring, params).
4. Answer with the filtered list + citations.

## Mode B - Generation

**Triggers:** "generate typed client for users", "把 orders 模块的 client 写一下", "wire up the client for module X", "create a typed client".

**Output:** One `.ts` file at `<api.client.output_dir>/<module-name>.ts`, plus a one-line summary in the user's language.

**Flow:**
1. Read `knowject/context.yaml#api.sources[*]` **and** `knowject/context.yaml#api.client`.
2. If `api.client` is missing or incomplete, refuse and tell the user which fields are missing - do not invent a wrapper or output path.
3. Extract endpoints for the requested module only (the user names it, or it is inferred from the source file the user pointed at).
4. Build the typed client per `typed-client-generation.md`.
5. Write the file. Do not overwrite an existing file silently - diff first and ask for confirmation.

## When the user is ambiguous

If the user says "scan the api" without indicating intent, default to Mode A (discovery) and end the answer with "Want me to generate a typed client for any of these? Tell me the module name."

## Preconditions

Both modes require `knowject/context.yaml` to exist and contain `api.sources`. If not, point the user at `knowject-context-init` and stop.
