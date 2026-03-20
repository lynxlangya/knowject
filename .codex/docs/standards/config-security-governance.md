# 配置与安全治理标准

## 1. 目标
- 保持配置和运行时密钥的唯一真源，避免因为文档、容器、脚本等多份事实导致 secret 泄露或接口暴露面不一致。
- 明确环境变量、Docker compose、容器出口、health/error 以及内网 API 的边界，确保任何改动都受控可追踪。

## 2. 触发条件
- 新增或修改 `*.env*`、compose、Docker secrets、Kubernetes/容器配置时。
- 引入新的 `JWT_SECRET`、`MONGODB_URI`、`SETTINGS_ENCRYPTION_KEY` 等敏感键或其 `*_FILE` 形式，或将 secret 聚合到新的目录。
- 暴露新的接口 / 端口（包括 `caddy`、`api`、`chroma` 等）给宿主机或公网。
- 服务对外新增健康检查（`/healthz`、`/health`）或错误响应路由，特别是携带可敏感信息的字段。
- 引入 `internal` 路由（如 `apps/indexer-py` 的 `/internal/*`）或新的内部 token 校验逻辑。

## 3. 红线风险
- 敏感配置与 secrets 以明文、测试值、示例文件等形式落在 git，可通过 `docker/secrets/` 或 `.gitignore` 验证；具体禁止 `JWT_SECRET`、`MONGODB_URI` 等直接入仓。
- 任何 `Authorization: Bearer` 以外的 token 泄露（如在日志、错误、`GET /api/settings` 返回的明文 `apiKey`），或 `API_ERROR_EXPOSE_DETAILS=true` 之类会暴露内部字段的开关。
- Docker compose 连接 `mongo`/`chroma` 等服务时缺乏 `internal` 网络隔离，或者 `compose.local.yml` 产生新的外网曝光端口。
- 线上 TLS/HTTP 入口（`caddy`）未被 `https` 代理，直接把敏感接口暴露给 HTTP。
- `internal` 接口（`/internal/*`、`/docs`、`/redoc`、`/openapi.json`）在非 `development` 且未配置 `KNOWLEDGE_INDEXER_INTERNAL_TOKEN` 下被打开。
- 健康探针、错误响应、日志输出回显 secret 或敏感字段。

## 4. 推荐巡检动作
- 检查 `docker/secrets/` 是否仍由 `.gitignore` 屏蔽，生成脚本（`docker/scripts/generate-local-secrets.sh`）按期更新，确保 `*_FILE` 模式与 `pnpm` dev 脚本一致。
- 在配置表（`.env`、compose、CI/CD）里统一使用 `MONGODB_URI_FILE`、`JWT_SECRET_FILE`、`SETTINGS_ENCRYPTION_KEY_FILE`，其余非 secret 配置继续走明文。
- 审阅 expose 端口：确认 `platform`、`api`、`chroma` 仅在 `publish` 网络中发布必要端口，生产默认仅由 `caddy` 处理 TLS。
- 任何 HTTP 登录/设置相关接口的响应都不回显完整 token；200 响应只允许 `apiKeyHint`、`hasKey`，认证或登出逻辑保持前端 localStorage 清理。
- 新增健康检查或 internal 路由时记录依赖：`platform` 复用 `/healthz`、`indexer-py` 固定 `/health`，`/internal/*` 仅在 `KNOWLEDGE_INDEXER_INTERNAL_TOKEN` 启用并带 token 校验。
- 复查 auth contract：`knowject_token`、`Authorization: Bearer`、`401`/`403` 语义保持一致，错误码不要从细节字段泄露。

## 5. 允许例外
- 仅当开发环境必须时，短期开放 `/docs`、`/redoc` 等调试路由，并在 `.env.local`/`docker-compose.dev` 明确标记为 `development` 才允许。上线前需移除输入暴露或加上 token。
- 某些低风险咨询脚本或迁移工具可能需要临时的 `internal` 访问，必须通过文档记录审批并在 Sprint 结束前撤回。

## 6. 文档同步要求
- 与配置/Secret 相关的同步点包括 `.codex/docs/current/docker-usage.md`（compose、网络、secret 路径）、`.codex/docs/contracts/auth-contract.md`（token 写入/暴露规则）、`.codex/docs/plans/tasks-engineering-governance-foundation.md`，确保项目事实与治理标准一致。
- 如果拓扑、端口或 TLS 入口有变更，附带更新 `docker/README.md`、`.codex/docs/current/architecture.md`、`.codex/docs/current/docker-usage.md` 中的边界说明。
- 若新增巡检或 tooling（如新的 secret 生成脚本、lint 规则），同步 `.codex/docs/standards/review-checklist.md` 并通知相关 owner。
