# Docker 部署说明

本目录提供 Knowject 的容器化交付基线，目标是同时支持：

- 本地体验与联调
- 面向其他公司 / 项目组的私有化打包部署
- 本地与线上环境分层
- secrets 不进入 git

推荐优先通过统一命令入口操作：

```bash
./scripts/knowject.sh help
pnpm knowject:help
```

当前固定版本：

- MongoDB 容器镜像：`mongo:8.2.5`
- Chroma 容器镜像：`chromadb/chroma:1.5.5`
- API 使用的 `mongodb` Node.js Driver：`7.1.0`

## 1. 文件结构

```text
docker/
  api/
    Dockerfile
    start-api.sh
  indexer-py/
    Dockerfile
  platform/
    Dockerfile
    nginx.conf
  mongo/
    init/01-create-app-user.sh
  caddy/
    Caddyfile
  scripts/
    generate-local-secrets.sh
```

根目录编排文件：

- `compose.yml`：公共基线
- `compose.local.yml`：本地体验与调试端口暴露，并为宿主机发布端口补充非 `internal` 的 `publish` 网络
- `compose.production.yml`：线上 HTTPS 入口
- `.env.docker.local.example` / `.env.docker.production.example`：固定镜像 tag 与环境模板
- 本地可改的是宿主机发布端口（如 `WEB_PORT`、`API_PUBLISHED_PORT`），API 容器内部监听端口固定为 `3001`
- Chroma 心跳路径默认是 `/api/v2/heartbeat`，如需改动请同步修改 `CHROMA_HEARTBEAT_PATH`，脚本与容器健康检查会共享该值

## 2. 安全约定

- 实际 secrets 放在 `docker/secrets/`，目录已被 `.gitignore` 忽略。
- API 支持 `JWT_SECRET_FILE`、`MONGODB_URI_FILE` 等 `*_FILE` 读取方式。
- MongoDB root 与应用账号密码通过 Docker secrets 文件注入。
- 默认不对外暴露 `api`、`mongo`、`chroma`；仅本地 override 才映射到宿主机。
- 公共基线中的 `app`、`data` 网络保持 `internal`；本地若要直接把 `api / mongo / chroma` 发布给宿主机，需要额外挂载 `publish` 网络，否则会出现“端口声明存在但未真正绑定”的状态。
- 生产环境通过 `caddy` 提供 HTTPS；否则 API 的敏感路由会因安全传输保护而被拒绝。

## 3. 本地启动

说明：

- `pnpm docker:local:up` 会启动完整本地部署拓扑：`platform + api + indexer-py + mongo + chroma`
- 这条命令更适合集成联调、部署验收和对外交付演示
- 日常本地开发更推荐宿主机运行前后端，只把 `mongo / chroma` 放进 Docker
- 当前 `pnpm dev` / `pnpm dev:up` 会在宿主机同时启动 `platform + api + indexer-py`，避免知识库上传在默认开发流里因为缺少 Python indexer 而直接失败
- 完整编排会把 API 与 `indexer-py` 绑定到同一个知识存储卷，保证跨容器仍能读取上传文件
- 推荐日常开发命令：
  - `pnpm dev:init`
  - `pnpm dev:up`
  - `pnpm dev:deps:up`
  - `pnpm dev:deps:health`
  - `pnpm dev:deps:down`
- 具体操作清单见 `../.agent/docs/current/docker-operation-checklist.md`

### 3.1 准备环境文件

```bash
pnpm docker:local:init
```

### 3.2 启动

```bash
pnpm docker:local:up
```

### 3.3 访问

- 默认 Web：`http://localhost:8080`
- 默认 API：`http://localhost:3001/api/health`
- 默认 MongoDB：`127.0.0.1:27017`
- 默认 Chroma：`http://127.0.0.1:8000/api/v2/heartbeat`
- 如果在 `.env.docker.local` 中改了 `WEB_PORT` / `API_PUBLISHED_PORT` / `MONGO_PUBLISHED_PORT` / `CHROMA_PUBLISHED_PORT`，请按实际端口访问
- `indexer-py` 默认只暴露在容器内部网络，不直接发布宿主机端口；其健康检查由 compose 内部完成
- `api` 容器健康检查会读取 `/api/health` 的 JSON `status`；只有返回 `ok` 才视为健康，`degraded` 会继续被标记为不健康

### 3.4 常用本地命令

```bash
pnpm docker:local:ps
pnpm docker:local:logs -- api
pnpm docker:local:health
pnpm docker:local:down
pnpm docker:local:reset
```

## 4. 线上部署

### 4.1 准备环境文件

```bash
pnpm docker:prod:init
```

必须至少修改：

- `PUBLIC_DOMAIN`
- `CORS_ORIGIN`

### 4.2 准备 secrets

```bash
mkdir -p docker/secrets
printf '%s' 'replace-with-a-strong-jwt-secret' > docker/secrets/jwt_secret.txt
printf '%s' 'replace-with-a-strong-mongo-root-password' > docker/secrets/mongo_root_password.txt
printf '%s' 'replace-with-a-strong-mongo-app-password' > docker/secrets/mongo_app_password.txt
chmod 600 docker/secrets/*.txt
```

### 4.3 启动

```bash
pnpm docker:prod:up
```

### 4.4 常用线上命令

```bash
pnpm docker:prod:config
pnpm docker:prod:ps
pnpm docker:prod:logs -- caddy api
pnpm docker:prod:down
```

## 5. 常用运维命令

查看状态：

```bash
pnpm docker:local:ps
```

查看日志：

```bash
pnpm docker:local:logs -- platform api indexer-py mongo chroma
```

停止并保留数据：

```bash
pnpm docker:local:down
```

停止并清空数据卷：

```bash
pnpm docker:local:reset
```

## 6. 当前边界

- 当前业务正式使用的是 MongoDB。
- Chroma 已进入容器化基线，并被纳入 API 健康诊断，但正式知识检索链路仍未落地。
- `indexer-py` 当前只负责最小解析 / 分块与状态协作，不负责向量写入与统一检索。
- 当前更适合把这套 Docker 交付视为“可本地部署 / 可私有化打包的基础设施基线”，而不是完整 AI 能力交付。
