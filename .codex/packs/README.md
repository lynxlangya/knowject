# Compatibility Stub

`.codex/packs/` 不再是主导出目录。
`docs/exports/` 是新的导出层主入口（对应 `docs/exports/*`）。
当前 ChatGPT Projects 导出包内容仍在 `.codex/packs/chatgpt-projects/*`，待 Task 4 再完成收口迁移。
请把旧的 `.codex/packs/*` 引用按迁移节奏更新到 `docs/exports/*`。
