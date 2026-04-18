# AGENTS.md

## 1. 目录职责

- 本目录是 Knowject 最重要的跨语言/跨存储边界：知识库元数据、上传、检索、retry、rebuild、diagnostics、namespace/versioned collection 规则。
- Node 侧负责正式 API 与业务主状态；Python 侧负责解析、分块、embedding、写删侧索引。

## 2. 先读什么

1. 根 `AGENTS.md`
2. `apps/api/AGENTS.md`
3. `docs/contracts/chroma-decision.md`
4. `apps/api/README.md` 中 knowledge 相关段落
5. `.agents/skills/knowledge-index-boundary-guard/SKILL.md`

## 3. 本层不能猜的事实

- MongoDB 是主数据，Chroma 是可重建索引层
- namespace key、versioned collection、active pointer
- project/global scope 规则
- rebuild / retry / delete / diagnostics 的职责边界
- settings effective config 如何进入读写链路
- 不能用当前 settings 反推 active namespace state

## 4. 边界

- Node 负责业务 API、状态迁移、可见性、契约与错误语义。
- Python 负责 parser / chunker / embedding / Chroma 写删侧。
- 读侧 query 是已确认的 Node 例外，不改变写侧职责归属。
- 涉及 `apps/indexer-py`、Mongo、Chroma、settings 任一边界时，按边界审计而不是只看单文件实现。

## 5. 默认验证

- 优先跑 `knowledge.service.test.ts`
- 视改动补跑 search / namespace / diagnostics / mutation 相关测试
- 至少保留一项最小 API 构建或 typecheck 验证

## 6. 文档同步

- 若改动 namespace、scope、settings integration、delete/rebuild/retry/diagnostics 语义，回推：
  - `docs/contracts/chroma-decision.md`
  - `apps/api/README.md`
  - `docs/current/architecture.md`
