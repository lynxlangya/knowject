# Knowject 文档索引

`.agent/docs/` 是 Knowject 当前唯一的项目文档根目录，用于统一收敛“事实、规划、交接、契约、设计、输入材料与模板”。

补充说明：`.agent/gpt/` 是面向 ChatGPT Projects 的上传副本目录，属于派生包，不替代 `.agent/docs/` 的主文档职责。

本次收敛的目标不是单纯挪文件，而是把文档入口、分类和维护边界一起稳定下来，避免后续继续出现“知道有文档，但不知道该去哪里找”的问题。

## 1. 分类结构

```text
.agent/docs/
  README.md                     文档总索引
  current/
    architecture.md            当前事实源
    docker-usage.md            Docker 使用现状
    docker-operation-checklist.md Docker 操作清单
  contracts/
    auth-contract.md           认证与环境契约
    chroma-decision.md         Chroma 角色与实施边界
  roadmap/
    target-architecture.md     目标蓝图
    gap-analysis.md            current vs target 差距分析
  plans/
    doc-iteration-handoff-plan.md
    tasks-foundation-framework.md
    tasks-global-assets-foundation.md
    tasks-index-ops-project-consumption.md
  handoff/
    handoff-guide.md
    chatgpt-project-brief.md
    handoff-prompt.md
  inputs/
    知项Knowject-项目认知总结-v2.md
    知项Knowject-项目认知总结-v3.md
  design/
    ...
  templates/
    PLANS.md
```

## 2. 阅读顺序

### 快速接手当前工作

1. 先读 `.agent/docs/handoff/handoff-guide.md`
2. 再读 `.agent/docs/current/architecture.md`
3. 涉及基础框架阶段范围与完成记录时，再读 `.agent/docs/plans/tasks-foundation-framework.md`
4. 涉及 Week 3-4 全局资产阶段拆分时，再读 `.agent/docs/plans/tasks-global-assets-foundation.md`
5. 涉及 Week 5-6 索引运维与项目层消费时，再读 `.agent/docs/plans/tasks-index-ops-project-consumption.md`
6. 然后读 `.agent/docs/roadmap/gap-analysis.md`
7. 涉及认证与环境时，再读 `.agent/docs/contracts/auth-contract.md`
8. 涉及 Chroma、知识索引、collection 命名、metadata 或检索 service 边界时，再读 `.agent/docs/contracts/chroma-decision.md`
9. 涉及 Docker、MongoDB 本地联调方式或部署现状时，再读 `.agent/docs/current/docker-usage.md`
10. 需要直接执行本地登录、后端调用、Navicat 连接、Chroma 查看或开发 / 验收模式切换时，再读 `.agent/docs/current/docker-operation-checklist.md`
11. 需要直接执行容器启动、TLS 入口或私有化部署命令时，再读 `docker/README.md`
12. 需要给 ChatGPT / 外部大模型快速建立当前上下文时，先读 `.agent/docs/handoff/chatgpt-project-brief.md`
13. 如果需要一组可直接上传到 ChatGPT Projects 的副本文件，读 `.agent/gpt/README.md`
14. 需要把任务交给下一位 AI 或人类时，使用 `.agent/docs/handoff/handoff-prompt.md`

### 理解产品现状与目标

1. 先读 `.agent/docs/current/architecture.md`
2. 再读 `.agent/docs/roadmap/target-architecture.md`
3. 最后读 `.agent/docs/roadmap/gap-analysis.md`

如果只需要快速判断当前仓库状态，只读 `.agent/docs/current/architecture.md` 即可。

## 3. 分类索引

| 分类     | 目录                    | 主要文件                                                                                              | 适合回答的问题                                                    |
| -------- | ----------------------- | ----------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| 当前事实 | `.agent/docs/current`   | `architecture.md`、`docker-usage.md`、`docker-operation-checklist.md`                                | 现在的路由、数据来源、模块边界、API / Docker 边界，以及该怎么操作 |
| 实施契约 | `.agent/docs/contracts` | `auth-contract.md`、`chroma-decision.md`                                                              | MongoDB、JWT、密码哈希、注册登录、Node / Python / Chroma 分层与检索约束怎么定 |
| 路线蓝图 | `.agent/docs/roadmap`   | `target-architecture.md`、`gap-analysis.md`                                                           | 产品最终想做成什么、现在差多少、先补什么                          |
| 阶段计划 | `.agent/docs/plans`     | `doc-iteration-handoff-plan.md`、`tasks-foundation-framework.md`、`tasks-global-assets-foundation.md`、`tasks-index-ops-project-consumption.md` | 当前阶段具体怎么拆、顺序如何、DoD 怎么定                          |
| 接手交接 | `.agent/docs/handoff`   | `handoff-guide.md`、`chatgpt-project-brief.md`、`handoff-prompt.md`                                  | 新协作者、ChatGPT 或外部模型如何快速建立事实并继续推进            |
| 输入材料 | `.agent/docs/inputs`    | `知项Knowject-项目认知总结-v2.md`、`知项Knowject-项目认知总结-v3.md`                                  | 认知总结原文是什么，哪些内容需要吸收为正式文档                    |
| 设计资料 | `.agent/docs/design`    | 品牌与视觉资料                                                                                        | 品牌表达、图标、字标、视觉方向是什么                              |
| 模板     | `.agent/docs/templates` | `PLANS.md`                                                                                            | 复杂任务、迁移和高风险变更该如何写执行计划                        |

## 4. 维护边界

- 更新 `.agent/docs/current/architecture.md`
  - 路由、重定向、页面命名变化。
  - 项目数据来源、localStorage 键、Mock 组织方式变化。
  - 模块职责边界、API 边界、当前运行基线变化。
- 更新 `.agent/docs/current/docker-usage.md`
  - Docker 使用边界、MongoDB 联调方式、最小服务拓扑发生变化。
  - 新增或删除 `Dockerfile`、`docker-compose`、容器化部署脚本。
  - 部署现状从“规划”变为“已交付”或发生明显收缩。
- 更新 `.agent/docs/contracts/auth-contract.md`
  - 基础框架阶段的环境变量、JWT、密码哈希、注册登录契约发生变化。
  - 错误响应格式、状态码语义或安全边界发生变化。
- 更新 `.agent/docs/contracts/chroma-decision.md`
  - Chroma 的角色定位、MongoDB / Chroma 分工、collection 命名或 metadata 设计原则发生变化。
  - Node / Python 索引分层、检索 service 边界、删除 / 重建 / 去重策略发生变化。
  - Week 3-4 与 Week 5-8 的检索分层边界发生变化。
- 更新 `.agent/docs/roadmap/target-architecture.md`
  - 产品三层架构定义变化。
  - Knowledge / Skill / Agent 定义变化。
  - MVP / 第二阶段 / 第三阶段目标变化。
  - 重要待决策项被确认或被废弃。
- 更新 `.agent/docs/roadmap/gap-analysis.md`
  - 当前事实和目标蓝图之间的主要差距发生变化。
  - 优先级、风险判断或阶段性建议发生明显调整。
  - 关键 git 演进节点需要补充新的里程碑。
- 更新 `.agent/docs/plans/doc-iteration-handoff-plan.md`
  - 需要补充新的文档迭代范围、里程碑或验证结果。
  - 本轮计划已完成，需要记录结果总结与残余风险。
- 更新 `.agent/docs/plans/tasks-foundation-framework.md`
  - 基础框架阶段的任务范围、顺序、依赖关系或 DoD 发生变化。
  - 基础框架阶段状态从“进行中”变为“已完成 / 延后 / 拆到下一阶段”时，需同步更新完成记录与边界。
- 更新 `.agent/docs/plans/tasks-global-assets-foundation.md`
  - Week 3-4 全局资产阶段的范围、顺序、依赖关系或 DoD 发生变化。
  - 已确认的前置决策、阶段取舍或风险止损策略发生变化。
  - 阶段状态从“待启动”变为“进行中 / 已完成 / 延后”时，需同步更新。
- 更新 `.agent/docs/plans/tasks-index-ops-project-consumption.md`
  - Week 5-6 索引运维与项目层消费阶段的范围、顺序、依赖关系或 DoD 发生变化。
  - 项目私有知识库 scope、collection 命名、rebuild / diagnostics 边界发生变化。
  - 阶段状态从“待启动”变为“进行中 / 已完成 / 延后”时，需同步更新。
- 更新 `.agent/docs/handoff/handoff-guide.md`
  - 当前最重要的接手路径、阅读顺序、继续开发建议发生变化。
  - 有新的业务事实容易被误读，需要显式提醒接手者。
- 更新 `.agent/docs/handoff/chatgpt-project-brief.md`
  - 需要给 ChatGPT / 外部大模型提供新的项目快照时。
  - 当前事实、模块边界、运行方式或“哪些仍是 Mock”发生明显变化时。
- 更新 `.agent/gpt/*`
  - 当 `.agent/docs/current/*`、`.agent/docs/contracts/*`、`.agent/docs/plans/*` 中被上传包引用的原文发生变化时。
  - 需要同步更新 `.agent/gpt/README.md` 与受影响的派生副本，避免 ChatGPT Projects 上传包与事实源漂移。
- 更新 `.agent/docs/handoff/handoff-prompt.md`
  - 接手 Prompt 中引用的关键文档、源码入口或输出格式发生变化。
  - 交接方式需要从“阅读事实”调整为“执行某一类任务”。
- 更新 `.agent/docs/templates/PLANS.md`
  - 执行计划模板结构、里程碑格式、验证项或回滚项需要调整。
- 更新根 `README.md`
  - 文档入口、目录结构或对外阅读顺序发生变化。

## 5. 使用规则

- 关于“当前是什么”的判断，以 `.agent/docs/current/architecture.md` 和源码为准。
- 关于“Docker 现在怎么用、哪些还没交付”的判断，以 `.agent/docs/current/docker-usage.md` 为准。
- 关于“怎么最快接手当前工作”的判断，以 `.agent/docs/handoff/handoff-guide.md` 为准。
- 关于“给 ChatGPT / 外部大模型最小必要上下文”的判断，以 `.agent/docs/handoff/chatgpt-project-brief.md` 为准。
- 关于“给 ChatGPT Projects 上传哪组副本、这些副本是否已同步”的判断，以 `.agent/gpt/README.md` 与对应派生文件为准，但若与 `.agent/docs/*` 冲突，始终以后者为准。
- 关于“未来要做什么”的判断，以 `.agent/docs/roadmap/target-architecture.md` 为准。
- 关于“为什么现在不这么写、下一步先做什么”的判断，以 `.agent/docs/roadmap/gap-analysis.md` 为准。
- 关于“如何把上下文交给下一位协作者”的判断，以 `.agent/docs/handoff/handoff-prompt.md` 为准。
- 关于“基础框架阶段先拆哪些任务”的判断，以 `.agent/docs/plans/tasks-foundation-framework.md` 为准。
- 关于“全局资产阶段先拆哪些任务、执行顺序和 DoD 怎么定”的判断，以 `.agent/docs/plans/tasks-global-assets-foundation.md` 为准。
- 关于“Week 5-6 先补哪些索引运维能力、项目层消费和项目私有知识如何落地”的判断，以 `.agent/docs/plans/tasks-index-ops-project-consumption.md` 为准。
- 关于“基础框架阶段的环境变量和认证协议具体怎么实现”的判断，以 `.agent/docs/contracts/auth-contract.md` 为准。
- 关于“Chroma 应该放在哪一层、Node 与 Python 如何分工、collection 怎么命名、metadata 与检索 service 如何分层”的判断，以 `.agent/docs/contracts/chroma-decision.md` 为准。
- `.agent/docs/inputs/知项Knowject-项目认知总结-v3.md` 是当前最新的认知总结输入材料，但仍不是当前事实源；引用其中内容时，必须先判断它属于已落地事实、目标态还是待决策。
- `.agent/docs/inputs/知项Knowject-项目认知总结-v2.md` 保留为历史输入材料，用于回看阶段演进，不作为最新规划依据。

## 6. 当前结论

- 当前仓库已经进入“前后端基础框架已接通、局部能力仍依赖 Mock”的阶段，而不是单纯“前端壳层 + 演示 API”。
- 基础框架阶段已经完成；后端已具备 `auth`、`members`、最小项目 CRUD 与成员接口，前端项目列表、项目基础信息、成员 roster 与全局成员概览也已切到后端接口。
- 当前剩余的主要 Mock 仍集中在项目概览补充层、对话消息演示数据与协作快照补充层。
- 全局 `/skills` 已从“只读目录”升级为正式 Skill 资产治理链路；后续若再变更 Skill 来源、生命周期或绑定规则，需要同步 `.agent/docs/current/architecture.md`、handoff 文档与 `.agent/gpt/*` 上传副本。
- Week 5-6 当前已经收口到正式基线：`/knowledge` rebuild / diagnostics、项目资源页正式 `agents` 消费，以及项目私有 knowledge 的 create / upload / resources 最小闭环都已落地；继续迭代时应直接以 `.agent/docs/plans/tasks-index-ops-project-consumption.md` 的完成记录和顺延项为准。
- 目标蓝图已经形成，但大量 AI、数据层和部署能力还未进入实现阶段。
- 现在所有项目文档已统一收口到 `.agent/docs/`；后续若再新增项目级文档，应优先纳入这里的既有分类，而不是在仓库根部重新散落新入口。
