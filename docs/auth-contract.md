# 基础框架认证与环境契约

状态：基础框架已落地契约（截至 2026-03-10，`BF-03` ~ `BF-05` 已按本文件落地）；当前事实仍以 `docs/architecture.md` 为准，本文件负责解释 auth 与环境约定。

## 1. 目标

- 为基础框架阶段固定最小可实现、可联调、可维护的认证与环境边界。
- 避免在实现 `MongoDB / JWT / 注册登录 / 项目接口鉴权` 时反复改协议。
- 与当前前端壳层约定保持兼容：
  - token 继续使用 `knowject_token`
  - 用户信息继续使用 `knowject_auth_user`
  - 认证入口继续复用 `/login`，不新增 `/register`

当前已落地范围：

- Docker MongoDB 本地联调基线
- `users` 集合与 `username` 唯一索引
- `argon2id` 密码哈希
- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/users`
- JWT 鉴权中间件
- `memory` 路由 JWT 保护
- `/login` 同页登录 / 注册模式切换

## 2. 本地运行拓扑

- 基础框架阶段的最小本地拓扑固定为：`api + mongodb`
- MongoDB 用途：唯一正式结构化存储
- API 连接 MongoDB 时必须使用应用用户，不使用 root 用户
- 推荐本地数据库命名：
  - 数据库：`knowject`
  - 应用用户：`knowject_app`
  - 应用角色：`readWrite`

## 3. 环境变量契约

提交规则：

- 仓库只提交 [/.env.example](/Users/langya/Documents/CodeHub/ai/knowject/.env.example)
- 本地真实值放 `.env.local`
- `.env.local`、部署 secrets、数据库密码和 JWT secret 不进入 git

变量清单：

| 变量 | 必填 | 示例 / 默认值 | 说明 |
| --- | --- | --- | --- |
| `NODE_ENV` | 是 | `development` | 运行环境标识 |
| `APP_NAME` | 是 | `knowject-api` | 日志和健康检查里的应用名 |
| `PORT` | 是 | `3001` | API 监听端口 |
| `LOG_LEVEL` | 是 | `info` | 运行日志等级 |
| `CORS_ORIGIN` | 是 | `http://localhost:5173` | 允许访问 API 的前端来源 |
| `MONGODB_URI` | 是 | `mongodb://knowject_app:***@127.0.0.1:27017/knowject?authSource=knowject` | MongoDB 连接串 |
| `MONGODB_DB_NAME` | 是 | `knowject` | 默认数据库名 |
| `JWT_SECRET` | 是 | `CHANGE_ME_WITH_OPENSSL_BASE64_48` | JWT 签名 secret，至少 48 字节随机串 |
| `JWT_EXPIRES_IN` | 是 | `12h` | access token 有效期 |
| `JWT_ISSUER` | 是 | `knowject-api` | JWT `iss` |
| `JWT_AUDIENCE` | 是 | `knowject-platform` | JWT `aud` |
| `ARGON2_MEMORY_COST` | 是 | `65536` | `argon2id` 内存成本 |
| `ARGON2_TIME_COST` | 是 | `3` | `argon2id` 迭代次数 |
| `ARGON2_PARALLELISM` | 是 | `1` | `argon2id` 并行度 |
| `API_ERROR_EXPOSE_DETAILS` | 是 | `false` | 是否向客户端暴露安全可公开的字段级细节 |
| `API_ERROR_INCLUDE_STACK` | 是 | `false` | 是否在服务端错误日志中附带 stack，默认必须关闭 |

安全约束：

- `JWT_SECRET` 必须通过随机生成获得，例如：`openssl rand -base64 48`
- `MONGODB_URI` 只能使用应用用户，不允许 API 直接使用 root 凭据
- `CORS_ORIGIN` 在本地开发固定指向当前前端 dev server；部署时按环境显式注入
- `API_ERROR_INCLUDE_STACK` 只影响服务端错误日志，不进入客户端错误响应
- `API_ERROR_INCLUDE_STACK` 在所有环境默认关闭
- 生产环境中的认证与鉴权请求必须通过 HTTPS 发送；服务端会拒绝不安全传输的 `/api/auth/*` 与 `/api/memory/*` 请求
- `/api/auth/*` 与 `/api/memory/*` 响应必须带 `Cache-Control: no-store`

## 4. JWT 契约

固定决策：

- 只做 `access token`
- 算法固定为 `HS256`
- 不做 refresh token
- 不做 token 黑名单
- 登出先按前端清理本地 token 处理

必备 claims：

```json
{
  "sub": "user_123",
  "username": "alice",
  "iss": "knowject-api",
  "aud": "knowject-platform",
  "iat": 1710000000,
  "exp": 1710043200
}
```

字段约定：

- `sub`：用户主键字符串
- `username`：当前用户名，用于审计与日志定位
- `iss`：取自 `JWT_ISSUER`
- `aud`：取自 `JWT_AUDIENCE`
- `iat` / `exp`：标准签发时间与过期时间

接入约定：

- 受保护接口统一读取 `Authorization: Bearer <token>`
- 鉴权中间件只负责：
  - 解析并验证 JWT
  - 将当前用户身份注入请求上下文
- 项目级权限判断放在项目领域逻辑，不混在 JWT 验证层

## 5. 密码哈希契约

固定决策：

- 哈希算法固定为 `argon2id`
- 不存明文密码
- 不手工维护独立盐字段，由算法库负责盐处理
- 不为基础框架阶段引入二次封装过重的认证抽象

参数基线：

- `memoryCost = 65536`
- `timeCost = 3`
- `parallelism = 1`

实现要求：

- 注册时对密码做哈希后再落库
- 登录时只做哈希校验，不回传任何密码相关信息
- 用户模型中的密码字段命名固定为 `passwordHash`
- 请求体中的 `password` 保持原始口令语义，由 TLS 保护传输安全；不要改成“前端先哈希再提交”的伪安全方案

## 6. 认证接口契约

### `POST /api/auth/register`

请求体：

```json
{
  "username": "alice",
  "password": "s3cure-password",
  "name": "Alice"
}
```

成功响应：`200`

```json
{
  "token": "jwt_here",
  "user": {
    "id": "user_123",
    "username": "alice",
    "name": "Alice"
  }
}
```

约束：

- `username` 去除首尾空格后参与唯一性判断
- `register` 成功后直接返回登录态，不拆成“注册成功后再登录”
- 请求体中的 `password` 依赖 HTTPS 传输保护；生产环境下若不是安全传输，接口直接拒绝

### `POST /api/auth/login`

请求体：

```json
{
  "username": "alice",
  "password": "s3cure-password"
}
```

成功响应：`200`

```json
{
  "token": "jwt_here",
  "user": {
    "id": "user_123",
    "username": "alice",
    "name": "Alice"
  }
}
```

前端存储约定：

- token 存到 `localStorage['knowject_token']`
- 用户信息存到 `localStorage['knowject_auth_user']`
- 登录成功和注册成功都回到当前登录后壳层入口
- 客户端可以在 DevTools 中看到请求 JSON，这是正常现象；安全边界在 HTTPS 传输和服务端 `argon2id` 哈希，而不在前端再次哈希

### `GET /api/auth/users`

用途：

- 供已登录用户按 `username / name` 模糊搜索已有注册用户，作为项目成员添加候选。

请求参数：

- `query`：可选，搜索关键字；同时匹配 `username` 与 `name`
- `limit`：可选，默认 `10`，最大 `20`

成功响应：`200`

```json
{
  "total": 2,
  "items": [
    {
      "id": "user_123",
      "username": "langya",
      "name": "琅邪"
    },
    {
      "id": "user_456",
      "username": "langya-dev",
      "name": "琅邪王"
    }
  ]
}
```

约束：

- 需要 `Authorization: Bearer <token>`
- 只返回用户基础档案，不返回密码哈希、JWT 或其他敏感信息
- 当前成员页会基于该接口做前端过滤，避免把已在项目中的成员重复展示为可选项

## 7. 错误响应契约

统一结构：

```json
{
  "error": {
    "code": "AUTH_INVALID_CREDENTIALS",
    "message": "用户名或密码错误",
    "details": null
  },
  "meta": {
    "requestId": "req_01HV...",
    "timestamp": "2026-03-10T10:20:30.000Z"
  }
}
```

字段含义：

- `error.code`：稳定的机器可读错误码，供前后端分支判断
- `error.message`：可直接给用户展示的简短中文文案
- `error.details`：只承载安全可公开的字段级错误，不放内部异常文本
- `meta.requestId`：请求级追踪 ID，便于日志定位
- `meta.timestamp`：服务端生成的 ISO 时间戳

状态码与错误码：

| HTTP 状态码 | 错误码 | 触发场景 |
| --- | --- | --- |
| `400` | `VALIDATION_ERROR` | 参数缺失、字段格式非法、请求体不是合法 JSON |
| `401` | `AUTH_INVALID_CREDENTIALS` | 用户不存在或密码错误 |
| `401` | `AUTH_TOKEN_INVALID` | token 缺失、非法、过期 |
| `403` | `PROJECT_FORBIDDEN` | 已登录但无项目级操作权限 |
| `404` | `AUTH_USER_NOT_FOUND` | 按用户名添加项目成员时，目标用户不存在 |
| `404` | `PROJECT_NOT_FOUND` | 访问不存在或不可见的项目 |
| `404` | `PROJECT_MEMBER_NOT_FOUND` | 修改或移除不存在的项目成员 |
| `409` | `AUTH_USERNAME_CONFLICT` | 注册时用户名冲突 |
| `409` | `PROJECT_MEMBER_ALREADY_EXISTS` | 成员重复加入项目 |
| `409` | `PROJECT_LAST_ADMIN_REQUIRED` | 尝试降级或移除项目中最后一位 `admin` |
| `500` | `INTERNAL_SERVER_ERROR` | 未处理异常或基础设施错误 |

暴露规则：

- 默认 `details = null`
- 只有字段级校验失败时，才允许返回安全可公开的 `details`
- 不向客户端返回数据库错误原文、内部堆栈、第三方库错误文本

## 8. 与项目模型的边界

- JWT 只表达“当前用户是谁”，不直接承载项目角色列表
- 项目级 `admin / member` 权限判断由项目接口和成员关系完成
- 当前前端中的 `owner / product / design / frontend / backend / marketing` 仍视为协作演示数据里的展示型角色，不进入正式认证模型

## 8.1 项目成员接口契约

已落地的最小项目成员接口：

- `POST /api/projects/:projectId/members`
- `PATCH /api/projects/:projectId/members/:userId`
- `DELETE /api/projects/:projectId/members/:userId`

请求体约定：

- 新增成员：`{ "username": "alice", "role": "member" }`
- 修改角色：`{ "role": "admin" }`

响应约定：

- 三个接口当前都返回最新项目快照：`{ project }`
- `project.members[]` 中每个成员至少包含：
  - `userId`
  - `username`
  - `name`
  - `role`
  - `joinedAt`

角色规则：

- 只允许 `admin / member`
- 只有项目级 `admin` 可以新增成员、修改角色、移除成员
- 项目至少保留一位 `admin`
- 前端当前通过 `GET /api/auth/users` 提供的候选列表，支持按用户名 / 姓名模糊搜索后多选添加

## 9. 本阶段明确不做

- refresh token
- 邀请链接、邮件验证、密码找回
- 外部 OAuth
- SSE 鉴权链路
- 组织级 RBAC
- 审计日志、风控、设备管理

## 10. 实施顺序建议

1. 先实现环境变量读取与 MongoDB 基线
2. 再落用户模型和 `argon2id`
3. 再落 JWT 签发与鉴权中间件
4. 再落 `register / login`
5. 最后让前端 `/login` 页面切到正式契约

## 11. 当前遗留边界

- 当前已完成 auth、项目 CRUD 和项目成员接口，前端项目列表、项目基础信息与成员 roster 也已切到正式后端接口。
- JWT 当前只验证身份，不校验“用户是否已被系统禁用”之类更复杂状态。
- 项目资源绑定、对话列表与协作演示数据仍主要停留在前端本地层。
