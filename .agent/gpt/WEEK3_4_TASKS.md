# Knowject Week 3-4 任务边界（ChatGPT Projects 上传版）

状态：2026-03-13  
来源：基于 `.agent/docs/plans/tasks-global-assets-foundation.md` 精简同步。  
定位：用于回答当前阶段应该做什么、不该做什么，以及顺序如何。

## 1. 当前阶段目标

Week 3-4 不是“把所有 AI 能力一次做完”，而是在已完成的 `auth / projects / members` 基线上，补出全局资产正式化底座。

本阶段至少要交付：

- 全局知识库最小闭环
- `global_docs` 正式索引闭环
- 最小 Skill registry
- 最小 Agent 配置模型

## 2. 当前阶段完成定义（DoD）

- 后端新增：
  - `knowledge`
  - `skills`
  - `agents`
- Python indexer 运行时边界已冻结
- Node -> Python 触发方式已冻结
- 状态回写方式已冻结
- `global_docs` 可写 / 可删 / 可重建
- `global_code` 完成集合命名与 metadata 预留
- UI 能看到知识库文档状态
- `search_documents` 复用统一知识检索 service

## 3. 已冻结的阶段决策

- Node -> Python：本地 HTTP 服务
- 业务状态回写：Node 独占写入
- embedding：OpenAI + `text-embedding-3-small`
- 文件保留：原始文件长期保留，中间产物短期保留
- 重试 / 重建：先做 document / knowledge 级，不做系统级批处理

## 4. 本阶段明确不做

- 项目私有知识库
- 项目资源绑定正式写回后端
- `global_code` 真实 Git 导入
- 对话会话模型
- SSE
- 来源引用展示
- Agent runtime
- LLM 自主调用 Skill 编排
- Skill 公网引入与复杂自建

## 5. 推荐分层

### Node / `apps/api`

- 对外正式 API
- 知识库 CRUD
- 文档记录
- 上传入口
- 状态查询
- 统一知识检索 service
- 触发 Python indexer

### Python / `services/indexer-py`

- parse
- clean
- chunk
- embed
- upsert
- delete
- rebuild
- retry
- diagnostics

## 6. 当前阶段任务顺序

### GA-01

- 冻结范围、边界、字段和环境契约

### GA-02

- 建立 `knowledge / skills / agents` 模块骨架
- 确立 Python indexer 目录与集成边界

### GA-03

- 设计知识库与文档元数据模型
- 明确状态机与索引相关字段

### GA-04

- 打通知识库 CRUD 与文档上传入口
- Node 建记录、落盘并触发 Python

### GA-05

- Python 主导解析、清洗、分块、状态机

### GA-06

- 接入 Chroma
- `global_docs` 写入 / 删除 / 重建
- Node 统一知识检索 service

### GA-07 ~ GA-11

- 前端 `/knowledge`、`/skills`、`/agents` 接正式接口
- Skill registry 与 Agent 配置模型落地

### GA-12

- Node / Python / Chroma 联调验证
- 回归检查
- 文档同步

## 7. 关键字段建议

### 文档记录

- `status`
- `documentVersionHash`
- `embeddingProvider`
- `embeddingModel`
- `lastIndexedAt`
- `retryCount`
- `errorMessage`

### Chroma metadata

- `knowledgeId`
- `documentId`
- `type`
- `source`
- `chunkIndex`
- `chunkId`

## 8. 最小验收清单

- `/knowledge` 已接正式接口
- 至少一种文档类型完成完整索引闭环
- `global_docs` 已实际写入 Chroma
- `/skills` 已展示 3 个内置 Skill
- `/agents` 已支持创建并绑定知识库 / Skill
- `search_documents` 不直连 Chroma
- 至少有一条 Node / Python / Chroma 闭环验证记录

## 9. 给 ChatGPT 的判断规则

- 如果讨论“现在最应该做什么”，优先顺序以这份文档为准。
- 如果方案把项目私有知识库、完整对话、SSE、Agent runtime、Git 代码导入一起打包推进，应直接判定为超出当前阶段范围。
