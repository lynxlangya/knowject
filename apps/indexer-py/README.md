# `apps/indexer-py`

状态：目录边界已冻结，但截至 2026-03-13 仍未落地可运行 Python 代码。

本目录用于承接 Week 3-4 之后的 Python 索引处理链路，职责先于实现被冻结，避免后续把索引复杂度重新塞回 `apps/api`。

## 角色定位

- 运行时：Python 独立索引服务。
- 负责内容：
  - 文档解析
  - 文本清洗
  - 分块
  - embedding
  - Chroma upsert / delete
  - 文档级 retry / rebuild
  - 最小诊断
- 不负责内容：
  - 不对外暴露前端直连 API
  - 不写 MongoDB 业务主状态
  - 不替代 `apps/api` 的知识库 CRUD、鉴权、权限与统一知识检索 service

## 集成边界

- Node / Express 仍是业务主链路入口。
- Node 触发 Python 的长期契约固定为本地 HTTP。
- MongoDB 中的知识库 / 文档状态只能由 Node 回写。
- Python 负责写 Chroma，但处理结果必须交回 Node，再由 Node 更新业务状态。
- Skill 不能直连底层 Chroma，后续必须走统一知识检索 service。

## 当前阶段不做

- 不落地真实 HTTP server、worker、CLI。
- 不落地 OpenAI embedding 代码。
- 不落地 `global_code` 真实导入。

## 后续任务承接

- `GA-05`：补文档解析、清洗、分块和状态协作。
- `GA-06`：补 Chroma 写入、`global_docs / global_code` 命名空间和统一知识检索 service。
