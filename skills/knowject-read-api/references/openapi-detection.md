# OpenAPI detection recipe

When `knowject/context.yaml#api.sources[*].format` is `openapi`, follow this order.

## Step 1 - Resolve the document

`api.sources[*].path` may point at a single file (`openapi.yaml`, `openapi.json`) or a directory containing one. If a directory, prefer `openapi.yaml` then `openapi.json` then `swagger.yaml`; do not merge multiple OpenAPI files automatically - ask the user which is canonical.

## Step 2 - Run the extractor

```bash
python3 <SKILLS_ROOT>/knowject-read-api/scripts/extract-openapi-endpoints.py <openapi-doc>
```

Output shape:

```json
{
  "source": "<file basename>",
  "endpoints": [
    { "method": "GET", "path": "/users", "params": [], "operationId": "listUsers", "summary": "List users" }
  ]
}
```

The `params` list contains only `in: path` parameters; query/header/cookie params are deliberately omitted at this layer - re-read the source document if the user asks about query string shape.

## Step 3 - When the document references external `$ref`s

The extractor does not resolve external `$ref` (e.g., `./schemas/User.yaml#/User`). For Phase 2, discovery answers may quote the local `summary` / `operationId` only; if the user asks about request/response schema shape, read the OpenAPI file directly and trace the `$ref` manually.

## Step 4 - Server URL handling

`servers[*].url` is **not** consumed. Per spec section 6, base URLs are environment-dependent and must not be persisted in `context.yaml`. If the user asks about the base URL, point them at `.env` or the deployment system, do not hard-code it in generated client output.
