---
name: knowject-api-to-types
description: |
  Use when the user wants to generate TypeScript types from an OpenAPI document and
  wire them into the typed client produced by knowject-read-api. Triggers on phrases
  like "/knowject types", "把 openapi 转成 types", "给 read-api client 补类型", "生成
  typed client 的类型", "rewrite the unknown placeholders", "wire types into the
  generated client". Day-1 input is OpenAPI 3 only — non-OpenAPI inputs (Express
  routes, Mongoose, Zod, Pydantic, Spring DTOs, Nest decorators, markdown specs,
  etc.) are refused with framework-specific recommendations for exposing OpenAPI.
  Two output modes: (1) primary — emit a sibling <module>.types.ts and rewrite
  request<unknown>(...) in the read-api client to request<X>(...); (2) fallback —
  emit types-only when no read-api client file is found. Both modes use the
  diff-first / confirm-before-write safety gate established in Phase 2.
---

# `knowject-api-to-types`

Body lands in Task 10. Do not consume yet.
