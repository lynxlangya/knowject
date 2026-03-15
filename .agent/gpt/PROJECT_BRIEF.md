# Knowject 项目简介（ChatGPT Projects 上传版）

状态：2026-03-15
来源：基于 `AGENTS.md`、`.agent/docs/current/architecture.md`、`.agent/docs/contracts/chroma-decision.md`、`.agent/docs/plans/tasks-index-ops-project-consumption.md`、`.agent/docs/roadmap/gap-analysis.md` 汇总。
定位：这是给 ChatGPT Projects 建立上下文的首份文档，不是主事实源。

## 1. 项目是什么

- `知项 · Knowject` 是一个面向开发团队的项目级 AI 知识协作产品。
- 当前仓库是 monorepo，核心由三部分组成：
  - `apps/platform`：React + Vite + Ant Design 前端
  - `apps/api`：Express + TypeScript 后端
  - `apps/indexer-py`：FastAPI + `uv` 的内部 Python 索引控制面
- 当前项目阶段不是纯 Demo，也不是完整 AI 产品，而是：
  - 前后端基础框架已接通
  - 项目主数据与成员链路已落地
  - 索引运维基线与项目私有 knowledge 最小闭环已落地
  - 全局 Skill / Agent 管理页已落地，运行时仍在推进

## 2. 当前已经落地的事实

- 登录页 `/login` 已接通正式注册 / 登录接口。
- 后端已落地：
  - MongoDB 连接与健康诊断
  - `argon2id` 密码哈希
  - JWT 鉴权
  - 全局成员概览
  - 项目最小 CRUD
  - 项目成员管理
  - 已注册用户搜索
  - 知识库 CRUD、文档上传、状态推进与统一检索
  - Skill 正式资产 CRUD / 导入 / 草稿发布 / 绑定校验，以及 Agent 正式 CRUD / 绑定
  - `memory/overview` 与 `memory/query` 演示接口
- 前端已经切到正式后端的数据包括：
  - 项目列表
  - 项目基础信息
  - 成员 roster
  - 项目资源绑定
  - 项目私有知识目录
  - 项目对话列表 / 详情
  - 全局成员页
  - `/knowledge`、`/skills`、`/agents` 全局资产管理页
- Python indexer 已落地：
  - FastAPI + `uv`
  - `GET /health`
  - `POST /internal/v1/index/documents`
  - 隐藏兼容旧路径 `POST /internal/index-documents`
  - `/docs`、`/redoc`、`/openapi.json`

## 3. 当前仍未落地的事实

- Skill / Agent 执行闭环
- `global_code` 真实导入与项目级合并检索
- 项目对话消息写入与 SSE
- 来源引用渲染
- 项目知识原文的预览 / 下载能力

## 4. 当前信息架构

- 登录后默认落点：`/home`
- 全局主导航固定为：
  - `/home`
  - `/knowledge`
  - `/skills`
  - `/agents`
  - `/members`
  - `/analytics`
  - `/settings`
- 项目 canonical 路由固定为：
  - `/project/:projectId/overview`
  - `/project/:projectId/chat`
  - `/project/:projectId/chat/:chatId`
  - `/project/:projectId/resources`
  - `/project/:projectId/members`
- 以下只是兼容入口，不应继续扩展为主业务入口：
  - `/workspace`
  - `/home/project/*`
  - `/project/:projectId/knowledge|skills|agents`

## 5. 当前数据分层

### 正式后端主链路

- 登录 / 注册
- 项目主数据
- 项目成员关系
- 全局成员概览
- 项目资源绑定
- 项目私有知识目录
- 项目对话列表 / 详情读链路
- 知识库 CRUD、上传、rebuild / diagnostics、状态推进与统一检索

### 仍主要依赖前端本地 / Mock

- 项目概览页内容
- 对话消息演示数据
- 项目成员协作快照与概览补充层

### 当前关键前端本地状态

- `knowject_token`
- `knowject_auth_user`
- `knowject_project_pins`
- `knowject_project_resource_bindings`（历史迁移缓存）

## 6. 新的索引分层决策

这是当前已冻结并已按最小闭环落地的实现路径：

- `apps/api`
  - 继续负责业务主链路。
  - 负责鉴权、权限、知识库 CRUD、文档记录、上传入口、状态查询、统一知识检索 service。
- `apps/indexer-py`
  - 负责索引处理链路。
  - 当前已落地 FastAPI + `uv` 控制面、`GET /health`、`POST /internal/v1/index/documents`，并隐藏兼容旧路径 `POST /internal/index-documents`。
  - 当前已覆盖 parse / clean / chunk / embed / upsert / delete，并已开放 rebuild / diagnostics 相关内部入口。
- MongoDB
  - 负责业务主数据层。
  - 保存知识库元数据、文档记录、索引状态、失败原因、绑定关系。
- Chroma
  - 只负责向量索引层。
  - 保存 chunk embeddings 与检索 metadata。

## 7. 已冻结的 5 个关键实施决策

### 1. Node -> Python 触发方式

- 固定为：Node 调 Python 本地 HTTP 服务。
- 当前正式内部写侧入口：`POST /internal/v1/index/documents`
- 若实现初期临时借用 CLI / 子进程，只能作为内部适配细节，不能成为长期业务契约。

### 2. 业务状态回写归口

- MongoDB 中的知识库 / 文档业务状态统一由 Node/Express 回写。
- Python 只返回处理结果，不直接写业务主状态表。

### 3. Embedding 基线

- provider：OpenAI
- model：`text-embedding-3-small`
- 开发环境缺少 `OPENAI_API_KEY` 时，允许用 deterministic 本地 embedding 保持上传状态流可联调。

### 4. 文件保留策略

- 原始上传文件长期保留，直到文档被删除或被新版本替换。
- 中间产物成功后清理，失败时保留 `72 小时 ~ 7 天` 供诊断。

### 5. 重试 / 重建粒度

- Week 3-4 先交付：
  - `retry document`
  - `rebuild document`
  - `rebuild knowledge`
- 系统级批量重建延后到 Week 5-6 以后。

## 8. 最小调用链

1. 用户通过前端上传文档。
2. `apps/api` 创建 knowledge/document 元数据记录。
3. 文档状态初始化为 `pending`。
4. Node 保存文件到本地存储。
5. Node 调 Python 本地 HTTP 服务触发 indexer。
6. Python 完成解析、清洗、分块、embedding、写入 Chroma。
7. Python 把结果交回 Node。
8. Node 统一回写 `processing / completed / failed`。
9. Node 的统一知识检索 service 查询 Chroma 并返回标准结果。
10. `search_documents` Skill 只能调用统一知识检索 service，不能自己直连 Chroma。

## 9. Week 5-6 当前阶段结果

### 本阶段已完成

- `/knowledge` 的 document / knowledge rebuild 与 diagnostics
- 项目资源页 `agents` 正式消费切换
- 项目私有知识的 `scope / projectId` 模型、`proj_{projectId}_docs` 写侧，以及资源页中的统一知识接入入口与详情抽屉
- Week 5-6 统一验证入口 `pnpm verify:index-ops-project-consumption`

### 顺延到下一阶段

- 项目对话消息写入、SSE、来源引用 UI
- 项目 + 全局知识合并检索
- `global_code` 真实 Git 导入
- 完整 Agent runtime
- 项目知识原文的预览 / 下载能力

## 10. 给 ChatGPT 的工作约束

- 不要把目标蓝图当成当前事实。
- 不要把 `/skills`、`/agents` 误判为已经进入运行时；当前正式写链路已经覆盖 Knowledge 上传、索引运维、Skill 资产治理、Agent 配置与项目私有知识最小消费，但运行时仍未完成。
- 不要把 Chroma 误判为正式业务主数据库。
- 不要把“Node/Express 负责业务主链路，Python 负责索引处理链路”写成“全仓切 Python”。
- 默认中文输出，结论先行，尽量最小改动。

## 11. 推荐继续阅读

1. `PROJECT_RULES.md`
2. `CURRENT_ARCHITECTURE.md`
3. `INDEXING_DECISION.md`
4. `WEEK5_6_TASKS.md`
5. `GAP_ANALYSIS.md`
6. `AUTH_ENV_CONTRACT.md`（按需）

## 12. 一句话总结

当前 Knowject 最稳定的是信息架构、鉴权、项目主数据、成员链路、`/knowledge` 的索引运维基线，以及项目私有 knowledge 最小闭环；当前最大的断层仍是项目对话消息写侧、项目级合并检索与 Skill / Agent 运行时。
