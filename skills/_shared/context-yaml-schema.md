# `knowject/context.yaml` Schema (v0.1)

This file documents the schema for `knowject/context.yaml`, the project context anchor that all Knowject Skills consume. Every field, every constraint, every example lives here.

**Companion:** [`schema.py`](./schema.py) — machine-readable validator (pure Python 3 + PyYAML, self-contained).

## Top-level structure

```yaml
knowject_version: "0.1"
project: {...}      # required
stack: {...}        # required
design: {...}       # optional (recommended when frontend exists)
api: {...}          # optional (recommended when backend exists)
brand: {...}        # optional (recommended when frontend exists)
```

**Partial config is legal.** You can ship a valid `context.yaml` with only `project` + `stack`. Skills that need a missing block (e.g., `knowject-read-design` needs `design`) will refuse to run on that block and report which fields you must add. They will not fabricate values.

## `project` (required)

| Field | Type | Required | Description |
|---|---|---|---|
| `name` | string | ✅ | Project identifier (kebab-case recommended) |
| `description` | string | ✅ | One-line project description |
| `type` | enum | ✅ | `monorepo` \| `frontend-only` \| `backend-only` \| `full-stack` |
| `locale` | enum | ✅ | `zh` \| `en` \| `zh-en` \| `en-zh` — influences Skill output language |

## `stack` (required)

```yaml
stack:
  package_manager: pnpm@10        # required: <name>@<major>
  frontend: {...}                  # required when project.type ∈ {monorepo, frontend-only, full-stack}
  backend: {...}                   # required when project.type ∈ {monorepo, backend-only, full-stack}
```

### `stack.frontend`

| Field | Type | Required | Recommended values |
|---|---|---|---|
| `framework` | string | ✅ | `react@N` \| `vue@N` \| `svelte@N` \| `solid@N` \| `none` |
| `bundler` | string | ✅ | `vite` \| `webpack` \| `next` \| `nuxt` \| `turbopack` |
| `ui` | string | ✅ | `antd` \| `mui` \| `shadcn` \| `chakra` \| `naive` \| `mantine` \| `custom` |
| `styling` | string | ✅ | `tailwind` \| `css-modules` \| `styled-components` \| `emotion` \| `custom` |
| `language` | string | ✅ | `typescript@N` \| `javascript` |

### `stack.backend`

| Field | Type | Required | Recommended values |
|---|---|---|---|
| `framework` | string | ✅ | `express` \| `fastify` \| `nest` \| `fastapi` \| `django` \| `gin` \| `custom` |
| `language` | string | ✅ | `typescript@N` \| `python@N` \| `go@N` \| etc. |
| `database` | string | optional | `mongodb@N` \| `postgres@N` \| `mysql@N` \| omit if none |

## `design` (optional; recommended when frontend exists)

```yaml
design:
  sources:                         # array; can mix formats
    - path: files/designs/         # filesystem path or glob
      format: png                  # png | figma-export | pdf | sketch | url
  output:
    components_dir: apps/platform/src/components
    pages_dir: apps/platform/src/pages
```

## `api` (optional; recommended when backend exists)

When `api` is present, `api.sources` is required. `api.client` is optional — omit it for pure backend services with no frontend caller.

```yaml
api:
  sources:                         # array; can mix formats
    - format: express              # express | openapi | fastapi | nest | markdown
      path: apps/api/src/modules   # filesystem path or glob
  client:
    wrapper: "@knowject/request"   # frontend's API client wrapper (package name or relative path)
    output_dir: apps/platform/src/api
```

## `brand` (optional; recommended when frontend exists)

| Field | Type | Required | Notes |
|---|---|---|---|
| `primary_color` | string (hex) | ✅ | e.g. `#1677ff` |
| `font_family` | string | ✅ | CSS font-family value |
| `voice` | string | ✅ | One-line voice/tone descriptor; affects mock copy |
| `logo_path` | string | optional | Filesystem path relative to project root |
| `reference_mocks` | string[] | optional | Tier 1 does NOT consume; reserved for Tier 2 |

## Forbidden fields

Never include — `context.yaml` is committed to git:

- Base URLs (use environment variables in your app)
- API keys, tokens, secrets
- Database connection strings
- Per-environment configuration

If a Skill needs an environment value, it must read from `.env` or ask the user — never from `context.yaml`.

## Versioning

`knowject_version` at top tracks schema version. Breaking changes bump the version and `knowject-context-init` Skill must support migration from prior versions.

Current version: **0.1**.
