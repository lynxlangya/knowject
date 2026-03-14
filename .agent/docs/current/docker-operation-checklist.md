# Docker 操作清单

状态：截至 2026-03-14，本清单用于指导 Knowject 当前仓库的本地登录、后端调用、Docker 操作、MongoDB 查看与 Chroma 查看；当前事实仍以源码、`compose.yml` 和相关 README 为准。

## 1. 一句话结论

- 日常本地开发默认**不要**把前后端都跑在 Docker 里。
- 当前 `pnpm docker:local:up` **会同时启动**：
  - `platform`
  - `api`
  - `indexer-py`
  - `mongo`
  - `chroma`
- 推荐把这套完整 Docker 环境主要用于：
  - 集成联调
  - 发包前验收
  - 私有化部署演示
  - 给其他公司 / 项目组交付“本地一键部署”能力
- 日常功能开发更推荐：
  - 前端跑宿主机热更新
  - 后端跑宿主机热更新
  - 数据依赖按需用 Docker 托管

## 2. 推荐工作模式

### 2.1 日常开发模式（推荐）

适用场景：

- 改页面
- 改接口
- 需要热更新
- 需要浏览器 DevTools、Node 调试和快速重启

推荐命令：

```bash
pnpm dev:init
pnpm dev:up
```

说明：

- `pnpm dev:up` 会先确保 `mongo + chroma` 在 Docker 中可用，再启动宿主机 `platform + api + indexer-py`
- `pnpm dev:init` / `pnpm dev:up` 会先确保 `docker/secrets/` 与 `.env.docker.local` 已就绪，再把宿主机 `.env.local` 回写为 `MONGODB_URI_FILE`、`JWT_SECRET_FILE` 和当前 `CHROMA_URL`，避免 Docker 本地依赖轮换后宿主机 API 继续使用旧直写值
- 若走宿主机开发流，请先安装 `uv`；`apps/indexer-py` 当前通过 `uv run` 启动 FastAPI 控制面
- 若你只想单独管理依赖，可使用下一小节的 `dev:deps:*` 命令

此时常用访问入口：

- 以下地址默认假定 `.env.docker.local` 使用模板端口与默认 `CHROMA_HEARTBEAT_PATH`；如果你改过 `WEB_PORT` / `API_PUBLISHED_PORT` / `MONGO_PUBLISHED_PORT` / `CHROMA_PUBLISHED_PORT` / `CHROMA_HEARTBEAT_PATH`，请把下面命令和地址替换成实际值。
- 前端：`http://127.0.0.1:5173`
- 后端：`http://127.0.0.1:3001`
- Python indexer：`http://127.0.0.1:8001/health`
- MongoDB：`127.0.0.1:27017`
- Chroma：`http://127.0.0.1:8000`

### 2.2 完整 Docker 联调模式

适用场景：

- 验证完整部署拓扑
- 验证前端反向代理到 `/api`
- 验证镜像、secrets、网络和容器健康检查
- 给外部项目组演示“一键启动”

启动命令：

```bash
pnpm docker:local:init
pnpm docker:local:up
```

此命令会启动：

- `platform`
- `api`
- `indexer-py`
- `mongo`
- `chroma`

访问入口：

- 以下入口默认假定 `.env.docker.local` 仍使用模板端口与默认 `CHROMA_HEARTBEAT_PATH`。
- 前端：`http://127.0.0.1:8080`
- API：`http://127.0.0.1:3001/api/health`
- MongoDB：`127.0.0.1:27017`
- Chroma：`http://127.0.0.1:8000/api/v2/heartbeat`

### 2.3 什么时候不要用完整 Docker

不推荐在以下场景下长期使用 `pnpm docker:local:up`：

- 高频改前端样式和交互
- 高频改后端路由和调试日志
- 需要热更新、断点调试、快速重启
- 宿主机已经在跑 `3001 / 8080 / 27017 / 8000` 端口上的开发服务

原因很简单：

- 镜像重建和容器重启成本更高
- 前后端调试链路更长
- 日常开发效率会明显下降

### 2.4 只管理 Docker 依赖

```bash
pnpm dev:deps:up
pnpm dev:deps:ps
pnpm dev:deps:health
pnpm dev:deps:logs -- mongo
pnpm dev:deps:down
```

## 3. 前端登录清单

### 3.1 打开入口

- 完整 Docker：`http://127.0.0.1:8080/login`
- 宿主机前端开发：`http://127.0.0.1:5173/login`

### 3.2 当前登录规则

- 当前**没有预置演示账号**。
- 第一次使用请先在登录页切到“注册”模式。
- 注册成功后会自动登录，并写入浏览器本地存储：
  - `knowject_token`
  - `knowject_auth_user`

### 3.3 注册字段

- `name`：显示名称
- `username`：登录用户名
- `password`：密码，至少 8 位

### 3.4 登录字段

- `username`
- `password`

### 3.5 登录态异常时

若页面反复跳回登录页，可先清理浏览器本地存储：

- `knowject_token`
- `knowject_auth_user`
- `knowject_remembered_username`

## 4. 后端接口操作清单

### 4.1 健康检查

完整 Docker 直连：

```bash
# 若改过 `API_PUBLISHED_PORT`，请替换端口
curl http://127.0.0.1:3001/api/health
```

通过前端反向代理：

```bash
# 若改过 `WEB_PORT`，请替换端口
curl http://127.0.0.1:8080/api/health
```

### 4.2 注册用户

```bash
curl -X POST http://127.0.0.1:3001/api/auth/register \
  -H 'Content-Type: application/json' \
  -d '{
    "username": "langya",
    "password": "Passw0rd!",
    "name": "琅邪"
  }'
```

### 4.3 登录拿 Token

```bash
curl -X POST http://127.0.0.1:3001/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{
    "username": "langya",
    "password": "Passw0rd!"
  }'
```

### 4.4 访问受保护接口

```bash
curl http://127.0.0.1:3001/api/projects \
  -H 'Authorization: Bearer <你的JWT>'
```

### 4.5 检查 Python indexer 控制面

宿主机默认开发流下可直接访问：

```bash
curl http://127.0.0.1:8001/health
```

补充说明：

- 当前 Python indexer 已切到 FastAPI + `uv`。
- 当前内部写侧入口固定为 `POST /internal/v1/index/documents`，由 Node 在上传链路中触发。
- `/docs`、`/redoc`、`/openapi.json` 在宿主机开发流下可直接通过 `127.0.0.1:8001` 访问；完整 Docker 编排默认不把该端口发布到宿主机。

## 5. Docker 常用操作清单

### 5.1 查看状态

```bash
pnpm docker:local:ps
```

### 5.2 查看健康检查

```bash
pnpm docker:local:health
```

### 5.3 查看日志

```bash
pnpm docker:local:logs -- api
pnpm docker:local:logs -- indexer-py
pnpm docker:local:logs -- mongo
pnpm docker:local:logs -- chroma
pnpm docker:local:logs -- platform
```

### 5.4 停止与清理

```bash
pnpm docker:local:down
pnpm docker:local:reset
```

### 5.5 进入容器

```bash
docker exec -it knowject-local-api-1 bash
docker exec -it knowject-local-mongo-1 bash
docker exec -it knowject-local-chroma-1 bash
docker exec -it knowject-local-platform-1 sh
```

## 6. MongoDB 查看清单（Navicat Premium）

推荐优先使用应用账号，不要默认直接使用 root。

### 6.1 应用账号连接参数

- Connection Type：`MongoDB`
- Host：`127.0.0.1`
- Port：`27017`
- Database：`knowject`
- Username：`knowject_app`
- Password：读取文件 `docker/secrets/mongo_app_password.txt`
- Authentication Database：`knowject`
- SSL：关闭

### 6.2 Root 管理员连接参数

- Connection Type：`MongoDB`
- Host：`127.0.0.1`
- Port：`27017`
- Username：`knowject_root`
- Password：读取文件 `docker/secrets/mongo_root_password.txt`
- Authentication Database：`admin`
- SSL：关闭

### 6.3 当前重点查看的集合

- `users`
- `projects`
- `knowledge_bases`
- `knowledge_documents`

说明：

- `users`：注册用户后会出现数据
- `projects`：创建项目后会出现数据
- `knowledge_bases`：创建知识库后会出现数据
- `knowledge_documents`：上传知识文档后会出现数据
- 当前成员关系放在 `projects.members` 中，不是单独的 `memberships` 集合

## 7. Chroma 查看清单

### 7.1 基础入口

- 心跳：`http://127.0.0.1:8000/api/v2/heartbeat`（若改过 `CHROMA_PUBLISHED_PORT` 或 `CHROMA_HEARTBEAT_PATH`，请按实际值访问）
- Swagger UI：`http://127.0.0.1:8000/docs/`
- OpenAPI：`http://127.0.0.1:8000/openapi.json`

### 7.2 当前默认租户 / 数据库

```bash
curl http://127.0.0.1:8000/api/v2/tenants/default_tenant
curl http://127.0.0.1:8000/api/v2/tenants/default_tenant/databases
curl http://127.0.0.1:8000/api/v2/tenants/default_tenant/databases/default_database/collections
```

### 7.3 当前阶段怎么看结果

- 当前 Chroma 已经进入容器基线，并纳入 API 健康检查。
- 当前 `global_docs` 已进入正式最小写侧 / 检索闭环；`global_code` 仍只保留命名空间预留。
- 在服务启动并完成集合初始化后，`collections` 通常至少会出现 `global_docs`、`global_code` 两个 collection。
- 如果还没有上传过任何文档，`global_docs` 可能只有空集合；上传 `md / txt` 后应能看到实际向量数据。

## 8. 本地开发建议

### 8.1 推荐结论

- **日常开发**：优先宿主机跑前后端
- **依赖托管**：按需只跑 Docker 版 `mongo / chroma`
- **集成验收**：再跑 `pnpm docker:local:up`

### 8.2 原因

- 宿主机前后端具备热更新，调试效率更高
- Docker 更适合验证“部署形态是否成立”
- 两种模式分开使用，边界更清晰，也更接近后续对外发包的真实交付方式

### 8.3 当前仓库的真实情况

- 是的，当前 `pnpm docker:local:up` 的确会把前端和后端项目一起启动到 Docker 中。
- 这不是给你做日常代码迭代用的主路径，而是给整套部署链路做验收的。

### 8.4 推荐习惯

推荐把这三类命令分开记忆：

```bash
# 日常开发
pnpm dev:init
pnpm dev:up

# 只起依赖
pnpm dev:deps:up

# 整套验收
pnpm docker:local:up
```

## 9. 相关文档

- Docker 使用现状：`./docker-usage.md`
- Docker 部署手册：`../../../docker/README.md`
- 架构事实：`./architecture.md`
- API 子系统说明：`../../../apps/api/README.md`
