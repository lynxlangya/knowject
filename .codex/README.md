# `.codex/` Compatibility Layer

`.codex/` 现在只承载项目级 Codex 配置与少量兼容说明，不再作为正式文档、导出包或 Skill 的主目录。
正式文档主源在 `docs/`；`docs/exports/` 是正在建立的派生层根目录，但当前 ChatGPT Projects 导出包内容仍在 `.codex/packs/chatgpt-projects/*`（Task 4 前保持该 live 入口）；项目级 Skills 官方根目录计划在 Task 3 迁移到 `.agents/skills/`（Task 3 前 live 兼容入口仍为 `.codex/skills/README.md`）。
`.codex/docs/*` 可继续按兼容 stub 指引迁移；`.codex/packs/*` 与 `.codex/skills/*` 的 active 引用请分别等 Task 4 / Task 3 落地后再切换。
