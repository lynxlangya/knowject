---
name: knowject-read-api
description: |
  Use when the user asks to discover backend API endpoints or generate a typed HTTP
  client in a project that has knowject/context.yaml. Triggers on phrases like
  "/knowject api", "找一下用户列表 endpoint", "生成 typed client", "has there been a
  POST /orders endpoint", "scan the api", "wire up the client for the users module",
  "把 user 接口的 client 帮我写一下". Two modes: discovery (answer questions about the
  API surface) and generation (emit a typed-client TypeScript file under
  api.client.output_dir using api.client.wrapper). Reads api.sources[*] from
  knowject/context.yaml — Phase 2 supports format=express and format=openapi.
---

# `knowject-read-api`

Body lands in Task 9. Do not consume yet.
