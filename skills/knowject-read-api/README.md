# knowject-read-api

## What It Does

`knowject-read-api` reads the project's API surface and either answers questions about endpoints or generates typed HTTP client stubs. It uses `api.sources` from `knowject/context.yaml` and supports Express routes and OpenAPI documents in the current phase.

Discovery mode cites endpoint sources. Generation mode writes a TypeScript client that calls the configured request wrapper.

## When To Use

- You need to find whether an endpoint exists and where it is defined.
- You want a typed client stub for a backend module.
- You are integrating frontend and backend code and need a project-grounded API inventory.

## Inputs

- `knowject/context.yaml`.
- `api.sources[*]` with `format: express` or `format: openapi`.
- For client generation: `api.client.wrapper` and `api.client.output_dir`.
- Optional module name or endpoint query from the user.

## Outputs

- Discovery answers with repo-relative file and line citations.
- Generated typed client files under `api.client.output_dir` when requested.
- A prompt to generate a client when discovery mode finds relevant endpoints.
- Diffs and overwrite confirmations for existing client files.

## Example

User asks:

```text
/knowject api find the user list endpoint
```

Expected result:

```text
The Skill reads configured API sources, extracts endpoints, and reports the matching method/path with source file citations. It offers to generate a typed client if useful.
```

## Safety Rules

- Refuse without `knowject/context.yaml`.
- Never invent endpoints; if extraction finds nothing, say so.
- Prefer deterministic extractors over ad-hoc search when the source format is supported.
- Never write base URLs, API keys, tokens, or environment-specific config into generated clients.
- Never overwrite existing client files silently.
- Do not modify barrel files automatically.

## Related Files

- [`SKILL.md`](./SKILL.md)
- [`agents/openai.yaml`](./agents/openai.yaml)
- [`scripts/extract-express-routes.py`](./scripts/extract-express-routes.py)
- [`scripts/extract-openapi-endpoints.py`](./scripts/extract-openapi-endpoints.py)
- [`scripts/generate-typed-client.py`](./scripts/generate-typed-client.py)
- [`references/discovery-vs-generation.md`](./references/discovery-vs-generation.md)
- [`references/express-detection.md`](./references/express-detection.md)
- [`references/openapi-detection.md`](./references/openapi-detection.md)
- [`references/typed-client-generation.md`](./references/typed-client-generation.md)
- [`references/examples/`](./references/examples/)
