# Knowject Week 5-6 阶段摘要（ChatGPT Projects 上传版）

状态：2026-03-16  
来源：基于 `.agent/docs/plans/tasks-index-ops-project-consumption.md` 精简同步。  
定位：用于让 ChatGPT 快速知道 Week 5-6 做成了什么、没做什么、下一阶段该接什么。

## 1. 本阶段目标

- 把 `global_docs` 从“能上传”推进到“可运维”。
- 收口项目资源页的正式资源消费。
- 让项目私有 knowledge 具备最小 `create -> upload -> index -> resources 可见` 闭环。

## 2. 本阶段已完成

- `IC-01`
  - 冻结 Week 5-6 范围、scope 语义、namespace key 命名与延后项。
- `IC-02`
  - 补齐 `global_docs` 的 document rebuild、knowledge rebuild、diagnostics 正式 API 与 Python 内部入口。
- `IC-03`
  - `/knowledge` 已接 document / knowledge rebuild 与 diagnostics 面板。
- `IC-04`
  - 项目资源页 `agents` 已切正式 `/api/agents`。
- `IC-05`
  - `knowledge` 模型已支持 `scope=global|project` 与 `projectId`。
- `IC-06`
  - 项目私有 knowledge 已开放 `list / create / detail / upload` 路由，并写入 `proj_{projectId}_docs` namespace 当前 active 的 versioned collection。
- `IC-07`
  - `/project/:projectId/resources` 已能同时展示“全局绑定知识”和“项目私有知识”，并已补齐统一“接入知识库”入口与知识库详情抽屉。
- `IC-09`
  - 已新增统一验证入口 `pnpm verify:index-ops-project-consumption`，并完成回归与文档同步。

## 3. 本阶段明确未做

- `pdf` 恢复保持 timebox 候选，没有纳入硬性 DoD。
- `docx / Word` 没有进入本阶段。
- 项目对话消息写入、SSE、来源引用没有进入本阶段。
- `global_code` 真实 Git 导入没有进入本阶段。
- Skill runtime / Agent runtime 没有进入本阶段。
- 项目知识原文预览 / 下载没有进入本阶段。

## 4. 本阶段最重要的固定结论

- `projects.knowledgeBaseIds` 继续只表达“项目绑定的全局知识库”。
- 项目私有 knowledge 只通过 `scope=project + projectId` 表达 owner 关系，不回写到 `projects.knowledgeBaseIds`。
- Chroma namespace key 已冻结：
  - `global_docs`
  - `global_code`
  - `proj_{projectId}_docs`
  - `proj_{projectId}_code`
- 物理 collection 现已升级为 versioned naming，但 Week 5-6 冻结的 namespace key 契约保持不变。
- Week 5-6 只真正落地 `proj_{projectId}_docs`。

## 5. 最小验证

- 已有统一入口：
  - `pnpm verify:index-ops-project-consumption`
- 当前真实执行结果：
  - `apps/api` 54 个测试通过
  - `apps/indexer-py` 18 个测试通过
  - `apps/platform` 类型检查通过

## 6. 下一阶段建议

1. 先做项目对话消息写链路。
2. 再做项目 + 全局知识合并检索。
3. 然后补来源引用与技能调用展示。
4. 最后再推进 Skill / Agent runtime。

## 7. 一句话总结

Week 5-6 已经把 Knowject 的知识基座从“能上传”推进到“可运维、可在项目内正式消费”，下一阶段不应回头重做资产基础设施，而应直接进入对话与运行时主链路。
