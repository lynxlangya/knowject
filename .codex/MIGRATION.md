# `.agent/` -> `.codex/` 迁移说明

## 为什么要收口到 `.codex/`

Knowject 之前把项目主文档放在 `.agent/docs/`，把 ChatGPT Projects 上传副本放在 `.agent/gpt/`。这种结构在历史阶段可用，但会让 Codex 配置、项目文档、上传副本与技能目录分散在多处，容易形成双主源。

本次迁移按 Codex 当前推荐入口收口：

- 项目级长期指令：`AGENTS.md`
- 项目级配置：`.codex/config.toml`
- 项目级 Skills：`.codex/skills/<skill>/SKILL.md`
- 项目级协作文档与派生包：统一进入 `.codex/`

说明依据：

- `codex --help` 明确项目级配置走 `config.toml`。
- OpenAI Codex 文档说明项目配置可放在 `.codex/config.toml`，项目指令继续使用 `AGENTS.md`。

## 迁移后目录职责

```text
.codex/
  config.toml                  项目级 Codex 配置
  README.md                    Codex 工作区入口
  MIGRATION.md                 迁移规则与映射
  docs/                        正式主文档源
    standards/                 长期工程治理与协作规范（长期规则与评审清单）
    plans/                     执行计划层（任务拆解、DoD、验证与回滚记录）
  packs/chatgpt-projects/      ChatGPT Projects 派生上传包
  skills/                      项目级 Skill 根目录

.agent/
  README.md                    历史目录废弃说明
  docs/README.md               指向 `.codex/docs/`
  gpt/README.md                指向 `.codex/packs/chatgpt-projects/`
  skills/README.md             指向 `.codex/skills/`
```

## 目录映射

| 旧位置 | 新位置 | 迁移后角色 |
| --- | --- | --- |
| `.agent/docs/` | `.codex/docs/` | 正式文档主源 |
| `.agent/gpt/` | `.codex/packs/chatgpt-projects/` | 派生上传包 |
| `.agent/skills/` | `.codex/skills/` | 项目级 Skill 根目录 |
| `.agent/` | `.agent/` | 历史说明与兼容提示，不再维护主内容 |

## 维护规则

- 文档、配置、skills、上传包的新增维护统一走 `.codex/`。
- `.codex/docs/` 与 `.codex/packs/chatgpt-projects/` 不得并列承担事实源职责；派生包永远从主文档同步，不反向编辑。
- `.codex/docs/standards/` 承载长期工程治理与协作规则；`.codex/docs/plans/` 仍承载执行计划层，二者不要混写。
- 应用内页面 / service / repository 的拆分事实不在本文件保留实现细节；相关当前事实应同步到 `AGENTS.md` 与 `.codex/docs/current/architecture.md`，本文件只维护 `.agent/` / `.codex/` 迁移边界。
- `.agent/*` 只保留迁移说明和兼容路径提示，不再新增主文档、主配置、主 skill。
- 做结构治理时，优先更新 `AGENTS.md`、`.codex/README.md`、`.codex/MIGRATION.md` 与 `.codex/docs/current/architecture.md`。

## 当前结论

- `.codex/` 现在是 Knowject 唯一长期维护的 Codex 主入口。
- `.agent/` 已从“工作主目录”降级为“历史保留层”。
- `.codex/skills/` 已从“未来唯一 Skill 根目录”进入“当前正式维护入口”状态；当前首批已落地 `docs-boundary-guard`、`knowledge-index-boundary-guard` 与 `api-contract-align-review` 三个项目私有 Skill。
