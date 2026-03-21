# Codex Doc Root Baseline

Date: 2026-03-21

Baseline commands:
- `test -f docs/README.md && echo "docs-readme-present" || echo "docs-readme-missing"`
- `test -d docs/current && echo "docs-current-present" || echo "docs-current-missing"`
- `test -d docs/contracts && echo "docs-contracts-present" || echo "docs-contracts-missing"`

Baseline outputs before migration:
- `docs-readme-missing`
- `docs-current-missing`
- `docs-contracts-missing`

Expected missing results: `docs-readme-missing`, `docs-current-missing`, `docs-contracts-missing`.

This baseline was captured before the doc-root migration began in this worktree.
