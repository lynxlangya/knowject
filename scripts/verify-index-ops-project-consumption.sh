#!/usr/bin/env bash

set -euo pipefail

echo "[verify:index-ops-project-consumption] 运行 API 项目知识与索引运维测试"
pnpm --filter api exec node --test --import tsx \
  src/modules/knowledge/knowledge.service.test.ts \
  src/modules/projects/projects.service.test.ts

echo "[verify:index-ops-project-consumption] 运行 Python indexer 测试"
pnpm --filter indexer-py test

echo "[verify:index-ops-project-consumption] 运行 platform 类型检查"
pnpm --filter platform check-types
