# OpenAPI 3 → TypeScript mapping

How the extractor turns OpenAPI schema fragments into TypeScript type expressions. Defines the rules the script applies; reviewers can use this as the spec when comparing fixture output.

## Scalars

| OpenAPI `type` | OpenAPI `format` | TypeScript |
|---|---|---|
| `string` | any | `string` |
| `integer` | any | `number` |
| `number` | any | `number` |
| `boolean` | — | `boolean` |
| `null` | — | `null` |

`format` is preserved in the OpenAPI doc for runtime validation but does not change the TypeScript type — `string` with `format: date-time` is still `string`. Runtime parsing of date strings is the consumer's responsibility.

## Composite types

| OpenAPI construct | TypeScript |
|---|---|
| `$ref: '#/components/schemas/X'` | `X` (and the named schema is added to the emit queue) |
| `enum: [a, b, c]` | `"a" \| "b" \| "c"` (literal union) |
| `oneOf: [A, B]` | `A \| B` |
| `anyOf: [A, B]` | `A \| B` (TypeScript has no distinct anyOf semantics; the union is the closest analogue) |
| `allOf: [A, B]` | `A & B` |
| `type: array, items: X` | `Array<X>` |
| `type: object, properties: {…}` | `{ …key-value pairs… }` |
| object with no `properties` | `Record<string, unknown>` |
| `not`, `discriminator`, `patternProperties` | `unknown` (escape hatch; flagged in v2 to support properly) |

## Object properties

For each property under `properties`:

- If the property name appears in the schema's `required` array → emit `<name>: <type>;`
- Otherwise → emit `<name>?: <type>;` (TypeScript optional marker)
- If the property name is not a valid TypeScript identifier, emit it as a string-literal property, e.g. `"display-name": string;`.

Nested inline object schemas are indented one level relative to their parent.

## Naming

| Source | Name |
|---|---|
| Schema in `components.schemas.X` | `X` (verbatim, preserve PascalCase) |
| Inline response schema on an operation | `<PascalOperationId>Response` |
| Inline request body schema on an operation | `<PascalOperationId>Request` |

Where `PascalOperationId` is `operationId[0].upper() + operationId[1:]`. The script does not invent operation IDs — if an operation lacks `operationId`, it synthesizes `<method><pathStripped>` and uses that as the base.

## Ordering

Emit order in the `.types.ts` file:

1. Named types from `components.schemas` in **declaration order** (the order they appear in the OpenAPI document), filtered to only the ones reachable via transitive `$ref` closure from at least one operation. Object schemas emit `export interface`; non-object schemas such as named enums, scalar aliases, arrays, and unions emit `export type`.
2. Inline-synthesized types (`*Response` / `*Request`) in operation-walk order.

Unreachable types in `components.schemas` are **not** emitted — the Skill only generates code for endpoints the project actually consumes (per the read-api inventory). This is a deliberate differentiation from `openapi-typescript`, which emits all components regardless of use.

## Reference output

See [`examples/types-output-expected.ts`](./examples/types-output-expected.ts) for the canonical rendering of the fixture OpenAPI input.
