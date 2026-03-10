# Knowject 文档导航

`docs/` 目录按“当前事实 / 目标蓝图 / 差距分析”分层维护，避免把已落地实现、未来方案和路线设想继续混写。

## 1. 阅读顺序

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
| `docs/tasks-foundation-framework.md` | 基础框架任务清单 | 交付规划 | Week 1-2 基础框架阶段具体做什么、按什么顺序拆票 |
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
- 更新 `docs/tasks-foundation-framework.md`
  - 基础框架阶段的任务范围、顺序、依赖关系或 DoD 发生变化。
  - 基础框架阶段已经落地或被明确延后，需同步更新状态与边界。
- 更新 `docs/auth-contract.md`
  - 基础框架阶段的环境变量、JWT、密码哈希、注册登录契约发生变化。
  - 错误响应格式、状态码语义或安全边界发生变化。

## 4. 使用规则

- 关于“当前是什么”的判断，以 `docs/architecture.md` 和源码为准。
- 关于“未来要做什么”的判断，以 `docs/target-architecture.md` 为准。
- 关于“为什么现在不这么写、下一步先做什么”的判断，以 `docs/gap-analysis.md` 为准。
- 关于“基础框架阶段先拆哪些任务”的判断，以 `docs/tasks-foundation-framework.md` 为准。
- 关于“基础框架阶段的环境变量和认证协议具体怎么实现”的判断，以 `docs/auth-contract.md` 为准。
- `docs/知项Knowject-项目认知总结-v2.md` 不直接作为当前事实源引用；引用其中内容时，必须先判断它属于已落地事实、目标态还是待决策。

## 5. 当前结论

- 当前仓库主线仍是“前端壳层 + 本地 Mock + 演示 API”。
- 目标蓝图已经形成，但大量 AI、数据层和部署能力还未进入实现阶段。
- 后续开发前，建议先读 `docs/gap-analysis.md`，再决定是继续补前端产品骨架，还是开始推进后端 / RAG / Skill 能力。
