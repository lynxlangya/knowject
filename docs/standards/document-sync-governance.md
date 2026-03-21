# 文档同步治理标准

## 1. 目标

- 把现有的“需要同步何时更新某些入口文档”的零散规则汇总成一张稳定的矩阵，让每次变更都有一个可追溯的冲突判断链。
- 让每位协作者在启动改动时先判断：本次改动是否让 `README.md`、`docs/README.md`、`docs/current/architecture.md`、`AGENTS.md` 等事实源失真，如果是就必须同步、记录和验证；否则就明确为什么暂时保持旧状态。
- 通过标准化的推荐动作、例外记录与验证步骤，把“谁负责更新文档”这个不明确的位置变成可执行的行动项并纳入 review checklist。

## 2. 触发条件

- 路由、页面/组件名称、模块归属、资源加载路径、数据流或 storage key 发生变化，导致 `docs/current/architecture.md`、子模块 README 或主入口 README 中的叙述失效。
- Mock 数据源、示例路径、项目本地存储的键、配置模板或授权 token 组织方式调整，按照 AGENTS 的规划必须同步 `docs/current/architecture.md`、相关 README，必要时同步 `AGENTS.md` 确保协作约定清楚。
- Docker/compose/容器端口、网络、环境变量、secrets 暴露面发生变化，要同步 `README.md`、`docs/current/docker-usage.md`、`docs/current/architecture.md`、`docker/README.md` 与 `apps/api/README.md` 并验证手册和部署文档一致。
- 仓库级命令包装、新增脚本、部署辅助命令、镜像构建变化时，要同步 README、`docker/README.md`、`docs/current/architecture.md`，并在必要时把控制路径写进 `AGENTS.md` 或相关计划。
- Codex 根目录职责、`docs` 上传包映射、`.codex/skills` 根目录变化必须同步 `AGENTS.md`、`.codex/README.md`、`.codex/MIGRATION.md`、`.codex/packs/chatgpt-projects/README.md` 与 `.codex/skills/README.md`，避免后续导入/上传包与事实源脱节。
- 模块边界、目录结构、协作规则等核心架构变化，要同步 `AGENTS.md`、`.codex/README.md`、`.codex/MIGRATION.md` 与 `docs/current/architecture.md`，并更新任何引用这些边界的 `plans/` 或 `tasks-*` 文档。
- 任何 contracts、contracts 相关接口、roadmap 目标、plans 进度、handoff 内容、templates 或 pack 副本被更新的场景，都必须反推是否要同步 `docs/contracts/*`、`docs/roadmap/*`、`docs/plans/*`、`docs/handoff/*`、`docs/templates/PLANS.md`、`.codex/packs/chatgpt-projects/*` 这些依赖文档。

## 3. 同步矩阵

| 文档 | 触发变化 | 说明与参照 |
| --- | --- | --- |
| `README.md` | 结构、入口、运行流程、部署命令或资源约定发生变化 | AGENTS §5 与 `docs/README.md` §5 要求把入口文档与现状保持一致，并在 `plans/` 中同步记录改动。 |
| `docs/README.md` | `docs` 的目录职责、标准流程、上传包同步、Skill 根目录变化 | 上述 README 里的“维护边界”条目第 5-6 项指明这些文档是 `.codex` 事实的统一入口。 |
| `AGENTS.md` | 关键路径、模块边界、协作机制、例外收束、Codex 角色发生调整 | AGENTS §5-6 列出必须同步 AGENTS 及相关 doc 的前提，避免规则藏在隐式约定里。 |
| `docs/current/architecture.md` | 路由、data flow、API 依赖、mock 用例、localStorage 键、模块归属、Default behavior 变更 | README 列出的 architecture 维护边界对上述事实变更给出了清晰触发器。 |
| `.codex/README.md` | `docs` 目录职责、标准流程、上传包/Skill 目录职责变化 | AGENTS §5 强调 Codex 根目录职责调整需同步 `.codex/README.md`，保持入口说明与治理规则一致。 |
| `.codex/MIGRATION.md` | `docs` 与 `.agent/` 收口策略变更、目录迁移、结构职责调整 | AGENTS §5/§0.1 要求 `.codex/MIGRATION.md` 与 `.codex/README.md` 同步体现迁移规则，避免交接歧义。 |
| `.codex/packs/chatgpt-projects/README.md` | `docs` 中的 source 文档 (current/contracts/plans) 被上传包引用的内容发生变化 | AGENTS §5 规定派生上传包必须与事实源同步，相关 README 也应更新以反映最新可上传快照。 |
| `.codex/skills/README.md` | `.codex/skills` 目录职责、Skill 目录治理流程、导入/发布政策变更 | AGENTS §5 要求 `.codex/skills/README.md` 反映当前 skills 协作治理，确保 `docs` 的入口说明一致。 |
| `docs/current/docker-usage.md` | Docker/compose 文件变化、新增镜像、端口/网络/secret/vault 方案修改 | README “维护边界”第 5 项专门列出 Docker 维护情形。 |
| `docs/contracts/*.md` | APIs、接口约定、错误/状态码、身份校验、Chat/Knowledge/Indexer 约定发生变化 | README “维护边界”中认证/对话/Chroma contract 的维护条目。 |
| `docs/roadmap/*.md` | 产品目标、gap 分析、阶段优先级调整 | README 指出 roadmap 目标和 gap 需同步。 |
| `docs/plans/*.md` | 阶段状态、DoD、里程碑、资源绑定、计划实施方法更新 | README 里每个 plan 条目都说明何种变更需同步 plan 文档（包括 governance implementation plan）。 |
| `docs/handoff/*` & `docs/templates/PLANS.md` | 交接顺序、handoff prompt、模板结构或引用路径变化 | README 里 handoff/brief/prompt、templates 维护条目。 |
| `.codex/packs/chatgpt-projects/*` | 被上传包引用的 `docs/*` 源文档内容变更 | README 提到副本必须与事实源同步，优先以 `docs` 为准。 |

## 4. 推荐动作

1. 变更上线前先过一遍矩阵：把预计改动的代码/配置与矩阵行对照，圈出需要同步的文档并列入 issue/PR checklist。
2. 如果触发多个文档，先更新事实源（`docs/current/...`、contracts 等），再更新入口/目录说明（README、AGENTS、`.codex/README.md`），确保“事实→入口”顺序一致。
3. 更新时在 PR 描述、review note、plans 或 documentation ticket 中指出“哪个触发项导致了同步”（引用 matrix row），方便后续 audit。
4. 更新完成后，运行 `rg` 或 `grep` 检查入口文档中指涉的路径、名称、命令是否与源码一致，必要时让 review checklist 中的“文档同步”条目负责验收。
5. 若同步影响到了 `.codex/packs/chatgpt-projects/*`，在汇总列表里提交一个同步记录，提醒上传副本必须重新生成。

## 5. 允许例外

- 小范围 refactor 或临时调研时可推迟同步，但必须在 review note/plan 中记录：触发项、当前影响、预计同步时间与负责人。
- 例外记录需与改动紧贴（在 PR description、plan update、AGENTS 例外 block 等处），不能放在其他 issue 里，以便 governance review 及时发现。
- 若同步被拆分成多个 PR 或阶段，需要在第一个 PR 就列出整体同步清单，并在后续 PR 中逐条关闭。例外记录必须注明“何时/何人补全”，不能“留给未来某个不确定时间”。

## 6. 文档同步要求

- 所有文档同步都要在 `review-checklist.md` 的“文档同步”项中打钩或说明例外，必要时引用本标准的矩阵行号。
- 同步记录应保留在 PR 描述、review note、implementation plan、或例外记录中，不要把入口文档作为同步笔记；只有当入口文档本身的事实、结构或职责发生变化时再更新它们。
- 如果同步引入了新目录/标准（例如新建 `standards/document-sync-governance.md`），务必在 `engineering-governance-overview.md`、`review-checklist.md` 和 `docs/README.md` 中新增导航，确保治理标准本身也在文档同步体系内。
- 每一轮同步后，复查 `docs/current/architecture.md` 与 README 的内链，确保没有遗失的新路径或名字，并把检查结果附在 review note 或 Plan 记录里。
