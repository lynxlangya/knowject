# AGENTS.md

## 1. 目录职责

- 本目录是 Python 索引运行时，只覆盖 `app/api / core / domain/indexing / schemas / services`。
- 负责解析、清洗、分块、embedding、Chroma 写删侧与 diagnostics。
- 不负责 Mongo 业务主状态，也不替代 `apps/api` 的正式 API。

## 2. 先读什么

1. 根 `AGENTS.md`
2. `apps/indexer-py/README.md`
3. `docs/contracts/chroma-decision.md`
4. `apps/api/src/modules/knowledge/AGENTS.md`

## 3. 本层不能猜的事实

- internal token 在非 development 下必须 fail-close
- parser / chunker / embedding / chroma / diagnostics 的各自职责
- Node 管业务主状态，Python 只返回处理结果
- `global_code` 仍不是 live 导入链路

## 4. 边界

- `app/api` 只承接内部控制面路由。
- `app/domain/indexing/*` 负责索引核心能力，不把业务状态逻辑带进来。
- 修改控制面契约前，先确认 `apps/api` knowledge 调用链与 `docs/contracts/chroma-decision.md`。

## 5. 默认验证

- `uv run pytest`
- 需要时重点跑 indexing、diagnostics、delete/rebuild 相关测试

## 6. 文档同步

- 若改动 internal route、parser 支持面、embedding/chroma 行为或 internal token 安全边界，回推：
  - `apps/indexer-py/README.md`
  - `docs/contracts/chroma-decision.md`
  - 必要时 `apps/api/README.md`
