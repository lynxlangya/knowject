# Knowject 项目协作规则（ChatGPT Projects 上传版）

状态：2026-03-13  
来源：基于项目 `AGENTS.md` 精简同步。  
定位：这是给 ChatGPT Projects 用的协作规则副本，不是仓库自动生效规则。

## 1. 输出风格

- 默认中文。
- 结论先行，避免空泛。
- 优先短段落，不做无意义长列表。
- 需求不完整时，先基于最低风险假设推进。

## 2. 工作原则

- 优先级顺序：
  - Safety > Correctness > Maintainability > Minimal Diff > Speed
- 不臆造 API、路径、配置或实现状态。
- 修改前先检查现有实现和现有文档。
- 优先复用现有架构、模块边界和命名。
- 默认做最小可行改动，不顺手修 unrelated issues。

## 3. 项目级事实判断规则

- 当前事实以 `.agent/docs/current/architecture.md` 和源码为准。
- 目标蓝图以 `.agent/docs/roadmap/target-architecture.md` 为准。
- 当前差距与优先顺序以 `.agent/docs/roadmap/gap-analysis.md` 为准。
- Node / Python / MongoDB / Chroma 的索引分层判断，以 `.agent/docs/contracts/chroma-decision.md` 为准。

## 4. 当前项目最重要的架构边界

- `apps/platform`
  - 登录后产品壳、路由、项目态页面、全局资产治理壳层。
- `apps/api`
  - 正式业务主后端。
  - 当前已落地 auth、members、projects、memberships、memory。
- MongoDB
  - 正式业务主数据库。
- Chroma
  - 当前只在基础设施与健康诊断层就绪。
- Python indexer
  - 是当前已确认的推荐实现方向，但仓库里还没有落地代码。

## 5. 当前产品与路由约束

- 登录页固定为 `/login`。
- 登录后默认落点固定为 `/home`。
- 项目 canonical 路由固定为：
  - `/project/:projectId/overview`
  - `/project/:projectId/chat`
  - `/project/:projectId/chat/:chatId`
  - `/project/:projectId/resources`
  - `/project/:projectId/members`
- `/workspace` 只是兼容入口，必须重定向到 `/home`。
- `/home/project/*` 只是兼容入口，不应继续作为主路径扩展。

## 6. 当前阶段范围约束

- 当前阶段重点是“全局资产正式化”。
- 不要提前一次做完：
  - 项目私有知识库
  - 完整对话链路
  - SSE
  - Agent runtime
  - Git 代码导入

## 7. 文档同步要求

如果改动了以下内容，必须同步更新文档：

- 路由、重定向、页面命名
- localStorage 键
- 模块职责边界
- API 边界
- 环境变量与部署拓扑
- Node / Python / Chroma / MongoDB 分层边界

优先更新位置：

1. `.agent/docs/current/architecture.md`
2. `.agent/docs/contracts/*`
3. `.agent/docs/plans/*`
4. `.agent/docs/roadmap/*`
5. 必要时更新项目 `AGENTS.md`

## 8. 这份上传包的特别说明

- `.agent/gpt/` 是“上传给 ChatGPT Projects 的派生目录”。
- 它不是新的主文档根目录。
- 若这里与 `.agent/docs/` 冲突，以 `.agent/docs/` 和源码为准。
