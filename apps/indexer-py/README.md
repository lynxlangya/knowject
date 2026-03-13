# `apps/indexer-py`

状态：截至 2026-03-13，已落地 GA-05 所需的最小可运行 Python 索引服务。

本目录承接 Knowject 的 Python 索引处理链路，当前先完成“文档解析、清洗、分块与结果回传”的最小闭环，不提前把 Chroma 写入、重建和统一检索一起做完。

## 当前已实现

- `server.py`
  - 提供最小本地 HTTP 服务。
  - `GET /health`：返回服务状态、chunk 配置和当前支持格式。
  - `POST /internal/index-documents`：接收 Node 下发的文档处理请求。
- `pipeline.py`
  - 负责 `md / txt` 解析。
  - 负责文本清洗。
  - 负责按 `1000 字符 / 200 重叠 / 尽量保留段落边界` 进行分块。
  - 对 `pdf` 明确返回失败信息，不假装支持。

## 角色定位

- 运行时：Python 独立索引服务。
- 当前负责内容：
  - 文档解析
  - 文本清洗
  - 分块
  - 结果通过 HTTP 响应交回 Node
- 当前不负责内容：
  - 不对外暴露前端直连 API
  - 不写 MongoDB 业务主状态
  - 不替代 `apps/api` 的知识库 CRUD、鉴权、权限与统一知识检索 service
  - 不做 OpenAI embedding
  - 不做 Chroma upsert / delete
  - 不做 `global_code` 真实导入

## 集成边界

- Node / Express 仍是业务主链路入口。
- Node 触发 Python 的长期契约固定为本地 HTTP。
- MongoDB 中的知识库 / 文档状态只能由 Node 回写。
- Python 当前只返回处理结果；Node 负责把状态推进为 `processing / completed / failed`。
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

## 当前阶段不做

- 不落地 Chroma 写入、删除、重建。
- 不落地 OpenAI embedding 代码。
- 不落地 `global_code` 真实导入。
- 不让 Python 直接写 MongoDB 业务主状态。

## 后续任务承接

- `GA-06`：补 Chroma 写入、`global_docs / global_code` 命名空间和统一知识检索 service。
- `GA-07`：前端 `/knowledge` 接正式接口并补状态视图。
