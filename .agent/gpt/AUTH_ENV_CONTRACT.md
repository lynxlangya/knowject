# Knowject 认证与环境契约（ChatGPT Projects 上传版）

状态：2026-03-13  
来源：基于 `.agent/docs/contracts/auth-contract.md` 精简同步。  
定位：用于回答登录、JWT、环境变量与安全边界。

## 1. 当前认证基线

- 登录入口固定为 `/login`
- 不新增 `/register` 路由
- 已落地：
  - `POST /api/auth/register`
  - `POST /api/auth/login`
  - `GET /api/auth/users`
  - JWT 鉴权中间件
  - `argon2id` 密码哈希

## 2. JWT 约定

- 只做 `access token`
- 算法固定 `HS256`
- 不做 refresh token
- 不做 token 黑名单
- Bearer token 格式：
  - `Authorization: Bearer <token>`

### 关键 claims

- `sub`
- `username`
- `iss`
- `aud`
- `iat`
- `exp`

## 3. 前端存储约定

- `localStorage['knowject_token']`
- `localStorage['knowject_auth_user']`
- `localStorage['knowject_remembered_username']`

## 4. 安全边界

- 服务端只存 `passwordHash`，不存明文密码
- 哈希算法固定为 `argon2id`
- 生产环境下：
  - `/api/auth/*` 必须走 HTTPS
  - `/api/memory/*` 必须走 HTTPS
- `/api/auth/*` 与 `/api/memory/*` 默认带 `Cache-Control: no-store`

## 5. 环境变量规则

- 模板文件：`/.env.example`
- 本地真实值：`.env.local`
- 加载顺序：
  - `.env`
  - `.env.local`
- 所有字符串型变量支持 `<NAME>_FILE`
- 同一份 env 中不要同时定义 `NAME` 和 `NAME_FILE`

## 6. 当前最小必需变量

- `PORT`
- `APP_NAME`
- `CORS_ORIGIN`
- `MONGODB_URI`
- `MONGODB_DB_NAME`
- `JWT_SECRET`
- `JWT_EXPIRES_IN`
- `JWT_ISSUER`
- `JWT_AUDIENCE`
- `ARGON2_MEMORY_COST`
- `ARGON2_TIME_COST`
- `ARGON2_PARALLELISM`
- `API_ERROR_EXPOSE_DETAILS`
- `API_ERROR_INCLUDE_STACK`

## 7. 当前与知识索引相关的已生效变量

- `CHROMA_URL`
- `CHROMA_HEARTBEAT_PATH`
- `KNOWLEDGE_INDEXER_URL`
- `KNOWLEDGE_INDEXER_TIMEOUT_MS`
- `OPENAI_API_KEY`
- `OPENAI_BASE_URL`
- `OPENAI_EMBEDDING_MODEL`
- `OPENAI_TIMEOUT_MS`

说明：

- `CHROMA_URL` 当前已经不仅用于健康诊断，也用于 `global_docs` 的正式写侧索引与统一检索。
- `KNOWLEDGE_INDEXER_URL` 默认回落到 `http://127.0.0.1:8001`，本地 `pnpm dev` 会一起带起 `apps/indexer-py`。
- 在 `development` 环境下，若缺少 `OPENAI_API_KEY`，上传链路会退化到 deterministic 本地 embedding，用于保持文档上传与状态流可验证；正式检索与生产环境仍以真实 OpenAI-compatible embedding 为准。

## 8. ChatGPT 使用提醒

- 如果讨论的是：
  - 登录
  - JWT
  - env
  - Docker secrets
  请优先参考这份文件。
- 如果讨论的是：
  - Node / Python / Chroma / MongoDB 分层
  请切到 `INDEXING_DECISION.md`。
