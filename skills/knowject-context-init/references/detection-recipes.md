# Detection Recipes for `knowject-context-init`

This document is loaded **on demand** by the `knowject-context-init` Skill when it needs concrete detection patterns. Do not load eagerly — only when the Skill is actively running Step 1 (Scan).

## Project type detection

| Signal | Inferred type |
|---|---|
| `apps/` directory exists with multiple subprojects | `monorepo` |
| Top-level `frontend/` AND `backend/` directories | `full-stack` |
| `package.json` exists, no backend deps in dependencies | `frontend-only` |
| `package.json` exists, no React/Vue/Svelte in deps | `backend-only` |
| `pyproject.toml` or `requirements.txt` only | `backend-only` |
| `Cargo.toml` only | `backend-only` |
| `go.mod` only | `backend-only` |

When ambiguous, ask the user to pick from the 4 enum values.

## Frontend framework detection

Read root `package.json#dependencies`:

| Dep | Inferred `framework` |
|---|---|
| `react` ≥ 16 | `react@<major>` |
| `vue` ≥ 3 | `vue@<major>` |
| `svelte` ≥ 4 | `svelte@<major>` |
| `solid-js` | `solid@<major>` |
| none of the above | `none` (then likely backend-only) |

## Bundler detection

| Sign | Inferred `bundler` |
|---|---|
| `vite` in devDeps | `vite@<major>` |
| `next` in deps | `next@<major>` |
| `nuxt` in deps | `nuxt@<major>` |
| `webpack` in devDeps + no vite | `webpack@<major>` |

## UI library detection

| Sign | Inferred `ui` |
|---|---|
| `antd` in deps | `antd@<major>` |
| `@mui/material` in deps | `mui@<major>` |
| `@radix-ui/*` or `class-variance-authority` + Tailwind | `shadcn` |
| `@chakra-ui/react` | `chakra@<major>` |
| `naive-ui` | `naive@<major>` |
| `@mantine/core` | `mantine@<major>` |
| none | `custom` (and confirm with user) |

## Styling detection

| Sign | Inferred `styling` |
|---|---|
| `tailwindcss` in devDeps + `tailwind.config.*` | `tailwind@<major>` |
| `styled-components` in deps | `styled-components` |
| `@emotion/react` | `emotion` |
| `*.module.css` files present | `css-modules` |
| none of the above | `custom` |

## Backend framework detection

| Sign | Inferred `framework` |
|---|---|
| `express` in deps | `express@<major>` |
| `fastify` in deps | `fastify@<major>` |
| `@nestjs/core` in deps | `nest@<major>` |
| `fastapi` in `pyproject.toml` / `requirements.txt` | `fastapi` |
| `django` in `pyproject.toml` / `requirements.txt` | `django` |
| `github.com/gin-gonic/gin` in `go.mod` | `gin` |

## Database detection

| Sign | Inferred `database` |
|---|---|
| `mongodb` driver in deps | `mongodb@<major>` |
| `pg` or `postgres` in deps | `postgres@<major>` |
| `mysql2` in deps | `mysql@<major>` |
| `prisma` schema → look at `datasource` block | follow prisma |
| no driver detected | omit field |

## Design source directory candidates

In order of likelihood, check existence:

1. `files/designs/`
2. `design/`
3. `designs/`
4. `mockups/`
5. `figma/`
6. `prototype/` or `Prototype/`
7. `assets/design/`

If any exists, peek inside:

- Files end in `.png` / `.jpg` → `format: png`
- Files end in `.fig` or `figma-export.json` → `format: figma-export`
- Files end in `.pdf` → `format: pdf`
- Files end in `.sketch` → `format: sketch`
- Mixed → use most common; user can edit later

## Components / pages directory candidates

Look for the deepest matching path:

- `apps/<workspace>/src/components` (monorepo)
- `frontend/src/components`
- `src/components`
- `app/components`

Same for pages: `pages/`, `views/`, `routes/`, `app/`.

## API source directory candidates

| Backend framework | Likely path |
|---|---|
| Express / Fastify (TS) | `apps/api/src/modules` or `src/routes` or `routes/` |
| NestJS | `src/modules` or `src/<feature>/<feature>.controller.ts` |
| FastAPI | `app/routers` or `app/api` |
| Django | `*/views.py` and `*/urls.py` |
| Existing `openapi.yaml` / `openapi.json` | use that file directly |

## Frontend API client wrapper detection

| Sign | Inferred `wrapper` |
|---|---|
| `@knowject/request` in deps (or any workspace `request` package) | that package name |
| Standalone `apps/<workspace>/src/api/index.ts` exporting an axios wrapper | path to that file |
| `axios` in deps + no wrapper file | `axios` |
| Only `fetch` used | `fetch` |
| none detected | ask user |

## Brand primary color detection

1. `tailwind.config.{js,ts,mjs}` → look for `theme.extend.colors.primary` or first custom color
2. `antd` theme config → `token.colorPrimary`
3. `:root` CSS custom properties for `--color-primary` / `--primary`
4. README badges (last resort)
5. Ask user

## Font detection

1. `tailwind.config.*` `theme.extend.fontFamily`
2. `index.html` `<link rel="stylesheet" href="...fonts.googleapis...">`
3. CSS `@import url("...fonts...")`
4. Ask user

## Locale detection

1. Count Chinese vs ASCII characters in `README.md` first 1000 chars
2. > 30% Chinese → `zh`; > 30% ASCII letters → `en`; mixed → ask

## Always-ask fields (no detection)

- `brand.voice` — no reliable detection
- `brand.reference_mocks` — no reliable detection
- `project.description` if README has none — ask
