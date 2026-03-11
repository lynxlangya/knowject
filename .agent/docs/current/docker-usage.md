# Docker 使用现状

状态：截至 2026-03-11，仓库已经正式交付可运行的 Docker Compose 基线，覆盖本地部署与线上部署两条路径；当前事实仍以源码和本文件为准。

## 1. 一句话结论

- 当前仓库已经有正式容器化交付文件：
  - `compose.yml`
  - `compose.local.yml`
  - `compose.production.yml`
  - `docker/api/Dockerfile`
  - `docker/platform/Dockerfile`
  - `docker/mongo/init/01-create-app-user.sh`
  - `docker/caddy/Caddyfile`
- 当前容器化交付目标不是“替代宿主机开发”，而是补齐：
  - 本地一键部署
  - 面向其他公司 / 项目组的私有化打包基线
  - 本地与线上环境分层
  - secrets 不入仓的安全默认值
- 当前业务正式使用 MongoDB；Chroma 已进入容器基础设施与 API 健康诊断，但正式知识检索链路仍未落地。
- 常用启动、停止、日志、健康检查命令已统一收口到根脚本 `scripts/knowject.sh` 与对应的 `pnpm` scripts。
- 当前推荐工作流已经拆分为三条路径：
  - `pnpm dev:up`：宿主机前后端开发
  - `pnpm dev:deps:*`：仅管理 Docker 依赖 `mongo + chroma`
  - `pnpm docker:local:up`：完整 Docker 联调 / 验收
- 其中 `pnpm dev:init` / `pnpm dev:up` 会自动同步宿主机 `.env.local` 对 MongoDB / JWT 的关键文件引用，避免 Docker secrets 轮换后宿主机 API 仍使用旧密码。
- 当前 Docker 固定镜像版本：
  - MongoDB：`mongo:8.2.5`
  - Chroma：`chromadb/chroma:1.5.5`

## 2. 当前已交付的 Docker 拓扑

### 2.1 本地宿主机开发拓扑

- 宿主机开发仍保留原有主路径：`platform + api + mongodb`
- 这一条路径主要服务日常开发、热更新和代码迭代。

### 2.2 本地容器化部署拓扑

- `compose.yml + compose.local.yml` 会启动：
  - `platform`
  - `api`
  - `mongodb`
  - `chroma`
- 公共基线里的 `app`、`data` 保持 `internal`；`compose.local.yml` 额外挂载本地专用 `publish` 网络给 `api / mongo / chroma`，确保宿主机端口真正发布，同时不改变生产默认边界。
- 本地 override 会把以下端口映射到宿主机：
  - 默认 Web：`127.0.0.1:8080`（可通过 `WEB_PORT` 覆盖）
  - 默认 API：`127.0.0.1:3001`（可通过 `API_PUBLISHED_PORT` 覆盖；容器内部监听固定 `3001`）
  - 默认 MongoDB：`127.0.0.1:27017`（可通过 `MONGO_PUBLISHED_PORT` 覆盖）
  - 默认 Chroma：`127.0.0.1:8000`（可通过 `CHROMA_PUBLISHED_PORT` 覆盖）

### 2.3 线上容器化部署拓扑

- `compose.yml + compose.production.yml` 会在上述基础上增加 `caddy` 作为 HTTPS 入口。
- 线上默认只对外暴露：
  - `80`
  - `443`
- `api`、`mongodb`、`chroma` 默认不直接对外开放。

## 3. 当前安全策略

### 3.1 secrets 不进仓

- 真实 secrets 统一放在 `docker/secrets/`，该目录已被 `.gitignore` 忽略。
- 仓库只提交：
  - `.env.docker.local.example`
  - `.env.docker.production.example`
  - `docker/scripts/generate-local-secrets.sh`

### 3.2 API 支持 `*_FILE`

- `apps/api/src/config/env.ts` 现在支持 `<NAME>_FILE` 方式读取环境变量。
- 这意味着 Docker secrets 可直接用于：
  - `JWT_SECRET_FILE`
  - `MONGODB_URI_FILE`
  - 以及其他字符串型环境变量

### 3.3 MongoDB 凭据隔离

- MongoDB root 密码与应用账号密码分离。
- API 只使用应用账号连接 MongoDB，不直接持有 root 凭据。
- Mongo 应用用户通过 `docker/mongo/init/01-create-app-user.sh` 在初始化阶段创建。

### 3.4 线上强制 HTTPS

- 生产环境中的认证与鉴权请求仍要求 HTTPS。
- 线上编排通过 `caddy` 处理 TLS，避免直接把 HTTP 暴露给敏感接口。
- `platform` 内的 Nginx 会保留上游 `X-Forwarded-Proto`，确保 API 的安全传输保护在反向代理后仍能正确判断。

## 4. 当前服务分工

| 服务       | 角色                               | 当前状态 |
| ---------- | ---------------------------------- | -------- |
| `platform` | 提供前端静态资源，并反向代理 `/api` | 已交付   |
| `api`      | 提供正式 API 基线，连接 MongoDB     | 已交付   |
| `mongodb`  | 正式业务主数据存储                 | 已交付   |
| `chroma`   | 向量检索基础设施容器与心跳诊断目标 | 已交付   |
| `caddy`    | 线上 HTTPS 入口与外层反向代理      | 已交付   |

补充说明：

- Chroma 当前的“已交付”只指容器编排、持久化卷和 API 健康探测，不等于正式 knowledge module 已经实现。
- 为了稳定部署，Mongo 与 Chroma 当前都使用精确 patch tag，而不是浮动 minor tag。

## 5. 当前关键文件

- 根编排：
  - `../../../compose.yml`
  - `../../../compose.local.yml`
  - `../../../compose.production.yml`
- 构建与入口：
  - `../../../docker/api/Dockerfile`
  - `../../../docker/api/start-api.sh`
  - `../../../docker/platform/Dockerfile`
  - `../../../docker/platform/nginx.conf`
  - `../../../docker/caddy/Caddyfile`
- 数据与 secrets：
  - `../../../docker/mongo/init/01-create-app-user.sh`
  - `../../../docker/scripts/generate-local-secrets.sh`
  - `../../../.env.docker.local.example`
  - `../../../.env.docker.production.example`
- 命令入口：
  - `../../../scripts/knowject.sh`

## 6. 与 Docker 相关的文档入口

- 当前事实总览：`./architecture.md`
- 当前 Docker 专题：`./docker-usage.md`
- Docker 操作清单：`./docker-operation-checklist.md`
- 认证与 MongoDB 环境契约：`../contracts/auth-contract.md`
- Docker 操作手册：`../../../docker/README.md`
- API 子系统说明：`../../../apps/api/README.md`
- Chroma 决策说明：`../contracts/chroma-decision.md`

## 7. 当前边界

- 当前仍然保留宿主机开发方式，不强制所有日常开发都进入容器。
- 当前 `pnpm docker:local:up` 会启动完整本地部署拓扑，主要用于联调、验收和对外交付演示，不是日常前后端迭代的首选路径。
- 日常本地开发更推荐宿主机运行 `platform + api`，并按需只把 `mongo / chroma` 放进 Docker。
- 当前 `memory` 路由仍是演示接口；Chroma 进入的是基础设施层，不是正式业务链路。
- 当前线上部署基线已经具备，但是否直接用于生产，还取决于后续补齐备份、监控、日志汇聚和业务级健康告警。

## 8. 维护建议

后续若发生以下变化，应同步更新本文件：

- 服务拓扑变化，例如新增 Redis、对象存储、Embedding Service
- 端口暴露策略、网络边界或 TLS 入口变化
- Docker secrets 约定变化
- Chroma 从“基础设施就绪”进入“正式知识检索链路落地”

建议同时检查：

- `README.md`
- `.agent/docs/README.md`
- `.agent/docs/current/architecture.md`
- `.agent/docs/contracts/auth-contract.md`
- `apps/api/README.md`
- `docker/README.md`
