#!/usr/bin/env bash

set -euo pipefail

echo "[verify:core-loop-readiness] 运行 API indexer helper 契约测试"
pnpm --filter api exec node --test --import tsx \
  src/lib/knowledge-indexer-request.test.ts

echo "[verify:core-loop-readiness] 运行核心知识与项目对话链路"
pnpm verify:index-ops-project-consumption

echo "[verify:core-loop-readiness] 运行平台项目对话回归"
pnpm --filter platform exec node --test --import tsx \
  tests/projects.stream.test.ts \
  tests/projectChatCitations.test.ts \
  tests/projectChatSourceDrawer.test.ts \
  tests/useProjectConversationTurn.helpers.test.ts \
  tests/projectChatIssues.test.ts
