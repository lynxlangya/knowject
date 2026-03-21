# `.codex/` Compatibility Layer

`.codex/` 现在只承载项目级 Codex 配置与少量兼容说明，不再作为正式文档、导出包或 Skill 的主目录。
正式文档主源在 `docs/`；`docs/exports/` 是新的派生层根目录，但当前 ChatGPT Projects 导出包内容仍在 `.codex/packs/chatgpt-projects/*`（待 Task 4 收口）；项目级 Skills 官方根目录计划在 Task 3 迁移到 `.agents/skills/`。
若仍引用 `.codex/docs/*`、`.codex/packs/*`、`.codex/skills/*`，请改为新路径。
