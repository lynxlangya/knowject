# `apps/indexer-py`

状态：截至 2026-03-13，已落地 GA-06 所需的 Python 写侧索引链路。

本目录承接 Knowject 的 Python 索引处理链路，当前已完成 `global_docs` 的“解析、清洗、分块、embedding、Chroma 写入/删除、结果回传”最小闭环；`global_code` 仍只保留命名空间契约，不做真实导入。

## 当前已实现

- `server.py`
  - 提供最小本地 HTTP 服务。
  - `GET /health`：返回服务状态、chunk 配置和当前支持格式。
  - `POST /internal/index-documents`：接收 Node 下发的文档处理请求。
- `pipeline.py`
  - 负责 `md / txt` 解析。
  - 负责文本清洗。
  - 负责按 `1000 字符 / 200 重叠 / 尽量保留段落边界` 进行分块。
  - 负责通过 OpenAI-compatible `/embeddings` 接口生成向量。
  - 负责把 `global_docs` chunk upsert 到 Chroma，并在同一 `documentId` 重建前先删除旧向量，避免重复累积。
  - 对 `pdf` 明确返回失败信息，不假装支持。
- `runtime_env.py`
  - 负责读取仓库根 `.env` / `.env.local`，让 Python indexer 与 `apps/api` 共用本地环境契约。

## 角色定位

- 运行时：Python 独立索引服务。
- 当前负责内容：
  - 文档解析
  - 文本清洗
  - 分块
  - OpenAI-compatible embedding 生成
  - Chroma `global_docs` 写入 / 删除
  - 结果通过 HTTP 响应交回 Node
- 当前不负责内容：
  - 不对外暴露前端直连 API
  - 不写 MongoDB 业务主状态
  - 不替代 `apps/api` 的知识库 CRUD、鉴权、权限与统一知识检索 service
  - 不做 `global_code` 真实导入

## 集成边界

- Node / Express 仍是业务主链路入口。
- Node 触发 Python 的长期契约固定为本地 HTTP。
- MongoDB 中的知识库 / 文档状态只能由 Node 回写。
- Python 当前只返回处理结果；Node 负责把状态推进为 `processing / completed / failed`。
- Python 负责写侧 Chroma 索引；Node 负责读侧统一知识检索 service。
- Skill 不能直连底层 Chroma，后续必须走统一知识检索 service。

## 运行方式

```bash
python3 apps/indexer-py/server.py
```

Docker Compose 完整编排下会自动构建并启动 `indexer-py` 服务，不需要额外手动起进程；该服务默认只暴露在容器内部网络，通过共享知识存储卷读取上传文件。

可选环境变量：

- `KNOWLEDGE_INDEXER_HOST`
  - 默认 `127.0.0.1`
- `KNOWLEDGE_INDEXER_PORT`
  - 默认 `8001`
- `KNOWLEDGE_CHUNK_SIZE`
  - 默认 `1000`
- `KNOWLEDGE_CHUNK_OVERLAP`
  - 默认 `200`
- `CHROMA_URL`
  - 指向 Chroma 服务地址
- `CHROMA_TENANT`
  - 默认 `default_tenant`
- `CHROMA_DATABASE`
  - 默认 `default_database`
- `OPENAI_API_KEY`
  - 生成 embedding 所需凭证
- `OPENAI_BASE_URL`
  - 默认 `https://api.openai.com/v1`
- `OPENAI_EMBEDDING_MODEL`
  - 默认 `text-embedding-3-small`
- `OPENAI_TIMEOUT_MS`
  - 默认 `15000`

## 当前阶段不做

- 不落地 `global_code` 真实导入。
- 不让 Python 直接写 MongoDB 业务主状态。
- 不提供统一知识检索 API；检索统一留给 `apps/api`。
- 不提供对外可见的重建 / retry HTTP 接口。

## 后续任务承接

- `GA-07`：前端 `/knowledge` 接正式接口并补状态视图。
