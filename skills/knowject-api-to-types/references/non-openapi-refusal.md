# Non-OpenAPI refusal recipes

Day-1 only supports `format: openapi`. For every other value of `api.sources[*].format`, the Skill refuses and outputs the matching recommendation below — verbatim — in the user's language.

## Refusal template

```
knowject-api-to-types Day-1 only consumes OpenAPI 3 documents. Your
context.yaml declares `api.sources[*].format: <FORMAT>`, which is not
supported yet. To use this Skill, expose an OpenAPI document via:

<framework-specific recommendation>

Re-run knowject-context-init with `api.sources[*].format: openapi` and
`api.sources[*].path: <generated-openapi-path>` after the OpenAPI doc
exists, then re-trigger this Skill.
```

## Per-framework recommendations

| `format` value (from context.yaml) | Recommended OpenAPI exposure tool |
|---|---|
| `express` | [`tsoa`](https://tsoa-community.github.io/docs/) for TypeScript-decorated controllers, or [`express-openapi-validator`](https://github.com/cdimascio/express-openapi-validator) + [`swagger-jsdoc`](https://github.com/Surnet/swagger-jsdoc) for JSDoc-annotated routes, or [`zod-to-openapi`](https://github.com/asteasolutions/zod-to-openapi) if you already use Zod for validation. |
| `fastapi` | FastAPI exposes OpenAPI automatically at `/openapi.json`. Set `api.sources[*].path` to that URL or a downloaded copy. |
| `nest` | [`@nestjs/swagger`](https://docs.nestjs.com/openapi/introduction) module. Generated doc available at `/api-docs-json` after configuration. |
| `django` | [`drf-spectacular`](https://drf-spectacular.readthedocs.io/) for Django REST Framework; `manage.py spectacular --file openapi.yaml`. |
| `flask` | [`flask-smorest`](https://flask-smorest.readthedocs.io/) or [`apispec`](https://apispec.readthedocs.io/). |
| `spring` (Java) | [`springdoc-openapi`](https://springdoc.org/); generated at `/v3/api-docs`. |
| `gin` / `echo` (Go) | [`swag`](https://github.com/swaggo/swag) — annotate handlers, run `swag init`. |
| `axum` / `actix` (Rust) | [`utoipa`](https://github.com/juhaku/utoipa). |
| `rails` (Ruby) | [`rswag`](https://github.com/rswag/rswag). |
| `markdown` | No automatic conversion exists. Either rewrite the docs as OpenAPI by hand, or treat the API as un-typed and skip this Skill. |
| anything else | Refer the user to the OpenAPI ecosystem tooling for their stack; do not attempt native parsing. |

## Why not just parse the native source?

Documented in `skills/ROADMAP.md` Phase 3 Design block (locked 2026-05-17): every native parser is a separate AST engineering project (validator library version drift, decorator metadata, ORM coupling), and OpenAPI is the only true polyglot common denominator. v2 native paths can land as additive expansions without breaking the Day-1 contract.
