# Knowject Codex Workspace

`.codex/` 是 Knowject 当前唯一长期维护的 Codex 工作区目录。`AGENTS.md` 负责项目级长期指令，`.codex/config.toml` 负责项目级 Codex 配置，`.codex/docs/`、`.codex/packs/` 与 `.codex/skills/` 负责协作资料收口。

## 目录职责

- `config.toml`
  - 项目级 Codex 配置。
- `docs/`
  - 当前事实、契约、roadmap、standards、plans、handoff、design 与输入材料的正式主源。
  - `docs/standards/`：长期工程治理与协作规范（长期有效的规则与评审清单）。
  - `docs/plans/`：执行计划层（任务拆解、DoD、里程碑、验证与回滚记录）。
- `packs/chatgpt-projects/`
  - 面向 ChatGPT Projects 的派生上传包；只做同步副本，不反向充当事实源。
- `skills/`
  - 项目级 Skill 根目录；当前已落地首批 3 个项目私有审查 Skill：`docs-boundary-guard`、`knowledge-index-boundary-guard`、`api-contract-align-review`。后续新增统一使用 `.codex/skills/<skill>/SKILL.md`。
- `MIGRATION.md`
  - `.agent/` 收口到 `.codex/` 的迁移规则、目录映射和维护要求。

## 维护规则

- 新增 Codex 相关文档、上传包或项目私有 Skill 时，只能落在 `.codex/` 下。
- `.codex/` 是正式长期协作目录；不得当作本地临时资料目录或 scratch 区使用。
- `.codex/docs/` 先更新，`.codex/packs/chatgpt-projects/` 再按需同步；不要直接把派生包当主源维护。
- 应用内页面 / service / repository 的模块边界发生变化时，先更新 `AGENTS.md` 与 `.codex/docs/current/architecture.md`；`.codex/README.md` 只补入口级维护规则，不重复记录实现细节。
- `.agent/` 已废弃，仅保留历史说明与兼容提示；禁止继续向 `.agent/*` 新增主内容。
- 做目录结构治理时，至少同步 `AGENTS.md`、`.codex/README.md`、`.codex/MIGRATION.md` 与受影响的 `.codex/docs/*` / `.codex/packs/*`。

## 推荐入口

1. `AGENTS.md`
2. `.codex/docs/README.md`
3. `.codex/MIGRATION.md`（仅在改结构、文档治理或 Codex 协作规则时）
