# Knowject 文档导航

`docs/` 目录按“当前事实 / 目标蓝图 / 差距分析 / 接手交接”分层维护，避免把已落地实现、未来方案和路线设想继续混写，也避免把接手说明散落在多个入口里。

## 1. 阅读顺序

### 快速接手当前工作

1. 先读 `docs/handoff-guide.md`
2. 再读 `docs/architecture.md`
3. 涉及基础框架范围与完成记录时再读 `docs/tasks-foundation-framework.md`
4. 然后读 `docs/gap-analysis.md`
5. 涉及认证与环境时再读 `docs/auth-contract.md`
6. 需要把任务交给下一位 AI 或人类时，使用 `docs/handoff-prompt.md`

### 理解产品现状与目标

1. 先读 `docs/architecture.md`
2. 再读 `docs/target-architecture.md`
3. 最后读 `docs/gap-analysis.md`

如果只需要快速判断当前仓库状态，只读 `docs/architecture.md` 即可。

## 2. 文档角色

| 文档 | 角色 | 权威级别 | 适合回答的问题 |
| --- | --- | --- | --- |
| `docs/architecture.md` | 当前事实源 | 最高 | 现在的路由、数据来源、模块边界、API 边界是什么 |
| `docs/target-architecture.md` | 目标蓝图源 | 高 | 产品最终想做成什么，Knowledge / Skill / Agent 如何分层 |
| `docs/gap-analysis.md` | current vs target 对照 | 高 | 现在离目标差多少，先补什么，风险在哪里 |
| `docs/doc-iteration-handoff-plan.md` | 本轮文档执行计划 | 交付规划 | 本轮文档迭代打算做什么、范围和验证方式是什么 |
| `docs/handoff-guide.md` | 快速接手指南 | 高 | 新 AI / 新同学如何在 15 分钟内建立当前事实并继续推进 |
| `docs/handoff-prompt.md` | 接手提示模板 | 高 | 如何把仓库和当前上下文准确交给下一位 AI 或人类 |
| `docs/tasks-foundation-framework.md` | 基础框架任务归档 | 阶段复盘 | Week 1-2 基础框架做了什么、完成到哪里、遗留什么 |
| `docs/auth-contract.md` | 基础框架实施契约 | 实施约束 | MongoDB、JWT、密码哈希、注册登录、错误响应具体怎么定 |
| `docs/知项Knowject-项目认知总结-v2.md` | 输入材料 / 工作底稿 | 参考 | 最新认知总结原文是什么，哪些内容需要被吸收到正式文档 |
| `docs/design/*` | 品牌与视觉资料 | 专项参考 | 品牌表达、图标、字标、视觉方向是什么 |

## 3. 维护边界

- 更新 `docs/architecture.md`
  - 路由、重定向、页面命名变化。
  - 项目数据来源、localStorage 键、Mock 组织方式变化。
  - 模块职责边界、API 边界、当前运行基线变化。
- 更新 `docs/target-architecture.md`
  - 产品三层架构定义变化。
  - Knowledge / Skill / Agent 定义变化。
  - MVP / 第二阶段 / 第三阶段目标变化。
  - 重要待决策项被确认或被废弃。
- 更新 `docs/gap-analysis.md`
  - 当前事实和目标蓝图之间的主要差距发生变化。
  - 优先级、风险判断或阶段性建议发生明显调整。
  - 关键 git 演进节点需要补充新的里程碑。
- 更新 `docs/doc-iteration-handoff-plan.md`
  - 需要补充新的文档迭代范围、里程碑或验证结果。
  - 本轮计划已完成，需要记录结果总结与残余风险。
- 更新 `docs/handoff-guide.md`
  - 当前最重要的接手路径、阅读顺序、继续开发建议发生变化。
  - 有新的业务事实容易被误读，需要显式提醒接手者。
- 更新 `docs/handoff-prompt.md`
  - 接手 Prompt 中引用的关键文档、源码入口或输出格式发生变化。
  - 交接方式需要从“阅读事实”调整为“执行某一类任务”。
- 更新 `docs/tasks-foundation-framework.md`
  - 基础框架阶段的任务范围、顺序、依赖关系或 DoD 发生变化。
  - 基础框架阶段状态从“进行中”变为“已完成 / 延后 / 拆到下一阶段”时，需同步更新完成记录与边界。
- 更新 `docs/auth-contract.md`
  - 基础框架阶段的环境变量、JWT、密码哈希、注册登录契约发生变化。
  - 错误响应格式、状态码语义或安全边界发生变化。

## 4. 使用规则

- 关于“当前是什么”的判断，以 `docs/architecture.md` 和源码为准。
- 关于“怎么最快接手当前工作”的判断，以 `docs/handoff-guide.md` 为准。
- 关于“未来要做什么”的判断，以 `docs/target-architecture.md` 为准。
- 关于“为什么现在不这么写、下一步先做什么”的判断，以 `docs/gap-analysis.md` 为准。
- 关于“如何把上下文交给下一位协作者”的判断，以 `docs/handoff-prompt.md` 为准。
- 关于“基础框架阶段先拆哪些任务”的判断，以 `docs/tasks-foundation-framework.md` 为准。
- 关于“基础框架阶段当前已经做到哪一步”的判断，同时看 `docs/architecture.md` 与 `docs/tasks-foundation-framework.md`。
- 关于“基础框架阶段的环境变量和认证协议具体怎么实现”的判断，以 `docs/auth-contract.md` 为准。
- `docs/知项Knowject-项目认知总结-v2.md` 不直接作为当前事实源引用；引用其中内容时，必须先判断它属于已落地事实、目标态还是待决策。

## 5. 当前结论

- 当前仓库已经进入“前后端基础框架已接通、局部能力仍依赖 Mock”的阶段，而不是单纯“前端壳层 + 演示 API”。
- 基础框架阶段已经完成；后端已具备 auth、members、最小项目 CRUD 与成员接口，前端项目列表、项目基础信息、成员 roster 与全局成员概览也已切到后端接口。
- 成员管理当前支持按用户名 / 姓名模糊搜索已有用户，并通过多选下拉框批量加入项目。
- 当前剩余的主要 mock 仍集中在项目概览、对话、资源绑定与协作演示数据。
- 目标蓝图已经形成，但大量 AI、数据层和部署能力还未进入实现阶段。
- 本轮已把“当前事实”“接手路径”“交接 Prompt”拆成单独文档，减少后续接手时的误读成本。
- 若需要回顾基础框架阶段到底交付了什么，先读 `docs/tasks-foundation-framework.md`；若要决定下一阶段优先级，再读 `docs/gap-analysis.md`。
