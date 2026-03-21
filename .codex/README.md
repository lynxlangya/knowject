# `.codex/` Compatibility Layer

`.codex/` 现在只承载项目级 Codex 配置与少量兼容说明，不再作为正式文档、导出包或 Skill 的主目录。
正式文档主源在 `docs/`；`docs/exports/` 是 live 派生导出层，其中 ChatGPT Projects 导出包 live 根目录为 `docs/exports/chatgpt-projects/*`。
`.codex/packs/chatgpt-projects/README.md` 仅保留 compatibility shell；项目级 Skills 的 live 根目录是 `.agents/skills/*`，`.codex/skills/README.md` 仅保留 compatibility stub。
`.codex/docs/*`、`.codex/packs/*`、`.codex/skills/*` 仅作兼容入口，不再作为主维护目录。
