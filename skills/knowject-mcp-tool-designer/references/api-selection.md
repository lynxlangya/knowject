# API Selection For MCP Tool Design

Start from the most structured API source available. Do not infer endpoints from UI labels or prose alone.

## Supported Inputs

| Input | How to use it |
|---|---|
| OpenAPI source from `knowject/context.yaml` | Read operations, methods, paths, operation ids, params, request bodies, and response summaries. |
| Express route source from `knowject/context.yaml` | Use `knowject-read-api` extractor output when possible; otherwise cite route files and lines. |
| Endpoint inventory from `knowject-read-api` | Preferred Day-1 input because it is already normalized. |
| Explicit endpoint list | Use only the endpoints the user provided; mark missing behavior as uncertain. |

## Candidate Selection

Prefer endpoints that:

- have a clear single-purpose action
- have explicit path/query/body inputs
- can be described without environment-specific values
- have understandable auth scope
- have low blast radius

Be cautious with endpoints that:

- delete, archive, import, export, rebuild, retry, send, publish, or provision
- support broad filters or bulk mutation
- return sensitive or tenant-crossing data
- lack a clear rollback path
- depend on implicit server-side context not visible in the source

## Naming

Use stable snake_case names:

- `GET /users` -> `list_users`
- `GET /users/{id}` -> `get_user`
- `POST /users` -> `create_user`
- `PATCH /users/{id}` -> `update_user`
- `DELETE /users/{id}` -> `delete_user`

Prefer intent-revealing names over raw REST names when the endpoint is domain-specific, but keep the source endpoint explicit in the schema.
