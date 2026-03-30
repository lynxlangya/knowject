# Knowject 核心主线闭环评估与内测硬化设计

- 日期：2026-03-30
- 状态：已确认
- 适用范围：`知识接入 -> 项目对话 -> 引用出处`
- 评估口径：`可稳定自用 / 小范围内测`
- 协作假设：`2-5 人团队在同一个项目里协作试用也基本不掉链子`

## 1. 背景

本设计不定义新的产品能力，而是收口当前阶段的判断标准与下一阶段方向。

当前仓库已经具备：

- 知识库 CRUD、文档上传、项目私有 knowledge 与统一检索基线
- 项目对话正式读写链路与默认流式发送
- assistant `sources`、`citationContent`、`sources_seed`、`citation_patch` 的前后端契约
- 引用 drawer、draft -> persisted handoff、citation fail-closed 与回读收口

但用户当前要回答的不是“有没有做出这些能力”，而是：

1. 这条核心业务主线是否已经形成闭环
2. 是否还存在会阻碍小范围内测的遗留问题
3. 当前是否具备进入下一步的条件
4. 下一步应该往哪个方向推进

## 2. 评估边界

本次只评估核心主线：

`知识接入 -> 项目对话 -> 引用出处`

明确不把以下内容作为本轮闭环成立的前提：

- `Skill runtime`
- `Agent runtime`
- `global_code` 真实导入
- `/analytics`
- 完整权限系统、分享、归档、Logo 上传等外围能力

取舍依据：当前目标是判断核心业务是否足以支撑小团队试用，而不是判断整个产品面是否已经完整。

## 3. 评估方法

采用“四道门”判断是否达到小范围内测门槛。

### 3.1 入口门

判断知识是否能稳定完成：

- 创建或选择知识库
- 上传文档
- 索引处理
- 项目侧检索消费

### 3.2 主链路门

判断项目对话是否能稳定完成：

- 新建会话
- 发送消息
- 流式生成
- 回读收口
- 重试 / replay / edit

### 3.3 可信门

判断引用是否足够可信：

- `sources` 是否稳定
- `citationContent` 是否可回退
- draft -> persisted handoff 是否平滑
- 引用失配时是否 fail-closed

### 3.4 试用门

判断 2-5 人协作试用时是否容易掉链子：

- 环境和鉴权契约是否一致
- 故障是否可定位
- 流式异常与恢复是否可理解
- 新成员是否能按文档跑通最小闭环

## 4. 证据来源

本轮判断基于以下证据：

- 当前事实与交接文档：
  - `docs/current/architecture.md`
  - `docs/roadmap/gap-analysis.md`
  - `docs/handoff/handoff-guide.md`
  - `docs/handoff/chatgpt-project-brief.md`
  - `docs/contracts/chat-contract.md`
  - `docs/plans/tasks-chat-core-week7-8.md`
- 子系统说明：
  - `README.md`
  - `apps/api/README.md`
  - `apps/platform/README.md`
  - `apps/indexer-py/README.md`
- 最近提交与实现入口：
  - `git log --oneline -n 12`
  - `apps/api/src/modules/projects/*`
  - `apps/platform/src/pages/project/*`
  - `apps/indexer-py/app/api/routes/indexing.py`
- 运行验证：
  - `pnpm verify:index-ops-project-consumption`
  - `pnpm --filter platform test`

## 5. 评估结论

## 5.1 总结论

`知识接入 -> 项目对话 -> 引用出处` 这条主线，已经达到“功能层面基本闭环”，但尚未达到“工程稳定性完全闭环”。

更准确地说：

- 已经不是概念验证或纯演示壳层
- 已经具备进入“小范围内测前最后一段硬化阶段”的条件
- 当前不应该继续以“补主功能”为主，而应以“补运行边界与内测稳定性”为主

## 5.2 四道门结论

### 入口门：通过

判断依据：

- 知识库 CRUD、上传、项目私有 knowledge、统一检索与项目 merged retrieval 已接通
- `pnpm verify:index-ops-project-consumption` 中 Node/API 侧与知识主链路相关测试通过

结论：

- 文档接入、索引、项目消费不再是概念层，而是正式业务能力

### 主链路门：通过

判断依据：

- 项目对话已经具备 create / message / stream / retry / replay / edit / done / citation_patch
- 后端项目对话写链路与前端默认流式消费均已接通

结论：

- 项目对话不是“只读壳层”，而是正式对话主链路

### 可信门：通过

判断依据：

- `pnpm --filter platform test` 全绿，且覆盖 citation/source drawer/draft-persisted handoff/fail-closed
- `chat-contract` 与当前页面行为基本一致

结论：

- 引用出处已经具备最小可信与可回退能力

### 试用门：未完全通过

判断依据：

- `pnpm verify:index-ops-project-consumption` 中，Node/API 侧 108 项测试通过
- 同一入口中的 `apps/indexer-py` 测试有 13 项失败
- 失败集中在 `KNOWLEDGE_INDEXER_INTERNAL_TOKEN`、internal route 鉴权与 development/production 环境假设

结论：

- 当前最大缺口不是业务功能，而是运行契约与内测稳定性

## 6. 遗留问题分层

## 6.1 真阻塞

### A. indexer internal auth / env 契约漂移

表现：

- Python indexer 的 internal token 相关测试失败
- `.env.local` 已配置 `KNOWLEDGE_INDEXER_INTERNAL_TOKEN_FILE`
- `app.main` 在 import 时创建全局 `app`
- `app/api/routes/indexing.py` 已切到 fail-close internal auth

影响：

- 团队联调与环境切换时容易出现“你这里能跑，我这里不行”
- 开发态、部署态、测试态对 internal token 的假设不再完全一致

判断：

- 这是当前最明确的工程风险

### B. 流式恢复与故障观测尚未完全收口

表现：

- 文档仍把“更细的流式恢复 / 观测能力”列为未完成项
- 当前虽然已有 `ack / sources_seed / delta / done / citation_patch / error`，但异常路径的可观测性仍偏弱

影响：

- 试用阶段一旦断流、配置错误、索引器异常，排障成本仍偏高

判断：

- 这是影响小范围内测质量的第二类硬问题

## 6.2 次阻塞

### A. 项目概览与部分协作快照仍有 mock / 补充层

影响：

- 不阻塞核心主线
- 但会影响团队对“项目状态是否完全真实”的感知

### B. 外围协作能力未完整

包括：

- `/analytics` 占位
- `/settings` 的成员与权限占位
- 项目分享 / 归档未完成
- workspace Logo 上传未完成

影响：

- 不阻塞核心主线内测
- 但不适合被误判为“产品面已完整”

## 6.3 非阻塞

当前不应插队的能力：

- `Skill runtime`
- `Agent runtime`
- `global_code`
- 更大的分析看板

原因：

- 这些属于下一阶段扩展，不是当前内测闭环缺口

## 7. 阶段判断与方向选择

## 7.1 当前阶段定义

当前阶段不应再定义为“主功能建设中”，而应定义为：

`核心主线内测硬化`

## 7.2 为什么不是继续扩能力

因为当前最贵的风险已经不是“功能缺失”，而是：

- 运行契约漂移
- 故障恢复成本高
- 小团队试用时的稳定性还未完全收口

如果此时优先做：

- `Agent runtime`
- `global_code`
- 更多外围产品面

会在未稳的基础上继续增加变量和回归面。

## 7.3 推荐路线

推荐路线：`先硬化，再扩能力`

不推荐路线：

- 先做更重的 AI runtime
- 先扩完整产品面
- 先追求更大的讲故事能力

## 8. 下一阶段设计：核心主线内测硬化

## 8.1 阶段目标

让一支 2-5 人团队，在同一个项目里能稳定完成：

- 接入知识
- 发起项目对话
- 获得回答
- 查看可信引用
- 遇到失败时理解原因并恢复

## 8.2 四个工作包

### 工作包 1：运行契约硬化

目标：

- 收口 `indexer internal auth/env` 真相

重点：

- development / production 行为一致性
- `_FILE` 与直接环境变量的优先级
- 测试夹具与实际运行路径一致
- internal bearer token 契约只保留一套真相

### 工作包 2：端到端 smoke 硬化

目标：

- 为核心主线建立一个最小但可信的端到端验证链

最小闭环应覆盖：

- 创建或选择知识库
- 上传文档
- 索引完成
- 项目对话提问
- 返回回答
- 展示引用出处

### 工作包 3：流式与引用恢复硬化

目标：

- 把当前已有流式协议收口成稳定体验

重点：

- `citation_patch` 缺席时安全回退
- 中断 / 取消 / 重试时线程不写脏
- settings 缺失、retrieval 失败、indexer 异常时有明确恢复路径

### 工作包 4：小团队试用边界硬化

目标：

- 降低协作试用时的理解和排障成本

重点：

- 项目私有 knowledge 与项目对话边界不串
- 新成员可以按文档独立跑通
- 常见失败可定位到 settings/api/indexer/retrieval/citation 层级

## 9. 出关标准

完成以下 5 条后，才视为可以进入下一轮能力建设：

1. `pnpm verify:index-ops-project-consumption` 全绿，不能再让 indexer 子链路红着
2. `pnpm --filter platform test` 继续保持全绿，项目对话/引用相关回归不退
3. 按当前文档在新环境启动后，能走通一次真实核心闭环，无需人工修状态
4. 2-5 人试用时，不再频繁出现配置漂移、索引器鉴权不一致、引用缺失、重试写脏等问题
5. 故障可以快速定位到具体层级，而不是只能靠源码猜

## 10. 当前阶段明确不做

在“核心主线内测硬化”阶段，不把以下能力作为主线任务：

- `Skill runtime`
- `Agent runtime`
- `global_code`
- 更大的分析看板
- 完整权限系统

原因：

- 这些能力会增加复杂度，但不能直接消除当前内测阶段的主要风险

## 11. 硬化完成后的推荐顺序

当本阶段出关后，下一轮建议按以下顺序推进：

1. 引用体验深化
2. 原文定位 / 预览
3. `global_code`
4. `Skill runtime / Agent runtime`

取舍依据：

- 先提升已有主线的解释力与可用性
- 再扩检索范围
- 最后再叠更重的运行时编排

## 12. 一句话结论

Knowject 当前已经具备核心主线的功能闭环，但还没有完成面向小团队内测的工程闭环。下一步不该继续扩新能力，而应进入“核心主线内测硬化”阶段，优先收口运行契约、端到端 smoke、流式恢复与协作试用边界。
