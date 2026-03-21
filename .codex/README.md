# `.codex/` Compatibility Layer

`.codex/` 现在只承载项目级 Codex 配置与少量兼容说明，不再作为正式文档、导出包或 Skill 的主目录。
正式文档主源在 `docs/`；`docs/exports/` 是正在建立的派生层根目录，但当前 ChatGPT Projects 导出包内容仍在 `.codex/packs/chatgpt-projects/*`（Task 4 前保持该 live 入口）；项目级 Skills 的 live 根目录已在 `.agents/skills/`，`.codex/skills/README.md` 仅保留兼容跳转。
`.codex/docs/*` 可继续按兼容 stub 指引迁移；`.codex/packs/*` 的 active 引用在 Task 4 落地后再切换，`.codex/skills/*` 不再作为主维护目录。
