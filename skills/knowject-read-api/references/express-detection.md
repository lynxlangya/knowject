# Express detection recipe

When `knowject/context.yaml#api.sources[*].format` is `express`, follow this order.

## Step 1 - Resolve the source root

Use `api.sources[*].path` from `knowject/context.yaml`. Walk it for `*.ts`, `*.tsx`, `*.js`, `*.mjs` files. The agent should ignore obvious non-route files (`*.test.*`, `*.spec.*`, `*.d.ts`, `dist/`, `node_modules/`).

## Step 2 - Run the extractor

The deterministic path:

```bash
python3 <SKILLS_ROOT>/knowject-read-api/scripts/extract-express-routes.py <route-file>
```

Output shape:

```json
{
  "source": "<file basename>",
  "endpoints": [
    { "method": "GET", "path": "/users", "params": [], "line": 6 }
  ]
}
```

Run it per file and concatenate the `endpoints` arrays in the order the files were walked. Tag each endpoint with its absolute path before merging so discovery answers can cite `file:line`.

## Step 3 - When the extractor under-reports

The extractor is regex-based on purpose. It misses:

- Routes registered through a wrapper helper (`registerRoute(app, 'GET', '/x', h)`).
- Routes mounted at a non-root prefix via `app.use('/v1', subRouter)` - the extractor reports `/users`, not `/v1/users`.
- Routes whose path is a variable, not a string literal.

When **any** of these signals appear in a file, fall back to reading the file manually with Read / Grep and report the agent's best-effort inventory alongside a one-line caveat: "Detected wrapper-style route registration; inventory may be incomplete - see <file>."

## Step 4 - Cross-reference mount prefixes

If `app.use('/api', usersRouter)` lives in the entry file (commonly `app.ts` / `create-app.ts` / `index.ts`), prepend `/api` to each endpoint reported from the corresponding router file. Do this once after extraction, do not re-scan.

## Step 5 - Citation format

For discovery answers, always cite `<repo-relative-path>:<line>` from the extractor output so the user can jump to source. Do not cite line numbers the extractor did not produce.
