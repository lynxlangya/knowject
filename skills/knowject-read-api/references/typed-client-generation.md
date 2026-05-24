# Typed client generation

Triggered when the user asks "generate typed client for module X" or equivalent, **and** `knowject/context.yaml#api.client` is populated.

## Inputs

1. Endpoint inventory from `extract-express-routes.py` or `extract-openapi-endpoints.py` (the JSON shape from `*-detection.md`).
2. `api.client.wrapper` - the HTTP wrapper package or path (e.g. `@knowject/request`).
3. `api.client.output_dir` - where the file goes.
4. (Optional) `api.client.module_name` if the user supplies one, otherwise derive from the source filename.

## Deterministic generator

Run:

```bash
python3 <SKILLS_ROOT>/knowject-read-api/scripts/generate-typed-client.py \
  <endpoint-inventory.json> --wrapper <api.client.wrapper>
```

The script writes the TypeScript client to stdout. The Skill body is responsible for showing the diff and writing it to `<api.client.output_dir>/<module-name>.ts` after confirmation.

## Output contract

One TypeScript file at `<api.client.output_dir>/<module-name>.ts`. Header comment must include the source file + Skill name + the wrapper. One exported function per endpoint, named via the rule below.

### Function naming

| Source signal | Function name |
|---|---|
| OpenAPI `operationId` is present | use it verbatim |
| Express method + path | `<verb><Resource>[<By...>]` - e.g. `GET /users` -> `listUsers`, `POST /users` -> `createUser`, `GET /users/:id` -> `getUser`, `PATCH /users/:id` -> `updateUser`, `DELETE /users/:id` -> `deleteUser`. For multi-param paths, append all params: `GET /orders/:orderId/items/:itemId` -> `getOrderItem`. |

### Signature rules

- Path params become positional `string` arguments in declaration order.
- `POST` / `PUT` / `PATCH` take a trailing `body: unknown` parameter.
- `GET` / `DELETE` do not take a body parameter.
- Return type is always `request<unknown>({...})` - typed schemas come from the future `knowject-api-to-types` Skill (Tier 2). Do not invent return types in Phase 2.

### Wrapper invocation

Default shape (mirror `api.client.wrapper`):

```ts
import { request } from '<api.client.wrapper>';

export const <name> = (<args>) =>
  request<unknown>({ method: '<METHOD>', url: `<path-with-template-literals>`, data?: <body> });
```

If the wrapper exports a default function instead of `request`, change the import line accordingly but keep the call shape.

## Mount-prefix handling

If express-detection.md Step 4 prepended a mount prefix to the endpoint inventory, the generated `url` must include it. The agent must not add another prefix at codegen time.

## What this Skill does NOT do

- Does not generate request/response interfaces (Tier 2 `knowject-api-to-types`).
- Does not write tests for the generated client.
- Does not modify `package.json` to add the wrapper dependency - surfaces a one-line note if the wrapper package is missing from `dependencies`.

## Reference output

See [`examples/typed-client-expected.ts`](./examples/typed-client-expected.ts) - generated from the Express fixture + `wrapper: "@knowject/request"`.
