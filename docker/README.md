# Docker 操作入口

状态：2026-03-18 已收口。  
定位：本文件只保留 Docker 命令入口、运行流分层和跳转链接；当前拓扑、端口、secrets 契约与部署边界统一以 [`docs/current/docker-usage.md`](../docs/current/docker-usage.md) 为准。

## 1. 先看哪里

- 当前 Docker 事实：[`../docs/current/docker-usage.md`](../docs/current/docker-usage.md)
- 直接操作清单：[`../docs/current/docker-operation-checklist.md`](../docs/current/docker-operation-checklist.md)
- env / JWT / MongoDB 契约：[`../docs/contracts/auth-contract.md`](../docs/contracts/auth-contract.md)
- 仓库级启动入口：[`../README.md`](../README.md)

## 2. 统一命令入口

```bash
./scripts/knowject.sh help
pnpm knowject:help
```

当前运行流分三类：

- 宿主机开发：`pnpm dev:init`、`pnpm dev:up`
- 仅依赖容器：`pnpm dev:deps:up`、`pnpm dev:deps:health`、`pnpm dev:deps:down`
- 完整 Docker 本地联调：`pnpm docker:local:init`、`pnpm docker:local:up`
- 生产式编排：`pnpm docker:prod:init`、`pnpm docker:prod:config`、`pnpm docker:prod:up`

## 3. 本地常用命令

```bash
pnpm docker:local:init
pnpm docker:local:up
pnpm docker:local:ps
pnpm docker:local:logs -- api
pnpm docker:local:health
pnpm docker:local:down
pnpm docker:local:reset
```

## 4. 线上常用命令

```bash
pnpm docker:prod:init
pnpm docker:prod:config
pnpm docker:prod:up
pnpm docker:prod:ps
pnpm docker:prod:logs -- caddy api
pnpm docker:prod:down
```

## 5. 当前操作约定

- 实际 secrets 统一放在 `docker/secrets/`，不入仓。
- API secret / connection-string canonical `*_FILE` 契约固定为 `MONGODB_URI_FILE`、`JWT_SECRET_FILE`、`SETTINGS_ENCRYPTION_KEY_FILE`；可选 secret 保留 `OPENAI_API_KEY_FILE`。
- `pnpm dev:up` 默认运行宿主机 `platform + api + indexer-py`；`pnpm docker:local:up` 才是完整容器拓扑。
- `pnpm docker:prod:up` 默认按 image-only 方式启动，不再隐式 `--build`；生产镜像需要预先准备好。
- `scripts/knowject.sh` 只负责命令分发；helper 已拆到 `scripts/lib/knowject-*.sh`。
- 如果需要确认端口、网络、健康检查、Chroma、Caddy 或 compose 当前事实，不要在这里继续追加说明，回到 [`docs/current/docker-usage.md`](../docs/current/docker-usage.md) 更新。

## 6. 维护规则

- Docker 拓扑、端口、健康检查、secrets 契约变化：先更新 [`docs/current/docker-usage.md`](../docs/current/docker-usage.md)，再视命令面是否变化决定是否更新本文件。
- 本文件只保留可执行命令、运行流入口和文档跳转，不再重复维护当前事实。
