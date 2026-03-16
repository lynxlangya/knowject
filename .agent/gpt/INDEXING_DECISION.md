# Knowject 索引分层决策（ChatGPT Projects 上传版）

状态：2026-03-16
来源：基于 `.agent/docs/contracts/chroma-decision.md` 精简同步。  
定位：这是当前最重要的新决策文档副本，用于解释为什么采用“Node 管业务，Python 管索引”，以及当前已经落地到什么程度。

## 1. 核心结论

- Chroma 在 Knowject 中只承担知识索引层 / 检索层职责。
- MongoDB 继续承担业务主数据层职责。
- `apps/api` 继续承担业务主链路。
- `apps/indexer-py` 已经作为 Python 独立 indexer 落地，并已切到 FastAPI + `uv` 内部控制面。
- Knowject 不是“Node 直接全包 Chroma”。
- Knowject 也不是“全仓切 Python”。
- 自 2026-03-16 起，当前 runtime 契约已进一步升级为“namespace key + versioned collection + active pointer”；历史里提到的 OpenAI 固定基线，主要是 Week 3-4 的阶段冻结，不再等同于当前设置中心接管后的运行时配置来源。

## 2. 为什么推荐 Python 负责索引链路

- 不是因为 TypeScript 不能连接 Chroma。
- 真正复杂的地方在：
  - 文档解析
  - 文本清洗
  - chunking
  - embedding 接入
  - 批量重建
  - 重试与诊断
- 这些环节更适合用 Python 生态处理。

## 3. 为什么业务主链路仍保留在 Node

- 仓库当前已经有稳定的 `apps/api` 基线：
  - auth
  - projects
  - members
  - memberships
  - 错误处理中间件
  - env 管理
- 知识库 CRUD、文档记录、上传入口、状态查询、统一知识检索 API，以及 Skill / Agent 正式资产治理与绑定，仍然更适合留在 Node/Express。

## 4. 推荐运行时分层

### `apps/api`

- 对外正式 API
- 鉴权 / 权限
- 知识库 CRUD
- 文档记录
- 上传入口
- 状态查询
- 统一知识检索 service
- 触发 Python indexer
- 同步索引结果状态

### `apps/indexer-py`

- Python 独立索引服务 / worker / 控制面
- 当前内部写侧入口：`POST /internal/v1/index/documents`
- 开发态隐藏兼容旧路径：`POST /internal/index-documents`
- 当前运维探活入口：`GET /health`
- 当前内部文档入口：`/docs`、`/redoc`、`/openapi.json`
- parse
- clean
- chunk
- embed
- upsert
- delete
- rebuild
- retry
- diagnostics

### MongoDB

- 知识库元数据
- 文档记录
- 索引状态
- 失败原因
- 绑定关系

### Chroma

- chunk embeddings
- 检索 metadata

## 5. 已冻结的 5 个实施决策

### 1. 触发方式

- Node -> Python 固定为本地 HTTP 服务。
- 当前已冻结为版本化内部写接口 `POST /internal/v1/index/documents`；开发态仍隐藏兼容旧路径 `POST /internal/index-documents`；`GET /health` 保持非版本化。
- CLI / 子进程只能作为内部过渡细节。

### 2. 状态回写

- MongoDB 业务状态只允许由 Node/Express 回写。
- Python 不直接写业务主状态表。

### 3. Embedding 基线

- provider：OpenAI
- model：`text-embedding-3-small`
- 仅在 `development` 且未配置 `OPENAI_API_KEY` 时，允许退化为 deterministic 本地 embedding，用于保证上传 / 状态流联调。

### 4. 文件保留策略

- 原始文件长期保留
- 中间产物成功即清理
- 失败时保留 `72 小时 ~ 7 天`

### 5. 重试 / 重建粒度

- `retry document`
- `rebuild document`
- `rebuild knowledge`
- 系统级批量重建延后

## 6. 最小调用链

1. 前端上传文档
2. Node 创建 knowledge/document 记录
3. 状态初始化为 `pending`
4. Node 落盘原始文件
5. Node 优先调 Python `POST /internal/v1/index/documents`
6. Python 解析、清洗、分块、embedding、写入 Chroma
7. Python 把结果交回 Node
8. Node 回写 `processing / completed / failed`
9. Node 统一知识检索 service 查询 Chroma
10. `search_documents` Skill 只能调统一知识检索 service

## 7. 状态机与字段建议

### 文档状态

- `pending`
- `processing`
- `completed`
- `failed`

### 推荐字段

- `documentVersionHash`
- `embeddingProvider`
- `embeddingModel`
- `lastIndexedAt`
- `retryCount`
- `errorMessage`

### Chroma metadata 最小字段

- `knowledgeId`
- `documentId`
- `type`
- `source`
- `chunkIndex`
- `chunkId`

## 8. 固定边界

- Skill 不应直接操作底层 Chroma。
- `search_documents` 不能自己拼装底层 Chroma 查询。
- MongoDB 是主数据源，Chroma 是衍生索引层。
- 更换 provider 或 chunk 策略时，应优先重建 Chroma，而不是改写业务主库。

## 9. 当前阶段不做

- `global_code` 真实 Git 导入
- 项目级合并检索
- SSE
- 来源引用 UI
- Agent runtime

## 10. 给 ChatGPT 的判断规则

- 如果讨论“为什么这里要 Python”，以这份文档为准。
- 如果讨论“现在仓库里有没有 Python indexer”，答案是：有，路径为 `apps/indexer-py`。
- 如果讨论“正式链路是否完全生产化”，答案是：`global_docs` 最小闭环、document / knowledge rebuild、diagnostics 与项目私有 knowledge 最小写侧都已落地，但消息写链路、项目级合并检索与运行时仍未补齐，production 仍以真实 OpenAI-compatible embedding 为基线。
